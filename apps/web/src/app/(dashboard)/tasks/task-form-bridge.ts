type LinkedKeyResult = {
  id: string;
  title: string;
};

type LinkedDefinition = {
  id: string;
  frequency: string;
  endType: string;
  endDate?: string | null;
  occurrenceCount?: number | null;
};

type TaskItem = {
  id: string;
  title: string;
  notes: string | null;
  description?: string | null;
  dueDate: string | null;
  priority?: string | null;
  listId?: string | null;
  definition?: LinkedDefinition | null;
  keyResultLinks?: Array<{
    countsTowardCommitment?: boolean | null;
    keyResult: LinkedKeyResult;
  }>;
};

export type TaskKeyResultLinkValue = {
  keyResultId: string;
  countsTowardCommitment: boolean;
};

export type TaskFormValues = {
  id: string;
  taskId: string;
  definitionId: string;
  title: string;
  description: string;
  dueDate: string;
  priority: string;
  listId: string;
  isRecurring: boolean;
  frequency: string;
  endType: string;
  endDate: string;
  occurrenceCount: string;
  keyResultIds: string[];
  keyResultLinks: TaskKeyResultLinkValue[];
};

export function getTaskFormValues(
  task?: TaskItem,
  defaultListId?: string | null,
  defaultDueDate?: string | null,
  defaultPriority?: string | null,
): TaskFormValues {
  return {
    id: task?.definition?.id ?? task?.id ?? '',
    taskId: task?.id ?? '',
    definitionId: task?.definition?.id ?? '',
    title: task?.title ?? '',
    description: task?.description ?? task?.notes ?? '',
    dueDate: task?.dueDate ?? defaultDueDate ?? '',
    priority: task?.priority ?? defaultPriority ?? '',
    listId: task?.listId ?? defaultListId ?? '',
    isRecurring: Boolean(task?.definition),
    frequency: task?.definition?.frequency ?? 'daily',
    endType: task?.definition?.endType ?? 'never',
    endDate: task?.definition?.endDate ?? '',
    occurrenceCount: task?.definition?.occurrenceCount ? String(task.definition.occurrenceCount) : '',
    keyResultIds: (task?.keyResultLinks ?? []).map((link) => link.keyResult.id),
    keyResultLinks: (task?.keyResultLinks ?? []).map((link) => ({
      keyResultId: link.keyResult.id,
      countsTowardCommitment: Boolean(link.countsTowardCommitment),
    })),
  };
}

export function buildTaskFormData(values: TaskFormValues) {
  const formData = new FormData();
  if (values.id) {
    formData.set('id', values.id);
  }
  if (values.taskId) {
    formData.set('taskId', values.taskId);
  }
  if (values.definitionId) {
    formData.set('definitionId', values.definitionId);
  }

  formData.set('title', values.title);
  formData.set('description', values.description);
  formData.set('dueDate', values.dueDate);
  formData.set('priority', values.priority);
  formData.set('targetDate', values.dueDate);
  formData.set('listId', values.listId);
  formData.set('isRecurring', values.isRecurring ? 'on' : '');
  formData.set('frequency', values.frequency);
  formData.set('endType', values.endType);
  formData.set('endDate', values.endDate);
  formData.set('occurrenceCount', values.occurrenceCount);

  const commitmentByKeyResultId = new Map(
    values.keyResultLinks.map((link) => [link.keyResultId, link.countsTowardCommitment]),
  );
  const normalizedLinks = values.keyResultIds.map((keyResultId) => ({
    keyResultId,
    countsTowardCommitment: commitmentByKeyResultId.get(keyResultId) ?? false,
  }));

  normalizedLinks.forEach((link) => {
    formData.append('keyResultLinks', JSON.stringify(link));
  });

  return formData;
}
