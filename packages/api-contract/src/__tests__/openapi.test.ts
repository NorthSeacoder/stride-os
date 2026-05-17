import { describe, expect, it } from 'vitest';
import { v1Spec } from '../v1/openapi';

describe('v1 openapi contract', () => {
  it('includes core task automation endpoints', () => {
    expect(v1Spec.paths['/tasks']?.get.operationId).toBe('listTasks');
    expect(v1Spec.paths['/tasks']?.post.operationId).toBe('createTask');
    expect(v1Spec.paths['/tasks/{id}']?.get.operationId).toBe('getTask');
    expect(v1Spec.paths['/tasks/{id}']?.patch.operationId).toBe('updateTask');
    expect(v1Spec.paths['/tasks/{id}/complete']?.post.operationId).toBe('completeTask');
    expect(v1Spec.paths['/tasks/{id}/restore']?.post.operationId).toBe('restoreTask');
    expect(v1Spec.paths['/tasks/{id}/archive']?.post.operationId).toBe('archiveTask');
    expect(v1Spec.paths['/tasks/{id}/quadrant']?.post.operationId).toBe('moveTaskQuadrant');
    expect(v1Spec.paths['/tasks/definitions']?.get.operationId).toBe('listTaskDefinitions');
    expect(v1Spec.paths['/tasks/definitions']?.post.operationId).toBe('createTaskDefinition');
    expect(v1Spec.paths['/tasks/definitions/{id}']?.get.operationId).toBe('getTaskDefinition');
    expect(v1Spec.paths['/tasks/definitions/{id}']?.patch.operationId).toBe('updateTaskDefinition');
    expect(v1Spec.paths['/tasks/definitions/{id}/archive']?.post.operationId).toBe('archiveTaskDefinition');
    expect(v1Spec.paths['/tasks/definitions/{id}/restore']?.post.operationId).toBe('restoreTaskDefinition');
    expect(v1Spec.paths['/tasks/reminders']?.get.operationId).toBe('listTaskReminderCandidates');
    expect(v1Spec.components.schemas.TaskWriteRequest).toBeTruthy();
    expect(v1Spec.components.schemas.TaskDefinitionWriteRequest).toBeTruthy();
    expect(v1Spec.components.schemas.TaskDefinitionOccurrenceItem).toBeTruthy();
  });

  it('includes core okr automation endpoints', () => {
    expect(v1Spec.paths['/okr/current']).toBeTruthy();
    expect(v1Spec.paths['/okr/periods']?.get.operationId).toBe('listOkrPeriods');
    expect(v1Spec.paths['/okr/periods']?.post.operationId).toBe('createOkrPeriod');
    expect(v1Spec.paths['/okr/periods/{id}']?.get.operationId).toBe('getOkrPeriod');
    expect(v1Spec.paths['/okr/periods/{id}']?.patch.operationId).toBe('updateOkrPeriod');
    expect(v1Spec.paths['/okr/periods/{id}/archive']?.post.operationId).toBe('archiveOkrPeriod');
    expect(v1Spec.paths['/okr/periods/{id}/objectives']?.get.operationId).toBe('listOkrPeriodObjectives');
    expect(v1Spec.paths['/okr/objectives']?.post.operationId).toBe('createOkrObjective');
    expect(v1Spec.paths['/okr/objectives/{id}']?.get.operationId).toBe('getOkrObjective');
    expect(v1Spec.paths['/okr/objectives/{id}']?.patch.operationId).toBe('updateOkrObjective');
    expect(v1Spec.paths['/okr/objectives/{id}/archive']?.post.operationId).toBe('archiveOkrObjective');
    expect(v1Spec.paths['/okr/key-results']?.post.operationId).toBe('createOkrKeyResult');
    expect(v1Spec.paths['/okr/key-results/{id}']?.get.operationId).toBe('getOkrKeyResult');
    expect(v1Spec.paths['/okr/key-results/{id}']?.patch.operationId).toBe('updateOkrKeyResult');
    expect(v1Spec.paths['/okr/key-results/{id}/archive']?.post.operationId).toBe('archiveOkrKeyResult');
    expect(v1Spec.paths['/okr/key-results/{id}/check-ins']?.get.operationId).toBe('listOkrKeyResultCheckIns');
    expect(v1Spec.paths['/okr/key-results/{id}/check-ins']?.post.operationId).toBe('createOkrKeyResultCheckIn');
    expect(v1Spec.paths['/key-results/{id}/check-ins']?.post.operationId).toBe('createKeyResultCheckIn');
    expect(v1Spec.components.schemas.OkrKeyResultWriteRequest).toBeTruthy();
    expect(v1Spec.components.schemas.OkrPeriod.properties.type.enum).toEqual(['year', 'quarter', 'month', 'custom']);
    expect(v1Spec.components.schemas.OkrPeriod.properties.status.enum).toEqual(['active', 'archived']);
    expect(v1Spec.components.schemas.OkrPeriodWriteRequest.properties.type.enum).toEqual(['year', 'quarter', 'month', 'custom']);
    expect(v1Spec.components.schemas.OkrPeriodWriteRequest.properties.status.enum).toEqual(['active', 'archived']);
  });

  it('includes review and context endpoints without relying on examples', () => {
    expect(v1Spec.paths['/reviews/weekly/draft']).toBeTruthy();
    expect(v1Spec.paths['/reviews']?.get.operationId).toBe('listReviews');
    expect(v1Spec.paths['/reviews']?.post.operationId).toBe('saveReviewDraft');
    expect(v1Spec.paths['/reviews/{id}']?.get.operationId).toBe('getReview');
    expect(v1Spec.paths['/reviews/{id}']?.patch.operationId).toBe('updateReview');
    expect(v1Spec.paths['/reviews/{id}/finalize']?.post.operationId).toBe('finalizeReview');
    expect(v1Spec.paths['/reviews/{id}/archive']?.post.operationId).toBe('archiveReview');
    expect(v1Spec.paths['/reviews/context']?.get.operationId).toBe('getReviewContext');
    expect(v1Spec.paths['/reviews/context']?.get.parameters).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'type', schema: expect.objectContaining({ enum: ['daily', 'weekly', 'monthly', 'period'] }) }),
      expect.objectContaining({ name: 'start' }),
      expect.objectContaining({ name: 'end' }),
    ]));
    expect(v1Spec.components.schemas.ReviewContextResponse).toBeTruthy();
  });

  it('includes activity list endpoint and schemas', () => {
    expect(v1Spec.paths['/activity']?.get.operationId).toBe('listActivity');
    expect(v1Spec.paths['/activity']?.get.parameters).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'targetType' }),
      expect.objectContaining({ name: 'source' }),
      expect.objectContaining({ name: 'changedField' }),
      expect.objectContaining({ name: 'limit' }),
    ]));
    expect(v1Spec.components.schemas.ActivityRow).toBeTruthy();
    expect(v1Spec.components.schemas.ActivityListResponse).toBeTruthy();
  });
});
