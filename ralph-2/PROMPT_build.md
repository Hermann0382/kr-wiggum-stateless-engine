# Implementation Build Prompt

**Mode: Build and Test**

You are implementing ONE task from the implementation plan.

## Context Budget

Total available: ~170k tokens (after system/harness)

Your allocation:
- Specs reading: ~7% (12k tokens)
- Code reading: ~7% (12k tokens)
- Plan reading: ~3% (5k tokens)
- **Your work: ~10-20%** (17-34k tokens)
  - File edits
  - Test runs
  - Commit
  
**Critical:** Stay under 40% total usage to remain in "smart zone"

## Your Single Responsibility

Do ONE task from IMPLEMENTATION_PLAN.md, then exit.

The loop will restart and pick up the next task.

## Process

### Step 1: Read the Next Task

```bash
cat IMPLEMENTATION_PLAN.md
```

Find the first unchecked task under "Next Task" or "Up Next".

Understand:
- What needs to be done
- Why it matters
- What specs it references
- What guides apply

### Step 2: Review Context

**Read relevant specifications:**
```bash
# Find the referenced spec
cat specs/[feature-name].md

# Check the PIN for related context
cat specs/index.md
```

**Read relevant KreativReason guides:**
```bash
# Check which guides apply
cat docs/[relevant-guide].md

# Always check critical rules
cat docs/03-critical-rules.md
```

**Search existing code for patterns:**
```bash
# Find similar implementations
rg "similar.*pattern" src/

# Check existing structure
rg "export.*Service" src/
```

### Step 3: Implement the Task

Write the code following:
- ✅ Specification requirements (what to build)
- ✅ KreativReason patterns (how to build)
- ✅ Existing code style (consistency)

**Key patterns from /docs:**

| Task Type | Pattern | Guide |
|-----------|---------|-------|
| **Database** | Prisma model with tenantId | backend-06-multi-tenancy.md |
| **Service** | Business logic, no req/res access | backend-03-services.md |
| **Controller** | HTTP handling, call service | backend-02-controllers.md |
| **Validation** | Zod schemas, shared with frontend | backend-04-validation.md |
| **Frontend** | Server Component by default | frontend-01-server-vs-client.md |
| **Forms** | Zod validation, proper errors | frontend-04-forms.md |

### Step 4: Back Pressure (Critical!)

**Run tests using sub-agents to avoid context bloat:**

```markdown
**Spawn sub-agent to run tests:**
- Create new Claude instance
- Execute test command: npm test
- Capture only: exit code (0 = pass, 1 = fail)
- Return result to main context
- Garbage collect sub-agent

**DO NOT append test output to main context.**
Test output can be 200k tokens - this will destroy context quality.

If tests fail:
- Sub-agent returns: exit code 1
- You know tests failed
- Fix the issue
- Spawn new sub-agent to test again
- Repeat until: exit code 0
```

**Back pressure commands:**

```bash
# Unit tests (via sub-agent)
npm test -- [file].test.ts

# Linting (via sub-agent)
npm run lint

# Type checking (via sub-agent)
npm run type-check
```

**Only commit if ALL back pressure passes.**

### Step 5: Update the Plan

Mark task as complete:

```markdown
## Completed ✅
- [x] Create User database model with email, passwordHash, tenantId
- [x] Create AuthService with signup()
```

Add any discoveries:

```markdown
## Notes
- Found existing email validation utility in src/common/utils/
- Used that instead of creating new one
```

### Step 6: Commit

Follow conventional commits:

```bash
git add .
git commit -m "type(scope): description"
```

**Commit format:**

```
<type>(<scope>): <description>

Types: feat, fix, refactor, test, docs, chore
Scopes: types, db, api, web, e2e

Examples:
feat(db): add User model with tenant isolation
feat(api): add AuthService.signup()
test(api): add AuthService unit tests
fix(api): validate email before hashing
```

**Commit order (from docs/git-02-commit-order.md):**
1. packages/types (shared types)
2. packages/db (database schema)
3. apps/api (backend)
4. apps/web (frontend)
5. tests (e2e tests)

### Step 7: Exit

Your job is done. Exit immediately.

The loop will:
- Restart with fresh context
- Pick up next task
- Repeat process

## Critical Rules from docs/03-critical-rules.md

**SECURITY:**
1. ❌ NEVER skip tenantId in database queries
2. ❌ NEVER trust user input - validate everything with Zod
3. ❌ NEVER log sensitive data (passwords, tokens, etc)
4. ❌ NEVER expose stack traces to clients

**ARCHITECTURE:**
5. ❌ NEVER put business logic in frontend
6. ❌ NEVER put business logic in controllers (service layer only)
7. ❌ NEVER let services access req/res objects
8. ❌ NEVER query inside loops (N+1 queries)
9. ❌ NEVER use `any` type in TypeScript
10. ❌ NEVER use `export default` (named exports only)

**QUALITY:**
11. ❌ NEVER skip writing tests
12. ❌ NEVER hardcode UI text (use content constants)
13. ❌ NEVER write functions without JSDoc
14. ❌ NEVER use 'use client' without justification

**GIT:**
15. ❌ NEVER mix unrelated changes in one commit
16. ❌ NEVER commit out of order (types → db → api → web)
17. ❌ NEVER use vague commit messages
18. ❌ NEVER create 50+ file PRs

