import { describe, expect, it } from 'vitest';
import { buildTaskUpdatePatch } from '@/lib/services/task-service';

describe('task service rules', () => {
  it('requires today type when moving a task into today', () => {
    expect(() => buildTaskUpdatePatch({ status: 'today' })).toThrow(
      'Moving a task into Today requires Must or Focus.',
    );
  });

  it('adds completedAt when status becomes done', () => {
    const patch = buildTaskUpdatePatch({ status: 'done' });
    expect(patch.completedAt).toBeInstanceOf(Date);
  });

  it('clears today type when leaving today', () => {
    const patch = buildTaskUpdatePatch({ status: 'inbox' });
    expect(patch.todayType).toBeNull();
  });
});
