# Contributing to SDBA Admin System

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to the project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style Guidelines](#code-style-guidelines)
- [Testing Requirements](#testing-requirements)
- [Documentation](#documentation)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)

## 📜 Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Respect different viewpoints and experiences

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Git
- A Supabase account (for testing)
- Basic knowledge of Next.js, React, and TypeScript

### Setting Up Development Environment

1. **Fork the repository**

   Click the "Fork" button on GitHub to create your own copy.

2. **Clone your fork**

   ```bash
   git clone https://github.com/your-username/SDBA_admin_system-3.git
   cd SDBA_admin_system-3
   ```

3. **Add upstream remote**

   ```bash
   git remote add upstream https://github.com/original-owner/SDBA_admin_system-3.git
   ```

4. **Install dependencies**

   ```bash
   npm install
   ```

5. **Set up environment variables**

   Copy `.env.example` to `.env.local` and fill in your values.

6. **Set up database**

   Run `db_schema/main.sql` in your Supabase SQL Editor.

7. **Start development server**

   ```bash
   npm run dev
   ```

## 🔄 Development Workflow

### Branch Strategy

- **`main`**: Production-ready code (protected)
- **`application-form`**: Application form feature branch
- **Feature branches**: `feature/description` (e.g., `feature/add-export-filter`)
- **Bug fixes**: `fix/description` (e.g., `fix/csrf-token-validation`)
- **Documentation**: `docs/description` (e.g., `docs/update-api-docs`)

### Creating a Feature Branch

```bash
# Update main branch
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name

# Make your changes
# ...

# Commit and push
git add .
git commit -m "feat: add your feature"
git push origin feature/your-feature-name
```

### Keeping Your Branch Updated

```bash
# Fetch latest changes
git fetch upstream

# Rebase your branch on main
git checkout feature/your-feature-name
git rebase upstream/main

# Resolve conflicts if any
# ...

# Force push (only on your fork)
git push origin feature/your-feature-name --force-with-lease
```

## 📝 Code Style Guidelines

### TypeScript

- **Use strict mode**: Always enable TypeScript strict mode
- **Avoid `any`**: Use proper types or `unknown` if necessary
- **Type everything**: Functions, variables, and return types
- **Use interfaces for objects**: Prefer `interface` over `type` for object shapes

```typescript
// ✅ Good
interface User {
  id: string;
  email: string;
}

function getUser(id: string): Promise<User> {
  // ...
}

// ❌ Bad
function getUser(id: any): any {
  // ...
}
```

### React Components

- **Use functional components**: Prefer function components over class components
- **Use TypeScript**: All components should be typed
- **Extract reusable logic**: Use custom hooks for shared logic
- **Keep components small**: Single responsibility principle

```typescript
// ✅ Good
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export function Button({ label, onClick, disabled = false }: ButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
}

// ❌ Bad
export function Button(props: any) {
  return <button {...props} />;
}
```

### File Organization

- **One component per file**: Each component in its own file
- **Co-locate related files**: Keep tests, styles, and components together when possible
- **Use index files**: Export from `index.ts` for cleaner imports

### Naming Conventions

- **Files**: `kebab-case.ts` or `PascalCase.tsx` for components
- **Components**: `PascalCase`
- **Functions**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Types/Interfaces**: `PascalCase`

### Import Organization

```typescript
// 1. External dependencies
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// 2. Internal modules (absolute imports)
import { checkAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/api-errors";

// 3. Relative imports
import { Button } from "./Button";
```

### Comments and Documentation

- **JSDoc for public functions**: Document parameters and return types
- **Explain "why", not "what"**: Comments should explain reasoning, not obvious code
- **Keep comments up to date**: Remove outdated comments

```typescript
/**
 * Checks if a user has admin privileges.
 * 
 * @param user - The user object from Supabase Auth
 * @returns true if user is an admin, false otherwise
 */
export function isAdminUser(user: User | null): boolean {
  // ...
}
```

## 🧪 Testing Requirements

### Test Coverage

- **Target**: 80%+ coverage for critical paths
- **Required**: All API routes must have integration tests
- **Required**: All utility functions must have unit tests
- **Recommended**: Component tests for complex UI components

### Writing Tests

**Unit Test Example:**
```typescript
// lib/__tests__/auth.test.ts
import { isAdminUser } from '@/lib/auth';

describe('isAdminUser', () => {
  it('should return true for admin user', () => {
    const user = { app_metadata: { role: 'admin' } };
    expect(isAdminUser(user)).toBe(true);
  });

  it('should return false for non-admin user', () => {
    const user = { app_metadata: { role: 'user' } };
    expect(isAdminUser(user)).toBe(false);
  });
});
```

**Integration Test Example:**
```typescript
// app/api/admin/__tests__/approve.test.ts
import { createTestRequest, mockAuthenticatedAdmin } from '@/lib/test-utils';
import { POST } from '@/app/api/admin/approve/route';

describe('POST /api/admin/approve', () => {
  beforeEach(() => {
    mockAuthenticatedAdmin();
  });

  it('should approve a registration', async () => {
    const req = createTestRequest('POST', '/api/admin/approve', {
      registration_id: 'test-id',
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 📚 Documentation

### Updating Documentation

- **API changes**: Update `docs/openapi.yaml`
- **New features**: Update relevant `.md` files
- **Breaking changes**: Document in `MIGRATION_GUIDE.md`
- **Code comments**: Add JSDoc for public functions

### Documentation Files

- **README.md**: Project overview and getting started
- **API.md**: API documentation
- **ARCHITECTURE.md**: System architecture
- **DEPLOYMENT.md**: Deployment instructions
- **SECURITY.md**: Security guidelines
- **docs/API_DOCUMENTATION.md**: API documentation setup

### Generating Documentation

```bash
# Generate TypeScript types from OpenAPI
npm run generate:api-types

# Generate Postman collection
npm run generate:postman
```

## 🔀 Pull Request Process

### Before Submitting

1. **Update your branch**: Rebase on latest `main`
2. **Run tests**: `npm test`
3. **Run linter**: `npm run lint`
4. **Check coverage**: `npm run test:coverage`
5. **Update documentation**: If needed
6. **Test manually**: Verify your changes work

### PR Checklist

- [ ] Code follows style guidelines
- [ ] Tests added/updated and passing
- [ ] Documentation updated
- [ ] No console.logs or debug code
- [ ] No breaking changes (or documented)
- [ ] Commit messages follow convention

### PR Title Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples:**
- `feat(api): add rate limiting to admin endpoints`
- `fix(auth): resolve CSRF token validation issue`
- `docs(readme): update installation instructions`

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Tests passing
- [ ] Documentation updated
- [ ] No breaking changes (or documented)

## Related Issues
Closes #123
```

### Review Process

1. **Automated checks**: CI/CD runs tests and linting
2. **Code review**: At least one maintainer reviews
3. **Feedback**: Address review comments
4. **Approval**: Maintainer approves PR
5. **Merge**: Squash and merge to `main`

## 🐛 Issue Reporting

### Before Creating an Issue

1. **Search existing issues**: Check if already reported
2. **Check documentation**: Verify it's not documented
3. **Reproduce**: Ensure you can reproduce the issue

### Issue Template

```markdown
## Description
Clear description of the issue

## Steps to Reproduce
1. Step one
2. Step two
3. Step three

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- Node.js version:
- npm version:
- OS:
- Browser (if applicable):

## Additional Context
Screenshots, logs, etc.
```

### Issue Labels

- `bug`: Something isn't working
- `feature`: New feature request
- `documentation`: Documentation improvements
- `question`: Questions or discussions
- `help wanted`: Extra attention needed
- `good first issue`: Good for newcomers

## 💡 Tips for Contributors

### For New Contributors

1. **Start small**: Look for `good first issue` labels
2. **Ask questions**: Don't hesitate to ask for help
3. **Read code**: Understand existing patterns
4. **Test thoroughly**: Write tests for your changes

### Best Practices

- **Keep PRs small**: Easier to review and merge
- **Write clear commits**: Use conventional commit format
- **Test locally**: Verify changes before pushing
- **Be patient**: Reviews may take time

## 📞 Getting Help

- **Documentation**: Check relevant `.md` files
- **Issues**: Search existing issues or create new one
- **Discussions**: Use GitHub Discussions for questions
- **Contact**: Reach out to maintainers

## 🙏 Thank You!

Your contributions make this project better. Thank you for taking the time to contribute!

