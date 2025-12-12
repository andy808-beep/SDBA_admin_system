#!/usr/bin/env node
// scripts/generate-postman-collection.js
// Generate Postman collection from OpenAPI specification

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Check if js-yaml is installed
try {
  require.resolve('js-yaml');
} catch (e) {
  console.error('Error: js-yaml is required. Install it with: npm install --save-dev js-yaml');
  process.exit(1);
}

// Load OpenAPI spec
const openApiPath = path.join(__dirname, '..', 'docs', 'openapi.yaml');
const openApiSpec = yaml.load(fs.readFileSync(openApiPath, 'utf8'));

// Convert OpenAPI to Postman collection format
function convertToPostman(openApi) {
  const collection = {
    info: {
      name: openApi.info.title,
      description: openApi.info.description || '',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      _exporter_id: 'sdba-admin-system',
    },
    item: [],
    variable: [
      {
        key: 'baseUrl',
        value: openApi.servers?.[0]?.url || 'http://localhost:3000',
        type: 'string',
      },
    ],
  };

  // Group endpoints by tags
  const endpointsByTag = {};

  Object.entries(openApi.paths).forEach(([path, methods]) => {
    Object.entries(methods).forEach(([method, operation]) => {
      const tags = operation.tags || ['default'];
      tags.forEach((tag) => {
        if (!endpointsByTag[tag]) {
          endpointsByTag[tag] = [];
        }
        endpointsByTag[tag].push({ path, method: method.toUpperCase(), operation });
      });
    });
  });

  // Create folders for each tag
  Object.entries(endpointsByTag).forEach(([tag, endpoints]) => {
    const folder = {
      name: tag,
      item: endpoints.map(({ path, method, operation }) => {
        const request = {
          name: operation.summary || `${method} ${path}`,
          request: {
            method: method,
            header: [],
            url: {
              raw: '{{baseUrl}}' + path,
              host: ['{{baseUrl}}'],
              path: path.split('/').filter(Boolean),
            },
          },
          response: [],
        };

        // Add description
        if (operation.description) {
          request.request.description = {
            type: 'text',
            content: operation.description,
          };
        }

        // Add headers
        if (operation.security) {
          // Add CSRF token header if required
          if (operation.security.some((s) => s.csrfToken)) {
            request.request.header.push({
              key: 'X-CSRF-Token',
              value: '{{csrfToken}}',
              type: 'text',
            });
          }
        }

        // Add request body
        if (operation.requestBody) {
          const content = operation.requestBody.content;
          const contentType = Object.keys(content)[0];
          const schema = content[contentType]?.schema;

          if (contentType === 'application/json') {
            request.request.body = {
              mode: 'raw',
              raw: JSON.stringify(
                content[contentType]?.examples
                  ? Object.values(content[contentType].examples)[0]?.value
                  : generateExampleFromSchema(schema),
                null,
                2
              ),
              options: {
                raw: {
                  language: 'json',
                },
              },
            };
            request.request.header.push({
              key: 'Content-Type',
              value: 'application/json',
              type: 'text',
            });
          }
        }

        // Add query parameters
        if (operation.parameters) {
          request.request.url.query = operation.parameters
            .filter((p) => p.in === 'query')
            .map((param) => ({
              key: param.name,
              value: param.schema?.default?.toString() || '',
              description: param.description,
            }));
        }

        // Add example responses
        if (operation.responses) {
          Object.entries(operation.responses).forEach(([statusCode, response]) => {
            if (response.content?.['application/json']) {
              request.response.push({
                name: `${statusCode} ${response.description || ''}`,
                originalRequest: {
                  method: method,
                  header: request.request.header,
                  url: request.request.url,
                },
                status: statusCode,
                code: parseInt(statusCode),
                _postman_previewlanguage: 'json',
                header: [
                  {
                    key: 'Content-Type',
                    value: 'application/json',
                  },
                ],
                body: JSON.stringify(
                  response.content['application/json'].example ||
                    response.content['application/json'].schema,
                  null,
                  2
                ),
              });
            }
          });
        }

        return request;
      }),
    };

    collection.item.push(folder);
  });

  return collection;
}

// Generate example from schema (simplified)
function generateExampleFromSchema(schema) {
  if (!schema) return {};
  if (schema.example) return schema.example;
  if (schema.type === 'object' && schema.properties) {
    const example = {};
    Object.entries(schema.properties).forEach(([key, prop]) => {
      if (prop.type === 'string') {
        example[key] = prop.format === 'uuid' ? '550e8400-e29b-41d4-a716-446655440000' : 'string';
      } else if (prop.type === 'integer') {
        example[key] = prop.default || 0;
      } else if (prop.type === 'boolean') {
        example[key] = false;
      } else if (prop.type === 'array') {
        example[key] = [];
      }
    });
    return example;
  }
  return {};
}

// Generate Postman collection
const postmanCollection = convertToPostman(openApiSpec);

// Write to file
const outputPath = path.join(__dirname, '..', 'docs', 'postman-collection.json');
fs.writeFileSync(outputPath, JSON.stringify(postmanCollection, null, 2));

console.log(`✓ Postman collection generated at ${outputPath}`);

// Generate environment template
const envTemplate = {
  name: 'SDBA Admin System',
  values: [
    {
      key: 'baseUrl',
      value: 'http://localhost:3000',
      type: 'default',
      enabled: true,
    },
    {
      key: 'csrfToken',
      value: '',
      type: 'secret',
      enabled: true,
    },
  ],
  _postman_variable_scope: 'environment',
};

const envPath = path.join(__dirname, '..', 'docs', 'postman-environment.json');
fs.writeFileSync(envPath, JSON.stringify(envTemplate, null, 2));

console.log(`✓ Postman environment template generated at ${envPath}`);

