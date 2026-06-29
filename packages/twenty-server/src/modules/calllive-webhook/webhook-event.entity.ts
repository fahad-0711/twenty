// packages/twenty-server/src/modules/calllive-webhook/webhook-event.entity.ts
//
// Raw webhook ingestion log for CallLive.ai events.
// Write-once table used for idempotency (unique event_id) and debugging.
// Lives in the workspace schema with the calllive_ prefix.

import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

// Processing status tracks the lifecycle of a single webhook event
export enum WebhookEventStatus {
  RECEIVED = 'RECEIVED',
  PROCESSING = 'PROCESSING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
}

@Entity('calllive_webhook_event')
@Index('IDX_CALLLIVE_WEBHOOK_EVENT_EVENT_ID', ['eventId'], { unique: true })
@Index('IDX_CALLLIVE_WEBHOOK_EVENT_EVENT_TYPE', ['eventType'])
@Index('IDX_CALLLIVE_WEBHOOK_EVENT_PROCESSING_STATUS', ['processingStatus'])
export class WebhookEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // CallLive.ai's unique event identifier — used as idempotency key.
  // Duplicate event_id values are rejected to prevent double-processing.
  @Column({ type: 'varchar', unique: true, nullable: false })
  eventId: string;

  // Event type from CallLive.ai (e.g. "call.initiated", "transcript.ready")
  @Column({ type: 'varchar', nullable: false })
  eventType: string;

  // Complete raw JSON payload as received from CallLive.ai.
  // Stored before any processing for auditability and replay.
  @Column({ type: 'jsonb', nullable: false })
  rawPayload: Record<string, unknown>;

  // Lifecycle status of this event's processing
  @Column({
    type: 'enum',
    enum: WebhookEventStatus,
    default: WebhookEventStatus.RECEIVED,
  })
  processingStatus: WebhookEventStatus;

  // Populated only when processingStatus is FAILED
  @Column({ type: 'varchar', nullable: true })
  errorMessage: string | null;

  // Timestamp when the event was successfully processed
  @Column({ type: 'timestamptz', nullable: true })
  processedAt: Date | null;

  // FK reference to the VoiceJourney created/updated by this event.
  // Not a TypeORM @ManyToOne to avoid circular dependency with
  // the VoiceJourney entity (created in a later phase).
  @Column({ type: 'uuid', nullable: true })
  relatedVoiceJourneyId: string | null;

  // Timestamp when the webhook HTTP request was received by our server
  @Column({ type: 'timestamptz', nullable: false })
  receivedAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  // Soft delete — never hard-delete webhook records
  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;
}
