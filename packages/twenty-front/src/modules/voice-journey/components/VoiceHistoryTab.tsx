import { styled } from '@linaria/react';
import React from 'react';
import { IconPhone } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { SkeletonLoader } from '@/activities/components/SkeletonLoader';
import { useLayoutRenderingContext } from '@/ui/layout/contexts/LayoutRenderingContext';

import { useVoiceJourneys } from '../hooks/useVoiceJourneys';
import { VoiceJourneyCard } from './VoiceJourneyCard';

type VoiceHistoryTabProps = {
  contactId?: string;
};

const StyledContainer = styled.div`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[4]};
  padding: ${themeCssVariables.spacing[4]};
  width: 100%;
`;

const StyledEmptyState = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: center;
  padding: ${themeCssVariables.spacing[12]};
`;

export const VoiceHistoryTab = ({ contactId: propContactId }: VoiceHistoryTabProps) => {
  const { targetRecordIdentifier } = useLayoutRenderingContext();
  const contactId = propContactId ?? targetRecordIdentifier?.id;

  const { voiceJourneys, loading } = useVoiceJourneys({ contactId });

  if (loading) {
    return (
      <StyledContainer>
        <SkeletonLoader />
      </StyledContainer>
    );
  }

  if (voiceJourneys.length === 0) {
    return (
      <StyledContainer>
        <StyledEmptyState>
          <IconPhone size={48} />
          <div>No voice calls recorded for this contact.</div>
        </StyledEmptyState>
      </StyledContainer>
    );
  }

  return (
    <StyledContainer>
      {voiceJourneys.map((journey) => (
        <VoiceJourneyCard key={journey.id} voiceJourney={journey} />
      ))}
    </StyledContainer>
  );
};
