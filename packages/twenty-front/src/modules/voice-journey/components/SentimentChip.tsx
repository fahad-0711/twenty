import React from 'react';
import { Tag, type TagColor } from 'twenty-ui/data-display';

type SentimentChipProps = {
  score?: number | null;
};

export const SentimentChip = ({ score }: SentimentChipProps) => {
  let color: TagColor = 'gray';
  let text = 'N/A';

  if (score !== undefined && score !== null) {
    const formattedScore = Number(score).toFixed(2);
    if (score >= 0.3) {
      color = 'green';
      text = `Positive (${formattedScore})`;
    } else if (score < -0.3) {
      color = 'red';
      text = `Negative (${formattedScore})`;
    } else {
      color = 'yellow';
      text = `Neutral (${formattedScore})`;
    }
  }

  return <Tag color={color} text={text} />;
};
