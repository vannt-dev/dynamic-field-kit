import type { OpenApiDocument } from '../../src/openApi';

/**
 * A small Petstore in OpenAPI 3.0: `nullable`, boolean `exclusiveMinimum`,
 * `allOf` with a `$ref`, request bodies by `$ref`, and an upload that is not
 * JSON.
 */
export const petstore30: OpenApiDocument = {
  openapi: '3.0.3',
  info: { title: 'Petstore', version: '1.0.0' },
  paths: {
    '/pets': {
      post: {
        operationId: 'createPet',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/NewPet' },
            },
          },
        },
        responses: { '201': { description: 'Created' } },
      },
    },
    '/pets/{petId}': {
      put: {
        operationId: 'updatePet',
        requestBody: { $ref: '#/components/requestBodies/PetBody' },
        responses: { '200': { description: 'OK' } },
      },
      patch: {
        requestBody: {
          content: {
            'application/merge-patch+json; charset=utf-8': {
              schema: {
                type: 'object',
                properties: { name: { type: 'string' } },
              },
            },
          },
        },
        responses: { '200': { description: 'OK' } },
      },
      delete: {
        operationId: 'deletePet',
        responses: { '204': { description: 'Deleted' } },
      },
    },
    '/pets/{petId}/photo': {
      post: {
        operationId: 'uploadPhoto',
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: { file: { type: 'string', format: 'binary' } },
              },
            },
          },
        },
        responses: { '200': { description: 'OK' } },
      },
    },
    '/pets/batch': {
      post: {
        operationId: 'createPets',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: { $ref: '#/components/schemas/NewPet' },
              },
            },
          },
        },
        responses: { '200': { description: 'OK' } },
      },
    },
    '/owners': {
      post: {
        operationId: 'createOwner',
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: 'owner.yaml#/Owner' },
            },
          },
        },
        responses: { '200': { description: 'OK' } },
      },
    },
  },
  components: {
    requestBodies: {
      PetBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Pet' },
          },
        },
      },
    },
    schemas: {
      NewPet: {
        type: 'object',
        required: ['name', 'status'],
        properties: {
          name: { type: 'string', maxLength: 40 },
          status: {
            type: 'string',
            enum: ['available', 'pending', 'sold'],
            default: 'available',
          },
          ownerEmail: { type: 'string', format: 'email' },
          birthday: { type: 'string', format: 'date' },
          lastVisit: { type: 'string', format: 'date-time' },
          homepage: { type: 'string', format: 'uri' },
          nickname: { type: 'string', nullable: true },
          weight: {
            type: 'number',
            minimum: 0,
            exclusiveMinimum: true,
          },
          category: {
            nullable: true,
            allOf: [{ $ref: '#/components/schemas/Category' }],
          },
          tags: {
            type: 'array',
            items: { $ref: '#/components/schemas/Tag' },
          },
        },
      },
      Pet: {
        allOf: [
          { $ref: '#/components/schemas/NewPet' },
          {
            type: 'object',
            required: ['id'],
            properties: {
              id: { type: 'integer', format: 'int64', readOnly: true },
              createdAt: {
                type: 'string',
                format: 'date-time',
                readOnly: true,
              },
            },
          },
        ],
      },
      Category: {
        type: 'object',
        properties: {
          id: { type: 'integer', readOnly: true },
          name: { type: 'string' },
        },
      },
      Tag: {
        type: 'object',
        required: ['label'],
        properties: { label: { type: 'string' } },
      },
      Owner: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          address: { $ref: 'common.yaml#/Address' },
        },
      },
    },
  },
};

/**
 * The same store in OpenAPI 3.1: type arrays instead of `nullable`, a numeric
 * `exclusiveMinimum`, and a path item reused through `$ref`.
 */
export const petstore31: OpenApiDocument = {
  openapi: '3.1.0',
  info: { title: 'Petstore', version: '1.0.0' },
  paths: {
    '/pets': { $ref: '#/components/pathItems/Pets' },
  },
  components: {
    pathItems: {
      Pets: {
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
    schemas: {
      NewPet: {
        type: 'object',
        required: ['name'],
        properties: {
          id: { type: 'integer', readOnly: true },
          name: { type: 'string', minLength: 1 },
          status: {
            type: ['string', 'null'],
            enum: ['available', 'pending', 'sold', null],
          },
          nickname: { type: ['string', 'null'], maxLength: 12 },
          ownerEmail: { type: ['string', 'null'], format: 'email' },
          weight: { type: 'number', exclusiveMinimum: 0 },
          address: { $ref: '#/components/schemas/Address' },
        },
      },
      Address: {
        type: 'object',
        required: ['city'],
        properties: {
          street: { type: 'string' },
          city: { type: 'string' },
        },
      },
    },
  },
};
