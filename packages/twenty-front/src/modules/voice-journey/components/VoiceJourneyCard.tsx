import { styled } from '@linaria/react';
import React, { useState } from 'react';
import { Tag } from 'twenty-ui/data-display';
import {
  IconArrowDown,
  IconArrowUp,
  IconChevronDown,
  IconChevronUp,
} from 'twenty-ui/icon';
import { Card } from 'twenty-ui/surfaces';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { type VoiceJourneyNode } from '../hooks/useVoiceJourneys';
import { SentimentChip } from './SentimentChip';
import { TranscriptViewer, type TranscriptSegment } from './TranscriptViewer';

type VoiceJourneyCardProps = {
  voiceJourney: VoiceJourneyNode;
};

const StyledCardContent = styled.div`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 100%;
`;

const StyledHeader = styled.div`
  align-items: center;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  padding: ${themeCssVariables.spacing[4]};
`;

const StyledHeaderLeft = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[3]};
`;

const StyledHeaderRight = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledContactInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const StyledPhone = styled.div`
  color: ${themeCssVariables.font.color.primary};
  font-size: 14px;
  font-weight: 500;
`;

const StyledMeta = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: 12px;
`;

const StyledExpandedSection = styled.div`
  border-top: 1px solid ${themeCssVariables.border.color.light};
`;

const formatRelativeTime = (dateString?: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSec < 60) return `${diffSec < 0 ? 0 : diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

const IntentBadge = ({ intent }: { intent?: string }) => {
  if (!intent) return null;
  return <Tag color="blue" text={intent} />;
};

export const VoiceJourneyCard = ({ voiceJourney }: VoiceJourneyCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    setIsExpanded((prev) => !prev);
  };

  const segments = (
    Array.isArray(voiceJourney.transcriptRaw) ? voiceJourney.transcriptRaw : []
  ) as TranscriptSegment[];

  return (
    <Card>
      <StyledCardContent>
        <StyledHeader onClick={toggleExpand}>
          <StyledHeaderLeft>
            {voiceJourney.direction === 'INBOUND' ? (
              <IconArrowDown size={20} />
            ) : (
              <IconArrowUp size={20} />
            )}
            <StyledContactInfo>
              <StyledPhone>{voiceJourney.fromNumber}</StyledPhone>
              <StyledMeta>
                {formatRelativeTime(voiceJourney.createdAt)} •{' '}
                {voiceJourney.durationSeconds ?? 0}s
              </StyledMeta>
            </StyledContactInfo>
          </StyledHeaderLeft>

          <StyledHeaderRight>
            <SentimentChip score={voiceJourney.sentimentScore} />
            <IntentBadge intent={voiceJourney.intentDetected} />
            {isExpanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
          </StyledHeaderRight>
        </StyledHeader>

        {isExpanded && (
          <StyledExpandedSection>
            <TranscriptViewer
              sentimentScore={voiceJourney.sentimentScore}
              recordingUrl={voiceJourney.recordingUrl}
              summary={voiceJourney.transcriptSummary}
              nextAction={voiceJourney.nextAction}
              segments={segments}
            />
          </StyledExpandedSection>
        )}
      </StyledCardContent>
    </Card>
  );
};
