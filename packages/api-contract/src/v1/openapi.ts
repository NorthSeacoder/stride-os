export const v1Spec = {
  openapi: '3.1.0',
  info: {
    title: 'Stride OS API',
    version: '1.0.0',
    description: 'API for the Stride OS application',
  },
  servers: [{ url: '/api/v1' }],
  paths: {
    '/health': {
      get: {
        operationId: 'healthCheck',
        summary: 'Health check',
        responses: { '200': { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string' } } } } } } },
      },
    },
    '/me': {
      get: {
        operationId: 'getMe',
        summary: 'Get current user',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        responses: {
          '200': { description: 'Current user info', content: { 'application/json': { schema: { $ref: '#/components/schemas/UserResponse' } } } },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/examples': {
      get: {
        operationId: 'listExamples',
        summary: 'List example items',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        responses: { '200': { description: 'List of items', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/ExampleItem' } } } } } },
      },
      post: {
        operationId: 'createExample',
        summary: 'Create example item',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateExampleRequest' } } } },
        responses: { '201': { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/ExampleItem' } } } } },
      },
    },
    '/examples/{id}': {
      get: {
        operationId: 'getExample',
        summary: 'Get example item',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Item', content: { 'application/json': { schema: { $ref: '#/components/schemas/ExampleItem' } } } }, '404': { description: 'Not found' } },
      },
      patch: {
        operationId: 'updateExample',
        summary: 'Update example item',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateExampleRequest' } } } },
        responses: { '200': { description: 'Updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/ExampleItem' } } } }, '404': { description: 'Not found' } },
      },
      delete: {
        operationId: 'deleteExample',
        summary: 'Delete example item',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Deleted' }, '404': { description: 'Not found' } },
      },
    },
    '/okr/current': {
      get: {
        operationId: 'getCurrentOkr',
        summary: 'Get current period summary',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        responses: {
          '200': { description: 'Current OKR summary', content: { 'application/json': { schema: { $ref: '#/components/schemas/CurrentOkrSummary' } } } },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/tasks/today': {
      get: {
        operationId: 'listTodayTasks',
        summary: 'List tasks for the today smart source',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        responses: {
          '200': { description: 'Today tasks', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/TaskItem' } } } } },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/tasks': {
      get: {
        operationId: 'listTasks',
        summary: 'List tasks by smart source',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ name: 'source', in: 'query', schema: { type: 'string', default: 'all' } }],
        responses: {
          '200': { description: 'Tasks', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/TaskItem' } } } } },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
      post: {
        operationId: 'createTask',
        summary: 'Create task',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/TaskWriteRequest' } } } },
        responses: {
          '201': { description: 'Created task', content: { 'application/json': { schema: { $ref: '#/components/schemas/TaskItem' } } } },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/tasks/{id}': {
      get: {
        operationId: 'getTask',
        summary: 'Get task detail',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        responses: {
          '200': { description: 'Task detail', content: { 'application/json': { schema: { $ref: '#/components/schemas/TaskItem' } } } },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      patch: {
        operationId: 'updateTask',
        summary: 'Update task',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/TaskWriteRequest' } } } },
        responses: {
          '200': { description: 'Updated task', content: { 'application/json': { schema: { $ref: '#/components/schemas/TaskItem' } } } },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/tasks/{id}/complete': {
      post: {
        operationId: 'completeTask',
        summary: 'Complete task',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        responses: {
          '200': { description: 'Completed task', content: { 'application/json': { schema: { $ref: '#/components/schemas/TaskItem' } } } },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/tasks/{id}/restore': {
      post: {
        operationId: 'restoreTask',
        summary: 'Restore task from done state',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        responses: {
          '200': { description: 'Restored task', content: { 'application/json': { schema: { $ref: '#/components/schemas/TaskItem' } } } },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/tasks/{id}/archive': {
      post: {
        operationId: 'archiveTask',
        summary: 'Archive task',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        responses: {
          '200': { description: 'Archived task', content: { 'application/json': { schema: { $ref: '#/components/schemas/TaskItem' } } } },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/tasks/{id}/quadrant': {
      post: {
        operationId: 'moveTaskQuadrant',
        summary: 'Move task to Eisenhower quadrant',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/MoveTaskQuadrantRequest' } } } },
        responses: {
          '200': { description: 'Moved task', content: { 'application/json': { schema: { $ref: '#/components/schemas/TaskItem' } } } },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/tasks/reminders': {
      get: {
        operationId: 'listTaskReminderCandidates',
        summary: 'List stateless task reminder candidates',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [
          { name: 'today', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: {
          '200': { description: 'Reminder candidates', content: { 'application/json': { schema: { $ref: '#/components/schemas/TaskReminderResponse' } } } },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/tasks/inbox': {
      get: {
        operationId: 'listInboxTasks',
        summary: 'List tasks for the inbox smart source',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        responses: {
          '200': { description: 'Inbox tasks', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/TaskItem' } } } } },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/tasks/quadrants': {
      get: {
        operationId: 'listQuadrantTasks',
        summary: 'List tasks for quadrant view',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ name: 'includeCompleted', in: 'query', schema: { type: 'boolean' } }],
        responses: {
          '200': { description: 'Quadrant tasks', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/TaskItem' } } } } },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/tasks/definitions': {
      get: {
        operationId: 'listTaskDefinitions',
        summary: 'List recurring task definitions',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        responses: {
          '200': { description: 'Recurring task definitions', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/TaskDefinitionItem' } } } } },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
      post: {
        operationId: 'createTaskDefinition',
        summary: 'Create recurring task definition',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/TaskDefinitionWriteRequest' } } } },
        responses: {
          '201': { description: 'Created recurring task definition', content: { 'application/json': { schema: { $ref: '#/components/schemas/TaskDefinitionItem' } } } },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/tasks/definitions/{id}': {
      get: {
        operationId: 'getTaskDefinition',
        summary: 'Get recurring task definition',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        responses: {
          '200': { description: 'Recurring task definition', content: { 'application/json': { schema: { $ref: '#/components/schemas/TaskDefinitionItem' } } } },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      patch: {
        operationId: 'updateTaskDefinition',
        summary: 'Update recurring task definition',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/TaskDefinitionWriteRequest' } } } },
        responses: {
          '200': { description: 'Updated recurring task definition', content: { 'application/json': { schema: { $ref: '#/components/schemas/TaskDefinitionItem' } } } },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/tasks/definitions/{id}/archive': {
      post: {
        operationId: 'archiveTaskDefinition',
        summary: 'Archive recurring task definition',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        responses: {
          '200': { description: 'Archived recurring task definition', content: { 'application/json': { schema: { $ref: '#/components/schemas/TaskDefinitionItem' } } } },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/tasks/definitions/{id}/restore': {
      post: {
        operationId: 'restoreTaskDefinition',
        summary: 'Restore recurring task definition',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        responses: {
          '200': { description: 'Restored recurring task definition', content: { 'application/json': { schema: { $ref: '#/components/schemas/TaskDefinitionItem' } } } },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/key-results/{id}/check-ins': {
      post: {
        operationId: 'createKeyResultCheckIn',
        summary: 'Create a KR check-in',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateCheckInRequest' } } } },
        responses: {
          '201': { description: 'Check-in created', content: { 'application/json': { schema: { $ref: '#/components/schemas/CheckInItem' } } } },
          '400': { description: 'Bad request' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/okr/periods': {
      get: {
        operationId: 'listOkrPeriods',
        summary: 'List OKR periods',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        responses: {
          '200': { description: 'OKR periods', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/OkrPeriod' } } } } },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
      post: {
        operationId: 'createOkrPeriod',
        summary: 'Create OKR period',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/OkrPeriodWriteRequest' } } } },
        responses: {
          '201': { description: 'Created OKR period', content: { 'application/json': { schema: { $ref: '#/components/schemas/OkrPeriod' } } } },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/okr/periods/{id}': {
      get: {
        operationId: 'getOkrPeriod',
        summary: 'Get OKR period',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        responses: {
          '200': { description: 'OKR period', content: { 'application/json': { schema: { $ref: '#/components/schemas/OkrPeriod' } } } },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      patch: {
        operationId: 'updateOkrPeriod',
        summary: 'Update OKR period',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/OkrPeriodWriteRequest' } } } },
        responses: {
          '200': { description: 'Updated OKR period', content: { 'application/json': { schema: { $ref: '#/components/schemas/OkrPeriod' } } } },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/okr/periods/{id}/archive': {
      post: {
        operationId: 'archiveOkrPeriod',
        summary: 'Archive OKR period',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        responses: {
          '200': { description: 'Archived OKR period', content: { 'application/json': { schema: { $ref: '#/components/schemas/OkrPeriod' } } } },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/okr/periods/{id}/objectives': {
      get: {
        operationId: 'listOkrPeriodObjectives',
        summary: 'List objectives in an OKR period',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        responses: {
          '200': { description: 'Objectives', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/OkrObjective' } } } } },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/okr/objectives': {
      post: {
        operationId: 'createOkrObjective',
        summary: 'Create OKR objective',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/OkrObjectiveWriteRequest' } } } },
        responses: {
          '201': { description: 'Created objective', content: { 'application/json': { schema: { $ref: '#/components/schemas/OkrObjective' } } } },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/okr/objectives/{id}': {
      get: {
        operationId: 'getOkrObjective',
        summary: 'Get OKR objective',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        responses: {
          '200': { description: 'Objective', content: { 'application/json': { schema: { $ref: '#/components/schemas/OkrObjective' } } } },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      patch: {
        operationId: 'updateOkrObjective',
        summary: 'Update OKR objective',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/OkrObjectiveWriteRequest' } } } },
        responses: {
          '200': { description: 'Updated objective', content: { 'application/json': { schema: { $ref: '#/components/schemas/OkrObjective' } } } },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/okr/objectives/{id}/archive': {
      post: {
        operationId: 'archiveOkrObjective',
        summary: 'Archive OKR objective',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        responses: {
          '200': { description: 'Archived objective', content: { 'application/json': { schema: { $ref: '#/components/schemas/OkrObjective' } } } },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/okr/key-results': {
      post: {
        operationId: 'createOkrKeyResult',
        summary: 'Create OKR key result',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/OkrKeyResultWriteRequest' } } } },
        responses: {
          '201': { description: 'Created key result', content: { 'application/json': { schema: { $ref: '#/components/schemas/OkrKeyResult' } } } },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/okr/key-results/{id}': {
      get: {
        operationId: 'getOkrKeyResult',
        summary: 'Get OKR key result',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        responses: {
          '200': { description: 'Key result', content: { 'application/json': { schema: { $ref: '#/components/schemas/OkrKeyResult' } } } },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      patch: {
        operationId: 'updateOkrKeyResult',
        summary: 'Update OKR key result',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/OkrKeyResultWriteRequest' } } } },
        responses: {
          '200': { description: 'Updated key result', content: { 'application/json': { schema: { $ref: '#/components/schemas/OkrKeyResult' } } } },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/okr/key-results/{id}/archive': {
      post: {
        operationId: 'archiveOkrKeyResult',
        summary: 'Archive OKR key result',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        responses: {
          '200': { description: 'Archived key result', content: { 'application/json': { schema: { $ref: '#/components/schemas/OkrKeyResult' } } } },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/okr/key-results/{id}/check-ins': {
      get: {
        operationId: 'listOkrKeyResultCheckIns',
        summary: 'List KR check-ins',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        responses: {
          '200': { description: 'Check-ins', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/CheckInItem' } } } } },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      post: {
        operationId: 'createOkrKeyResultCheckIn',
        summary: 'Create namespaced KR check-in',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateCheckInRequest' } } } },
        responses: {
          '201': { description: 'Check-in created', content: { 'application/json': { schema: { $ref: '#/components/schemas/CheckInItem' } } } },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/reviews/weekly/draft': {
      post: {
        operationId: 'generateWeeklyReviewDraft',
        summary: 'Generate weekly review draft',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/GenerateReviewDraftRequest' } } } },
        responses: {
          '200': { description: 'Weekly review draft', content: { 'application/json': { schema: { $ref: '#/components/schemas/ReviewDraftResponse' } } } },
          '400': { description: 'Bad request' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/reviews': {
      get: {
        operationId: 'listReviews',
        summary: 'List reviews',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        responses: {
          '200': { description: 'Reviews', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/ReviewItem' } } } } },
          '401': { description: 'Unauthorized' },
        },
      },
      post: {
        operationId: 'saveReviewDraft',
        summary: 'Save review draft',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/SaveReviewDraftRequest' } } } },
        responses: {
          '201': { description: 'Saved review draft', content: { 'application/json': { schema: { $ref: '#/components/schemas/ReviewItem' } } } },
          '400': { description: 'Bad request' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/reviews/{id}': {
      get: {
        operationId: 'getReview',
        summary: 'Get review detail',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        responses: {
          '200': { description: 'Review detail', content: { 'application/json': { schema: { $ref: '#/components/schemas/ReviewItem' } } } },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      patch: {
        operationId: 'updateReview',
        summary: 'Update or finalize a review',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateReviewRequest' } } } },
        responses: {
          '200': { description: 'Updated review', content: { 'application/json': { schema: { $ref: '#/components/schemas/ReviewItem' } } } },
          '400': { description: 'Bad request' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Not found' },
        },
      },
    },
    '/reviews/{id}/finalize': {
      post: {
        operationId: 'finalizeReview',
        summary: 'Finalize review',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        responses: {
          '200': { description: 'Finalized review', content: { 'application/json': { schema: { $ref: '#/components/schemas/ReviewItem' } } } },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
          '409': { $ref: '#/components/responses/Conflict' },
        },
      },
    },
    '/reviews/{id}/archive': {
      post: {
        operationId: 'archiveReview',
        summary: 'Archive review',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        responses: {
          '200': { description: 'Archived review', content: { 'application/json': { schema: { $ref: '#/components/schemas/ReviewItem' } } } },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/reviews/context': {
      get: {
        operationId: 'getReviewContext',
        summary: 'Get review context for Hermes or CLI',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'period'], default: 'daily' } },
          { name: 'start', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'end', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: {
          '200': { description: 'Review context', content: { 'application/json': { schema: { $ref: '#/components/schemas/ReviewContextResponse' } } } },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/activity': {
      get: {
        operationId: 'listActivity',
        summary: 'List activity records',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [
          { name: 'start', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'end', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'targetType', in: 'query', schema: { type: 'string', enum: ['task', 'objective', 'key_result', 'period', 'review', 'api_token', 'system'] } },
          { name: 'targetId', in: 'query', schema: { type: 'string' } },
          { name: 'actorType', in: 'query', schema: { type: 'string', enum: ['user', 'api_token', 'agent', 'system', 'unknown'] } },
          { name: 'actorId', in: 'query', schema: { type: 'string' } },
          { name: 'source', in: 'query', schema: { type: 'string', enum: ['web', 'api', 'cli', 'hermes', 'agent', 'system', 'unknown'] } },
          { name: 'action', in: 'query', schema: { type: 'string' } },
          { name: 'keyword', in: 'query', schema: { type: 'string' } },
          { name: 'changedField', in: 'query', schema: { type: 'string' } },
          { name: 'cursor', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100 } },
        ],
        responses: {
          '200': { description: 'Activity list', content: { 'application/json': { schema: { $ref: '#/components/schemas/ActivityListResponse' } } } },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer' },
      cookieAuth: { type: 'apiKey', in: 'cookie', name: 'session_token' },
    },
    parameters: {
      IdPath: { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
    },
    responses: {
      BadRequest: { description: 'Bad request', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      Unauthorized: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      NotFound: { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      Conflict: { description: 'Conflict', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: { error: { type: 'string' } },
        required: ['error'],
      },
      UserResponse: {
        type: 'object',
        properties: { id: { type: 'string', format: 'uuid' }, email: { type: 'string' }, name: { type: 'string' } },
        required: ['id', 'email', 'name'],
      },
      ActivityDiffEntry: {
        type: 'object',
        properties: {
          field: { type: 'string' },
          label: { type: 'string' },
          before: {},
          after: {},
          beforeLabel: { type: 'string' },
          afterLabel: { type: 'string' },
        },
        required: ['field', 'label', 'before', 'after'],
      },
      ActivityRow: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          actorType: { type: 'string', enum: ['user', 'api_token', 'agent', 'system', 'unknown'] },
          actorId: { type: ['string', 'null'] },
          actorLabel: { type: ['string', 'null'] },
          action: { type: 'string' },
          targetType: { type: ['string', 'null'], enum: ['task', 'objective', 'key_result', 'period', 'review', 'api_token', 'system', null] },
          targetId: { type: ['string', 'null'] },
          targetTitle: { type: ['string', 'null'] },
          source: { type: ['string', 'null'], enum: ['web', 'api', 'cli', 'hermes', 'agent', 'system', 'unknown', null] },
          sourceLabel: { type: ['string', 'null'] },
          summary: { type: ['string', 'null'] },
          changedFields: { type: 'array', items: { type: 'string' } },
          diff: { type: 'array', items: { $ref: '#/components/schemas/ActivityDiffEntry' } },
          metadata: { type: ['object', 'null'], additionalProperties: true },
        },
        required: ['id', 'createdAt', 'actorType', 'actorId', 'actorLabel', 'action', 'targetType', 'targetId', 'targetTitle', 'source', 'sourceLabel', 'summary', 'changedFields', 'diff', 'metadata'],
      },
      ActivityListResponse: {
        type: 'object',
        properties: {
          items: { type: 'array', items: { $ref: '#/components/schemas/ActivityRow' } },
          nextCursor: { type: ['string', 'null'] },
        },
        required: ['items', 'nextCursor'],
      },
      ExampleItem: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          status: { type: 'string' },
          notes: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'title', 'status', 'createdAt', 'updatedAt'],
      },
      CreateExampleRequest: {
        type: 'object',
        properties: { title: { type: 'string' }, status: { type: 'string' }, notes: { type: 'string' } },
        required: ['title'],
      },
      UpdateExampleRequest: {
        type: 'object',
        properties: { title: { type: 'string' }, status: { type: 'string' }, notes: { type: 'string' } },
      },
      KeyResultRef: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
        },
        required: ['id', 'title'],
      },
      TaskLink: {
        type: 'object',
        properties: {
          keyResult: { $ref: '#/components/schemas/KeyResultRef' },
        },
        required: ['keyResult'],
      },
      TaskItem: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          notes: { type: ['string', 'null'] },
          description: { type: ['string', 'null'] },
          status: { type: 'string' },
          dueDate: { type: ['string', 'null'], format: 'date' },
          completedAt: { type: ['string', 'null'], format: 'date-time' },
          important: { type: 'boolean' },
          urgent: { type: 'boolean' },
          priority: { type: ['string', 'null'] },
          energy: { type: ['string', 'null'] },
          keyResultLinks: { type: 'array', items: { $ref: '#/components/schemas/TaskLink' } },
        },
        required: ['id', 'title', 'status', 'important', 'urgent'],
      },
      TaskWriteRequest: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          notes: { type: ['string', 'null'] },
          description: { type: ['string', 'null'] },
          listId: { type: ['string', 'null'], format: 'uuid' },
          dueDate: { type: ['string', 'null'], format: 'date' },
          priority: { type: ['string', 'null'], enum: ['P1', 'P2', 'P3', null] },
          energy: { type: ['string', 'null'], enum: ['low', 'medium', 'high', null] },
          completedAt: { oneOf: [{ type: 'string', format: 'date-time' }, { type: 'boolean' }, { type: 'null' }] },
          keyResultIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
        },
      },
      TaskDefinitionKeyResultLink: {
        type: 'object',
        properties: {
          keyResultId: { type: 'string', format: 'uuid' },
          countsTowardCommitment: { type: 'boolean' },
          keyResult: { $ref: '#/components/schemas/KeyResultRef' },
        },
        required: ['keyResultId'],
      },
      TaskDefinitionWriteRequest: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: ['string', 'null'] },
          listId: { type: 'string', format: 'uuid' },
          frequency: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'weekdays', 'weekends'] },
          endType: { type: 'string', enum: ['never', 'until_date', 'after_count'] },
          endDate: { type: ['string', 'null'], format: 'date' },
          occurrenceCount: { type: ['integer', 'null'] },
          targetDate: { type: 'string', format: 'date' },
          keyResultLinks: { type: 'array', items: { $ref: '#/components/schemas/TaskDefinitionKeyResultLink' } },
        },
      },
      TaskDefinitionItem: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          description: { type: ['string', 'null'] },
          listId: { type: 'string', format: 'uuid' },
          frequency: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'weekdays', 'weekends'] },
          endType: { type: 'string', enum: ['never', 'until_date', 'after_count'] },
          endDate: { type: ['string', 'null'], format: 'date' },
          occurrenceCount: { type: ['integer', 'null'] },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          list: {
            type: ['object', 'null'],
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              slug: { type: 'string' },
            },
          },
          keyResultLinks: { type: 'array', items: { $ref: '#/components/schemas/TaskDefinitionKeyResultLink' } },
          tasks: { type: 'array', items: { $ref: '#/components/schemas/TaskDefinitionOccurrenceItem' } },
        },
        required: ['id', 'title', 'listId', 'frequency', 'endType', 'createdAt', 'updatedAt'],
      },
      TaskDefinitionOccurrenceItem: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          description: { type: ['string', 'null'] },
          status: { type: 'string' },
          dueDate: { type: ['string', 'null'], format: 'date' },
          occurrenceDate: { type: ['string', 'null'], format: 'date' },
          completedAt: { type: ['string', 'null'], format: 'date-time' },
          archivedAt: { type: ['string', 'null'], format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'title', 'status', 'createdAt', 'updatedAt'],
      },
      MoveTaskQuadrantRequest: {
        type: 'object',
        properties: { quadrant: { type: 'string', enum: ['Q1', 'Q2', 'Q3', 'Q4'] } },
        required: ['quadrant'],
      },
      TaskReminderResponse: {
        type: 'object',
        properties: {
          today: { type: 'string', format: 'date' },
          to: { type: 'string', format: 'date' },
          items: { type: 'array', items: { $ref: '#/components/schemas/TaskItem' } },
        },
        required: ['today', 'to', 'items'],
      },
      CurrentOkrSummary: {
        type: ['object', 'null'],
        properties: {
          period: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
            },
            required: ['id', 'name'],
          },
          objectiveCount: { type: 'integer' },
          keyResultCount: { type: 'integer' },
          activeKeyResultCount: { type: 'integer' },
        },
      },
      OkrPeriod: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          type: { type: 'string', enum: ['year', 'quarter', 'month', 'custom'] },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
          status: { type: 'string', enum: ['active', 'archived'] },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'name', 'type', 'startDate', 'endDate', 'status'],
      },
      OkrPeriodWriteRequest: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          type: { type: 'string', enum: ['year', 'quarter', 'month', 'custom'] },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
          status: { type: 'string', enum: ['active', 'archived'] },
        },
      },
      OkrObjective: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          periodId: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          description: { type: ['string', 'null'] },
          status: { type: 'string', enum: ['active', 'done', 'archived'] },
          sortOrder: { type: 'number' },
          keyResults: { type: 'array', items: { $ref: '#/components/schemas/OkrKeyResult' } },
        },
        required: ['id', 'periodId', 'title', 'status'],
      },
      OkrObjectiveWriteRequest: {
        type: 'object',
        properties: {
          periodId: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          description: { type: ['string', 'null'] },
          status: { type: 'string', enum: ['active', 'done', 'archived'] },
          sortOrder: { type: 'number' },
        },
      },
      OkrKeyResult: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          objectiveId: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          description: { type: ['string', 'null'] },
          status: { type: 'string', enum: ['active', 'at_risk', 'done', 'archived'] },
        },
        required: ['id', 'objectiveId', 'title', 'status'],
      },
      OkrKeyResultWriteRequest: {
        type: 'object',
        properties: {
          objectiveId: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          description: { type: ['string', 'null'] },
          status: { type: 'string', enum: ['active', 'at_risk', 'done', 'archived'] },
        },
      },
      CreateCheckInRequest: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          blockers: { type: 'string' },
          nextActions: { type: 'string' },
        },
      },
      CheckInItem: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          keyResultId: { type: 'string', format: 'uuid' },
          summary: { type: ['string', 'null'] },
          blockers: { type: ['string', 'null'] },
          nextActions: { type: ['string', 'null'] },
          createdAt: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'keyResultId', 'createdAt'],
      },
      GenerateReviewDraftRequest: {
        type: 'object',
        properties: {
          periodStart: { type: 'string', format: 'date' },
          periodEnd: { type: 'string', format: 'date' },
        },
        required: ['periodStart', 'periodEnd'],
      },
      ReviewDraftResponse: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          periodStart: { type: 'string', format: 'date' },
          periodEnd: { type: 'string', format: 'date' },
          title: { type: 'string' },
          body: { type: 'string' },
          structuredSummary: { type: 'object', additionalProperties: true },
          keyResultIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
        },
        required: ['type', 'periodStart', 'periodEnd', 'title', 'body', 'structuredSummary', 'keyResultIds'],
      },
      SaveReviewDraftRequest: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['weekly', 'monthly', 'period'] },
          periodStart: { type: 'string', format: 'date' },
          periodEnd: { type: 'string', format: 'date' },
          title: { type: 'string' },
          body: { type: 'string' },
          structuredSummary: { type: 'object', additionalProperties: true },
          keyResultIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
        },
        required: ['type', 'periodStart', 'periodEnd', 'title', 'body', 'structuredSummary', 'keyResultIds'],
      },
      UpdateReviewRequest: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          body: { type: 'string' },
          structuredSummary: { type: 'object', additionalProperties: true },
          status: { type: 'string', enum: ['draft', 'final'] },
        },
      },
      ReviewSnapshot: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          reviewId: { type: 'string', format: 'uuid' },
          keyResultId: { type: 'string', format: 'uuid' },
          snapshot: { type: 'object', additionalProperties: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'reviewId', 'keyResultId', 'snapshot', 'createdAt'],
      },
      ReviewItem: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          type: { type: 'string' },
          periodStart: { type: 'string', format: 'date' },
          periodEnd: { type: 'string', format: 'date' },
          status: { type: 'string' },
          title: { type: 'string' },
          body: { type: 'string' },
          structuredSummary: { type: ['object', 'null'], additionalProperties: true },
          krSnapshots: { type: 'array', items: { $ref: '#/components/schemas/ReviewSnapshot' } },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'type', 'periodStart', 'periodEnd', 'status', 'title', 'body', 'createdAt', 'updatedAt'],
      },
      ReviewContextResponse: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'period'] },
          periodStart: { type: 'string', format: 'date' },
          periodEnd: { type: 'string', format: 'date' },
          tasks: {
            type: 'object',
            properties: {
              completedTasks: { type: 'array', items: { $ref: '#/components/schemas/TaskItem' } },
              openTodayDueTasks: { type: 'array', items: { $ref: '#/components/schemas/TaskItem' } },
            },
            required: ['completedTasks', 'openTodayDueTasks'],
          },
          okr: {
            type: 'object',
            properties: {
              current: { $ref: '#/components/schemas/CurrentOkrSummary' },
              checkIns: { type: 'array', items: { $ref: '#/components/schemas/CheckInItem' } },
            },
            required: ['current', 'checkIns'],
          },
          reviews: { type: 'array', items: { $ref: '#/components/schemas/ReviewItem' } },
        },
        required: ['type', 'periodStart', 'periodEnd', 'tasks', 'okr', 'reviews'],
      },
    },
  },
} as const;

export type V1Spec = typeof v1Spec;
