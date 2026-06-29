// packages/twenty-server/src/modules/project-unit/project-unit.entity.ts
//
// An individual unit (flat/villa/plot) within a RealEstateProject.
// Units flow through a kanban: AVAILABLE → BLOCKED → BOOKED → REGISTERED.

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

// Kanban status for the unit booking pipeline
export enum UnitStatus {
  AVAILABLE = 'AVAILABLE',
  BLOCKED = 'BLOCKED',
  BOOKED = 'BOOKED',
  REGISTERED = 'REGISTERED',
}

// --- Entity ---

@Entity('calllive_project_unit')
@Index('IDX_CALLLIVE_UNIT_PROJECT', ['relatedProjectId'])
@Index('IDX_CALLLIVE_UNIT_STATUS', ['status'])
@Index('IDX_CALLLIVE_UNIT_BOOKED_BY', ['bookedByContactId'])
export class ProjectUnitEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Unit identifier within the project (e.g. "A-1204")
  @Column({ type: 'varchar', nullable: false })
  unitNumber: string;

  // Physical location within the building
  @Column({ type: 'int', nullable: true })
  floorNumber: number | null;

  // Tower or block name (e.g. "Tower A")
  @Column({ type: 'varchar', nullable: true })
  tower: string | null;

  // Area measurements in square feet
  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: false })
  carpetAreaSqft: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  builtupAreaSqft: number | null;

  // Room configuration
  @Column({ type: 'int', nullable: true })
  bedrooms: number | null;

  @Column({ type: 'int', nullable: true })
  bathrooms: number | null;

  // Booking pipeline status
  @Column({
    type: 'enum',
    enum: UnitStatus,
    default: UnitStatus.AVAILABLE,
  })
  status: UnitStatus;

  // Total price in INR paise (bigint to avoid floating point issues)
  @Column({ type: 'bigint', nullable: false })
  priceTotal: number;

  // Direction the unit faces (e.g. "North-East")
  @Column({ type: 'varchar', nullable: true })
  facing: string | null;

  // ========================
  // CRM Relations
  // Plain UUID columns — NO @ManyToOne decorators.
  // ========================

  // Which project this unit belongs to — NOT NULL (every unit must have a project)
  @Column({ type: 'uuid', nullable: false })
  relatedProjectId: string;

  // Person who booked this unit — null until status reaches BOOKED
  @Column({ type: 'uuid', nullable: true })
  bookedByContactId: string | null;

  // ========================
  // Standard Timestamps
  // ========================

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  // Soft delete — never hard-delete unit records
  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;
}
