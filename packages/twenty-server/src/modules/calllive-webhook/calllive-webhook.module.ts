// packages/twenty-server/src/modules/calllive-webhook/calllive-webhook.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MessageQueueModule } from 'src/engine/core-modules/message-queue/message-queue.module';
import { AutoTaskCreatorService } from './auto-task-creator.service';
import { CallLiveWebhookController } from './calllive-webhook.controller';
import { CallLiveWebhookProcessor } from './calllive-webhook.processor';
import { CallLiveWebhookValidator } from './calllive-webhook.validator';

@Module({
  imports: [ConfigModule, MessageQueueModule],
  controllers: [CallLiveWebhookController],
  providers: [
    CallLiveWebhookValidator,
    CallLiveWebhookProcessor,
    AutoTaskCreatorService,
  ],
})
export class CallLiveWebhookModule {}
