export const ACTIVITY_SOURCES = ['web', 'api', 'cli', 'hermes', 'agent', 'system', 'unknown'] as const;
export const ACTIVITY_ACTOR_TYPES = ['user', 'api_token', 'agent', 'system', 'unknown'] as const;
export const ACTIVITY_TARGET_TYPES = ['task', 'objective', 'key_result', 'period', 'review', 'api_token', 'system'] as const;

export type ActivitySource = typeof ACTIVITY_SOURCES[number];
export type ActivityActorType = typeof ACTIVITY_ACTOR_TYPES[number];
