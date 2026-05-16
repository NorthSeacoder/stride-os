export const IMPORT_PERIOD_TYPES = ['year', 'quarter', 'month', 'custom'] as const;
export const IMPORT_PERIOD_STATUSES = ['active', 'archived'] as const;
export const IMPORT_TASK_LIST_KINDS = ['user', 'system'] as const;
export const IMPORT_OBJECTIVE_STATUSES = ['active', 'done', 'archived'] as const;
export const IMPORT_KEY_RESULT_STATUSES = ['active', 'at_risk', 'done', 'archived'] as const;

type ImportPeriodType = typeof IMPORT_PERIOD_TYPES[number];
type ImportPeriodStatus = typeof IMPORT_PERIOD_STATUSES[number];
type ImportTaskListKind = typeof IMPORT_TASK_LIST_KINDS[number];
type ImportObjectiveStatus = typeof IMPORT_OBJECTIVE_STATUSES[number];
type ImportKeyResultStatus = typeof IMPORT_KEY_RESULT_STATUSES[number];

export type OkrImportDocument = {
  period: {
    name: string;
    type: ImportPeriodType;
    year: number;
    startDate: string;
    endDate: string;
    status: ImportPeriodStatus;
  };
  taskLists: Array<{
    name: string;
    icon?: string;
    kind: ImportTaskListKind;
    slug: string;
    sortOrder: number;
    objectives: Array<{
      refId: string;
      title: string;
      description?: string;
      status: ImportObjectiveStatus;
      sortOrder: number;
      keyResults: Array<{
        refId: string;
        title: string;
        description?: string;
        status: ImportKeyResultStatus;
        eventTags?: string[];
      }>;
    }>;
  }>;
};

export type OkrImportValidationResult = {
  ok: boolean;
  errors: string[];
  summary: {
    taskListCount: number;
    objectiveCount: number;
    keyResultCount: number;
  };
};

function hasDuplicates(values: string[]) {
  return values.length !== new Set(values).size;
}

function assertEnum<T extends string>(value: string, allowed: readonly T[], label: string, errors: string[]) {
  if (!allowed.includes(value as T)) {
    errors.push(`${label} has invalid value: ${value}`);
  }
}

export function validateOkrImportDocument(input: OkrImportDocument): OkrImportValidationResult {
  const errors: string[] = [];

  assertEnum(input.period.type, IMPORT_PERIOD_TYPES, 'period.type', errors);
  assertEnum(input.period.status, IMPORT_PERIOD_STATUSES, 'period.status', errors);

  const taskListSlugs = input.taskLists.map((taskList) => taskList.slug);
  if (hasDuplicates(taskListSlugs)) {
    errors.push('taskLists contain duplicate slug values');
  }

  const objectiveRefIds: string[] = [];
  const keyResultRefIds: string[] = [];

  for (const taskList of input.taskLists) {
    assertEnum(taskList.kind, IMPORT_TASK_LIST_KINDS, `taskLists.${taskList.slug}.kind`, errors);

    if (!Array.isArray(taskList.objectives) || taskList.objectives.length === 0) {
      errors.push(`taskLists.${taskList.slug} must include at least one objective`);
      continue;
    }

    for (const objective of taskList.objectives) {
      objectiveRefIds.push(objective.refId);
      assertEnum(objective.status, IMPORT_OBJECTIVE_STATUSES, `objective.${objective.refId}.status`, errors);

      if (!Array.isArray(objective.keyResults) || objective.keyResults.length === 0) {
        errors.push(`objective.${objective.refId} must include at least one key result`);
        continue;
      }

      for (const keyResult of objective.keyResults) {
        keyResultRefIds.push(keyResult.refId);
        assertEnum(keyResult.status, IMPORT_KEY_RESULT_STATUSES, `keyResult.${keyResult.refId}.status`, errors);
      }
    }
  }

  if (hasDuplicates(objectiveRefIds)) {
    errors.push('objectives contain duplicate refId values');
  }

  if (hasDuplicates(keyResultRefIds)) {
    errors.push('keyResults contain duplicate refId values');
  }

  return {
    ok: errors.length === 0,
    errors,
    summary: {
      taskListCount: input.taskLists.length,
      objectiveCount: objectiveRefIds.length,
      keyResultCount: keyResultRefIds.length,
    },
  };
}
