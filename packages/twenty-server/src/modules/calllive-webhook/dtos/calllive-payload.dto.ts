// packages/twenty-server/src/modules/calllive-webhook/dtos/calllive-payload.dto.ts
import { z } from 'zod';

export const callLivePayloadSchema = z.object({
  event_id: z.string().uuid(),
  event_type: z.enum([
    'call.initiated',
    'call.in_progress',
    'call.completed',
    'call.failed',
    'call.no_answer',
    'transcript.ready',
    'sentiment.analyzed',
  ]),
  call_id: z.string(),
  agent_id: z.string().optional(),
  from_number: z.string().optional(),
  to_number: z.string().optional(),
  duration_seconds: z.number().int().optional(),
  recording_url: z.string().url().optional(),
  started_at: z.string().datetime().optional(),
  ended_at: z.string().datetime().optional(),
  sentiment_score: z.number().min(-1).max(1).optional(),
  intent_detected: z
    .enum([
      'INQUIRY',
      'SITE_VISIT_REQUEST',
      'BOOKING_INTENT',
      'COMPLAINT',
      'FOLLOW_UP',
      'NOT_INTERESTED',
      'CALLBACK_REQUEST',
    ])
    .optional(),
  transcript_summary: z.string().optional(),
  next_action: z.string().optional(),
  key_entities_extracted: z.record(z.any()).optional(),
  transcript_raw: z
    .array(
      z.object({
        speaker: z.enum(['AGENT', 'HUMAN']),
        text: z.string(),
        timestamp_ms: z.number(),
        confidence: z.number(),
      }),
    )
    .optional(),
  error_message: z.string().optional(),
  received_at: z.string().datetime().optional(),
});

export type CallLivePayload = z.infer<typeof callLivePayloadSchema>;
