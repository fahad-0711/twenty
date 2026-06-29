// packages/twenty-server/src/modules/modules.module.ts
import { Module } from '@nestjs/common';

import { CalendarModule } from 'src/modules/calendar/calendar.module';
import { CallLiveWebhookModule } from 'src/modules/calllive-webhook/calllive-webhook.module';
import { ConnectedAccountModule } from 'src/modules/connected-account/connected-account.module';
import { MessagingModule } from 'src/modules/messaging/messaging.module';
import { OnboardingInviteSuggestionsModule } from 'src/modules/onboarding-invite-suggestions/onboarding-invite-suggestions.module';
import { VoiceJourneyModule } from 'src/modules/voice-journey/voice-journey.module';
import { WorkflowModule } from 'src/modules/workflow/workflow.module';
import { WorkspaceMemberModule } from 'src/modules/workspace-member/workspace-member.module';

@Module({
  imports: [
    MessagingModule,
    CalendarModule,
    ConnectedAccountModule,
    OnboardingInviteSuggestionsModule,
    WorkflowModule,
    WorkspaceMemberModule,
    CallLiveWebhookModule,
    VoiceJourneyModule,
  ],
  providers: [],
  exports: [],
})
export class ModulesModule {}
