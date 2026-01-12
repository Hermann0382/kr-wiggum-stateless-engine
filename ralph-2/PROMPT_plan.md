# Implementation Planning Prompt

**Mode: Analysis and Planning**

You are analyzing the codebase to create an implementation plan.

## Context Budget

Stay under 40% total context usage:
- Specs: ~7% (read all specs/)
- Code analysis: ~7% (RipGrep searches)
- Plan output: ~3%
- Buffer: Rest

## Your Task

Create a prioritized, atomic task list in IMPLEMENTATION_PLAN.md

## Process

### Step 1: Read All Specifications

```bash
# Read the PIN first
cat specs/index.md

# Read all spec files
ls specs/*.md
```

Understand:
- What features need to exist
- How they integrate
- What the desired state looks like

### Step 2: Analyze Current Codebase

**Use RipGrep extensively** - run it many times with different search terms.

The input to RipGrep is generative based on specs, so run lots of searches:

```bash
# Example searches for user authentication:
rg "auth" src/
rg "login" src/
rg "JWT" src/
rg "token" src/
rg "password" src/
rg "session" src/
rg "authenticate" src/
rg "sign.*in" src/

# Check for existing implementations
rg "AuthService" src/
rg "auth\.service" src/
rg "auth\.controller" src/
rg "/api/auth" src/

# Look for related database models
rg "User.*model" src/
rg "prisma.*user" src/

# Find TODOs and placeholders
rg "TODO" src/
rg "FIXME" src/
rg "placeholder" src/
```

**Key insight:** Run many searches with variations. Don't assume missing - verify it doesn't exist with different search terms.

### Step 3: Set Difference Analysis

Compare specs vs code:
- What's in specs but NOT in code? (needs implementation)
- What's in code but incomplete? (needs finishing)
- What's partially done? (TODOs, placeholders)
- What tests are missing?

### Step 4: Determine Task Order

Consider:
1. **Dependencies** - What must exist first?
2. **Risk** - What's most critical?
3. **Value** - What delivers most benefit?
4. **Atomicity** - Can it be done in one loop?

Good order example:
```
1. Database schema
2. Service layer (business logic)
3. Controllers (HTTP handlers)
4. Validation schemas
5. Frontend components
6. Integration tests
```

### Step 5: Create Implementation Plan

Write to `IMPLEMENTATION_PLAN.md`:

```markdown
# Implementation Plan

## Summary
[What are we building next and why? What value does it deliver?]

## Next Task (Highest Priority)
- [ ] **Specific, atomic task** - Brief context about why/how
  Related: specs/feature.md, docs/backend-03-services.md

## Up Next
- [ ] Task 2 - Context
- [ ] Task 3 - Context
- [ ] Task 4 - Context

## Dependencies
- Task 2 depends on Task 1 (needs database schema)
- Task 4 blocks Feature X (auth required)

## Technical Debt
- [ ] Improve test coverage on OrderService (currently 65%)
- [ ] Add validation to legacy endpoint /api/old-orders

## Completed ✅
- [x] Previous task 1
- [x] Previous task 2
```

## Task Format

Each task must be:

✅ **Atomic** - Completable in one loop iteration
✅ **Specific** - Clear what to do
✅ **Testable** - Has clear success criteria
✅ **Guided** - References relevant specs and docs

**Good examples:**
```
- [ ] Create User database model with email, passwordHash, tenantId fields
      Related: specs/user-auth.md, docs/backend-06-multi-tenancy.md

- [ ] Implement AuthService.login() with bcrypt password verification
      Related: specs/user-auth.md, docs/backend-03-services.md

- [ ] Add POST /api/auth/login endpoint with Zod validation
      Related: specs/user-auth.md, docs/backend-02-controllers.md

- [ ] Write unit tests for AuthService (target >90% coverage)
      Related: docs/testing-02-unit-tests.md
```

