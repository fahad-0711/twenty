// packages/twenty-server/src/modules/calllive-webhook/calllive-webhook.controller.ts
import {
  BadRequestException,
  Controller,
  HttpCode,
  Post,
  type RawBodyRequest,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { type Queue } from 'bullmq';
import { type Request } from 'express';
import { InjectMessageQueue } from 'src/engine/core-modules/message-queue/decorators/message-queue.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { NoPermissionGuard } from 'src/engine/guards/no-permission.guard';
import { PublicEndpointGuard } from 'src/engine/guards/public-endpoint.guard';
import { DataSource } from 'typeorm';
import { CallLiveWebhookValidator } from './calllive-webhook.validator';
import { callLivePayloadSchema } from './dtos/calllive-payload.dto';

@Controller('api/webhooks/calllive')
export class CallLiveWebhookController {
  constructor(
    private readonly validator: CallLiveWebhookValidator,
    private readonly dataSource: DataSource,
    @InjectMessageQueue(MessageQueue.webhookQueue)
    private readonly queue: Queue,
  ) {}

  @Post('events')
  @UseGuards(PublicEndpointGuard, NoPermissionGuard)
  @HttpCode(200)
  async handleEvent(
    @Req() request: RawBodyRequest<Request>,
  ): Promise<{ received: boolean }> {
    // Step 1: Verify HMAC
    const signature = request.headers['x-calllive-signature'] as string;

    if (!request.rawBody) {
      throw new BadRequestException('Missing raw body');
    }

    const isValid = this.validator.verifyHmac(request.rawBody, signature);
    if (!isValid) {
      throw new UnauthorizedException('Invalid HMAC signature');
    }

    // Step 2: Zod.parse the body
    const parsed = callLivePayloadSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.errors);
    }

    const payload = parsed.data;

    // Step 3: Upsert WebhookEvent record by event_id (idempotent)
    const schemas = await this.dataSource.query(
      `SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'workspace_%' LIMIT 1`,
    );

    if (schemas.length > 0) {
      const schemaName = schemas[0].schema_name;
      await this.dataSource.query(
        `INSERT INTO "${schemaName}"."calllive_webhook_event" 
         ("eventId", "eventType", "rawPayload", "receivedAt", "processingStatus") 
         VALUES ($1, $2, $3, $4, 'RECEIVED') 
         ON CONFLICT ("eventId") DO NOTHING`,
        [payload.event_id, payload.event_type, payload, new Date()],
      );
    }

    // Step 4: Add job to BullMQ queue
    await this.queue.add(
      'process-calllive-event',
      { event_id: payload.event_id },
      { jobId: payload.event_id },
    );

    // Step 5: Return quickly (< 1 second total)
    return { received: true };
  }
}
