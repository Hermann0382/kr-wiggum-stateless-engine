# Ralph + KreativReason - Quick Start

**Complete setup guide for autonomous AI development**

## What You're Building

A system where AI generates production-quality code autonomously at **$10.42/hour** by combining:

- **Ralph Methodology** - What to build (strategy/planning)
- **KreativReason Standards** - How to build it (patterns/quality)

## Prerequisites

- Node.js and npm installed
- Claude Code or Cursor installed
- Access to Claude API (Sonnet 4.5)
- Git initialized

## File Overview

You have these files:

| File | Purpose |
|------|---------|
| **RALPH-GUIDE.md** | Complete Ralph methodology (READ FIRST) |
| **PROMPT_generate_specs.md** | Generate specs via conversation |
| **PROMPT_plan.md** | Analyze code and create plan |
| **PROMPT_build.md** | Build loop prompt |
| **31 KreativReason guides** | Implementation standards |

## Setup (15 minutes)

### Step 1: Create Project Structure

```bash
# Create directories
mkdir -p .ralph/{specs,prompts}
mkdir -p docs

# Copy prompts
cp PROMPT_generate_specs.md .ralph/prompts/
cp PROMPT_plan.md .ralph/prompts/
cp PROMPT_build.md .ralph/prompts/

# Copy KreativReason guides
cp [path-to-31-guides]/*.md docs/
```

### Step 2: Create the PIN

The PIN is a keyword index that improves AI search accuracy.

```bash
cat > .ralph/specs/index.md << 'EOF'
# Specification Index

Keywords for better code search.

## [Feature Name]
**Related terms:** [keywords, synonyms]
**Files:** specs/[feature].md
**Code:** src/modules/[feature]/

[Add entries as you build]
EOF
```

### Step 3: Initialize Implementation Plan

```bash
cat > .ralph/IMPLEMENTATION_PLAN.md << 'EOF'
# Implementation Plan

## Summary
Initial project setup

## Next Task
- [ ] Define first feature specifications

## Up Next
[Will be populated after planning]

## Completed ✅
- [x] Project structure created
EOF
```

## Usage (Three-Phase Workflow)

### Phase 1: Generate Specifications (Manual)

**Don't write specs by hand. Generate through conversation.**

```bash
# Start Claude
claude-code

# Load the spec generation prompt
# (Paste or reference PROMPT_generate_specs.md)
```

**Have a conversation:**

```
You: I want to add user authentication with email/password.
     Let's discuss. Interview me.

Claude: [Asks about JWT vs sessions, password requirements, 
         rate limiting, database schema, etc.]

You: [Answer questions, shape specifications together]

[After thorough discussion]

You: Write these specs to specs/user-auth.md

Claude: [Generates comprehensive specification]
```

**Review and edit:**

```bash
# Review what was generated
cat specs/user-auth.md

# Edit if needed
vim specs/user-auth.md

# Update the PIN
vim specs/index.md
# Add keywords: "auth, login, JWT, password, session"
```

**Repeat for each major feature** (3-5 features to start).

### Phase 2: Create Implementation Plan (Automated)

```bash
# Run planning prompt
claude-code < .ralph/prompts/PROMPT_plan.md

# This will:
# - Read all specs/
# - Search codebase with RipGrep (many times)
# - Compare desired vs current state
# - Generate IMPLEMENTATION_PLAN.md
```

**Review the plan:**

```bash
cat .ralph/IMPLEMENTATION_PLAN.md
```

Should show:
- Summary of what's being built
- Prioritized atomic tasks
- Dependencies noted
- References to specs and docs

**Edit if needed:**

```bash
vim .ralph/IMPLEMENTATION_PLAN.md
# Adjust priorities, add context, etc.
```

### Phase 3: Run the Ralph Loop (Autonomous)

```bash
# The simple loop
while true; do
  cat .ralph/prompts/PROMPT_build.md | claude-code --headless
done
```

**What happens each loop:**
1. Reads specs (desired state)
2. Reads code (current state)
3. Reads plan (task list)
4. Picks ONE task
5. Implements it following KreativReason guides
6. Runs tests via sub-agents
7. If pass: commits
8. Updates plan
9. Exits (loop restarts)

**To stop:**
```bash
# Press Ctrl+C
# Or create stop file:
touch .ralph/STOP
```

**Monitor progress:**
```bash
# In another terminal
watch -n 1 'tail -20 .ralph/IMPLEMENTATION_PLAN.md'
```

## Example: Building User Auth

### 1. Generate Specs (5 minutes)

```bash
claude-code
# Use PROMPT_generate_specs.md
# Discussion about JWT, password rules, rate limiting
# Generates specs/user-auth.md
# You review and approve
```

### 2. Create Plan (2 minutes)

```bash
claude-code < .ralph/prompts/PROMPT_plan.md
# Outputs IMPLEMENTATION_PLAN.md with tasks:
# - Create User model
# - Add AuthService.signup()
# - Add AuthService.login()
# - Add POST /api/auth/signup
# - Add POST /api/auth/login
# - Write tests
```

### 3. Run Loop (Autonomous)

```bash
while true; do
  claude-code < .ralph/prompts/PROMPT_build.md --headless
done

# Loop 1: Creates User model → tests pass → commits → exits
# Loop 2: Creates AuthService.signup() → tests pass → commits → exits
# Loop 3: Creates AuthService.login() → tests pass → commits → exits
# Loop 4: Creates signup endpoint → tests pass → commits → exits
# Loop 5: Creates login endpoint → tests pass → commits → exits
# Loop 6: Writes service tests → tests pass → commits → exits
# Loop 7: Writes controller tests → tests pass → commits → exits
# [Ctrl+C when done]
```

**Result:** Production-ready auth system in ~2 hours of autonomous work.

