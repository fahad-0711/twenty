// packages/twenty-server/src/modules/voice-journey/voice-journey.resolver.ts
import { UseGuards } from '@nestjs/common';
import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';
import {
  UpdateVoiceJourneyInput,
  VoiceJourneyFilterInput,
  VoiceJourneyStatsDTO,
  VoiceJourneyStatsInput,
} from './dtos/voice-journey-input.dto';
import {
  VoiceJourneyConnectionDTO,
  VoiceJourneyDTO,
} from './dtos/voice-journey.dto';
import { VoiceJourneyService } from './voice-journey.service';

@Resolver(() => VoiceJourneyDTO)
@UseGuards(JwtAuthGuard)
export class VoiceJourneyResolver {
  constructor(private readonly voiceJourneyService: VoiceJourneyService) {}

  @Query(() => VoiceJourneyConnectionDTO)
  async voiceJourneys(
    @Args('filter', { type: () => VoiceJourneyFilterInput, nullable: true })
    filter?: VoiceJourneyFilterInput,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 20 })
    limit?: number,
    @Args('cursor', { type: () => String, nullable: true })
    cursor?: string,
  ): Promise<VoiceJourneyConnectionDTO> {
    return this.voiceJourneyService.findAll(filter || {}, limit || 20, cursor);
  }

  @Query(() => VoiceJourneyDTO)
  async voiceJourney(@Args('id') id: string): Promise<VoiceJourneyDTO> {
    return this.voiceJourneyService.findOneById(id);
  }

  @Query(() => VoiceJourneyStatsDTO)
  async voiceJourneyStats(
    @Args('input', { type: () => VoiceJourneyStatsInput })
    input: VoiceJourneyStatsInput,
  ): Promise<VoiceJourneyStatsDTO> {
    return this.voiceJourneyService.getStats(input);
  }

  @Mutation(() => VoiceJourneyDTO)
  async updateVoiceJourney(
    @Args('id') id: string,
    @Args('input') input: UpdateVoiceJourneyInput,
  ): Promise<VoiceJourneyDTO> {
    return this.voiceJourneyService.update(id, input);
  }
}
