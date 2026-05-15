import { describe, expect, it } from 'vitest';
import { buildTaskFormData, getTaskFormValues } from '@/app/(dashboard)/tasks/task-form-bridge';

describe('task form bridge', () => {
  it('maps task data into form defaults', () => {
    const values = getTaskFormValues({
      id: 'task_1',
      title: 'Write review',
      notes: 'Keep it short',
      description: 'Keep it short',
      dueDate: '2026-05-13',
      priority: 'P2',
      listId: 'list_1',
      definition: {
        id: 'def_1',
        frequency: 'daily',
        endType: 'never',
      },
      keyResultLinks: [{ keyResult: { id: 'kr_1', title: 'Ship review loop' } }],
    });

    expect(values).toEqual({
      id: 'def_1',
      taskId: 'task_1',
      definitionId: 'def_1',
      title: 'Write review',
      description: 'Keep it short',
      dueDate: '2026-05-13',
      priority: 'P2',
      listId: 'list_1',
      isRecurring: true,
      frequency: 'daily',
      endType: 'never',
      endDate: '',
      occurrenceCount: '',
      keyResultIds: ['kr_1'],
      keyResultLinks: [{
        keyResultId: 'kr_1',
        countsTowardCommitment: false,
      }],
    });
  });

  it('serializes unified task form fields into FormData', () => {
    const formData = buildTaskFormData({
      id: 'task_1',
      taskId: 'task_1',
      definitionId: '',
      title: 'Write review',
      description: 'Bridge test',
      dueDate: '2026-05-20',
      priority: 'P1',
      listId: 'list_1',
      isRecurring: true,
      frequency: 'weekly',
      endType: 'after_count',
      endDate: '',
      occurrenceCount: '8',
      keyResultIds: ['kr_1', 'kr_2'],
      keyResultLinks: [
        { keyResultId: 'kr_1', countsTowardCommitment: true },
        { keyResultId: 'kr_2', countsTowardCommitment: false },
      ],
    });

    expect(formData.get('id')).toBe('task_1');
    expect(formData.get('taskId')).toBe('task_1');
    expect(formData.get('definitionId')).toBeNull();
    expect(formData.get('title')).toBe('Write review');
    expect(formData.get('description')).toBe('Bridge test');
    expect(formData.get('dueDate')).toBe('2026-05-20');
    expect(formData.get('priority')).toBe('P1');
    expect(formData.get('listId')).toBe('list_1');
    expect(formData.get('isRecurring')).toBe('on');
    expect(formData.get('frequency')).toBe('weekly');
    expect(formData.get('endType')).toBe('after_count');
    expect(formData.get('occurrenceCount')).toBe('8');
    expect(formData.getAll('keyResultLinks')).toEqual([
      JSON.stringify({ keyResultId: 'kr_1', countsTowardCommitment: true }),
      JSON.stringify({ keyResultId: 'kr_2', countsTowardCommitment: false }),
    ]);
  });

  it('falls back to plain key result ids as non-committed links', () => {
    const formData = buildTaskFormData({
      id: '',
      taskId: '',
      definitionId: '',
      title: 'Bridge fallback',
      description: '',
      dueDate: '',
      priority: '',
      listId: '',
      isRecurring: false,
      frequency: 'daily',
      endType: 'never',
      endDate: '',
      occurrenceCount: '',
      keyResultIds: ['kr_1', 'kr_2'],
      keyResultLinks: [],
    });

    expect(formData.getAll('keyResultLinks')).toEqual([
      JSON.stringify({ keyResultId: 'kr_1', countsTowardCommitment: false }),
      JSON.stringify({ keyResultId: 'kr_2', countsTowardCommitment: false }),
    ]);
  });

  it('serializes only currently selected key results while preserving existing commitment flags', () => {
    const formData = buildTaskFormData({
      id: 'task_1',
      taskId: 'task_1',
      definitionId: '',
      title: 'Bridge sync',
      description: '',
      dueDate: '',
      priority: '',
      listId: '',
      isRecurring: false,
      frequency: 'daily',
      endType: 'never',
      endDate: '',
      occurrenceCount: '',
      keyResultIds: ['kr_2', 'kr_3'],
      keyResultLinks: [
        { keyResultId: 'kr_1', countsTowardCommitment: true },
        { keyResultId: 'kr_2', countsTowardCommitment: true },
      ],
    });

    expect(formData.getAll('keyResultLinks')).toEqual([
      JSON.stringify({ keyResultId: 'kr_2', countsTowardCommitment: true }),
      JSON.stringify({ keyResultId: 'kr_3', countsTowardCommitment: false }),
    ]);
  });
});
