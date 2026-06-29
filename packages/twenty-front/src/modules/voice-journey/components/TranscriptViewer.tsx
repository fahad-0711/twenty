import { styled } from '@linaria/react';
import React from 'react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

export type TranscriptSegment = {
  speaker: 'AGENT' | 'HUMAN' | string;
  text: string;
  timestamp_ms: number;
  confidence?: number;
};

export type TranscriptViewerProps = {
  sentimentScore?: number | null;
  recordingUrl?: string | null;
  summary?: string | null;
  nextAction?: string | null;
  segments?: TranscriptSegment[] | null;
};

const StyledViewerContainer = styled.div`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[4]};
  max-height: 400px;
  overflow-y: auto;
  padding: ${themeCssVariables.spacing[4]};
  width: 100%;
`;

const StyledSentimentBanner = styled.div<{
  sentimentType: 'positive' | 'negative' | 'neutral' | 'none';
}>`
  align-items: center;
  background: ${({ sentimentType }) => {
    switch (sentimentType) {
      case 'positive':
        return themeCssVariables.tag.background.green;
      case 'negative':
        return themeCssVariables.tag.background.red;
      case 'neutral':
        return themeCssVariables.tag.background.yellow;
      default:
        return themeCssVariables.tag.background.gray;
    }
  }};
  border-radius: 6px;
  color: ${themeCssVariables.font.color.primary};
  display: flex;
  font-weight: 500;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

const StyledSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledSectionTitle = styled.div`
  color: ${themeCssVariables.font.color.secondary};
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
`;

const StyledSectionText = styled.div`
  color: ${themeCssVariables.font.color.primary};
  font-size: 14px;
`;

const StyledAudioContainer = styled.div`
  width: 100%;
  audio {
    width: 100%;
  }
`;

const StyledBubblesContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
`;

const StyledBubbleWrapper = styled.div<{ isAgent: boolean }>`
  align-self: ${({ isAgent }) => (isAgent ? 'flex-start' : 'flex-end')};
  display: flex;
  flex-direction: column;
  max-width: 75%;
`;

const StyledBubbleHeader = styled.div<{ isAgent: boolean }>`
  align-self: ${({ isAgent }) => (isAgent ? 'flex-start' : 'flex-end')};
  color: ${themeCssVariables.font.color.tertiary};
  font-size: 11px;
  margin-bottom: 2px;
`;

const StyledBubble = styled.div<{ isAgent: boolean }>`
  background: ${({ isAgent }) =>
    isAgent
      ? themeCssVariables.background.secondary
      : themeCssVariables.background.transparent.blue};
  border-radius: 12px;
  color: ${themeCssVariables.font.color.primary};
  font-size: 14px;
  line-height: 1.4;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

const formatTimestamp = (timestampMs?: number): string => {
  if (timestampMs === undefined || timestampMs === null || isNaN(Number(timestampMs))) {
    return '00:00';
  }
  const totalSeconds = Math.floor(Number(timestampMs) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return `${mm}:${ss}`;
};

const getSentimentType = (score?: number | null) => {
  if (score === undefined || score === null) return 'none';
  if (score >= 0.3) return 'positive';
  if (score < -0.3) return 'negative';
  return 'neutral';
};

export const TranscriptViewer = ({
  sentimentScore,
  recordingUrl,
  summary,
  nextAction,
  segments,
}: TranscriptViewerProps) => {
  const sentimentType = getSentimentType(sentimentScore);
  const formattedScore =
    sentimentScore !== undefined && sentimentScore !== null
      ? Number(sentimentScore).toFixed(2)
      : 'N/A';

  const transcriptList = Array.isArray(segments) ? segments : [];

  return (
    <StyledViewerContainer>
      <StyledSentimentBanner sentimentType={sentimentType}>
        Sentiment Analysis: {sentimentType.toUpperCase()} ({formattedScore})
      </StyledSentimentBanner>

      {recordingUrl && (
        <StyledAudioContainer>
          <audio controls src={recordingUrl}>
            <track kind="captions" />
            Your browser does not support the audio element.
          </audio>
        </StyledAudioContainer>
      )}

      {summary && (
        <StyledSection>
          <StyledSectionTitle>Summary</StyledSectionTitle>
          <StyledSectionText>{summary}</StyledSectionText>
        </StyledSection>
      )}

      {nextAction && (
        <StyledSection>
          <StyledSectionTitle>Next Action</StyledSectionTitle>
          <StyledSectionText>{nextAction}</StyledSectionText>
        </StyledSection>
      )}

      <StyledSection>
        <StyledSectionTitle>Conversation</StyledSectionTitle>
        <StyledBubblesContainer>
          {transcriptList.length > 0 ? (
            transcriptList.map((segment, index) => {
              const isAgent = segment.speaker === 'AGENT' || segment.speaker === 'agent';
              return (
                <StyledBubbleWrapper key={index} isAgent={isAgent}>
                  <StyledBubbleHeader isAgent={isAgent}>
                    {segment.speaker} • {formatTimestamp(segment.timestamp_ms)}
                  </StyledBubbleHeader>
                  <StyledBubble isAgent={isAgent}>{segment.text}</StyledBubble>
                </StyledBubbleWrapper>
              );
            })
          ) : (
            <StyledSectionText style={{ color: themeCssVariables.font.color.tertiary }}>
              No transcript segments available.
            </StyledSectionText>
          )}
        </StyledBubblesContainer>
      </StyledSection>
    </StyledViewerContainer>
  );
};
