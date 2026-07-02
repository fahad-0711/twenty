// packages/twenty-server/src/modules/voice-journey/voice-journey.module.ts
import { Module } from '@nestjs/common';
import { TokenModule } from 'src/engine/core-modules/auth/token/token.module';
import { WorkspaceCacheStorageModule } from 'src/engine/workspace-cache-storage/workspace-cache-storage.module';
import { VoiceJourneyResolver } from './voice-journey.resolver';
import { VoiceJourneyService } from './voice-journey.service';

@Module({
  imports: [
    // Required for JwtAuthGuard used in VoiceJourneyResolver
    TokenModule,
    WorkspaceCacheStorageModule,
  ],
  providers: [VoiceJourneyResolver, VoiceJourneyService],
  exports: [VoiceJourneyService],
})
export class VoiceJourneyModule {}
