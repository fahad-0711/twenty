// packages/twenty-server/src/modules/voice-journey/voice-journey.module.ts
import { Module } from '@nestjs/common';
import { VoiceJourneyResolver } from './voice-journey.resolver';
import { VoiceJourneyService } from './voice-journey.service';

@Module({
  providers: [VoiceJourneyResolver, VoiceJourneyService],
  exports: [VoiceJourneyService],
})
export class VoiceJourneyModule {}
