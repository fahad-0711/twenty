// packages/twenty-server/src/modules/voice-journey/dtos/voice-journey-input.dto.ts
import { Field, Float, InputType, Int, ObjectType } from '@nestjs/graphql';
import { CallStatus } from '../voice-journey.entity';

@InputType('VoiceJourneyDateRangeInput')
export class VoiceJourneyDateRangeInput {
  @Field()
  start: Date;

  @Field()
  end: Date;
}

@InputType('VoiceJourneyFilterInput')
export class VoiceJourneyFilterInput {
  @Field({ nullable: true })
  contactId?: string;

  @Field({ nullable: true })
  projectId?: string;

  @Field(() => CallStatus, { nullable: true })
  status?: CallStatus;

  @Field(() => VoiceJourneyDateRangeInput, { nullable: true })
  dateRange?: VoiceJourneyDateRangeInput;
}

@InputType('UpdateVoiceJourneyInput')
export class UpdateVoiceJourneyInput {
  @Field()
  isReviewed: boolean;
}

@InputType('VoiceJourneyStatsInput')
export class VoiceJourneyStatsInput {
  @Field({ nullable: true })
  projectId?: string;

  @Field(() => VoiceJourneyDateRangeInput, { nullable: true })
  dateRange?: VoiceJourneyDateRangeInput;
}

@ObjectType('VoiceJourneyStats')
export class VoiceJourneyStatsDTO {
  @Field(() => Int)
  totalCalls: number;

  @Field(() => Float)
  averageDurationSeconds: number;

  @Field(() => Float, { nullable: true })
  averageSentiment?: number;
}
