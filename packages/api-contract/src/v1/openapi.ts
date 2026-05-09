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
    },
  },
} as const;

export type V1Spec = typeof v1Spec;
