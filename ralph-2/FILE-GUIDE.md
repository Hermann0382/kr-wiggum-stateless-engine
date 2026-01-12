# Your Complete Setup - File Guide

**Everything you need for Ralph + KreativReason development**

## What You Have (39 Files Total)

### 📚 Ralph Methodology (5 files)

1. **QUICK-START.md** ⭐ **START HERE**
   - 15-minute setup guide
   - Three-phase workflow explained
   - Example walkthrough
   - Common issues and fixes

2. **RALPH-GUIDE.md** (Complete methodology)
   - Philosophy and concepts
   - Context budget explained
   - Back pressure engineering
   - Real examples from Geoff Huntley
   - The $10.42/hour calculation

3. **PROMPT_generate_specs.md**
   - Use for Phase 1
   - Conversation-driven spec generation
   - Copy to `.ralph/prompts/`

4. **PROMPT_plan.md**
   - Use for Phase 2
   - Analyzes code, creates implementation plan
   - Copy to `.ralph/prompts/`

5. **PROMPT_build.md**
   - Use for Phase 3 (the loop)
   - One task, test, commit, exit
   - Copy to `.ralph/prompts/`

### 📖 KreativReason Standards (31 files)

**Foundation (4 files):**
- 00-philosophy.md
- 01-stack-overview.md
- 02-project-structure.md
- 03-critical-rules.md ⚠️ **NEVER violate these**

**Testing (5 files):**
- testing-01-philosophy.md → testing-05-e2e-tests.md

**Backend (6 files):**
- backend-01-routes.md → backend-06-multi-tenancy.md

**Frontend (5 files):**
- frontend-01-server-vs-client.md → frontend-05-content-constants.md

**Shared (3 files):**
- shared-01-documentation.md → shared-03-state-as-records.md

**Git (5 files):**
- git-01-commit-messages.md → git-05-reverting.md

**Checklists (3 files):**
- new-module-checklist.md
- pr-checklist.md
- anti-patterns.md

### 🛠️ Setup Tools (3 files)

- **project-setup-guide.md** - Detailed setup instructions
- **activity-spec-template.md** - Format for creating specs
- **setup-project.sh** - Automated project initialization

## How Everything Fits Together

```
┌─────────────────────────────────────────────┐
│         YOUR INPUTS                         │
│  1. Conversation (via PROMPT_generate_specs)│
│  2. Generated specs (in .ralph/specs/)     │
│  3. KreativReason guides (in docs/)        │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│      PHASE 1: Generate Specs                │
│  Use: PROMPT_generate_specs.md              │
│  Output: specs/feature.md files             │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│      PHASE 2: Create Plan                   │
│  Use: PROMPT_plan.md                        │
│  Output: IMPLEMENTATION_PLAN.md             │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│      PHASE 3: Build Loop                    │
│  Use: PROMPT_build.md (in while loop)       │
│  Refs: specs/ (what) + docs/ (how)         │
│  Output: Production code                    │
└─────────────────────────────────────────────┘
```

## Quick Start (Copy/Paste)

```bash
# 1. Setup (one time)
mkdir -p .ralph/{specs,prompts}
mkdir -p docs

# 2. Copy files
cp PROMPT_generate_specs.md .ralph/prompts/
cp PROMPT_plan.md .ralph/prompts/
cp PROMPT_build.md .ralph/prompts/
cp [all-31-guide-files] docs/

# 3. Create PIN
cat > .ralph/specs/index.md << 'EOF'
# Specification Index

## [Feature Name]
**Related terms:** [keywords]
**Files:** specs/feature.md
**Code:** src/modules/feature/
EOF

# 4. Generate first spec
claude-code
# Use PROMPT_generate_specs.md
# Have conversation
# Review output

# 5. Create plan
claude-code < .ralph/prompts/PROMPT_plan.md

# 6. Run loop
while true; do
  claude-code < .ralph/prompts/PROMPT_build.md --headless
done
```

## File Locations After Setup

```
your-project/
├── .ralph/
│   ├── specs/
│   │   ├── index.md              # The PIN
│   │   └── [feature].md          # Generated specs
│   │
│   ├── prompts/
│   │   ├── PROMPT_generate_specs.md
│   │   ├── PROMPT_plan.md
│   │   └── PROMPT_build.md
│   │
│   └── IMPLEMENTATION_PLAN.md    # Generated plan
│
├── docs/                         # 31 KreativReason guides
│   ├── 00-philosophy.md
│   ├── 03-critical-rules.md
│   └── ... (copy all 31)
│
└── src/                          # Your code (generated)
```

## Reading Order

