# SPEC.md — CallLive AI CRM
## Product Requirements Document (PRD)
### For AI Coding Agent Consumption

---

## 1. PRODUCT OVERVIEW

**Product Name**: CallLive AI CRM
**Base Codebase**: Twenty CRM (open-source fork)
**Company**: CallLive AI (calllive.ai)
**Target Market**: Indian real estate — channel partners, developers, brokers
**Core Differentiator**: A voice-first CRM where every lead record is enriched with
AI call transcripts, sentiment scores, and next-action recommendations from
CallLive.ai's voice agent platform.

### Problem Statement
Existing CRMs (Salesforce, HubSpot, even Twenty) treat calls as a secondary
log entry. For CallLive AI's clients, the voice call IS the primary touchpoint —
every lead's entire journey may be conducted through AI voice agents. The CRM must
reflect this reality: call data should be first-class, not an afterthought.

### Success Criteria
- [ ] A salesperson can open any lead and see their complete voice journey timeline
- [ ] Every inbound/outbound CallLive.ai call auto-creates or updates a CRM record
- [ ] AI-generated transcript summaries, sentiment scores, and next actions are visible per call
- [ ] Channel partners can be tracked with commission pipeline views
- [ ] Real estate projects, units, and site visits are natively modeled
- [ ] Webhook events from CallLive.ai are ingested within 3 seconds

---

## 2. EXISTING TWENTY CRM OBJECTS (DO NOT RECREATE)

These already exist in Twenty. Extend with metadata fields, don't replace:

| Twenty Object | Maps To | Extension Needed |
|---------------|---------|-----------------|
| `Company` | Developer / Builder company | Add: `gst_number`, `rera_number`, `company_type` (DEVELOPER \| CHANNEL_PARTNER \| BROKERAGE) |
| `Person` | Individual lead / contact / broker | Add: `pan_number`, `role` (LEAD \| BROKER \| AGENT), `source_channel` |
| `Opportunity` | Deal / unit booking pipeline | Add: `unit_id`, `booking_amount`, `property_stage` |
| `Task` | Follow-up actions | Unchanged — AI will auto-create tasks via webhook |
| `Note` | Call notes | Unchanged — AI summaries stored here linked to VoiceJourney |

---

## 3. NEW ENTITIES TO CREATE

### 3.1 Entity: `RealEstateProject`

A real estate development project (e.g., "Prestige Lakeside" by Prestige Group).

```typescript
// TypeORM Entity Definition
@Entity('real_estate_project')
export class RealEstateProject {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column() name: string;                          // "Prestige Lakeside Habitat"
  @Column({ nullable: true }) rera_number: string; // RERA project registration ID
  @Column() city: string;
  @Column() locality: string;
  @Column({ nullable: true }) pin_code: string;
  @Column({ type: 'enum', enum: ProjectType })
  project_type: ProjectType;                       // APARTMENT | VILLA | PLOT | COMMERCIAL
  @Column({ type: 'enum', enum: ProjectStatus })
  status: ProjectStatus;                           // UNDER_CONSTRUCTION | READY_TO_MOVE | UPCOMING
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price_per_sqft: number;
  @Column({ nullable: true }) min_price: number;   // In INR
  @Column({ nullable: true }) max_price: number;
  @Column({ nullable: true }) total_units: number;
  @Column({ nullable: true }) available_units: number;
  @Column({ nullable: true }) brochure_url: string;
  @Column({ type: 'jsonb', nullable: true }) amenities: string[];
  @Column({ nullable: true }) possession_date: Date;

  // Relations
  @ManyToOne(() => Company) developer: Company;    // Links to existing Twenty Company
  @OneToMany(() => ProjectUnit, u => u.project) units: ProjectUnit[];
  @OneToMany(() => VoiceJourney, v => v.related_project) voice_journeys: VoiceJourney[];

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
  @DeleteDateColumn() deletedAt: Date;
}

enum ProjectType { APARTMENT = 'APARTMENT', VILLA = 'VILLA', PLOT = 'PLOT', COMMERCIAL = 'COMMERCIAL' }
enum ProjectStatus { UNDER_CONSTRUCTION = 'UNDER_CONSTRUCTION', READY_TO_MOVE = 'READY_TO_MOVE', UPCOMING = 'UPCOMING' }
```

### 3.2 Entity: `ProjectUnit`

An individual unit (flat/villa/plot) within a project.

```typescript
@Entity('project_unit')
export class ProjectUnit {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column() unit_number: string;               // "A-1204"
  @Column({ nullable: true }) floor_number: number;
  @Column({ nullable: true }) tower: string;   // "Tower A"
  @Column({ type: 'decimal', precision: 8, scale: 2 }) carpet_area_sqft: number;
  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true }) builtup_area_sqft: number;
  @Column({ nullable: true }) bedrooms: number;
  @Column({ nullable: true }) bathrooms: number;
  @Column({ type: 'enum', enum: UnitStatus }) status: UnitStatus;
  @Column({ type: 'bigint' }) price_total: number; // In INR paise (avoid floating point)
  @Column({ nullable: true }) facing: string;  // "North-East"

  @ManyToOne(() => RealEstateProject, p => p.units) project: RealEstateProject;
  @ManyToOne(() => Person, { nullable: true }) booked_by: Person; // Null until booked
  @OneToMany(() => SiteVisit, sv => sv.unit) site_visits: SiteVisit[];

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
  @DeleteDateColumn() deletedAt: Date;
}

enum UnitStatus { AVAILABLE = 'AVAILABLE', BLOCKED = 'BLOCKED', BOOKED = 'BOOKED', REGISTERED = 'REGISTERED' }
```

