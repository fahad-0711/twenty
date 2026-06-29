import { gql } from '@apollo/client';

export const FIND_VOICE_JOURNEYS = gql`
  query FindVoiceJourneys($filter: VoiceJourneyFilterInput, $first: Int, $after: String) {
    voiceJourneys(filter: $filter, first: $first, after: $after) {
      edges {
        cursor
        node {
          id
          callId
          agentId
          direction
          status
          fromNumber
          toNumber
          durationSeconds
          recordingUrl
          startedAt
          endedAt
          sentimentScore
          intentDetected
          transcriptSummary
          nextAction
          keyEntitiesExtracted
          transcriptRaw
          agentPerformanceScore
          relatedContactId
          relatedOpportunityId
          relatedProjectId
          isReviewed
          reviewedBy
          reviewedAt
          createdAt
          updatedAt
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
`;
