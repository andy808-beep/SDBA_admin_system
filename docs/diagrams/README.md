# Architecture Diagrams

This directory contains architecture diagrams for the SDBA Admin System.

## Diagrams

### System Architecture

The main system architecture diagram shows the overall structure of the application, including:
- Client layer (Browser, React components)
- API layer (Next.js routes, middleware)
- Business logic layer (utilities, services)
- Data layer (Supabase, PostgreSQL)

See [ARCHITECTURE.md](../../ARCHITECTURE.md) for the full diagram.

### Request Flow

The request flow diagram illustrates how requests are processed through the system:
1. Client sends HTTP request
2. Middleware processes (rate limiting, CSRF, auth)
3. API route handles request
4. Business logic executes
5. Database query executes
6. Response returned to client

See [ARCHITECTURE.md](../../ARCHITECTURE.md) for the full diagram.

### Authentication Flow

The authentication flow diagram shows how users authenticate and access protected resources:
1. User submits credentials
2. Supabase Auth verifies
3. Session cookie set
4. Subsequent requests verified
5. Admin role checked
6. Access granted/denied

See [API.md](../../API.md) for the full diagram.

## Generating Diagrams

Diagrams are written in Mermaid format and can be viewed:
- In GitHub (rendered automatically)
- In Markdown viewers that support Mermaid
- Using [Mermaid Live Editor](https://mermaid.live/)

## Adding New Diagrams

1. Create a new `.md` file in this directory
2. Use Mermaid syntax for diagrams
3. Reference the diagram in relevant documentation
4. Update this README with a description

---

**Last Updated**: 2025-01-01