### 3.3 Entity: `SiteVisit`

Scheduled or completed property site visits.

```typescript
@Entity('site_visit')
export class SiteVisit {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ type: 'enum', enum: SiteVisitStatus }) status: SiteVisitStatus;
  @Column() scheduled_at: Date;
  @Column({ nullable: true }) completed_at: Date;
  @Column({ nullable: true }) notes: string;
  @Column({ nullable: true }) outcome: string;  // AI-generated or manual
  @Column({ type: 'boolean', default: false }) attended: boolean;

  @ManyToOne(() => Person) lead: Person;
  @ManyToOne(() => RealEstateProject) project: RealEstateProject;
  @ManyToOne(() => ProjectUnit, { nullable: true }) unit: ProjectUnit;
  @ManyToOne(() => Person, { nullable: true }) accompanied_by: Person; // Channel partner agent

  // Which VoiceJourney led to this site visit being scheduled?
  @ManyToOne(() => VoiceJourney, { nullable: true }) scheduled_from_call: VoiceJourney;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
  @DeleteDateColumn() deletedAt: Date;
}

enum SiteVisitStatus { SCHEDULED = 'SCHEDULED', COMPLETED = 'COMPLETED', CANCELLED = 'CANCELLED', NO_SHOW = 'NO_SHOW' }
```

### 3.4 Entity: `VoiceJourney` ⭐ CORE ENTITY

This is the most critical new entity. Every AI call handled by CallLive.ai creates
one VoiceJourney record. This is what makes this a voice-first CRM.

```typescript
@Entity('voice_journey')
export class VoiceJourney {
  @PrimaryGeneratedColumn('uuid') id: string;

  // --- Call Identifiers ---
  @Column({ unique: true }) call_id: string;     // CallLive.ai's unique call ID
  @Column({ nullable: true }) agent_id: string;  // Which AI agent handled the call

  // --- Call Metadata ---
  @Column({ type: 'enum', enum: CallDirection }) direction: CallDirection;
  @Column({ type: 'enum', enum: CallStatus }) status: CallStatus;
  @Column() from_number: string;                 // E.164 format e.g. "+919876543210"
  @Column() to_number: string;
  @Column({ type: 'int', default: 0 }) duration_seconds: number;
  @Column({ nullable: true }) recording_url: string;
  @Column() started_at: Date;
  @Column({ nullable: true }) ended_at: Date;

  // --- AI Analysis (populated after call ends) ---
  @Column({ type: 'decimal', precision: 4, scale: 3, nullable: true })
  sentiment_score: number;                       // -1.000 to 1.000
  @Column({ type: 'enum', enum: CallIntent, nullable: true }) intent_detected: CallIntent;
  @Column({ type: 'text', nullable: true }) transcript_summary: string; // AI-generated summary
  @Column({ type: 'text', nullable: true }) next_action: string;       // AI-suggested next step
  @Column({ type: 'jsonb', nullable: true }) key_entities_extracted: {
    budget_min?: number;
    budget_max?: number;
    preferred_location?: string;
    preferred_bhk?: string;
    timeline?: string;
    mentioned_projects?: string[];
    objections?: string[];
  };

  // --- Raw Data ---
  @Column({ type: 'jsonb', nullable: true }) transcript_raw: TranscriptSegment[];

  // --- AI Agent Performance ---
  @Column({ type: 'decimal', precision: 4, scale: 3, nullable: true })
  agent_performance_score: number;               // 0.000 to 1.000, scored by LLM

  // --- CRM Relations ---
  @ManyToOne(() => Person, { nullable: true }) related_contact: Person;
  @ManyToOne(() => Opportunity, { nullable: true }) related_opportunity: Opportunity;
  @ManyToOne(() => RealEstateProject, { nullable: true }) related_project: RealEstateProject;

  // --- Status Tracking ---
  @Column({ type: 'boolean', default: false }) is_reviewed: boolean;
  @Column({ nullable: true }) reviewed_by: string;  // User ID who reviewed
  @Column({ nullable: true }) reviewed_at: Date;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
  @DeleteDateColumn() deletedAt: Date;
}

// Supporting types
interface TranscriptSegment {
  speaker: 'AGENT' | 'HUMAN';
  text: string;
  timestamp_ms: number;
  confidence: number;
}

enum CallDirection { INBOUND = 'INBOUND', OUTBOUND = 'OUTBOUND' }
enum CallStatus {
  INITIATED = 'INITIATED', IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED', FAILED = 'FAILED', NO_ANSWER = 'NO_ANSWER'
}
enum CallIntent {
  INQUIRY = 'INQUIRY', SITE_VISIT_REQUEST = 'SITE_VISIT_REQUEST',
  BOOKING_INTENT = 'BOOKING_INTENT', COMPLAINT = 'COMPLAINT',
  FOLLOW_UP = 'FOLLOW_UP', NOT_INTERESTED = 'NOT_INTERESTED',
  CALLBACK_REQUEST = 'CALLBACK_REQUEST'
}
```

