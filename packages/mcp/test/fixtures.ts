export const petstore = {
  openapi: '3.1.0',
  info: { title: 'Pets', version: '1.0.0' },
  paths: {
    '/pets': {
      post: {
        operationId: 'createPet',
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/NewPet' },
            },
          },
        },
        responses: { '201': { description: 'Created' } },
      },
    },
  },
  components: {
    schemas: {
      NewPet: {
        type: 'object',
        required: ['name'],
        properties: {
          id: { type: 'integer', readOnly: true },
          name: { type: 'string', maxLength: 40 },
          status: {
            type: 'string',
            enum: ['available', 'sold'],
            default: 'available',
          },
          ownerEmail: { type: 'string', format: 'email' },
        },
      },
    },
  },
};
