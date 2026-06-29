// packages/twenty-server/src/modules/voice-journey/voice-journey.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  UpdateVoiceJourneyInput,
  VoiceJourneyFilterInput,
  VoiceJourneyStatsDTO,
  VoiceJourneyStatsInput,
} from './dtos/voice-journey-input.dto';
import {
  VoiceJourneyConnectionDTO,
  VoiceJourneyDTO,
} from './dtos/voice-journey.dto';

@Injectable()
export class VoiceJourneyService {
  constructor(private readonly dataSource: DataSource) {}

  private async getSchemaName(): Promise<string> {
    const schemas = await this.dataSource.query(
      `SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'workspace_%' LIMIT 1`,
    );
    if (schemas.length === 0) {
      throw new Error('No workspace schema found');
    }
    return schemas[0].schema_name;
  }

  async findAll(
    filter: VoiceJourneyFilterInput,
    limit = 20,
    cursor?: string,
  ): Promise<VoiceJourneyConnectionDTO> {
    const schema = await this.getSchemaName();
    let query = `SELECT * FROM "${schema}"."calllive_voice_journey" WHERE "deletedAt" IS NULL`;
    const params: any[] = [];
    let paramIndex = 1;

    if (filter.contactId) {
      query += ` AND "relatedContactId" = $${paramIndex++}`;
      params.push(filter.contactId);
    }
    if (filter.projectId) {
      query += ` AND "relatedProjectId" = $${paramIndex++}`;
      params.push(filter.projectId);
    }
    if (filter.status) {
      query += ` AND "status" = $${paramIndex++}`;
      params.push(filter.status);
    }
    if (filter.dateRange) {
      query += ` AND "createdAt" >= $${paramIndex++} AND "createdAt" <= $${paramIndex++}`;
      params.push(filter.dateRange.start, filter.dateRange.end);
    }

    if (cursor) {
      query += ` AND "id" < $${paramIndex++}`;
      params.push(cursor);
    }

    // Total count
    const countQuery = `SELECT COUNT(*) as count FROM (${query}) t`;
    const countResult = await this.dataSource.query(countQuery, params);
    const totalCount = parseInt(countResult[0].count, 10);

    // Pagination
    query += ` ORDER BY "createdAt" DESC LIMIT $${paramIndex++}`;
    params.push(limit);

    const rows = await this.dataSource.query(query, params);

    const edges = rows.map((row: any) => ({
      node: this.mapRowToDTO(row),
      cursor: row.id,
    }));

    return {
      edges,
      pageInfo: {
        hasNextPage: rows.length === limit,
        hasPreviousPage: false,
        startCursor: edges[0]?.cursor,
        endCursor: edges[edges.length - 1]?.cursor,
      },
      totalCount,
    };
  }

  async findOneById(id: string): Promise<VoiceJourneyDTO> {
    const schema = await this.getSchemaName();
    const rows = await this.dataSource.query(
      `SELECT * FROM "${schema}"."calllive_voice_journey" WHERE id = $1 AND "deletedAt" IS NULL LIMIT 1`,
      [id],
    );
    if (rows.length === 0) {
      throw new NotFoundException(`VoiceJourney ${id} not found`);
    }
    return this.mapRowToDTO(rows[0]);
  }

  async update(
    id: string,
    input: UpdateVoiceJourneyInput,
    userId?: string,
  ): Promise<VoiceJourneyDTO> {
    const schema = await this.getSchemaName();
    await this.dataSource.query(
      `UPDATE "${schema}"."calllive_voice_journey" SET "isReviewed" = $2, "reviewedBy" = $3, "reviewedAt" = now(), "updatedAt" = now() WHERE id = $1`,
      [id, input.isReviewed, userId || null],
    );
    return this.findOneById(id);
  }

  async getStats(input: VoiceJourneyStatsInput): Promise<VoiceJourneyStatsDTO> {
    const schema = await this.getSchemaName();
    let query = `SELECT COUNT(*) as count, AVG("durationSeconds") as avg_dur, AVG("sentimentScore") as avg_sent FROM "${schema}"."calllive_voice_journey" WHERE "deletedAt" IS NULL`;
    const params: any[] = [];
    let paramIndex = 1;

    if (input.projectId) {
      query += ` AND "relatedProjectId" = $${paramIndex++}`;
      params.push(input.projectId);
    }
    if (input.dateRange) {
      query += ` AND "createdAt" >= $${paramIndex++} AND "createdAt" <= $${paramIndex++}`;
      params.push(input.dateRange.start, input.dateRange.end);
    }

    const res = await this.dataSource.query(query, params);
    const row = res[0] || {};
    return {
      totalCalls: parseInt(row.count || '0', 10),
      averageDurationSeconds: parseFloat(row.avg_dur || '0'),
      averageSentiment:
        row.avg_sent != null ? parseFloat(row.avg_sent) : undefined,
    };
  }

  private mapRowToDTO(row: any): VoiceJourneyDTO {
    return {
      id: row.id,
      callId: row.callId,
      agentId: row.agentId,
      direction: row.direction,
      status: row.status,
      fromNumber: row.fromNumber,
      toNumber: row.toNumber,
      durationSeconds: row.durationSeconds,
      recordingUrl: row.recordingUrl,
      startedAt: new Date(row.startedAt),
      endedAt: row.endedAt ? new Date(row.endedAt) : undefined,
      sentimentScore:
        row.sentimentScore != null ? parseFloat(row.sentimentScore) : undefined,
      intentDetected: row.intentDetected,
      transcriptSummary: row.transcriptSummary,
      nextAction: row.nextAction,
      keyEntitiesExtracted: row.keyEntitiesExtracted,
      transcriptRaw: row.transcriptRaw,
      agentPerformanceScore:
        row.agentPerformanceScore != null
          ? parseFloat(row.agentPerformanceScore)
          : undefined,
      relatedContactId: row.relatedContactId,
      relatedOpportunityId: row.relatedOpportunityId,
      relatedProjectId: row.relatedProjectId,
      isReviewed: row.isReviewed,
      reviewedBy: row.reviewedBy,
      reviewedAt: row.reviewedAt ? new Date(row.reviewedAt) : undefined,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      deletedAt: row.deletedAt ? new Date(row.deletedAt) : undefined,
    };
  }
}