### 3.5 Entity: `WebhookEvent`

Raw webhook ingestion log. Write-once, used for idempotency and debugging.

```typescript
@Entity('webhook_event')
export class WebhookEvent {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ unique: true }) event_id: string;    // From CallLive.ai — idempotency key
  @Column() event_type: string;
  @Column({ type: 'jsonb' }) raw_payload: object;
  @Column({ type: 'enum', enum: WebhookEventStatus })
  processing_status: WebhookEventStatus;
  @Column({ nullable: true }) error_message: string;
  @Column({ nullable: true }) processed_at: Date;
  @Column({ nullable: true }) related_voice_journey_id: string;
  @Column() received_at: Date;

  @CreateDateColumn() createdAt: Date;
}

enum WebhookEventStatus { RECEIVED = 'RECEIVED', PROCESSING = 'PROCESSING', PROCESSED = 'PROCESSED', FAILED = 'FAILED' }
```

---

## 4. WEBHOOK INTEGRATION SPECIFICATION

### 4.1 Endpoint
```
POST /api/webhooks/calllive/events
Headers:
  Content-Type: application/json
  X-CallLive-Signature: sha256=<hmac_signature>
  X-CallLive-Event-ID: <uuid>
```

### 4.2 Supported Event Types
| Event Type | Trigger | CRM Action |
|------------|---------|------------|
| `call.initiated` | Call starts | Create `VoiceJourney` with INITIATED status, attempt to match contact by phone number |
| `call.in_progress` | Call connects | Update `VoiceJourney` status to IN_PROGRESS |
| `call.completed` | Call ends | Update status, store duration, recording URL |
| `call.failed` | Call error | Update status, log failure reason |
| `call.no_answer` | No pickup | Update status, auto-create follow-up Task |
| `transcript.ready` | Transcript generated | Store `transcript_raw`, trigger AI analysis job |
| `sentiment.analyzed` | AI finishes analysis | Store `sentiment_score`, `intent_detected`, `next_action`, `key_entities_extracted`, auto-create next Task |

### 4.3 Processing Flow
```
HTTP POST → HMAC Verify → Store WebhookEvent → Return 200 → BullMQ Job → Process → Update VoiceJourney
```

### 4.4 Contact Matching Logic
When a call arrives with `from_number` (inbound) or `to_number` (outbound):
1. Search `Person` by exact phone match
2. If found → link `VoiceJourney.related_contact`
3. If not found → create new `Person` with `source_channel: 'VOICE_INBOUND'` or `'VOICE_OUTBOUND'`

### 4.5 Auto-Task Creation Rules
| Intent Detected | Auto Task Created |
|-----------------|-------------------|
| `SITE_VISIT_REQUEST` | "Schedule site visit for [lead name] — interested in [project]" — Due: 2 hours |
| `CALLBACK_REQUEST` | "Callback requested by [lead name]" — Due: 30 minutes |
| `BOOKING_INTENT` | "High-intent lead: [name] wants to book — follow up ASAP" — Due: 1 hour |
| `NOT_INTERESTED` | "Mark lead as cold — [reason from transcript]" — Due: 24 hours |

---

## 5. FRONTEND UI REQUIREMENTS

### 5.1 Voice Journey Timeline (on Person record)
- A new tab "Voice History" on every Person/Contact record
- Shows chronological list of all VoiceJourney records for that contact
- Each entry shows: direction icon, timestamp, duration, status badge, sentiment chip (colored), intent badge
- Click to expand: shows full AI summary, key entities extracted, next action, and transcript viewer

### 5.2 Transcript Viewer Component
- Conversation-style UI (like WhatsApp) — AI agent on left, human on right
- Each segment shows speaker label + timestamp
- Sentiment highlighted at call-level (banner color: green/yellow/red)
- "Play Recording" button if `recording_url` present

### 5.3 Real Estate Project Pages
- Project list view with filter by city, status, type
- Project detail: all units in a kanban (Available → Blocked → Booked → Registered)
- Unit detail: all site visits + voice journeys linked to this unit

### 5.4 Dashboard KPIs
- Calls today / this week (inbound vs outbound)
- Average sentiment score (rolling 7 days)
- Top intents breakdown (pie chart)
- Site visits scheduled from calls
- Leads created from voice (auto-matched vs new)

---

## 6. OUT OF SCOPE (Phase 1)

These are explicitly deferred and must NOT be built prematurely:
- ❌ Dialing out directly from CRM UI (Phase 3+)
- ❌ Real-time live call monitoring
- ❌ Commission calculation for channel partners
- ❌ Multi-language transcript display (transcripts are stored as-is)
- ❌ Mobile app
- ❌ WhatsApp integration
