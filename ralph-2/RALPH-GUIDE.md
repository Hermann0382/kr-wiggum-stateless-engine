# Ralph Methodology - Complete Setup Guide

**Based on Geoff Huntley's actual usage**

## What is Ralph?

Ralph is running an AI coding agent in a simple loop:

```bash
while true; do
  claude-code < PROMPT.md
done
```

That's it. The sophistication is in **how you engineer the loop**, not the loop itself.

## Core Concept

**Software development now costs $10.42/hour** (using Sonnet 4.5 API).

In 24 hours ($250 API cost), you get weeks worth of work output.

## The Philosophy

### Context Window is an Array

Think of the context window as an array that gets sent to the model each time:

```javascript
context = [
  system_message,
  user_message,
  tool_results,
  ...
]
```

**Key principle:** The less you fill this array, the better your results.

### Stay in the Smart Zone

```
Context Usage:
0-40%:  "Smart Zone" - Best results
40-70%: "Degrading Zone" - Quality drops  
70%+:   "Dumb Zone" - Poor results
```

**Your budget per loop:**
- Base (harness/system): 15%
- Specs (desired state): 7%
- Code (current state): 7%
- Plan (action list): 3%
- Work (edits/tests): 10-20%
- **Total: Keep under 40%**

## The Three Core Files

### 1. Specifications (specs/)

**Desired state of the world**

One markdown file per feature describing what should exist.

### 2. Source Code (src/)

**Current state of the world**

Your actual codebase.

### 3. Implementation Plan (IMPLEMENTATION_PLAN.md)

**Action list**

Prioritized list of atomic tasks to implement.

## Back Pressure - The Most Important Concept

Think of software development as a wheel:

```
┌────────────────┐
│   Generation   │  ← AI writes code
│   (Top Half)   │
├────────────────┤
│     Friction   │  ← Tests/Linting
│ Back Pressure  │     Reject bad code
│ (Bottom Half)  │
└────────────────┘
```

**Without back pressure:** Wheel spins, no progress (hallucinations)
**With back pressure:** Only good code advances

**Examples of back pressure:**
- Unit tests (`npm test`)
- Linting (`npm run lint`)
- Type checking (`tsc --noEmit`)
- Compilation (`cargo build`)
- E2E tests (`cypress run`)

The wheel must have friction to move forward.

## Project Structure

```
your-project/
├── .ralph/
│   ├── specs/
│   │   ├── index.md              # The PIN - keyword lookup
│   │   ├── user-auth.md          # Feature spec
│   │   ├── orders.md             # Feature spec
│   │   └── dashboard.md          # Feature spec
│   │
│   ├── prompts/
│   │   ├── PROMPT_generate_specs.md
│   │   ├── PROMPT_plan.md
│   │   └── PROMPT_build.md
│   │
│   └── IMPLEMENTATION_PLAN.md    # Current action list
│
├── src/                          # Your codebase
│   ├── modules/
│   ├── components/
│   └── ...
│
├── docs/                         # KreativReason guides (HOW)
│   ├── 00-philosophy.md
│   ├── 03-critical-rules.md
│   └── ...
│
└── package.json
```

## The PIN File (specs/index.md)

Critical file that improves search tool effectiveness:

```markdown
# Specification Index

Keywords that help the AI find relevant code.

## User Authentication
**Related terms:** login, auth, session, JWT, token, sign-in
**Files:** specs/user-auth.md
**Code:** src/modules/auth/

## Order Management  
**Related terms:** order, purchase, cart, checkout, transaction
**Files:** specs/orders.md
**Code:** src/modules/orders/

## Dashboard
**Related terms:** analytics, metrics, charts, overview
**Files:** specs/dashboard.md
**Code:** src/modules/dashboard/
```

This improves RipGrep search accuracy.

## The Three-Phase Workflow

### Phase 1: Generate Specifications

**Don't write specs by hand. Generate them through conversation.**

```bash
# Start Claude
claude-code

# Use the spec generation prompt
# Have a conversation
# Claude writes specs to specs/
# You review and edit manually
```

**Example conversation:**

```
You: I want to add user authentication with email/password.
     Let's discuss. Interview me.

Claude: What authentication method? JWT? Sessions?

You: JWT tokens. 
     Access token expires in 15 minutes.
     Refresh token expires in 7 days.
     Store refresh tokens in database.

Claude: Password requirements?

You: Minimum 8 characters, at least one number.
     Use bcrypt for hashing.
     
Claude: Rate limiting?

You: Yes, 5 failed attempts locks account for 15 minutes.

[Continue shaping specifications]

You: Write these specs to specs/user-auth.md

Claude: [Generates comprehensive specification]

You: [Review, edit, improve manually]
```

**Key points:**
- This is conversation-driven
- You're shaping clay on a pottery wheel
- Test what the model knows
- Apply your engineering knowledge
- Generate → Review → Edit → Approve

### Phase 2: Create Implementation Plan

```bash
# Use planning prompt
claude-code < .ralph/prompts/PROMPT_plan.md
```

