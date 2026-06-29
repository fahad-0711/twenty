import { useQuery } from '@apollo/client/react';

import { FIND_VOICE_JOURNEYS } from '../graphql/queries/findVoiceJourneys';

export type VoiceJourneyNode = {
  id: string;
  callId: string;
  agentId?: string;
  direction: string;
  status: string;
  fromNumber: string;
  toNumber: string;
  durationSeconds: number;
  recordingUrl?: string;
  startedAt: string;
  endedAt?: string;
  sentimentScore?: number;
  intentDetected?: string;
  transcriptSummary?: string;
  nextAction?: string;
  keyEntitiesExtracted?: Record<string, unknown>;
  transcriptRaw?: unknown;
  agentPerformanceScore?: number;
  relatedContactId?: string;
  relatedOpportunityId?: string;
  relatedProjectId?: string;
  isReviewed: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type UseVoiceJourneysParams = {
  contactId?: string;
};

type FindVoiceJourneysResponse = {
  voiceJourneys?: {
    edges?: Array<{
      node: VoiceJourneyNode;
    }>;
    totalCount?: number;
  };
};

export const useVoiceJourneys = ({ contactId }: UseVoiceJourneysParams) => {
  const { data, loading, error } = useQuery<FindVoiceJourneysResponse>(FIND_VOICE_JOURNEYS, {
    variables: {
      filter: contactId ? { relatedContactId: { eq: contactId } } : undefined,
    },
    skip: !contactId,
  });

  const voiceJourneys: VoiceJourneyNode[] =
    data?.voiceJourneys?.edges?.map((edge: { node: VoiceJourneyNode }) => edge.node) ?? [];
  const totalCount: number = data?.voiceJourneys?.totalCount ?? 0;

  return {
    voiceJourneys,
    loading,
    error,
    totalCount,
  };
};