### First Time Setup (30 minutes)
1. **QUICK-START.md** (5 min) - Overview
2. **RALPH-GUIDE.md** (15 min) - Deep concepts
3. **PROMPT_generate_specs.md** (3 min) - See how specs work
4. **docs/03-critical-rules.md** (5 min) - Never violate these
5. **docs/00-philosophy.md** (2 min) - Why these patterns

### Before Each Feature
1. Check relevant spec in `.ralph/specs/`
2. Check relevant guides in `docs/`
3. Review IMPLEMENTATION_PLAN.md

### When Stuck
1. Reread QUICK-START.md
2. Check RALPH-GUIDE.md for concept
3. Review relevant guide in docs/

## Key Concepts (Must Understand)

### 1. Context Budget
- Total: 200k tokens
- Use: < 40% for best results
- Budget: 7% specs, 7% code, 3% plan, 10-20% work

### 2. Back Pressure
- Tests must pass before commit
- Without tests = wheel spins (no progress)
- With tests = only good code advances

### 3. Sub-Agents
- Spawn to run tests
- Return only exit code
- Garbage collect output
- Keep main context clean

### 4. The Loop
```bash
while true; do
  # ONE task
  # Test it
  # Commit it
  # Exit
done
```

### 5. Atomic Tasks
- Completable in one loop
- Clearly defined
- Independently testable
- Referenced to specs and docs

## The Two Systems

### Ralph (WHAT to build)
- Specifications define desired state
- Plan breaks into atomic tasks
- Loop implements one task at a time
- **Strategy and planning**

### KreativReason (HOW to build)
- 31 guides define patterns
- Standards ensure quality
- Tests validate correctness
- **Quality and consistency**

### Together
- Ralph reads specs (desired state)
- References KreativReason guides (patterns)
- Implements following both
- Tests validate against both
- **Production code at $10.42/hour**

## Common Questions

**Q: Do I need all 31 KreativReason guides?**
A: Yes! PROMPT_build.md references them. Claude needs them to know HOW to build.

**Q: Can I modify the guides?**
A: Yes, but keep the structure. Claude expects YAML frontmatter and clear sections.

**Q: Do I write specs by hand?**
A: No! Generate via conversation (PROMPT_generate_specs.md), then review/edit.

**Q: How do I stop the loop?**
A: Press Ctrl+C. It's a simple `while true` loop.

**Q: What if it adds unwanted features?**
A: Overbaking. `git reset --hard`, improve specs, restart.

**Q: What if context fills up?**
A: Check that PROMPT_build.md uses sub-agents for test output.

**Q: Why $10.42/hour?**
A: Sonnet 4.5 API costs for 24-hour run (~$250) ÷ 24 = $10.42/hour

**Q: Is the code production-ready?**
A: If back pressure (tests) passes and you review it, yes. But you're responsible.

## Next Steps

1. ✅ You have all files
2. ⏭️ Read QUICK-START.md (start here)
3. ⏭️ Read RALPH-GUIDE.md (understand philosophy)
4. ⏭️ Set up project structure (15 min)
5. ⏭️ Generate first spec (5 min)
6. ⏭️ Run planning phase (2 min)
7. ⏭️ Run first Ralph loop (1-2 hours)
8. ⏭️ Review and iterate

## File Checklist

Print this and check off as you go:

### Setup
- [ ] Read QUICK-START.md
- [ ] Read RALPH-GUIDE.md
- [ ] Created `.ralph/specs/` directory
- [ ] Created `.ralph/prompts/` directory
- [ ] Created `docs/` directory
- [ ] Copied 3 PROMPT files to `.ralph/prompts/`
- [ ] Copied 31 guides to `docs/`
- [ ] Created `.ralph/specs/index.md` (PIN)

### First Feature
- [ ] Used PROMPT_generate_specs.md
- [ ] Generated spec via conversation
- [ ] Reviewed and edited spec
- [ ] Updated PIN (index.md) with keywords
- [ ] Ran PROMPT_plan.md
- [ ] Reviewed IMPLEMENTATION_PLAN.md
- [ ] Started Ralph loop
- [ ] Monitored output
- [ ] Stopped at right time (Ctrl+C)
- [ ] Reviewed generated code

### Validation
- [ ] All tests pass
- [ ] Code follows KreativReason patterns
- [ ] No violations of critical rules
- [ ] Git history is clean
- [ ] Specs match implementation

## Important Reminders

> "Learn the screwdriver before the jackhammer."

> "Code is disposable. Ideas are not."

> "One bad line of spec = 50,000 lines of bad code."

> "Context window is an array. The less you use, the better."

> "You can't hang up a shelf and blame the drill."

**You're a locomotive engineer now.** Keep the train on track.

---

Everything you need is here. Start with QUICK-START.md and go! 🚀