**What happens:**
1. Reads all specs/ files
2. Runs **multiple RipGrep searches** on codebase
3. Compares: what's in specs vs what's in code
4. Generates prioritized task list
5. Writes IMPLEMENTATION_PLAN.md

**Important:** The model runs RipGrep many times with different search terms to find what exists.

### Phase 3: Run the Ralph Loop

```bash
while true; do
  cat .ralph/prompts/PROMPT_build.md | claude-code --headless
done
```

**Each loop iteration:**
1. Reads specs (desired state)
2. Reads code (current state)
3. Reads IMPLEMENTATION_PLAN.md
4. Picks ONE task
5. Implements it
6. Runs tests (back pressure)
7. If tests pass: commits
8. Updates plan
9. **Exits** (loop restarts with fresh context)

**To stop:** Press Ctrl+C

## Sub-Agents for Garbage Collection

**Problem:**

```
Test output = 200,000 tokens
Appending to context = bloat
Context fills up
Quality degrades
```

**Solution:**

```
Spawn sub-agent → Run test → Return exit code only
Test output garbage collected
Main context stays clean
```

**In practice:**

```markdown
Run tests using a sub-agent:
- Spawn new Claude instance
- Execute: npm test
- Return: exit code (0 = pass, 1 = fail)
- Do NOT append test output to context
- Garbage collect the sub-agent
```

## The Three Failure States

| State | Description | Action |
|-------|-------------|--------|
| **Underbaked** | Feature incomplete | Keep running |
| **Perfectly Baked** | Feature complete, tests pass | Ctrl+C, done! |
| **Overbaked** | Added unwanted features | `git reset --hard`, fix specs |

**That's why you commit after every success** - so you can revert to "perfectly baked."

## Specification Format

Each spec file should have:

```markdown
# [Feature Name]

## Overview
Brief description of what this feature does.

## User Flow
1. User does X
2. System responds with Y
3. User sees Z

## Technical Requirements

### Backend
- Endpoints: POST /api/auth/login
- Service: auth.service.ts
- Validation: Zod schemas
- Database: User table with email, passwordHash

### Frontend
- Components: LoginForm, AuthGuard
- Pages: /login, /signup
- State: Auth context with user data

### Testing
- Unit: auth.service.test.ts (>90% coverage)
- Integration: auth.controller.test.ts (>80% coverage)
- E2E: login-flow.spec.ts

## Success Criteria
- [ ] User can sign up
- [ ] User can sign in
- [ ] JWT tokens issued correctly
- [ ] Protected routes work
- [ ] All tests pass

## Integration Points
- Depends on: database schema
- Blocks: dashboard (needs auth)
- References: /docs/backend-06-multi-tenancy.md
```

## The Economic Reality

**Using Sonnet 4.5 API:**
- $3 per million input tokens
- $15 per million output tokens

**24-hour run:**
- Typical consumption: ~80M tokens
- Cost: ~$250
- **= $10.42 per hour**
- Output: Weeks of human developer work

**Compare to:**
- Junior developer: $40-60/hour
- Mid-level developer: $75-100/hour
- Senior developer: $125-200/hour

## Language Choice for AI

Geoff tested C, Rust, and Zig for building Curs compiler:

| Language | Type Safety | Compile Speed | AI Performance |
|----------|-------------|---------------|----------------|
| **C** | Weak | Fast | Poor (no back pressure) |
| **Rust** | Strong | Slow | Good (strong types) |
| **Zig** | Balanced | Fast | Best (balance) |
| **TypeScript** | Strong | Fast | Excellent |
| **Python** | Dynamic | Fast | Good (with mypy) |

**Best for AI:**
- Strongly typed languages
- Fast compilation
- Good tooling (tests, linting)

## Code is Disposable

Geoff's experience with Curs:
- Wrote in C → Rewrote in Rust → Rewrote in Zig
- Each rewrite: ~8 hours
- Result: 15 million lines of code
- Model generated programs in a language NOT in training data

**Old world:** 
"We invested 6 months, can't throw it away"

**New world:**
"Delete it, regenerate in 8 hours"

**No emotional attachment to code anymore.**

## Engineering vs Development

### Software Development (Automated)
- Writing code
- Running tests
- Fixing bugs
- Making commits

### Software Engineering (Human)
- Designing the loop
- Writing specifications
- Creating back pressure
- Keeping locomotive on track
- Architectural decisions

**Your job:** Keep the train on the tracks, don't carry cargo by hand.

## Common Mistakes

### 1. Writing Specs by Hand
❌ **Wrong:** `vim specs/feature.md`
✅ **Right:** Conversation → generate → review → edit

### 2. Overfilling Context
❌ **Wrong:** Append everything, hit 80% usage
✅ **Right:** Stay under 40% with strict budgeting

### 3. Multiple Tasks Per Loop
❌ **Wrong:** "Do tasks 1, 2, and 3"
✅ **Right:** One task, commit, exit, restart

