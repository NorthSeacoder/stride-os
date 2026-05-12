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
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer' },
      cookieAuth: { type: 'apiKey', in: 'cookie', name: 'session_token' },
    },
    schemas: {
      UserResponse: {
        type: 'object',
        properties: { id: { type: 'string', format: 'uuid' }, email: { type: 'string' }, name: { type: 'string' } },
        required: ['id', 'email', 'name'],
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
      CreateCheckInRequest: {
        type: 'object',
        properties: {
          progressValue: { type: 'number' },
          confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
          summary: { type: 'string' },
          blockers: { type: 'string' },
          nextActions: { type: 'string' },
        },
        required: ['confidence'],
      },
      CheckInItem: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          keyResultId: { type: 'string', format: 'uuid' },
          progressValue: { type: ['number', 'null'] },
          confidence: { type: 'string' },
          summary: { type: ['string', 'null'] },
          blockers: { type: ['string', 'null'] },
          nextActions: { type: ['string', 'null'] },
          createdAt: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'keyResultId', 'confidence', 'createdAt'],
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
    },
  },
} as const;

export type V1Spec = typeof v1Spec;