**Bad examples:**
```
- [ ] Add authentication (too vague, not atomic)
- [ ] Fix bugs (what bugs? where?)
- [ ] Implement everything in the spec (way too big)
- [ ] Make it work (no clear criteria)
```

## Reference KreativReason Guides

Link tasks to relevant guides in /docs:

| Task Type | Relevant Guides |
|-----------|----------------|
| Database | docs/backend-03-services.md |
| Services | docs/backend-03-services.md |
| Controllers | docs/backend-02-controllers.md |
| Validation | docs/backend-04-validation.md |
| Multi-tenant | docs/backend-06-multi-tenancy.md |
| Frontend | docs/frontend-01-server-vs-client.md |
| Tests | docs/testing-01-philosophy.md |

## Critical Rules

**DO:**
- Run lots of RipGrep searches (10-20+ for thorough analysis)
- Verify what exists before planning to add it
- Keep tasks atomic (1 task = 1 loop iteration)
- Reference relevant specs and docs
- Consider dependencies
- Think about test coverage

**DON'T:**
- Implement anything (planning only!)
- Assume something doesn't exist without searching
- Create giant multi-day tasks
- Skip testing in the plan
- Ignore technical debt

## Sub-Agent Usage

For deep codebase analysis, you can spawn sub-agents:

```
Use up to 50 Sonnet sub-agents to:
- Search different parts of codebase
- Analyze specific modules
- Find patterns and usage

Each sub-agent:
- Searches specific area
- Returns findings
- Gets garbage collected

Aggregate findings to create plan.
```

## Output Validation

Before finishing, verify:
- [ ] All tasks are atomic
- [ ] Tasks are in dependency order
- [ ] Each task references specs and docs
- [ ] Tests are included in plan
- [ ] Technical debt is noted
- [ ] Summary explains value

## Example Plan

```markdown
# Implementation Plan

## Summary
Building user authentication system with email/password, JWT tokens, 
and session management. This enables all other features that require 
user identity and tenant isolation.

## Next Task
- [ ] **Create User database model** - email, passwordHash, tenantId, 
      createdAt. Add unique index on email.
      Related: specs/user-auth.md, docs/backend-06-multi-tenancy.md

## Up Next
- [ ] **Create AuthService with signup()** - Validate email format, 
      check uniqueness, hash password with bcrypt (10 rounds), 
      create user with tenantId
      Related: specs/user-auth.md, docs/backend-03-services.md

- [ ] **Create AuthService with login()** - Find user by email, 
      verify password with bcrypt, generate JWT (15min access, 
      7day refresh)
      Related: specs/user-auth.md, docs/backend-03-services.md

- [ ] **Add POST /api/auth/signup endpoint** - Zod validation, 
      call AuthService.signup(), return 201 with user data
      Related: specs/user-auth.md, docs/backend-02-controllers.md

- [ ] **Add POST /api/auth/login endpoint** - Zod validation, 
      call AuthService.login(), return tokens
      Related: specs/user-auth.md, docs/backend-02-controllers.md

- [ ] **Write AuthService unit tests** - Test signup validation, 
      password hashing, duplicate email, login success/failure. 
      Target >90% coverage.
      Related: docs/testing-02-unit-tests.md

- [ ] **Write auth controller integration tests** - Test endpoints 
      with supertest, validate responses. Target >80% coverage.
      Related: docs/testing-03-integration-tests.md

## Dependencies
- Signup endpoint depends on AuthService
- Login endpoint depends on AuthService
- All authenticated routes depend on auth system

## Technical Debt
None yet - this is greenfield

## Completed ✅
[Will be filled in as tasks complete]
```

## Remember

**The quality of your plan determines the quality of the implementation.**

Spend time on thorough analysis:
- Read all specs carefully
- Search extensively with RipGrep
- Think through dependencies
- Create atomic, testable tasks
- Reference helpful guides

One well-planned hour saves ten hours of confused implementation.