### 4. No Back Pressure
❌ **Wrong:** No tests, just generate code
✅ **Right:** Tests must pass before commit

### 5. Complex Loop Logic
❌ **Wrong:** Smart stopping, complex conditionals
✅ **Right:** Simple `while true`, Ctrl+C to stop

### 6. Appending Test Output
❌ **Wrong:** Add 200k test output to context
✅ **Right:** Sub-agent, return exit code only

### 7. Bad Specifications
❌ **Wrong:** Vague, ambiguous, incomplete
✅ **Right:** One bad line = 50,000 lines of bad code

## Integration with KreativReason

Ralph tells you **WHAT** to build.
KreativReason tells you **HOW** to build it.

**Together:**

```
.ralph/specs/           ← Desired state (Ralph)
docs/                   ← Implementation standards (KreativReason)
PROMPT_build.md         ← References both
Loop validates:         ← Matches specs + follows standards
```

**Example:**

```markdown
# In PROMPT_build.md

1. Read specs/user-auth.md (WHAT to build)
2. Read docs/backend-03-services.md (HOW to build)
3. Implement following both
4. Run tests
5. Commit
```

## Setup Instructions

### 1. Initialize Structure

```bash
mkdir -p .ralph/{specs,prompts}
mkdir -p docs
```

### 2. Create the PIN

```bash
cat > .ralph/specs/index.md << 'EOF'
# Specification Index

## [Your First Feature]
**Related terms:** [keywords]
**Files:** specs/feature.md
**Code:** src/modules/feature/
EOF
```

### 3. Add Prompts

Copy the three prompts:
- `PROMPT_generate_specs.md`
- `PROMPT_plan.md`
- `PROMPT_build.md`

(See separate prompt files)

### 4. Copy KreativReason Guides

```bash
cp /path/to/31-guides/*.md docs/
```

### 5. Generate Your First Spec

```bash
claude-code
# Start conversation using PROMPT_generate_specs.md
# Have discussion
# Review generated spec
# Edit as needed
```

### 6. Create Plan

```bash
claude-code < .ralph/prompts/PROMPT_plan.md
# Review IMPLEMENTATION_PLAN.md
# Edit if needed
```

### 7. Run the Loop

```bash
while true; do
  claude-code < .ralph/prompts/PROMPT_build.md --headless
done

# Monitor output
# Press Ctrl+C when done
```

## Monitoring the Loop

**Watch for these patterns:**

✅ **Good signs:**
- Tests passing
- Meaningful commits
- Steady progress
- Tasks getting checked off

⚠️ **Warning signs:**
- Same error repeatedly
- Going in circles
- Inventing features not in specs
- Test output appending to context

**If you see warning signs:**
1. Ctrl+C to stop
2. Check specs (are they clear?)
3. Check back pressure (are tests working?)
4. `git reset --hard` if needed
5. Fix issue and restart

## Advanced: Reverse Engineering (Clone Mode)

Geoff's technique for "clean room" reverse engineering:

```bash
# 1. Generate specs from existing code
# Input: Proprietary codebase
# Output: specs/

# 2. Throw away tainted code
rm -rf proprietary-code/

# 3. Generate new implementation
# Input: specs/
# Output: new clean code
```

**Note:** Check your local copyright laws. In Australia, computer-generated work without human effort has different copyright status.

## Real Example: The Curs Compiler

**Spec:** "Make a programming language with Gen Z keywords"
- yeet = return
- vibe = if
- slay = while
- highkey = true
- lowkey = false

**Result:**
- 15 million lines of code
- Full LLVM backend
- Interpreter mode
- Sample programs in the language
- The language wasn't in training data
- Model figured it out from specs + back pressure

**Reimplemented ~10 times** during development.

## The Rift is Coming

> "There's going to be a massive rift between those who get it and those who don't."

**Get ahead:**
- Master these concepts now
- Practice with real projects
- Understand the philosophy
- Learn the screwdriver before the jackhammer

## Key Quotes

> "Learn the screwdriver before the jackhammer."

> "Software development costs $10.42/hour. Less than fast food."

> "Code is disposable. Ideas are not."

> "Context window is an array. The less you use, the better."

> "One bad line of spec = 50,000 lines of bad code."

> "We're locomotive engineers now. We keep it on track."

> "You can't hang up a shelf and blame the drill."

## Next Steps

1. ✅ Understand the philosophy (you just read this)
2. ⏭️ Set up project structure
3. ⏭️ Generate first spec via conversation
4. ⏭️ Create implementation plan
5. ⏭️ Run first Ralph loop on small feature
6. ⏭️ Master the process
7. ⏭️ Scale up to larger projects

## Getting Help

**If stuck:**
- Review this guide
- Check your specs (are they clear?)
- Check your back pressure (do tests work?)
- Check your context usage (under 40%?)
- Monitor the stream for patterns

**Remember:**
- Professional liability still matters
- Review all generated code
- Tests are not optional
- You're responsible for the output

---

**You now have the real Ralph methodology.** The rest is practice.