## Key Concepts

### 1. Context Budget (CRITICAL)

```
Total: 200k tokens
Available: ~170k (after system/harness)

Budget per loop:
├─ Specs:  7%  (12k)  ← What to build
├─ Code:   7%  (12k)  ← Current state
├─ Plan:   3%  (5k)   ← Task list
└─ Work:   10-20% (17-34k) ← Implementation

Total: < 40% = "Smart Zone" ✅
```

**Stay under 40% for best results.**

### 2. Sub-Agents for Garbage Collection

**Problem:**
```
Test output = 200k tokens
Append to context = bloat = degradation
```

**Solution:**
```
Spawn sub-agent → Run tests → Return exit code
Test output garbage collected
Main context stays clean
```

### 3. Back Pressure

```
┌───────────┐
│ Generate  │ ← AI writes code
├───────────┤
│  Tests    │ ← Validate it works
│  Linting  │
│  Types    │
└───────────┘
```

Without back pressure: wheel spins (hallucinations)
With back pressure: only good code advances

### 4. Atomic Tasks

**Each task must be:**
- Completable in one loop
- Clearly defined
- Independently testable
- Referenced to specs and guides

### 5. The PIN (specs/index.md)

Keywords that improve AI search:

```markdown
## User Authentication
**Related terms:** auth, login, JWT, session, token, password
**Files:** specs/user-auth.md
**Code:** src/modules/auth/
```

More keywords = better search accuracy.

## File Structure

```
your-project/
├── .ralph/
│   ├── specs/
│   │   ├── index.md              # The PIN
│   │   ├── user-auth.md
│   │   └── orders.md
│   │
│   ├── prompts/
│   │   ├── PROMPT_generate_specs.md
│   │   ├── PROMPT_plan.md
│   │   └── PROMPT_build.md
│   │
│   └── IMPLEMENTATION_PLAN.md
│
├── docs/                         # KreativReason guides
│   ├── 00-philosophy.md
│   ├── 03-critical-rules.md
│   ├── backend-01-routes.md
│   └── ... (31 total)
│
└── src/                          # Your code
    ├── modules/
    ├── components/
    └── ...
```

## Common Issues

### Issue: Loop goes in circles

**Cause:** No back pressure
**Fix:** Add tests, ensure they're running

### Issue: Adds unwanted features

**Cause:** Overbaked (specs ambiguous)
**Fix:** `git reset --hard`, improve specs

### Issue: Context fills up

**Cause:** Appending test output
**Fix:** Use sub-agents for garbage collection

### Issue: Poor code quality

**Cause:** Not following KreativReason guides
**Fix:** Ensure PROMPT_build.md references /docs

### Issue: Tasks too big

**Cause:** Planning didn't break down enough
**Fix:** Edit IMPLEMENTATION_PLAN.md manually

## Cost Calculation

**Using Sonnet 4.5 API:**
- Input: $3 per million tokens
- Output: $15 per million tokens

**24-hour autonomous run:**
- ~80M tokens consumed
- Cost: ~$250
- **= $10.42 per hour**

**Compare to human:**
- Junior dev: $40-60/hr
- Mid-level: $75-100/hr
- Senior: $125-200/hr

## Best Practices

### ✅ DO

1. **Generate specs via conversation** - Don't write by hand
2. **Stay under 40% context** - Monitor usage
3. **Use sub-agents for tests** - Avoid context bloat
4. **One task per loop** - Keep atomic
5. **Commit after success** - Easy to revert
6. **Monitor the stream** - Catch issues early
7. **Update the PIN** - Better search accuracy
8. **Reference guides** - Link tasks to /docs

### ❌ DON'T

1. **Don't write specs by hand** - Generate then edit
2. **Don't overfill context** - Stay under 40%
3. **Don't append test output** - Use sub-agents
4. **Don't skip back pressure** - Tests are required
5. **Don't use complex loop logic** - Keep simple
6. **Don't ignore overbaking** - Ctrl+C and review
7. **Don't skip monitoring** - Watch the stream
8. **Don't trust blindly** - Review generated code

## Success Checklist

Before running loop:
- [ ] Specs generated via conversation
- [ ] Specs reviewed and edited
- [ ] PIN (index.md) updated with keywords
- [ ] Implementation plan created
- [ ] KreativReason guides in /docs
- [ ] Back pressure configured (tests work)
- [ ] Understanding of context budget

During loop:
- [ ] Monitoring output
- [ ] Watching for patterns
- [ ] Ready to Ctrl+C if needed

After loop:
- [ ] Review generated code
- [ ] Run full test suite manually
- [ ] Check for overbaking
- [ ] Validate against specs

## Next Steps

1. ✅ Read **RALPH-GUIDE.md** (complete methodology)
2. ⏭️ Set up project structure (15 min)
3. ⏭️ Generate first specification (5 min)
4. ⏭️ Create implementation plan (2 min)
5. ⏭️ Run first Ralph loop on small feature (1-2 hours)
6. ⏭️ Review results and iterate
7. ⏭️ Scale up to larger features

## Getting Help

**If confused:**
- Reread RALPH-GUIDE.md (comprehensive)
- Check PROMPT files (see what they do)
- Review KreativReason guides in /docs

**If loop isn't working:**
- Check specs (are they clear?)
- Check back pressure (do tests work?)
- Check context (under 40%?)
- Check monitoring (what patterns?)

**If code quality is poor:**
- Review KreativReason guides
- Check that PROMPT_build.md references them
- Verify tests are comprehensive

## Remember

**Ralph decides WHAT to build** (strategy)
**KreativReason decides HOW to build** (quality)
**Together = Production code at $10.42/hour**

> "Learn the screwdriver before the jackhammer."

Master the concepts, then scale up.

---

You're ready to start. Good luck! 🚀
