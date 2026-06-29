// packages/twenty-server/src/modules/voice-journey/voice-journey.entity.ts
//
// Core entity for CallLive AI CRM. Every AI call handled by CallLive.ai
// creates one VoiceJourney record. This is the primary data model that
// makes this a voice-first CRM.
//
// Lifecycle: INITIATED → IN_PROGRESS → COMPLETED → (transcript_raw populated)
//            → (AI analysis fields populated) → (auto-task created)
//            INITIATED → FAILED | NO_ANSWER
//
// See ARCHITECTURE.md Section 4 for the complete state machine.

import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// --- Enums ---

export enum CallDirection {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
}

// Status follows the lifecycle state machine in ARCHITECTURE.md Section 4.
// Valid transitions:
//   INITIATED → IN_PROGRESS → COMPLETED
//   INITIATED → FAILED
//   INITIATED → NO_ANSWER
export enum CallStatus {
  INITIATED = 'INITIATED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  NO_ANSWER = 'NO_ANSWER',
}

// Intent detected by the AI analysis pipeline (sentiment.analyzed event).
// Drives auto-task creation rules defined in SPEC.md Section 4.5.
export enum CallIntent {
  INQUIRY = 'INQUIRY',
  SITE_VISIT_REQUEST = 'SITE_VISIT_REQUEST',
  BOOKING_INTENT = 'BOOKING_INTENT',
  COMPLAINT = 'COMPLAINT',
  FOLLOW_UP = 'FOLLOW_UP',
  NOT_INTERESTED = 'NOT_INTERESTED',
  CALLBACK_REQUEST = 'CALLBACK_REQUEST',
}

// --- Supporting Types ---

// Shape of each segment in the transcript_raw JSONB column
export interface TranscriptSegment {
  speaker: 'AGENT' | 'HUMAN';
  text: string;
  timestamp_ms: number;
  confidence: number;
}

// Shape of the key_entities_extracted JSONB column
export interface KeyEntitiesExtracted {
  budget_min?: number;
  budget_max?: number;
  preferred_location?: string;
  preferred_bhk?: string;
  timeline?: string;
  mentioned_projects?: string[];
  objections?: string[];
}

// --- Entity ---

@Entity('calllive_voice_journey')
@Index('IDX_CALLLIVE_VOICE_JOURNEY_CALL_ID', ['callId'], { unique: true })
@Index('IDX_CALLLIVE_VOICE_JOURNEY_STATUS', ['status'])
@Index('IDX_CALLLIVE_VOICE_JOURNEY_DIRECTION', ['direction'])
@Index('IDX_CALLLIVE_VOICE_JOURNEY_RELATED_CONTACT', ['relatedContactId'])
@Index('IDX_CALLLIVE_VOICE_JOURNEY_FROM_NUMBER', ['fromNumber'])
export class VoiceJourneyEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ========================
  // Call Identifiers
  // ========================

  // CallLive.ai's unique call ID — one VoiceJourney per call
  @Column({ type: 'varchar', unique: true, nullable: false })
  callId: string;

  // Which AI agent handled the call (from CallLive.ai)
  @Column({ type: 'varchar', nullable: true })
  agentId: string | null;

  // ========================
  // Call Metadata
  // ========================

  @Column({
    type: 'enum',
    enum: CallDirection,
  })
  direction: CallDirection;

  // See ARCHITECTURE.md Section 4 for valid state transitions
  @Column({
    type: 'enum',
    enum: CallStatus,
    default: CallStatus.INITIATED,
  })
  status: CallStatus;

  // Phone numbers in E.164 format (e.g. "+919876543210")
  @Column({ type: 'varchar', nullable: false })
  fromNumber: string;

  @Column({ type: 'varchar', nullable: false })
  toNumber: string;

  // Call duration in seconds — 0 until call completes
  @Column({ type: 'int', default: 0 })
  durationSeconds: number;

  // URL to the call recording (populated by call.completed event)
  @Column({ type: 'varchar', nullable: true })
  recordingUrl: string | null;

  // When the call started (from CallLive.ai timestamp)
  @Column({ type: 'timestamptz', nullable: false })
  startedAt: Date;

  // When the call ended — null while call is in progress
  @Column({ type: 'timestamptz', nullable: true })
  endedAt: Date | null;

  // ========================
  // AI Analysis Fields
  // (populated asynchronously by transcript.ready and sentiment.analyzed events)
  // ========================

  // Sentiment score from -1.000 (negative) to 1.000 (positive)
  @Column({ type: 'decimal', precision: 4, scale: 3, nullable: true })
  sentimentScore: number | null;

  // Primary intent detected by the AI analysis pipeline
  @Column({
    type: 'enum',
    enum: CallIntent,
    nullable: true,
  })
  intentDetected: CallIntent | null;

  // AI-generated summary of the call transcript
  @Column({ type: 'text', nullable: true })
  transcriptSummary: string | null;

  // AI-suggested next step (e.g. "Schedule site visit for Prestige Lakeside")
  @Column({ type: 'text', nullable: true })
  nextAction: string | null;

  // Structured entities extracted by AI from the transcript
  @Column({ type: 'jsonb', nullable: true })
  keyEntitiesExtracted: KeyEntitiesExtracted | null;

  // ========================
  // Raw Data
  // ========================

  // Complete call transcript as array of speaker segments
  // Populated by transcript.ready webhook event
  @Column({ type: 'jsonb', nullable: true })
  transcriptRaw: TranscriptSegment[] | null;

  // ========================
  // AI Agent Performance
  // ========================

  // AI agent performance score from 0.000 to 1.000, scored by LLM
  @Column({ type: 'decimal', precision: 4, scale: 3, nullable: true })
  agentPerformanceScore: number | null;

  // ========================
  // CRM Relations
  // Plain UUID columns — NO @ManyToOne decorators.
  // Per ARCHITECTURE.md 3.2: FK columns are plain UUIDs to avoid
  // circular dependencies with Twenty's workspace entities.
  // ========================

  // Person record linked to this call (matched by phone number)
  @Column({ type: 'uuid', nullable: true })
  relatedContactId: string | null;

  // Opportunity/deal linked to this call
  @Column({ type: 'uuid', nullable: true })
  relatedOpportunityId: string | null;

  // RealEstateProject discussed in this call
  @Column({ type: 'uuid', nullable: true })
  relatedProjectId: string | null;

  // ========================
  // Review Tracking
  // ========================

  // Whether a human has reviewed this call record
  @Column({ type: 'boolean', default: false })
  isReviewed: boolean;

  // User ID of the reviewer (workspace member)
  @Column({ type: 'varchar', nullable: true })
  reviewedBy: string | null;

  // When the review was completed
  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  // ========================
  // Standard Timestamps
  // ========================

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  // Soft delete — never hard-delete call records
  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;
}
