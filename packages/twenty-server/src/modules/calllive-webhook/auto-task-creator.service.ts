// packages/twenty-server/src/modules/calllive-webhook/auto-task-creator.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { TaskWorkspaceEntity } from 'src/modules/task/standard-objects/task.workspace-entity';

@Injectable()
export class AutoTaskCreatorService {
  private readonly logger = new Logger(AutoTaskCreatorService.name);

  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
  ) {}

  async createAutoTask(
    intent: string,
    leadName: string,
    details: { project?: string; reason?: string },
    workspaceId: string,
  ): Promise<void> {
    let title = '';
    let dueHours = 0;

    switch (intent) {
      case 'SITE_VISIT_REQUEST':
        title = `Schedule site visit for ${leadName} — interested in ${details.project || 'project'}`;
        dueHours = 2;
        break;
      case 'CALLBACK_REQUEST':
        title = `Callback requested by ${leadName}`;
        dueHours = 0.5;
        break;
      case 'BOOKING_INTENT':
        title = `High-intent lead: ${leadName} wants to book — follow up ASAP`;
        dueHours = 1;
        break;
      case 'NOT_INTERESTED':
        title = `Mark lead as cold — ${details.reason || 'reason from transcript'}`;
        dueHours = 24;
        break;
      default:
        return;
    }

    const dueAt = new Date(Date.now() + dueHours * 60 * 60 * 1000);

    this.logger.log(`Creating auto-task for intent ${intent}: "${title}"`);

    await this.globalWorkspaceOrmManager.executeInWorkspaceContext(async () => {
      const taskRepository = await this.globalWorkspaceOrmManager.getRepository(
        workspaceId,
        TaskWorkspaceEntity,
        { shouldBypassPermissionChecks: true },
      );
      await taskRepository.insert({
        title,
        dueAt,
        status: 'TODO',
      });
    });
  }
}