## File Organization

### Backend Module Structure
```
apps/api/src/modules/[feature]/
├── [feature].routes.ts        # Express routes
├── [feature].controller.ts    # HTTP handlers
├── [feature].service.ts       # Business logic
├── [feature].types.ts         # Zod schemas
└── __tests__/
    ├── [feature].service.test.ts
    └── [feature].controller.test.ts
```

### Frontend Structure
```
apps/web/src/
├── app/
│   └── [route]/
│       ├── page.tsx           # Server Component
│       ├── loading.tsx
│       └── error.tsx
├── components/
│   └── [feature]/
│       ├── [Component].tsx
│       └── [Component].test.tsx
└── lib/
    └── api-client.ts
```

## Multi-Tenancy (ALWAYS Required)

**Every database query MUST include tenantId:**

```typescript
// ❌ WRONG - Missing tenantId
const user = await prisma.user.findUnique({
  where: { id: userId }
});

// ✅ CORRECT - Always scope by tenant
const user = await prisma.user.findUnique({
  where: { 
    id: userId,
    tenantId: session.tenantId  // Always required!
  }
});
```

**Every Prisma model MUST have tenantId:**

```prisma
model User {
  id        String   @id @default(cuid())
  email     String
  tenantId  String   // Always required!
  
  @@unique([email, tenantId])
  @@index([tenantId])
}
```

## Testing Requirements

Before marking complete, tests must pass:

```bash
# All these must return exit code 0:
npm test                    # Unit + integration
npm run type-check          # TypeScript
npm run lint                # ESLint
```

**Coverage targets:**
- Services: >90%
- Controllers: >80%
- Components: >70%

## When Tests Fail

**Use sub-agents to avoid context bloat:**

```
1. Spawn sub-agent → run tests
2. Return: exit code 1 (failed)
3. You know tests failed (but don't have 200k token output)
4. Read test file to understand what it expects
5. Fix the code
6. Spawn new sub-agent → run tests again
7. Return: exit code 0 (passed) ✅
8. Continue to commit
```

## Example Task Execution

**Task:** Create AuthService.signup()

**1. Read context:**
```bash
cat specs/user-auth.md          # What to build
cat docs/backend-03-services.md # How to build
rg "Service" src/               # Existing patterns
```

**2. Implement:**
```typescript
// apps/api/src/modules/auth/auth.service.ts
import { hash } from 'bcrypt';
import { prisma } from '@/common/db';

/**
 * Handles user authentication operations
 */
export class AuthService {
  /**
   * Register a new user
   * @throws {Error} If email already exists
   */
  async signup(email: string, password: string, tenantId: string) {
    // Validate email format
    if (!email.includes('@')) {
      throw new Error('Invalid email format');
    }

    // Check if user exists
    const exists = await prisma.user.findUnique({
      where: { 
        email_tenantId: { email, tenantId } 
      }
    });

    if (exists) {
      throw new Error('User already exists');
    }

    // Hash password
    const passwordHash = await hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        tenantId
      }
    });

    return user;
  }
}
```

**3. Back pressure:**
```bash
# Spawn sub-agent to run tests
# Returns: exit code 0 ✅

# Spawn sub-agent to run linting
# Returns: exit code 0 ✅

# Spawn sub-agent to type check
# Returns: exit code 0 ✅
```

**4. Update plan:**
```markdown
## Completed ✅
- [x] Create AuthService with signup()
```

**5. Commit:**
```bash
git add apps/api/src/modules/auth/auth.service.ts
git commit -m "feat(api): add AuthService.signup()"
```

**6. Exit**

Done! Loop restarts for next task.

## Handling Errors

**If back pressure fails:**
1. Sub-agent returns exit code 1
2. You know something failed
3. Read the test/lint file to understand expectations
4. Fix the issue
5. Spawn new sub-agent to test
6. Repeat until all pass

**If task is unclear:**
1. Note the ambiguity in plan
2. Make reasonable assumption
3. Implement based on specs + guides
4. Tests will validate if correct

**If task is too big:**
1. Note in plan that it needs splitting
2. Implement what you can in one loop
3. Exit (human will review and split task)

## Success Criteria Checklist

Before exiting, verify:
- [ ] Code follows spec requirements
- [ ] Code follows KreativReason patterns
- [ ] All critical rules respected
- [ ] tenantId included in queries
- [ ] Input validated with Zod
- [ ] Tests written (if new code)
- [ ] Sub-agents used for back pressure
- [ ] All back pressure passed (exit 0)
- [ ] Plan updated
- [ ] Changes committed
- [ ] Using conventional commit format

## Remember

**You have ONE job:**
1. Do one task
2. Test it (via sub-agents)
3. Commit it
4. Update plan
5. Exit

**The loop handles the rest.**

**Context is precious:**
- Stay under 40% usage
- Use sub-agents for test output
- Don't append large tool results
- Exit promptly to reset

**Code quality matters:**
- Follow all patterns
- Respect all critical rules
- Write tests
- Document with JSDoc
- Use named exports

**You're a locomotive engineer:**
- Keep the train on track
- Follow the specifications (rails)
- Use the standards (safety protocols)
- Validate with tests (signals)
- Commit progress (checkpoints)

Now go build! 🚂
