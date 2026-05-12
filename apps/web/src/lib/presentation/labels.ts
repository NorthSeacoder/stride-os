const taskStatusLabels = {
  inbox: '收件箱',
  today: '今日',
  scheduled: '已排期',
  done: '已完成',
  canceled: '已取消',
} as const;

const energyLabels = {
  low: '低',
  medium: '中',
  high: '高',
} as const;

const periodTypeLabels = {
  year: '年度',
  quarter: '季度',
  month: '月度',
  custom: '自定义',
} as const;

const sharedStatusLabels = {
  active: '进行中',
  archived: '已归档',
  done: '已完成',
  draft: '草稿',
  final: '最终版',
} as const;

const keyResultStatusLabels = {
  ...sharedStatusLabels,
  at_risk: '有风险',
} as const;

const keyResultTypeLabels = {
  numeric: '数值型',
  milestone: '里程碑型',
  hybrid: '混合型',
} as const;

const confidenceLabels = {
  low: '低',
  medium: '中',
  high: '高',
} as const;

const exampleStatusLabels = {
  active: '启用',
  archived: '已归档',
  draft: '草稿',
} as const;

function labelFromMap<T extends Record<string, string>>(value: string | null | undefined, labels: T, fallback = '-') {
  if (!value) return fallback;
  return labels[value as keyof T] ?? value;
}

export function getTaskStatusLabel(value: string | null | undefined) {
  return labelFromMap(value, taskStatusLabels);
}

export function getTaskPriorityLabel(value: string | null | undefined) {
  return value ?? '-';
}

export function getTaskEnergyLabel(value: string | null | undefined) {
  return labelFromMap(value, energyLabels);
}

export function getPeriodTypeLabel(value: string | null | undefined) {
  return labelFromMap(value, periodTypeLabels);
}

export function getPeriodStatusLabel(value: string | null | undefined) {
  return labelFromMap(value, sharedStatusLabels);
}

export function getObjectiveStatusLabel(value: string | null | undefined) {
  return labelFromMap(value, sharedStatusLabels);
}

export function getKeyResultTypeLabel(value: string | null | undefined) {
  return labelFromMap(value, keyResultTypeLabels);
}

export function getKeyResultStatusLabel(value: string | null | undefined) {
  return labelFromMap(value, keyResultStatusLabels);
}

export function getConfidenceLabel(value: string | null | undefined) {
  return labelFromMap(value, confidenceLabels, '未更新');
}

export function getReviewStatusLabel(value: string | null | undefined) {
  return labelFromMap(value, sharedStatusLabels);
}

export function getExampleStatusLabel(value: string | null | undefined) {
  return labelFromMap(value, exampleStatusLabels);
}
