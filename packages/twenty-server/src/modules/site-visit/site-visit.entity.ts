// packages/twenty-server/src/modules/site-visit/site-visit.entity.ts
//
// Scheduled or completed property site visits.

import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum SiteVisitStatus {
  SCHEDULED = 'SCHEDULED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

@Entity('calllive_site_visit')
@Index('IDX_CALLLIVE_SITE_VISIT_LEAD', ['leadId'])
@Index('IDX_CALLLIVE_SITE_VISIT_PROJECT', ['projectId'])
export class SiteVisitEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: SiteVisitStatus,
  })
  status: SiteVisitStatus;

  @Column({ type: 'timestamptz', nullable: false })
  scheduledAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'text', nullable: true })
  outcome: string | null;

  @Column({ type: 'boolean', default: false })
  attended: boolean;

  // ========================
  // CRM Relations
  // Plain UUID columns — NO @ManyToOne decorators.
  // ========================

  @Column({ type: 'uuid', nullable: false })
  leadId: string;

  @Column({ type: 'uuid', nullable: false })
  projectId: string;

  @Column({ type: 'uuid', nullable: true })
  unitId: string | null;

  @Column({ type: 'uuid', nullable: true })
  accompaniedById: string | null;

  @Column({ type: 'uuid', nullable: true })
  scheduledFromCallId: string | null;

  // ========================
  // Standard Timestamps
  // ========================

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;
}
