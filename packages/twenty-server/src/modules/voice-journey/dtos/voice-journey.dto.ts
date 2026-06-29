// packages/twenty-server/src/modules/voice-journey/dtos/voice-journey.dto.ts
import {
  Field,
  Float,
  Int,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import {
  CallDirection,
  CallIntent,
  CallStatus,
} from '../voice-journey.entity';

registerEnumType(CallDirection, { name: 'CallDirection' });
registerEnumType(CallStatus, { name: 'CallStatus' });
registerEnumType(CallIntent, { name: 'CallIntent' });

@ObjectType('VoiceJourney')
export class VoiceJourneyDTO {
  @Field()
  id: string;

  @Field()
  callId: string;

  @Field({ nullable: true })
  agentId?: string;

  @Field(() => CallDirection)
  direction: CallDirection;

  @Field(() => CallStatus)
  status: CallStatus;

  @Field()
  fromNumber: string;

  @Field()
  toNumber: string;

  @Field(() => Int)
  durationSeconds: number;

  @Field({ nullable: true })
  recordingUrl?: string;

  @Field()
  startedAt: Date;

  @Field({ nullable: true })
  endedAt?: Date;

  @Field(() => Float, { nullable: true })
  sentimentScore?: number;

  @Field(() => CallIntent, { nullable: true })
  intentDetected?: CallIntent;

  @Field({ nullable: true })
  transcriptSummary?: string;

  @Field({ nullable: true })
  nextAction?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  keyEntitiesExtracted?: any;

  @Field(() => GraphQLJSON, { nullable: true })
  transcriptRaw?: any;

  @Field(() => Float, { nullable: true })
  agentPerformanceScore?: number;

  @Field({ nullable: true })
  relatedContactId?: string;

  @Field({ nullable: true })
  relatedOpportunityId?: string;

  @Field({ nullable: true })
  relatedProjectId?: string;

  @Field()
  isReviewed: boolean;

  @Field({ nullable: true })
  reviewedBy?: string;

  @Field({ nullable: true })
  reviewedAt?: Date;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field({ nullable: true })
  deletedAt?: Date;
}

@ObjectType('VoiceJourneyPageInfo')
export class VoiceJourneyPageInfoDTO {
  @Field()
  hasNextPage: boolean;

  @Field()
  hasPreviousPage: boolean;

  @Field({ nullable: true })
  startCursor?: string;

  @Field({ nullable: true })
  endCursor?: string;
}

@ObjectType('VoiceJourneyEdge')
export class VoiceJourneyEdgeDTO {
  @Field(() => VoiceJourneyDTO)
  node: VoiceJourneyDTO;

  @Field()
  cursor: string;
}

@ObjectType('VoiceJourneyConnection')
export class VoiceJourneyConnectionDTO {
  @Field(() => [VoiceJourneyEdgeDTO])
  edges: VoiceJourneyEdgeDTO[];

  @Field(() => VoiceJourneyPageInfoDTO)
  pageInfo: VoiceJourneyPageInfoDTO;

  @Field(() => Int)
  totalCount: number;
}
