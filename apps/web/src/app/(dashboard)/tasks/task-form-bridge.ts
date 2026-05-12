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
  listId?: string | null;
  definition?: LinkedDefinition | null;
  keyResultLinks?: Array<{
    keyResult: LinkedKeyResult;
  }>;
};

export type TaskFormValues = {
  id: string;
  taskId: string;
  definitionId: string;
  title: string;
  description: string;
  dueDate: string;
  listId: string;
  isRecurring: boolean;
  frequency: string;
  endType: string;
  endDate: string;
  occurrenceCount: string;
  keyResultIds: string[];
};

export function getTaskFormValues(task?: TaskItem, defaultListId?: string | null, defaultDueDate?: string | null): TaskFormValues {
  return {
    id: task?.definition?.id ?? task?.id ?? '',
    taskId: task?.id ?? '',
    definitionId: task?.definition?.id ?? '',
    title: task?.title ?? '',
    description: task?.description ?? task?.notes ?? '',
    dueDate: task?.dueDate ?? defaultDueDate ?? '',
    listId: task?.listId ?? defaultListId ?? '',
    isRecurring: Boolean(task?.definition),
    frequency: task?.definition?.frequency ?? 'daily',
    endType: task?.definition?.endType ?? 'never',
    endDate: task?.definition?.endDate ?? '',
    occurrenceCount: task?.definition?.occurrenceCount ? String(task.definition.occurrenceCount) : '',
    keyResultIds: (task?.keyResultLinks ?? []).map((link) => link.keyResult.id),
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
  formData.set('targetDate', values.dueDate);
  formData.set('listId', values.listId);
  formData.set('isRecurring', values.isRecurring ? 'on' : '');
  formData.set('frequency', values.frequency);
  formData.set('endType', values.endType);
  formData.set('endDate', values.endDate);
  formData.set('occurrenceCount', values.occurrenceCount);

  values.keyResultIds.forEach((keyResultId) => {
    formData.append('keyResultIds', keyResultId);
  });

  return formData;
}
