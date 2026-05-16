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

const activitySourceLabels = {
  web: 'Web',
  api: 'API',
  cli: 'CLI',
  hermes: 'Hermes',
  agent: 'Agent',
  system: 'System',
  unknown: 'Unknown',
} as const;

const activityActorTypeLabels = {
  user: '用户',
  api_token: 'API Token',
  agent: 'Agent',
  system: 'System',
  unknown: 'Unknown',
} as const;

const activityTargetTypeLabels = {
  task: '任务',
  objective: '目标',
  key_result: '关键结果',
  period: '周期',
  review: '复盘',
  api_token: 'API 令牌',
  system: '系统',
} as const;

const activityActionLabels = {
  'task.create': '创建任务',
  'task.update': '更新任务',
  'task.complete': '完成任务',
  'task.restore': '恢复任务',
  'task.archive': '归档任务',
  'task.move_list': '移动列表',
  'task.move_quadrant': '移动四象限',
  'task.link_key_result': '关联 KR',
  'task.unlink_key_result': '取消关联 KR',
  'okr.period.create': '创建周期',
  'okr.period.update': '更新周期',
  'okr.period.archive': '归档周期',
  'okr.objective.create': '创建目标',
  'okr.objective.update': '更新目标',
  'okr.objective.archive': '归档目标',
  'okr.key_result.create': '创建 KR',
  'okr.key_result.update': '更新 KR',
  'okr.key_result.check_in': 'KR Check-in',
  'review.draft.create': '创建复盘草稿',
  'review.draft.update': '更新复盘草稿',
  'review.finalize': '完成复盘',
  'review.archive': '归档复盘',
  'auth.login': '登录',
  'auth.logout': '退出登录',
  'token.create': '创建令牌',
  'token.revoke': '撤销令牌',
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

export function getActivityFieldLabel(value: string | null | undefined) {
  return labelFromMap(value, {
    status: '状态',
    dueDate: '截止日期',
    priority: '优先级',
    title: '标题',
    listId: '列表',
    listName: '列表',
    summary: '总结',
    blockers: '阻塞项',
    nextActions: '下一步',
    currentValue: '手工当前值',
    targetValue: '目标值',
    confidence: '信心',
    reviewStatus: '复盘状态',
    completedAt: '完成时间',
  });
}

export function getActivitySourceLabel(value: string | null | undefined) {
  return labelFromMap(value, activitySourceLabels);
}

export function getActivityActorTypeLabel(value: string | null | undefined) {
  return labelFromMap(value, activityActorTypeLabels);
}

export function getActivityTargetTypeLabel(value: string | null | undefined) {
  return labelFromMap(value, activityTargetTypeLabels);
}

export function getActivityActionLabel(value: string | null | undefined) {
  return labelFromMap(value, activityActionLabels);
}

export function getReviewStatusLabel(value: string | null | undefined) {
  return labelFromMap(value, sharedStatusLabels);
}

export function getExampleStatusLabel(value: string | null | undefined) {
  return labelFromMap(value, exampleStatusLabels);
}
