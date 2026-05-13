import { beforeEach, describe, expect, it, vi } from 'vitest';

const insertReturning = vi.fn();
const insertValues = vi.fn();
const findManyAuditLogs = vi.fn();

vi.mock('@stride-os/db', () => ({
  db: {
    insert: vi.fn(() => ({
      values: (...args: unknown[]) => insertValues(...args),
    })),
    query: {
      auditLogs: {
        findMany: (...args: unknown[]) => findManyAuditLogs(...args),
      },
    },
  },
  schema: {
    auditLogs: {
      id: {},
      actorType: {},
      actorId: {},
      action: {},
      targetType: {},
      targetId: {},
      targetTitle: {},
      source: {},
      summary: {},
      metadata: {},
      createdAt: {},
    },
  },
}));

import {
  buildActivityDiff,
  listActivity,
  recordActivity,
  sanitizeActivityMetadata,
} from '@/lib/services/activity-service';

describe('activity service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertValues.mockReturnValue({
      returning: (...args: unknown[]) => insertReturning(...args),
    });
  });

  it('sanitizes metadata and strips unsafe keys before insert', async () => {
    insertReturning.mockResolvedValue([
      {
        id: 'log_1',
        metadata: {
          changedFields: ['title'],
        },
      },
    ]);

    await recordActivity({
      actorType: 'user',
      actorId: 'user_1',
      action: 'task.update',
      targetType: 'task',
      targetId: 'task_1',
      targetTitle: '  Refine roadmap  ',
      source: 'web',
      summary: '  Updated title  ',
      metadata: {
        changedFields: ['title'],
        diff: [
          {
            field: 'title',
            label: '标题',
            before: 'Before',
            after: 'After',
          },
        ],
        token: 'secret',
        passwordHash: 'also-secret',
        nested: { nope: true },
      } as unknown as Record<string, unknown>,
    });

    expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({
      targetTitle: 'Refine roadmap',
      summary: 'Updated title',
      metadata: {
        changedFields: ['title'],
        diff: [
          expect.objectContaining({
            field: 'title',
            before: 'Before',
            after: 'After',
          }),
        ],
      },
    }));
  });

  it('builds display-safe diff entries for changed fields', () => {
    expect(buildActivityDiff(
      {
        status: 'inbox',
        dueDate: null,
        priority: 'P2',
        confidence: 'low',
      },
      {
        status: 'done',
        dueDate: '2026-05-13',
        priority: 'P1',
        confidence: 'high',
      },
      ['status', 'dueDate', 'priority', 'confidence'],
    )).toEqual({
      changedFields: ['status', 'dueDate', 'priority', 'confidence'],
      diff: [
        expect.objectContaining({
          field: 'status',
          beforeLabel: '收件箱',
          afterLabel: '已完成',
        }),
        expect.objectContaining({
          field: 'dueDate',
          before: null,
          after: '2026-05-13',
        }),
        expect.objectContaining({
          field: 'priority',
          beforeLabel: 'P2',
          afterLabel: 'P1',
        }),
        expect.objectContaining({
          field: 'confidence',
          beforeLabel: '低',
          afterLabel: '高',
        }),
      ],
    });
  });

  it('returns reverse chronological rows and preserves legacy null display fields', async () => {
    findManyAuditLogs.mockResolvedValue([
      {
        id: 'log_2',
        actorType: 'user',
        actorId: 'user_1',
        action: 'task.update',
        targetType: 'task',
        targetId: 'task_1',
        targetTitle: 'Task A',
        source: 'web',
        summary: 'Updated task',
        metadata: {
          changedFields: ['title'],
          diff: [],
          actorLabel: 'You',
        },
        createdAt: new Date('2026-05-13T10:00:00.000Z'),
      },
      {
        id: 'log_1',
        actorType: 'user',
        actorId: 'user_1',
        action: 'session.login',
        targetType: null,
        targetId: null,
        targetTitle: null,
        source: null,
        summary: null,
        metadata: null,
        createdAt: new Date('2026-05-13T09:00:00.000Z'),
      },
    ]);

    const result = await listActivity({ limit: 5 });

    expect(findManyAuditLogs).toHaveBeenCalledWith(expect.objectContaining({
      orderBy: expect.any(Array),
      limit: 6,
    }));
    expect(result.nextCursor).toBeNull();
    expect(result.items).toEqual([
      expect.objectContaining({
        id: 'log_2',
        targetTitle: 'Task A',
        source: 'web',
        actorLabel: 'You',
      }),
      expect.objectContaining({
        id: 'log_1',
        targetTitle: null,
        source: null,
        summary: null,
        changedFields: [],
      }),
    ]);
  });

  it('filters by changed field within the fetched result window and returns a cursor', async () => {
    findManyAuditLogs.mockResolvedValue([
      {
        id: 'log_4',
        actorType: 'user',
        actorId: 'user_1',
        action: 'task.update',
        targetType: 'task',
        targetId: 'task_4',
        targetTitle: 'Task 4',
        source: 'web',
        summary: 'Changed title',
        metadata: { changedFields: ['title'] },
        createdAt: new Date('2026-05-13T10:04:00.000Z'),
      },
      {
        id: 'log_3',
        actorType: 'user',
        actorId: 'user_1',
        action: 'task.update',
        targetType: 'task',
        targetId: 'task_3',
        targetTitle: 'Task 3',
        source: 'web',
        summary: 'Changed due date',
        metadata: { changedFields: ['dueDate'] },
        createdAt: new Date('2026-05-13T10:03:00.000Z'),
      },
      {
        id: 'log_2',
        actorType: 'user',
        actorId: 'user_1',
        action: 'task.update',
        targetType: 'task',
        targetId: 'task_2',
        targetTitle: 'Task 2',
        source: 'web',
        summary: 'Changed title again',
        metadata: { changedFields: ['title'] },
        createdAt: new Date('2026-05-13T10:02:00.000Z'),
      },
    ]);

    const result = await listActivity({ changedField: 'title', limit: 1 });

    expect(findManyAuditLogs).toHaveBeenCalledWith(expect.objectContaining({
      limit: 6,
    }));
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe('log_4');
    expect(result.nextCursor).toBe('2026-05-13T10:02:00.000Z::log_2');
  });

  it('passes query filters and cursor constraint into the audit log query', async () => {
    findManyAuditLogs.mockResolvedValue([]);

    await listActivity({
      start: new Date('2026-05-01T00:00:00.000Z'),
      end: new Date('2026-05-31T23:59:59.000Z'),
      targetType: 'task',
      targetId: 'task_1',
      actorType: 'user',
      actorId: 'user_1',
      source: 'web',
      action: 'task.update',
      keyword: 'refine',
      cursor: '2026-05-13T09:00:00.000Z::log_1',
      limit: 20,
    });

    expect(findManyAuditLogs).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.anything(),
      limit: 21,
    }));
  });

  it('supports a representative activity flow across task, key result, and review records', async () => {
    findManyAuditLogs
      .mockResolvedValueOnce([
        {
          id: 'log_5',
          actorType: 'user',
          actorId: 'user_1',
          action: 'review.finalize',
          targetType: 'review',
          targetId: 'review_1',
          targetTitle: 'Week 19 review',
          source: 'web',
          summary: '完成周复盘',
          metadata: { actorLabel: 'You', changedFields: [] },
          createdAt: new Date('2026-05-13T10:05:00.000Z'),
        },
        {
          id: 'log_4',
          actorType: 'user',
          actorId: 'user_1',
          action: 'okr.key_result.check_in',
          targetType: 'key_result',
          targetId: 'kr_1',
          targetTitle: 'Grow weekly shipping rhythm',
          source: 'web',
          summary: '更新 KR 进度',
          metadata: {
            actorLabel: 'You',
            changedFields: ['currentValue', 'confidence'],
            diff: [
              {
                field: 'currentValue',
                label: '当前值',
                before: 1,
                after: 5,
              },
            ],
          },
          createdAt: new Date('2026-05-13T10:04:00.000Z'),
        },
        {
          id: 'log_3',
          actorType: 'user',
          actorId: 'user_1',
          action: 'task.complete',
          targetType: 'task',
          targetId: 'task_1',
          targetTitle: 'Write review',
          source: 'web',
          summary: '完成任务',
          metadata: {
            actorLabel: 'You',
            changedFields: ['status', 'completedAt'],
          },
          createdAt: new Date('2026-05-13T10:03:00.000Z'),
        },
        {
          id: 'log_2',
          actorType: 'user',
          actorId: 'user_1',
          action: 'task.update',
          targetType: 'task',
          targetId: 'task_1',
          targetTitle: 'Write review',
          source: 'web',
          summary: '更新任务截止日期',
          metadata: {
            actorLabel: 'You',
            changedFields: ['dueDate'],
          },
          createdAt: new Date('2026-05-13T10:02:00.000Z'),
        },
        {
          id: 'log_1',
          actorType: 'user',
          actorId: 'user_1',
          action: 'task.create',
          targetType: 'task',
          targetId: 'task_1',
          targetTitle: 'Write review',
          source: 'web',
          summary: '创建任务',
          metadata: { actorLabel: 'You', changedFields: [] },
          createdAt: new Date('2026-05-13T10:01:00.000Z'),
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'log_3',
          actorType: 'user',
          actorId: 'user_1',
          action: 'task.complete',
          targetType: 'task',
          targetId: 'task_1',
          targetTitle: 'Write review',
          source: 'web',
          summary: '完成任务',
          metadata: {
            actorLabel: 'You',
            changedFields: ['status', 'completedAt'],
          },
          createdAt: new Date('2026-05-13T10:03:00.000Z'),
        },
        {
          id: 'log_2',
          actorType: 'user',
          actorId: 'user_1',
          action: 'task.update',
          targetType: 'task',
          targetId: 'task_1',
          targetTitle: 'Write review',
          source: 'web',
          summary: '更新任务截止日期',
          metadata: {
            actorLabel: 'You',
            changedFields: ['dueDate'],
          },
          createdAt: new Date('2026-05-13T10:02:00.000Z'),
        },
        {
          id: 'log_1',
          actorType: 'user',
          actorId: 'user_1',
          action: 'task.create',
          targetType: 'task',
          targetId: 'task_1',
          targetTitle: 'Write review',
          source: 'web',
          summary: '创建任务',
          metadata: { actorLabel: 'You', changedFields: [] },
          createdAt: new Date('2026-05-13T10:01:00.000Z'),
        },
      ]);

    const globalResult = await listActivity({ limit: 10 });
    const taskResult = await listActivity({
      targetType: 'task',
      targetId: 'task_1',
      limit: 10,
    });

    expect(globalResult.items.map((item) => item.action)).toEqual([
      'review.finalize',
      'okr.key_result.check_in',
      'task.complete',
      'task.update',
      'task.create',
    ]);
    expect(taskResult.items.map((item) => item.action)).toEqual([
      'task.complete',
      'task.update',
      'task.create',
    ]);
    expect(taskResult.items.every((item) => item.targetId === 'task_1')).toBe(true);
    expect(globalResult.items.find((item) => item.action === 'okr.key_result.check_in')?.changedFields).toEqual([
      'currentValue',
      'confidence',
    ]);
  });

  it('sanitizes standalone metadata helpers for null transitions and arrays', () => {
    expect(sanitizeActivityMetadata({
      changedFields: ['status', 'dueDate'],
      diff: [
        {
          field: 'status',
          label: '状态',
          before: 'inbox',
          after: 'done',
        },
        {
          field: 'tags',
          label: 'tags',
          before: ['a'],
          after: ['a', 'b'],
        },
      ],
      requestId: 'req_1',
      payload: { leaked: true } as unknown as string,
    })).toEqual({
      changedFields: ['status', 'dueDate'],
      diff: [
        expect.objectContaining({
          field: 'status',
          before: 'inbox',
          after: 'done',
        }),
        expect.objectContaining({
          field: 'tags',
          before: ['a'],
          after: ['a', 'b'],
        }),
      ],
      requestId: 'req_1',
    });
  });
});
