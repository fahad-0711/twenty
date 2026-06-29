// packages/twenty-server/src/modules/real-estate-project/real-estate-project.entity.ts
//
// A real estate development project (e.g., "Prestige Lakeside" by Prestige Group).
// Projects contain multiple ProjectUnits and are linked to a developer Company.

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

export enum ProjectType {
  APARTMENT = 'APARTMENT',
  VILLA = 'VILLA',
  PLOT = 'PLOT',
  COMMERCIAL = 'COMMERCIAL',
}

export enum ProjectStatus {
  UNDER_CONSTRUCTION = 'UNDER_CONSTRUCTION',
  READY_TO_MOVE = 'READY_TO_MOVE',
  UPCOMING = 'UPCOMING',
}

// --- Entity ---

@Entity('calllive_real_estate_project')
@Index('IDX_CALLLIVE_PROJECT_CITY', ['city'])
@Index('IDX_CALLLIVE_PROJECT_STATUS', ['status'])
@Index('IDX_CALLLIVE_PROJECT_TYPE', ['projectType'])
@Index('IDX_CALLLIVE_PROJECT_DEVELOPER', ['developerId'])
export class RealEstateProjectEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Project name (e.g. "Prestige Lakeside Habitat")
  @Column({ type: 'varchar', nullable: false })
  name: string;

  // RERA project registration ID (mandatory in India for marketing)
  @Column({ type: 'varchar', nullable: true })
  reraNumber: string | null;

  // Location fields
  @Column({ type: 'varchar', nullable: false })
  city: string;

  @Column({ type: 'varchar', nullable: false })
  locality: string;

  @Column({ type: 'varchar', nullable: true })
  pinCode: string | null;

  // Project classification
  @Column({
    type: 'enum',
    enum: ProjectType,
  })
  projectType: ProjectType;

  // Construction / availability status
  @Column({
    type: 'enum',
    enum: ProjectStatus,
  })
  status: ProjectStatus;

  // Pricing
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  pricePerSqft: number | null;

  // Price range in INR
  @Column({ type: 'bigint', nullable: true })
  minPrice: number | null;

  @Column({ type: 'bigint', nullable: true })
  maxPrice: number | null;

  // Unit inventory
  @Column({ type: 'int', nullable: true })
  totalUnits: number | null;

  @Column({ type: 'int', nullable: true })
  availableUnits: number | null;

  // Marketing material
  @Column({ type: 'varchar', nullable: true })
  brochureUrl: string | null;

  // List of amenities (e.g. ["Swimming Pool", "Gym", "Club House"])
  @Column({ type: 'jsonb', nullable: true })
  amenities: string[] | null;

  // Expected or actual possession date
  @Column({ type: 'timestamptz', nullable: true })
  possessionDate: Date | null;

  // ========================
  // CRM Relations
  // Plain UUID column — NO @ManyToOne decorator.
  // Links to existing Twenty Company (developer/builder).
  // ========================
  @Column({ type: 'uuid', nullable: true })
  developerId: string | null;

  // ========================
  // Standard Timestamps
  // ========================

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  // Soft delete — never hard-delete project records
  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;
}
