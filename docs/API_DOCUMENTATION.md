# API Documentation

This directory contains comprehensive API documentation for the SDBA Admin System.

## Files

- **`openapi.yaml`** - OpenAPI 3.0 specification file containing all API endpoints, schemas, and examples
- **`postman-collection.json`** - Postman collection for testing API endpoints
- **`postman-environment.json`** - Postman environment template with variables

## Viewing API Documentation

### Interactive Swagger UI

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to `/api-docs` in your browser (admin access required)

3. The Swagger UI provides:
   - Interactive API testing with "Try it out" functionality
   - Request/response examples
   - Schema documentation
   - Authentication support

### OpenAPI Specification

The OpenAPI specification can be viewed using any OpenAPI-compatible tool:

- **Swagger Editor**: https://editor.swagger.io/ (paste `docs/openapi.yaml`)
- **Redoc**: https://redocly.github.io/redoc/ (paste `docs/openapi.yaml`)
- **Postman**: Import `docs/openapi.yaml` directly

## Generating TypeScript Types

Generate TypeScript types from the OpenAPI specification:

```bash
npm run generate:api-types
```

This will create `types/api-generated.ts` with TypeScript interfaces for all API requests and responses.

**Note**: Regenerate types whenever the OpenAPI specification is updated.

## Postman Collection

### Importing the Collection

1. Open Postman
2. Click "Import"
3. Select `docs/postman-collection.json`
4. Import `docs/postman-environment.json` as an environment

### Using the Collection

1. Set the `baseUrl` variable in your Postman environment:
   - Development: `http://localhost:3000`
   - Production: `https://your-domain.com`

2. For authenticated requests:
   - Log in through the application to get session cookies
   - Postman will automatically include cookies for authenticated requests

3. For CSRF-protected requests:
   - Get a CSRF token from `GET /api/csrf-token`
   - Set the `csrfToken` variable in your environment
   - The collection automatically includes `X-CSRF-Token` header

### Regenerating the Collection

If you update the OpenAPI specification, regenerate the Postman collection:

```bash
npm run generate:postman
```

## API Endpoints

### Public Endpoints

- **`POST /api/public/register`** - Register a new team (no authentication required)

### Admin Endpoints (Require Authentication)

- **`GET /api/admin/list`** - List registrations with filtering and pagination
- **`GET /api/admin/counters`** - Get registration statistics
- **`POST /api/admin/approve`** - Approve a registration
- **`POST /api/admin/reject`** - Reject a registration
- **`POST /api/admin/export`** - Export team data as CSV

### Auth Endpoints

- **`GET /api/csrf-token`** - Get CSRF token for state-changing requests

## Authentication

### Admin Endpoints

Admin endpoints require:
1. **Session Cookie**: Supabase session cookie (`sb-access-token`) set automatically on login
2. **CSRF Token** (for POST/PUT/DELETE/PATCH): Include `X-CSRF-Token` header with token from `/api/csrf-token`

### Example Request

```bash
# Get CSRF token
curl -X GET http://localhost:3000/api/csrf-token \
  -c cookies.txt

# Approve registration (with CSRF token)
curl -X POST http://localhost:3000/api/admin/approve \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: <token-from-csrf-endpoint>" \
  -b cookies.txt \
  -d '{
    "registration_id": "550e8400-e29b-41d4-a716-446655440000",
    "notes": "Approved"
  }'
```

## Rate Limiting

- **Public API**: 10 requests per 10 seconds per IP
- **Admin API**: 100 requests per minute per authenticated user

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum number of requests
- `X-RateLimit-Remaining`: Remaining requests in the current window
- `X-RateLimit-Reset`: Time when the rate limit resets

## Error Responses

All errors follow a consistent format:

```json
{
  "ok": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### Common Error Codes

- `BAD_REQUEST` (400) - Invalid request parameters
- `FORBIDDEN` (403) - Authentication required or insufficient permissions
- `NOT_FOUND` (404) - Resource not found
- `CONFLICT` (409) - Resource conflict (e.g., already processed)
- `VALIDATION_ERROR` (422) - Request validation failed
- `CSRF_ERROR` (403) - CSRF token validation failed
- `RATE_LIMIT_EXCEEDED` (429) - Rate limit exceeded
- `INTERNAL_ERROR` (500) - Internal server error

## Versioning

Currently, all endpoints are under `/api/*`. Future versions will use `/api/v1/*`, `/api/v2/*`, etc.

When versioning is introduced:
- Old endpoints will be deprecated with a `Deprecation` header
- New endpoints will be documented in the OpenAPI spec
- Migration guides will be provided

## Updating Documentation

1. **Update OpenAPI Spec**: Edit `docs/openapi.yaml`
2. **Regenerate Types**: Run `npm run generate:api-types`
3. **Regenerate Postman Collection**: Run `npm run generate:postman`
4. **Update JSDoc Comments**: Add `@swagger` comments to route handlers (optional, for auto-generation)

## Best Practices

1. **Always use TypeScript types** from `types/api-generated.ts` for type safety
2. **Test endpoints** using the Postman collection before deploying
3. **Keep OpenAPI spec updated** when adding/modifying endpoints
4. **Document breaking changes** in the OpenAPI spec and release notes
5. **Use CSRF tokens** for all state-changing requests
6. **Handle rate limits** gracefully in client applications

## Support

For API-related questions or issues, please refer to:
- OpenAPI specification: `docs/openapi.yaml`
- Interactive documentation: `/api-docs` (when server is running)
- Postman collection: `docs/postman-collection.json`

