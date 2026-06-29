// packages/twenty-server/src/modules/calllive-webhook/calllive-webhook.processor.ts
import { Injectable, Logger } from '@nestjs/common';
import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { DataSource } from 'typeorm';
import { AutoTaskCreatorService } from './auto-task-creator.service';

@Processor('calllive-events')
export class CallLiveWebhookProcessor {
  private readonly logger = new Logger(CallLiveWebhookProcessor.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly autoTaskCreator: AutoTaskCreatorService,
  ) {}

  @Process('process-calllive-event')
  async handle(job: { data: { event_id: string } }): Promise<void> {
    const eventId = job.data.event_id;
    this.logger.log(`Processing CallLive event: ${eventId}`);

    const schemas = await this.dataSource.query(
      `SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'workspace_%' LIMIT 1`,
    );
    if (schemas.length === 0) {
      throw new Error('No workspace schema found');
    }
    const schemaName = schemas[0].schema_name;
    const workspaceId = schemaName.replace('workspace_', '');

    // 1. Fetch WebhookEvent
    const events = await this.dataSource.query(
      `SELECT * FROM "${schemaName}"."calllive_webhook_event" WHERE "eventId" = $1 LIMIT 1`,
      [eventId],
    );

    if (events.length === 0) {
      this.logger.error(`WebhookEvent not found: ${eventId}`);
      return;
    }

    const eventRecord = events[0];
    const payload = eventRecord.rawPayload;
    const eventType = eventRecord.eventType;

    // Mark PROCESSING
    await this.dataSource.query(
      `UPDATE "${schemaName}"."calllive_webhook_event" SET "processingStatus" = 'PROCESSING' WHERE "eventId" = $1`,
      [eventId],
    );

    try {
      switch (eventType) {
        case 'call.initiated':
          await this.handleCallInitiated(payload, schemaName);
          break;
        case 'call.in_progress':
          await this.handleCallInProgress(payload, schemaName);
          break;
        case 'call.completed':
          await this.handleCallCompleted(payload, schemaName);
          break;
        case 'call.failed':
          await this.handleCallFailed(payload, schemaName);
          break;
        case 'call.no_answer':
          await this.handleCallNoAnswer(payload, schemaName);
          break;
        case 'transcript.ready':
          await this.handleTranscriptReady(payload, schemaName);
          break;
        case 'sentiment.analyzed':
          await this.handleSentimentAnalyzed(payload, schemaName, workspaceId);
          break;
        default:
          this.logger.warn(`Unhandled event type: ${eventType}`);
      }

      // Mark PROCESSED
      await this.dataSource.query(
        `UPDATE "${schemaName}"."calllive_webhook_event" SET "processingStatus" = 'PROCESSED', "processedAt" = now() WHERE "eventId" = $1`,
        [eventId],
      );
    } catch (error: any) {
      this.logger.error(`Error processing event ${eventId}: ${error.message}`);
      await this.dataSource.query(
        `UPDATE "${schemaName}"."calllive_webhook_event" SET "processingStatus" = 'FAILED', "errorMessage" = $2 WHERE "eventId" = $1`,
        [eventId, error.message || 'Unknown error'],
      );
      throw error;
    }
  }

  private async handleCallInitiated(payload: any, schemaName: string) {
    const callId = payload.call_id;
    const direction = payload.direction || 'INBOUND';
    const phone =
      direction === 'INBOUND' ? payload.from_number : payload.to_number;

    let contactId: string | null = null;
    if (phone) {
      const persons = await this.dataSource
        .query(
          `SELECT id, name FROM "${schemaName}"."person" WHERE phone = $1 LIMIT 1`,
          [phone],
        )
        .catch(() => []);

      if (persons.length > 0) {
        contactId = persons[0].id;
      }
    }

    await this.dataSource.query(
      `INSERT INTO "${schemaName}"."calllive_voice_journey" 
       ("id", "callId", "direction", "status", "relatedContactId", "createdAt", "updatedAt") 
       VALUES (uuid_generate_v4(), $1, $2, 'INITIATED', $3, now(), now()) 
       ON CONFLICT ("callId") DO UPDATE SET "status" = 'INITIATED', "updatedAt" = now()`,
      [callId, direction, contactId],
    );
  }

  private async handleCallInProgress(payload: any, schemaName: string) {
    await this.dataSource.query(
      `UPDATE "${schemaName}"."calllive_voice_journey" SET "status" = 'IN_PROGRESS', "updatedAt" = now() WHERE "callId" = $1`,
      [payload.call_id],
    );
  }

  private async handleCallCompleted(payload: any, schemaName: string) {
    await this.dataSource.query(
      `UPDATE "${schemaName}"."calllive_voice_journey" SET "status" = 'COMPLETED', "updatedAt" = now() WHERE "callId" = $1`,
      [payload.call_id],
    );
  }

  private async handleCallFailed(payload: any, schemaName: string) {
    await this.dataSource.query(
      `UPDATE "${schemaName}"."calllive_voice_journey" SET "status" = 'FAILED', "updatedAt" = now() WHERE "callId" = $1`,
      [payload.call_id],
    );
  }

  private async handleCallNoAnswer(payload: any, schemaName: string) {
    await this.dataSource.query(
      `UPDATE "${schemaName}"."calllive_voice_journey" SET "status" = 'NO_ANSWER', "updatedAt" = now() WHERE "callId" = $1`,
      [payload.call_id],
    );
  }

  private async handleTranscriptReady(payload: any, schemaName: string) {
    await this.dataSource.query(
      `UPDATE "${schemaName}"."calllive_voice_journey" SET "transcriptRaw" = $2, "updatedAt" = now() WHERE "callId" = $1`,
      [payload.call_id, JSON.stringify(payload.transcript_raw || [])],
    );
  }

  private async handleSentimentAnalyzed(
    payload: any,
    schemaName: string,
    workspaceId: string,
  ) {
    await this.dataSource.query(
      `UPDATE "${schemaName}"."calllive_voice_journey" SET 
       "sentimentScore" = $2, 
       "intentDetected" = $3, 
       "transcriptSummary" = $4, 
       "nextAction" = $5, 
       "keyEntitiesExtracted" = $6, 
       "updatedAt" = now() 
       WHERE "callId" = $1`,
      [
        payload.call_id,
        payload.sentiment_score || null,
        payload.intent_detected || null,
        payload.transcript_summary || null,
        payload.next_action || null,
        JSON.stringify(payload.key_entities_extracted || {}),
      ],
    );

    if (payload.intent_detected) {
      let leadName = 'Lead';
      const journeys = await this.dataSource.query(
        `SELECT "relatedContactId" FROM "${schemaName}"."calllive_voice_journey" WHERE "callId" = $1 LIMIT 1`,
        [payload.call_id],
      );
      if (journeys.length > 0 && journeys[0].relatedContactId) {
        const persons = await this.dataSource
          .query(
            `SELECT name FROM "${schemaName}"."person" WHERE id = $1 LIMIT 1`,
            [journeys[0].relatedContactId],
          )
          .catch(() => []);
        if (persons.length > 0 && persons[0].name) {
          leadName =
            typeof persons[0].name === 'string'
              ? persons[0].name
              : persons[0].name.firstName || 'Lead';
        }
      }

      await this.autoTaskCreator.createAutoTask(
        payload.intent_detected,
        leadName,
        {
          project:
            payload.key_entities_extracted?.preferred_location ||
            payload.key_entities_extracted?.mentioned_projects?.[0],
          reason: payload.transcript_summary,
        },
        workspaceId,
      );
    }
  }
}
