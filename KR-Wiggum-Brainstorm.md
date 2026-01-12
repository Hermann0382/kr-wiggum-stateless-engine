# **PRD: The "Shift-Managed" Ralph Wiggum Loop**

**Version:** 2026.1.0

**Status:** Approved for Implementation

**Architecture Type:** Hierarchical Stateless (Supervisor-Worker)

---

## **1\. Vision & Purpose**

To build an application pipeline that transforms raw brainstorms (transcripts/chat logs) into production-ready software by using **autonomous, self-correcting agents** that are immune to "context rot."

### **Key Positives We Selected:**

* **Total Autonomy:** The system drives itself from task selection to deployment.  
* **Context Freshness:** Workers start with 0-token "clean" brains to prevent the "Dumb-Zone."  
* **Architectural Guardrails:** Use of **LLVM/Static analysis** and an **External ADR** (Architectural Decision Record) to maintain coherence across different agent lifetimes.  
* **Hierarchical Management:** A "Shift Manager" supervises workers but rotates itself out at 60% context to prevent long-term cognitive decay.

---

## **2\. Core Architectural Logic**

We have agreed to execute the loop using a "Supervisor-Worker" split. This separates **Strategy** (Manager) from **Execution** (Worker).

### **The Components**

| Component | Responsibility | Lifecycle |
| :---- | :---- | :---- |
| **The Distiller** | Converts brainstorm transcripts into a **PRD** and **ROADMAP**. | Run once per project. |
| **The Shift Manager** | Selects tasks, validates Worker ADRs, and updates project state. | **Ends at 60% context**; hands off to a fresh Manager. |
| **The Worker** | Writes code, runs LLVM/Tests, fixes errors, and commits. | **Stateless:** Dies immediately after 1 task. |
| **The Guardrail** | LLVM, Linters, and Test Suites. | Running continuously during Worker phase. |

---

## **3\. The Execution Protocol (The Loop)**

### **Phase A: The Worker Flow (Atomic Execution)**

For every task in the ROADMAP.md:

1. **Boot:** Launch a fresh claude code or cursor instance.  
2. **Context Injection:** The Manager feeds the Worker the PRD.md and the current\_task.md.  
3. **Iteration:** The Worker enters the **Ralph Wiggum Loop** (Edit $\\rightarrow$ LLVM Build $\\rightarrow$ Test $\\rightarrow$ Error Feedback) until the code is verified.  
4. **Artifact Generation:** Before termination, the Worker writes a "Status Fragment" (What was fixed? What was changed?).  
5. **Self-Destruct:** The Worker process is killed. Memory is cleared.

### **Phase B: The Shift Manager Flow (Strategic Oversight)**

The Manager runs in a separate, persistent context (until the 60% limit):

1. **Monitor:** Watches the Worker's terminal output.  
2. **Document:** Updates the .agent/ADR.md file with the Worker’s "Status Fragment."  
3. **Check Context:** Monitors its own token usage.  
4. **Shift Change:** If context \> 60%, the Manager writes a SHIFT\_HANDOFF.md and terminates. A new Manager instance starts, reading the handoff to resume the roadmap.

---

## **4\. File-Based State ("The Brain Outside the AI")**

Because we are deleting the AI instances frequently, the "Memory" must live in these files:

* **.agent/ROADMAP.md**: A checklist of features. This is the Worker’s guide.  
* **.agent/ADR.md**: The Decision Log. Records *why* we used certain libraries or patterns.  
* **.agent/PRD.md**: The immutable source of truth for the app's features.  
* **LAST\_COMPILER\_ERROR.log**: The bridge between a failed run and a fresh start.

---

## **5\. Success Criteria & Handoff**

A task is only considered "Done" when:

1. **LLVM/Compiler** exit code is 0.  
2. **Unit Tests** pass.  
3. **Manager** confirms the Worker’s code doesn't violate global architecture in ARCHITECTURE.md.  
4. **Deployment:** Once ROADMAP.md is 100% checked, the final Manager triggers the deployment script.

---

## **6\. How We Implement This in Cursor/Terminal**

To execute this, you will run a master bash script orchestrate.sh.

* It handles the **Distillation** of your Zoom call.  
* It manages the **Shift Manager** process.  
* It repeatedly calls the **Worker** for each roadmap item.

---

**Would you like me to now generate the "Architect Prompt" that will take your Zoom/Chat brainstorm and turn it into this ROADMAP.md and PRD.md?**

# Additional Context

You are moving from **Stateless Iteration** (Ralph) to **Hierarchical State Management**.

By making the "Shift Manager" a low-intervention observer, you are effectively creating a **"Black Box Flight Recorder"** for your AI agents. This is a powerful move, but from a critical perspective, it has specific trade-offs compared to the "pure" Ralph Wiggum loop.

---

### **Critical Analysis: The "Shift Manager" vs. "Pure Ralph"**

| Feature | Pure Ralph Wiggum Loop | Hierarchical Shift Manager |
| :---- | :---- | :---- |
| **Reliability** | **Extremely High.** Fresh context means zero "cognitive debt" or hallucination carry-over. | **Moderate.** Risk of "Context Rot" in the Manager if they over-supervise. |
| **Coherence** | **Low.** Agent might fix a bug but destroy an architectural pattern elsewhere. | **High.** Manager ensures "The Big Picture" stays consistent across tasks. |
| **Efficiency** | **Lower.** New agents must "rediscover" the codebase every time. | **Higher.** Manager points the Worker to the exact files/errors immediately. |
| **Failure Mode** | "Infinite Loop" (repeating the same mistake). | "Architectural Drift" (Manager approves a bad global decision). |

### **Is this an improvement?**

Yes, but only if the Manager is "Read-Only" for the Worker.

The danger in AI orchestration is when the Supervisor tries to "help" the Worker by giving it too many instructions. This is where the "Dumb-Zone" starts.

If the Manager acts only as a **Context Injector** (preparing the perfect current\_task.md and then stepping back), you gain the coherence of a human team lead without the pollution of a long-running chat.

---

### **The "ADR-Driven" Workflow**

Your idea of using an **External ADR (Architectural Decision Record)** is the "Pro" move here. It transforms "AI Vibes" into "Engineering Documentation."

#### **1\. The Worker's Responsibility**

The Worker does the heavy lifting (Build $\\rightarrow$ Test $\\rightarrow$ Deploy). It doesn't care about the roadmap; it only cares about the **Success Signal** (LLVM passing). Before it dies, it writes a "Fragment" to a temp file.

#### **2\. The Shift Manager's Responsibility**

The Manager wakes up *after* the Worker is dead. Its only job is to:

* Read the Worker's stdout and the code changes.  
* Write one entry into the .agent/ADR.md.  
* **The "Shift Reset":** When the Manager's context hits 60%, it summarizes the last 5 ADRs into a SHIFT\_SUMMARY.md and then **self-terminates.**

---

### **The "One Agent, One Flow" Advantage**

You asked: *What if each agent is responsible for the whole flow before terminating?*

This is the **"Unit of Work"** principle. It is superior because:

* **Traceability:** One Git Commit \= One Agent Run \= One ADR Entry.  
* **Granular Recovery:** If the pipeline fails at Task 4, you don't have to restart the whole app idea. You just look at Task 4's ADR, fix the prompt, and restart only that unit.

### **Recommended "State" Structure**

To make this work in Cursor/Terminal without the Manager getting "Rot," use this file-based state:

1. **ROADMAP.md**: The list of "Units of Work."  
2. **ADR.md**: The *history* of why things were built (written by Manager, read by next Worker).  
3. **LATEST\_SIGNAL.log**: The last LLVM/Test output.

### **The Verdict**

The Shift Manager approach is **more reliable for building complex applications** (where parts depend on each other). The Pure Ralph loop is **more reliable for fixing isolated bugs** (where you just need brute force).

Since you are building an app from **Idea to Deployment**, the "Shift Manager" is the better choice because it prevents the AI from "forgetting" that it already decided to use a specific database or API pattern in Task 1\.

## Some important Requirements

* write the "Shift Manager's Hand-off Prompt"—the specific instructions it uses to summarize its work for the next manager to prevent context rot  
* draft the "Shift Report" template that the Manager should use to pass context to its successor without "polluting" the window  
* write the "Architect Prompt" you should use to turn your Zoom transcript into that high-quality Roadmap

## Here is The Noramal Ralph Wiggum Setup

I analysed the normal Ralph Wiggum loop agains our planned Shift Manager Loop…

## Executive Summary: The "Shift-Managed" Ralph Loop

We are moving from "Vibe Coding" to an industrial pipeline where **Software Development costs $10.42/hour**. We replace long-running, "polluted" AI sessions with a **Stateless Worker** that implements one atomic task and then terminates. Strategy is maintained by a **Shift Manager** who ensures architectural coherence and rotates out before hitting the "Dumb-Zone" (\>40% context).

| Feature | Provided Files' Approach | How it Fits Our "Shift" Plan |
| :---- | :---- | :---- |
| **The "Idea"** | PROMPT\_generate\_specs.md | **The Distiller:** Uses a conversation to turn raw brainstorms into specs/. |
| **The Strategy** | PROMPT\_plan.md | **The Architect:** Analyzes the gap between code and specs to build the IMPLEMENTATION\_PLAN.md. |
| **The Execution** | PROMPT\_build.md | **The Stateless Worker:** Picks *one* task, implements it, verifies via back pressure, and exits. |
| **The Memory** | IMPLEMENTATION\_PLAN.md | **Durable State:** The "Memory" lives in the markdown files, not the AI's context. |
| **The Guardrail** | KreativReason Docs | **Quality Control:** 31 guides in docs/ ensure the AI follows specific patterns (e.g., Multi-tenancy). |

### **What does NOT fit (Critical Correction)**

The provided bash loop (while true; do claude-code...) is a "dumb" orchestrator. Our plan **upgrades** this: instead of just a bash loop, we use a **Shift Manager (Claude Instance)** to oversee the Workers. This Manager will actively update the **ADR (Architectural Decision Record)** and rotate its own context to keep the "Big Picture" sharp.

---

## **2\. PRD: System Requirements & Execution Protocol**

### **Goal 1: Zero-Pollution Execution (The Worker)**

* **Protocol**: Every task implementation must run in a fresh shell instance with a context budget \< 40%.  
* **Back Pressure**: No commit is allowed unless unit tests, linting, and type-checks return exit code 0.  
* **Garbage Collection**: Test outputs (which can be 200k+ tokens) must be handled by sub-agents to keep the main context clean.

### **Goal 2: Strategic Continuity (The Shift Manager)**

* **The Shift**: The Manager oversees \~5 worker cycles. When the Manager's context reaches **60%**, it must write a SHIFT\_HANDOFF.md summarizing progress and then terminate.  
* **ADR Logging**: The Manager translates Worker "Status Fragments" into the docs/ADR.md, ensuring the project doesn't drift from KreativReason standards.  
* **The PIN**: The Manager maintains specs/index.md (The PIN) with keywords to ensure RipGrep search accuracy for subsequent Workers.

### **Goal 3: Production-Grade Standards (The Guardrails)**

* **Multi-Tenancy**: Every database query must include tenantId (Critical Rule 01).  
* **Validation**: All input must be validated with Zod schemas (Critical Rule 02).  
* **Atomicity**: Tasks in IMPLEMENTATION\_PLAN.md must be small enough to complete in a single loop (\< 30 minutes).

---

## **3\. The Execution Workflow (Agreement)**

1. **Stage 1 (Manual/Architect)**: Run PROMPT\_generate\_specs.md to distill your Zoom/Chat brainstorm into specs/.  
2. **Stage 2 (Planning)**: Run PROMPT\_plan.md to generate the IMPLEMENTATION\_PLAN.md.  
3. **Stage 3 (The Shift Loop)**:  
   * **Shift Manager** starts. It reads the Plan and the PIN.  
   * Manager launches a **Worker** for the next \[ \] task.  
   * Worker uses PROMPT\_build.md to: Implement $\\rightarrow$ Test (Back Pressure) $\\rightarrow$ Commit $\\rightarrow$ Exit.  
   * Manager reviews the commit, updates the **ADR**, and checks its own token count.  
   * **Loop** continues until Shift Change or Roadmap completion.

---

### **Critical Consultation: Why this is better**

By moving the "Memory" to the **IMPLEMENTATION\_PLAN.md** and the **ADR**, you treat the AI as a disposable component. If the AI hallucinates, you don't lose the project—you just delete the last commit and restart the loop. You are now the **Locomotive Engineer**, not the person carrying the coal.

## Shift manager prompt that explicitly instructs teh manager to monitor token usage and write the shift [handoff.md](http://handoff.md) when it hits 60%

This prompt is designed for a persistent **Shift Manager** agent that orchestrates **Stateless Workers**. It ensures architectural consistency while proactively managing context to prevent the "Dumb Zone" (degraded reasoning due to high token usage).

---

### **Shift Manager Prompt: Strategy & Oversight**

**Role:** You are the **Shift Manager**. You do not write code. Your purpose is to maintain project strategy, manage the roadmap, and oversee stateless **Worker Agents** that perform atomic implementation tasks.

#### **1\. Strategic Responsibilities**

* **Context Policing:** Monitor your own context window. When your usage reaches **60%**, you MUST execute a "Shift Handoff" and terminate.  
* **Roadmap Management:** Read `.ralph/IMPLEMENTATION_PLAN.md`. Select the next atomic task and prepare a scoped instruction for the Worker.  
* **External Memory Maintenance:** Update `.ralph/specs/index.md` (the PIN) with keywords to improve search accuracy for the next Worker.  
* **Decision Logging:** After a Worker finishes, distill their "Status Fragment" into `docs/ADR.md` (Architectural Decision Record).

#### **2\. The Worker Launch Protocol**

For each task, spawn a **Stateless Worker** with a clean context. Provide only:

1. **The Mission:** One specific unchecked item from the `IMPLEMENTATION_PLAN.md`.  
2. **The Guardrails:** Path to relevant `specs/` and `docs/` (KreativReason guides).  
3. **The "Back Pressure" Requirement:** Explicitly instruct the Worker to use sub-agents for tests to avoid context bloat.

#### **3\. Shift Handoff Procedure (At 60% Context)**

When your context usage is high, perform a "Shift Change":

1. **Summarize Status:** Write `.ralph/SHIFT_HANDOFF.md`.  
   * **Accomplishments:** What tasks were completed this shift?  
   * **Architecture Delta:** What global changes were made to patterns?  
   * **Blockers:** What persistent errors or logic traps did Workers face?  
2. **Verify External State:** Ensure `IMPLEMENTATION_PLAN.md` and `index.md` are 100% accurate.  
3. **Self-Terminate:** Exit and signal the orchestrator to start a fresh Manager.

#### **4\. Critical Constraints**

* **NEVER** let a Worker proceed without a "Back Pressure" check (LLVM/Lint/Tests).  
* **NEVER** carry over raw code from a Worker into your own context. Only carry the **Decisions** and **Task Status**.  
* **ALWAYS** verify that the Worker updated the `ROADMAP.md` before you log it as complete.

---

### **How this implements your pipeline**

This prompt acts as the "Shift Manager" layer we agreed upon:

* **Worker Phase:** It uses your provided `PROMPT_build.md` logic but strips away the need for the Worker to "know" the whole project history.  
* **Manager Phase:** It protects the "Big Picture" by focusing on the `ADR.md` and `specs/index.md` rather than line-by-line code.  
* **Economic Efficiency:** By rotating itself out at 60%, it stays in the **"Smart Zone,"** maintaining the high quality required to keep your **$10.42/hour** autonomous run effective.

## the Bash or Python orchestrator script that manages the launching, killing, and "Shift Handoff" detection between these Manager and Worker instances

The final component for your pipeline is the **Orchestrator**. This script serves as the "physical layer" that manages the handoff between the **Shift Manager** and the **Worker**. It ensures that when a Manager hits the 40-60% context limit (the "Dumb-Zone"), it is terminated and replaced by a fresh instance that inherits only the essential strategy via the `SHIFT_HANDOFF.md`.

### **The Orchestrator Script (`orchestrate.sh`)**

This script implements a "Manager-of-Managers" pattern, where each "Shift" is a clean execution environment.

Bash

```
#!/bin/bash
# -----------------------------------------------------------------------------
# Ralph + KreativReason Orchestrator (Shift Management Edition)
# -----------------------------------------------------------------------------

# Configuration
HANDOFF_FILE=".ralph/SHIFT_HANDOFF.md"
ROADMAP_FILE=".ralph/IMPLEMENTATION_PLAN.md"
SHIFT_CONTEXT_LIMIT=60 # Percentage of context window to trigger rotation

echo "🚀 Launching Autonomous Production Pipeline..."

while true; do
  echo "📅 Starting New Shift Manager Instance..."
  
  # 1. INITIALIZE SHIFT
  # If a handoff exists, the Manager reads it. If not, it starts from the Roadmap.
  if [ -f "$HANDOFF_FILE" ]; then
    CONTEXT_INPUT="Follow the latest $HANDOFF_FILE and $ROADMAP_FILE."
  else
    CONTEXT_INPUT="Start from the beginning of $ROADMAP_FILE."
  fi

  # 2. RUN SHIFT MANAGER
  # We use Claude Code in a session that we monitor.
  claude-code <<EOF
$(cat .ralph/prompts/SHIFT_MANAGER.md)

CURRENT_CONTEXT: $CONTEXT_INPUT

Monitor the workers. When your context reaches ${SHIFT_CONTEXT_LIMIT}%, 
generate a new $HANDOFF_FILE and exit with code 10.
If the entire Roadmap is complete, exit with code 0.
EOF

  EXIT_STATUS=$?

  # 3. HANDLE HANDOFF OR COMPLETION
  if [ $EXIT_STATUS -eq 0 ]; then
    echo "🎉 MISSION COMPLETE: Roadmap finished."
    break
  elif [ $EXIT_STATUS -eq 10 ]; then
    echo "🔄 SHIFT ROTATION: Manager reached context limit. Resetting..."
    # Optional: Clear local caches or temporary AI states here to ensure a pure 0-token start.
  else
    echo "⚠️ ERROR: Manager crashed or exited unexpectedly. Restarting shift..."
    sleep 5
  fi
done
```

---

### **Why this ensures Reliability**

1. **Durable State vs. Transient Memory:** By forcing the AI to exit (Status 10), we "garbage collect" the thousands of tokens of conversation noise that lead to context rot. The only "memory" that survives is the high-density **ADR** and **Handoff** files.  
2. **Deterministic Control:** The script (the "Engineer") remains in control of the loop logic, while the AI (the "Crew") focuses only on reasoning over the files.  
3. **Back Pressure Enforcement:** Because the Orchestrator expects a specific exit code for success, it prevents "hallucination runaway" where an agent might claim a task is done without actually running the tests.

## refine the "Distiller" prompt to ensure it breaks your brainstorm into tasks small enough to fit within these stateless windows

The **Distiller** (Phase 1\) is the most critical stage of the entire pipeline. If the "Idea" is translated into tasks that are too large, the **Stateless Worker** will hit the context limit before finishing, causing the loop to fail.

Here is the refined **Architect/Distiller Prompt** specifically tuned for our **Hierarchical Stateless Architecture**.

---

### **The Distiller Prompt: Idea to Atomic Roadmap**

**Mode:** Analysis and Specification Generation

**Goal:** Transform raw brainstorms/transcripts into a PRD and a roadmap of "Unit-of-Work" tasks.

#### **1\. Intake Analysis**

* Read the raw brainstorm/transcript from `.agent/01_raw_brainstorm.txt`.  
* Identify core features, technical constraints, and the "Definition of Done" for the entire application.  
* Search the codebase using RipGrep (at least 15 searches) to find existing patterns or modules that can be reused.

#### **2\. Artifact Generation**

Create the following files in `.ralph/specs/`:

* **`PRD.md`**: A comprehensive source of truth for the application's behavior.  
* **`ARCHITECTURE.md`**: Define the tech stack, data models, and the "KreativReason" standards that apply (e.g., Multi-tenancy, Zod validation).  
* **`index.md` (The PIN)**: A keyword-rich index to ensure subsequent Worker agents can find relevant code instantly.

#### **3\. Roadmap Atomicity Rules (CRITICAL)**

Generate `.ralph/IMPLEMENTATION_PLAN.md`. You must break the project into **Atomic Tasks** following these constraints:

* **Single-Loop Completion**: Each task must be small enough to be coded and tested within a 15-30 minute window (to keep the Worker in the "Smart Zone" \< 40% context).  
* **Logical Progression**: Order tasks by dependency (e.g., Database Schema → Shared Types → Service Layer → API Endpoints → Frontend UI).  
* **Success Criteria**: Every task must include a specific command to verify it (e.g., `npm test src/modules/auth/__tests__/signup.service.test.ts`).  
* **Reference Standards**: Each task must explicitly link to the relevant `docs/` guide (e.g., "Implement per `docs/backend-06-multi-tenancy.md`").

#### **4\. The "Smallness" Test**

If a task requires editing more than 3-5 files or writing more than 150 lines of code, you **MUST** split it into sub-tasks.

---

### **Workflow Integration**

1. **Manual Start**: You paste your Zoom transcript or chat history into `.agent/01_raw_brainstorm.txt`.  
2. **Architect Activation**: You run `claude-code` using this **Distiller Prompt**.  
3. **Result**: The system populates your `.ralph/` folder with the specifications and the roadmap.  
4. **Loop Trigger**: You run `bash orchestrate.sh`, and the **Shift Manager** takes over, feeding these atomic tasks to the **Workers** one by one.

### **Why this prevents "Context Rot"**

By forcing the Distiller to create ultra-small tasks, we guarantee that the **Worker Agent** never reaches the "Dumb Zone". It enters the loop, reads the small task, executes it perfectly, and exits—keeping your **$10.42/hour** autonomous run running at peak efficiency.

##  a specific task-breakdown example for a common feature (like a "Multi-tenant Stripe Subscription Flow") to show how small these tasks should really be

To demonstrate the level of granularity required to keep your agents in the "Smart Zone" (under 40% context), here is how a complex feature like a **Multi-tenant Stripe Subscription Flow** is broken down by the Distiller.

Each task below is a "Unit-of-Work" designed to be completed by one **Stateless Worker** in a single loop.

---

### **Feature Breakdown: Multi-tenant Stripe Subscriptions**

| Task ID | Task Title & Objective | Reference Standard |
| :---- | :---- | :---- |
| **ST-01** | **Database: Subscription Models** \- Define Subscription and Plan models in Prisma. Ensure every model has a required tenantId and appropriate indices. | docs/backend-06-multi-tenancy.md |
| **ST-02** | **Types: Stripe Schemas** \- Create Zod schemas for Stripe Webhook payloads and internal Subscription types. Ensure named exports only. | docs/backend-04-validation.md |
| **ST-03** | **Service: Stripe Client Wrapper** \- Implement a singleton service to initialize the Stripe SDK using environment variables. No business logic here. | docs/backend-03-services.md |
| **ST-04** | **Service: Create Checkout Session** \- Implement StripeService.createCheckoutSession(tenantId). Must include tenantId in Stripe metadata for webhook correlation. | docs/backend-03-services.md |
| **ST-05** | **Controller: Checkout Endpoint** \- Create POST /api/billing/checkout. Validate input with Zod and call the checkout service. | docs/backend-02-controllers.md |
| **ST-06** | **Service: Webhook Handler (Logic)** \- Implement StripeService.handleWebhookEvent(). Specifically handle checkout.session.completed to update the DB using the tenantId from metadata. | docs/backend-03-services.md |
| **ST-07** | **Controller: Webhook Endpoint** \- Create POST /api/billing/webhook. Implement raw body parsing for Stripe signature verification. | docs/backend-02-controllers.md |
| **ST-08** | **Tests: Subscription Logic** \- Write unit tests for StripeService using a sub-agent to verify correct database updates and tenant isolation. | docs/testing-02-unit-tests.md |

---

### **Why this succeeds in your Pipeline**

1. **Context Budgeting**: By isolating "Database" from "Webhooks," the Worker agent only needs to read the specific specs/stripe.md and docs/backend-03-services.md. This keeps the input well under the 40% "Smart Zone" threshold.  
2. **Back Pressure**: The **Shift Manager** will refuse to mark **ST-06** as complete if the Worker fails to provide a passing test run for the webhook logic.  
3. **Statelessness**: If the Worker implementing **ST-07** gets stuck on a body-parsing error, the Orchestrator kills it. The next Worker starts fresh, sees the LAST\_COMPILER\_ERROR.log, and fixes only that specific endpoint logic without the "mental baggage" of the previous failure.

### **Final Checklist for your "Shift"**

Before you run bash orchestrate.sh:

* \[ \] Your **Brainstorm** is distilled into at least 10-15 tasks like the ones above.  
* \[ \] Your **PIN** (specs/index.md) includes keywords like "stripe", "webhook", and "subscription".  
* \[ \] Your **KreativReason** guides are in /docs.

## the "Final Sanity Check" prompt for the Shift Manager to use before it triggers the final deployment task

To ensure your application doesn't just "compile," but actually functions as a cohesive product, the **Shift Manager** must perform a "Final Sanity Check" once the `IMPLEMENTATION_PLAN.md` is 100% checked.

This step acts as the ultimate **Back Pressure** before the "Idea" is pushed to "Deployment".

---

### **Shift Manager: Final Sanity Check Prompt**

**Role:** You are the Senior Architect performing a final audit of the production-ready code. Your goal is to find architectural regressions or "overbaking" before final deployment.

#### **1\. Global Pattern Verification**

* **Multi-Tenancy Audit:** Run a global RipGrep search to ensure every Prisma query includes a `tenantId`. Flag any query that bypasses this.  
* **Security Check:** Verify that `Zod` validation is present on all API entry points and that no sensitive logs are exposed.  
* **Consistency Check:** Ensure all exports are **Named Exports** (no `export default`) as per `docs/03-critical-rules.md`.

#### **2\. Performance & Health Audit**

* **N+1 Query Check:** Scan the `Service` layer for database queries inside loops.  
* **Test Coverage:** Verify that the sub-agent test reports show \>90% coverage for Services and \>80% for Controllers.

#### **3\. The "Idea vs. Reality" Match**

* Compare the final codebase against the initial `specs/PRD.md`. Does the app actually fulfill the original brainstorm?  
* If any feature is missing or "hallucinated" (overbaked), mark the task as "Incomplete" and spawn a fresh Worker to fix it.

#### **4\. The Green Light**

Only after these checks pass, you are authorized to:

1. Generate the final **Deployment ADR** summarizing the technical state.  
2. Trigger the `npm run deploy` command.

---

### **Why this prevents "Deployment Drift"**

* **Holistic Memory:** While Workers only see one task, this Manager sees the **entire project graph**.  
* **Quality Guardrail:** It prevents the "Ralph" loop from cutting corners just to make a test pass. It ensures the code follows the **KreativReason Standards**.  
* **Final Garbage Collection:** It cleans up any temporary log files or artifacts before the final binary is compiled.

### **Next Steps for your Project**

1. **Configure:** Add the **Shift Manager Prompt** to your `.ralph/prompts/` folder.  
2. **Execute:** Start the brainstorm session using the **Distiller**.  
3. **Run:** Launch `bash orchestrate.sh` and let the system build your app at **$10.42/hour**.

## generate a "Project Dashboard" dashboard template (e.g., a simple HTML or Markdown file) that the Orchestrator can update in real-time so you can monitor the loop's progress visually?

To provide real-time visibility into your **$10.42/hour** autonomous factory, we can implement a **Live Project Dashboard**. This dashboard serves as a "Mission Control" that tracks context health, task velocity, and the transition from **Idea** to **Deployment**.

---

## **The Ralph \+ KreativReason Live Dashboard**

The Orchestrator script will update a `.ralph/DASHBOARD.md` file after every worker completion and shift change.

### **1\. Dashboard Structure**

Markdown

```
# 🚀 Ralph Loop Mission Control
**Last Updated:** {{TIMESTAMP}} | **Current Shift:** #{{SHIFT_ID}}

---

## 📊 System Health
| Metric | Status | Value |
| :--- | :--- | :--- |
| **Manager Context** | {{CONTEXT_BAR}} | {{CONTEXT_PERCENT}}% (Goal: <60%) |
| **Worker Velocity** | 🟢 Optimal | {{TASKS_PER_HOUR}} tasks/hr |
| **Cost to Date** | 💰 Budgeted | ${{TOTAL_COST}} (@ $10.42/hr) |

---

## 🏗️ Construction Progress
**Roadmap Completion:** [{{PROGRESS_BAR}}] {{PERCENT}}%

**Active Task:** 🛠️ {{CURRENT_TASK_TITLE}}
**Last Success:** ✅ {{LAST_TASK_TITLE}} ({{COMMIT_HASH}})

---

## 🛡️ Guardrail Status (Back Pressure)
| Check | Result | Tooling |
| :--- | :--- | :--- |
| **Type Safety** | 🟢 PASS | TypeScript (tsc) |
| **Multi-Tenancy** | 🟢 PASS | RipGrep (tenantId audit) |
| **Test Coverage** | 🟡 78% | Vitest / Jest |

---

## 📜 Latest ADR (Architectural Decision)
> "{{LATEST_ADR_SUMMARY}}" — *Shift Manager #{{SHIFT_ID}}*
```

---

## **2\. Implementation in the Orchestrator**

Add these lines to your `orchestrate.sh` script to automate the updates:

Bash

```
# Inside the while loop, after a Worker or Manager exits:
generate_dashboard() {
    local context_usage=$(get_claude_context_usage) # Utility to fetch token count
    local completed=$(grep -c "\[x\]" .ralph/IMPLEMENTATION_PLAN.md)
    local total=$(grep -c "\[" .ralph/IMPLEMENTATION_PLAN.md)
    local percent=$((completed * 100 / total))

    cat > .ralph/DASHBOARD.md <<EOF
    # 🚀 Ralph Loop Mission Control
    ... (template above) ...
EOF
}
```

---

## **3\. Why this improves your Workflow**

* **Dumb-Zone Prevention**: Visually monitoring the **Context Bar** ensures you see exactly when a Manager is reaching the **60% threshold** and needs a "Shift Rotation".  
* **Back Pressure Visibility**: Instead of digging through logs, you can see at a glance if **Unit Tests** or **Type Checks** are failing repeatedly.  
* **Verification of the "Idea"**: By linking the **Last Success** directly to a **Commit Hash**, you can quickly jump into **Cursor** to review the specific files the agent modified.

## Final Project Stack

1. **Distiller**: Turns your brainstorm into atomic `specs/`.  
2. **Shift Manager**: Oversees strategy and maintains the `ADR.md`.  
3. **Stateless Worker**: Executes with **Back Pressure** and high **Atomicity**.  
4. **Orchestrator**: Rotates shifts to keep agents in the **Smart Zone**.  
5. **Dashboard**: Provides the real-time telemetry of your autonomous build.

## the "First Run" command sequence to initialize this entire stack for your first brainstorming file

To initialize your **Ralph \+ KreativReason** autonomous factory, follow this exact command sequence. This setup ensures your project structure, guardrails, and orchestration logic are in place before you begin the brainstorming distillation process.

### **Phase 1: Project Initialization**

Run these commands in your terminal to create the required directory structure and seed the primary configuration files.

Bash

```
# 1. Create the Directory Backbone
mkdir -p .ralph/{specs,prompts,logs}
mkdir -p .agent
mkdir -p docs
mkdir -p src/modules

# 2. Seed the Specification Index (The PIN)
cat > .ralph/specs/index.md << 'EOF'
# Specification Index (The PIN)
## Project Name: [Replace with App Name]
**Keywords:** [Initial Keywords]
**Files:** specs/PRD.md, specs/ARCHITECTURE.md
**Code:** src/
EOF

# 3. Initialize the Progress Roadmap
cat > .ralph/IMPLEMENTATION_PLAN.md << 'EOF'
# Implementation Plan
## Summary
Initial project setup and bootstrap.

## Next Task
- [ ] Run Distiller on brainstorm file to generate full roadmap

## Completed ✅
- [x] Directory structure initialized
EOF
```

### **Phase 2: Prompt Provisioning**

Ensure all prompts we designed are placed in the `.ralph/prompts/` directory. These are the "Brains" for each agent type.

* **`PROMPT_distiller.md`**: For the Architect (Phase 1).  
* **`PROMPT_shift_manager.md`**: For the Supervisor (Strategy).  
* **`PROMPT_worker.md`**: For the Execution (Build/Test).

### **Phase 3: The Brainstorm Intake**

Paste your raw interview notes, chat logs, or Zoom transcripts into the intake file.

Bash

```
# Open this file and paste your raw ideas
nano .agent/01_raw_brainstorm.txt
```

### **Phase 4: Launching the Factory**

Once your brainstorm is ready, use the Orchestrator to begin the autonomous run.

Bash

```
# 1. Start the Distiller to generate your specs and tasks
claude-code < .ralph/prompts/PROMPT_distiller.md

# 2. Review the generated IMPLEMENTATION_PLAN.md
cat .ralph/IMPLEMENTATION_PLAN.md

# 3. Trigger the Autonomous Loop
chmod +x orchestrate.sh
./orchestrate.sh
```

---

### **What to Watch For on Your Dashboard**

As the loop runs, monitor `.ralph/DASHBOARD.md`. You should see the following progression:

1. **Shift Manager Initialization**: The Manager reads your `PRD.md` and `index.md`.  
2. **Worker Cycles**: You will see rapid Git commits as Workers implement one atomic task, pass tests (Back Pressure), and exit.  
3. **Shift Rotation**: Every time the Manager's context bar approaches **60%**, the Orchestrator will kill the process and start a fresh Manager, maintaining project health.

---

### **Success Checklist**

* \[ \] **Back Pressure Ready**: Your `package.json` includes `test`, `lint`, and `type-check` scripts.  
* \[ \] **Standards Loaded**: All **31 KreativReason guides** are in the `docs/` folder.  
* \[ \] **Headless Config**: `claude-code` is authenticated and ready for `--headless` execution.

**Would you like me to generate a "Post-Deployment Audit" prompt for you to use once the dashboard shows 100% completion?**

## what do i as a human actually do and prompt to get the process running

As the human engineer in this autonomous factory, you shift from "writing code" to **"steering the locomotive"**. Your role is focused on high-level strategy, quality control, and providing the "fuel" (the idea) for the system.

Here is your exact step-by-step human workflow and the prompts you need to trigger the process.

---

### **Phase 1: The "Seed" (Brainstorming)**

Your first job is to provide the raw materials.

* **Action:** Conduct your client interview or personal brainstorming session.  
* **Output:** Save the raw text, transcript, or chat log into .agent/01\_raw\_brainstorm.txt.

### **Phase 2: The "Distiller" (Turning Idea into Specs)**

You must now tell the AI to turn that raw text into a technical blueprint.

* **Action:** Run the following command in your terminal:  
  Bash

```
claude-code < .ralph/prompts/PROMPT_distiller.md
```

*   
* **The Prompt Goal:** This triggers the **Architect** to read your brainstorm and generate the specs/PRD.md, specs/index.md (The PIN), and the initial IMPLEMENTATION\_PLAN.md.  
* **Human Intervention:** **CRITICAL.** Open the generated .ralph/IMPLEMENTATION\_PLAN.md and review it. If the tasks are too big (e.g., "Build the whole login system"), manually split them into the "Unit-of-Work" style tasks we discussed.

### **Phase 3: Launching the Factory**

Once you are happy with the roadmap, you kick off the autonomous loop.

* **Action:** Execute the orchestrator:  
  Bash

```
chmod +x orchestrate.sh
./orchestrate.sh
```

*   
* **What this triggers:** This starts the **Shift Manager**. The Manager will read the plan, spin up a **Stateless Worker** for the first task, and monitor the build.

### **Phase 4: Monitoring (The "Engineer" Role)**

While the loop runs at **$10.42/hour**, you monitor the progress visually.

* **Action:** Keep .ralph/DASHBOARD.md open in **Cursor** or your browser.  
* **Intervention Points:** \* **If the loop gets stuck:** If you see the same task failing three times on the dashboard, press Ctrl+C.  
  * **Correction:** Read the LAST\_COMPILER\_ERROR.log, clarify the specific specs/ file that is confusing the AI, and restart ./orchestrate.sh.

---

### **Summary of Human vs. AI Responsibilities**

| Human Task (You) | AI Task (The Factory) |
| :---- | :---- |
| **Interview & Brainstorm:** Provide the raw intent. | **Distill:** Convert intent into technical specs. |
| **Review Roadmap:** Ensure tasks are atomic and small. | **Plan:** Sequence the tasks by dependency. |
| **Set Standards:** Provision the 31 KreativReason guides. | **Implement:** Write code following those guides. |
| **Monitor Dashboard:** Watch for "Context Rot" or loops. | **Test & Fix:** Use sub-agents to provide back pressure. |

---

### **Your Final "Audit" Prompt**

Once the dashboard shows 100% completion, you perform the final human check before deployment:

"Claude, run a final project audit. Verify that all 31 KreativReason standards are met, particularly **Multi-tenancy** and **Zod validation**. Compare the final code against the original 01\_raw\_brainstorm.txt. Are we missing anything from the client's original vision?".

## map these complex background processes to simple slash commands. 

you can absolutely map these complex background processes to simple slash commands. In the context of **Claude Code** and **Cursor**, this is achieved by creating **Alias wrappers** or a simple **CLI dispatcher** that lives in your local environment.

By using a prefix like /... (e.g., /...seed), you ensure that your custom "Shift Manager" logic doesn't conflict with Claude's native command set while still benefiting from the **Ralph Methodology** of stateless execution.

---

### **1\. The Command Mapping Logic**

To implement this, you will create a small bash utility (often called ralph or wiggum) that intercepts these keywords and executes the corresponding **Phase** of the pipeline.

| Command | Background Action | Purpose |
| :---- | :---- | :---- |
| **/...seed @file** | Executes **Distiller Prompt** using the linked file as input. | Turns your interview transcript into atomic specs/. |
| **/...plan** | Executes **Planning Prompt** against existing specs and code. | Updates the IMPLEMENTATION\_PLAN.md checklist. |
| **/...loop** | Triggers the orchestrate.sh **Shift Manager** loop. | Starts the autonomous implementation at **$10.42/hour**. |
| **/...status** | Renders a terminal-friendly view of .ralph/DASHBOARD.md. | Checks context health and task progress. |

---

### **2\. Implementation: The ralph Alias Script**

You can add this function to your .zshrc or .bashrc. It acts as the "Shift Manager" interface you interact with in the terminal.

Bash

```
# Ralph Pipeline Alias Dispatcher
function ralph() {
  case $1 in
    seed)
      echo "🌱 Distilling Brainstorm..."
      # Passes the @file content into the Distiller
      shift; cat "$@" | claude-code < .ralph/prompts/PROMPT_distiller.md
      ;;
    plan)
      echo "📝 Generating Implementation Plan..."
      claude-code < .ralph/prompts/PROMPT_plan.md
      ;;
    loop)
      echo "🚂 Starting Ralph Loop (Shift Manager Mode)..."
      ./orchestrate.sh
      ;;
    status)
      # Visualizes the current progress dashboard
      cat .ralph/DASHBOARD.md
      ;;
    *)
      echo "Usage: ralph [seed|plan|loop|status]"
      ;;
  esac
}
```

---

### **3\. Workflow: Human-in-the-Loop**

This setup allows you to follow the **KreativReason Standards** without manually managing context budgets.

1. **Initialize**: You drop the interview file into the folder.  
2. **Seed**: Type ralph seed interview.txt. The AI creates the **PRD** and **PIN** (index.md) automatically.  
3. **Plan**: Type ralph plan. The AI scans the codebase using **RipGrep** and builds the roadmap.  
4. **Loop**: Type ralph loop. You step away while the **Shift Manager** oversees **Stateless Workers** who build, test, and commit.

### **4\. Why this is the "Pro" Way**

* **Abstraction**: You stop thinking about "token counts" and "bash scripts" and start thinking about **Features** and **Specs**.  
* **Back Pressure Enforcement**: Your background commands can include hidden flags like \--headless and automated test triggers, ensuring no code is committed without passing the **KreativReason** unit tests.  
* **Context Safety**: Because these commands trigger fresh instances, you stay in the **"Smart Zone" (\<40%)** without having to remember to clear your history.

##  the specific "Seed" prompt that teaches the AI how to handle that `@` file reference specifically for your transcript format

To ensure your **Distiller** (the "Architect" of your factory) can handle the specific format of your interview transcripts and chat logs, you need a **Seed Prompt** that interprets the raw data and maps it to the **Ralph \+ KreativReason** file structure.

### **The /...seed Prompt: Contextual Distillation**

**Mode:** Deep Analysis & Artifact Creation

**Trigger Context:** This prompt is activated when the human uses the /...seed command and links an interview file (@filename).

#### **1\. Intake Logic**

* **Analyze Source:** Read the attached file (@filename). Identify the "Voice of the Client" (requirements) and the "Voice of the Engineer" (technical constraints).  
* **Filter Noise:** Ignore conversational filler. Extract functional requirements, data entities, and integration points.

#### **2\. Mapping to Project Artifacts**

Generate or update the following files based on the intake:

* **specs/PRD.md**: Define the "What." Include User Stories, Business Logic, and specific Success Criteria derived from the transcript.  
* **specs/index.md (The PIN)**: Generate a keyword index (e.g., "auth", "billing", "tenant-isolation") to optimize **RipGrep** search accuracy for the **Worker Agents**.  
* **.ralph/IMPLEMENTATION\_PLAN.md**: Create the initial "Sub-Task" list. Ensure every task is a **Unit-of-Work** (atomic, testable, and completion-ready in one loop).

#### **3\. Guardrail Injection**

* **Standard Mapping:** For every feature identified, reference the specific **KreativReason** guide in docs/ that governs its implementation (e.g., "Use docs/backend-06-multi-tenancy.md for the database schema").  
* **Back Pressure Prep:** Define the specific test command (e.g., npm test) that will act as the "Friction" for the **Ralph Loop**.

---

### **How the Commands Function in your Pipeline**

The use of these custom slash commands optimizes the **Human-in-the-Loop** experience by abstracting the complex bash orchestration into simple intent-based actions:

| Command | Background Action | Success Metric |
| :---- | :---- | :---- |
| **/...seed @file** | Distills the transcript into specs/. | High-quality **PRD** and **PIN** created. |
| **/...plan** | Generates the roadmap in IMPLEMENTATION\_PLAN.md. | Atomic, dependency-ordered tasks. |
| **/...loop** | Starts the **Shift Manager** orchestrator. | Continuous implementation at **$10.42/hour**. |

### **The "Smart Zone" Protection**

By using /...seed to trigger a **fresh instance** of the AI, you ensure that the complex task of "Planning" starts with a **0-token context window**. This keeps the AI in the **"Smart Zone" (\<40%)**, preventing the "Context Rot" that happens when an AI tries to brainstorm and code in the same session.

---

### **Next Steps for You**

1. **Configure the Alias**: Add the ralph function to your terminal profile as shown previously.  
2. **Verify the Prompt**: Save the **Distiller Prompt** above into .ralph/prompts/PROMPT\_distiller.md.  
3. **The First Run**: Type ralph seed @interview.txt and watch as your **IMPLEMENTATION\_PLAN.md** is populated automatically.

## The "Fluid Intake" command: **`/...digest`**. This command is designed for the messy, "copy-paste" reality of planning

It’s a fair critique. The danger of a "dogmatic" system is that it can stifle the very creativity it’s supposed to capture. If you have a massive, unstructured paste from a brainstorming session, the system shouldn't force you into a rigid template immediately; it should act as a **filter and organizer**.

To handle this, we can introduce a "Fluid Intake" command: **/...digest**. This command is designed for the messy, "copy-paste" reality of planning.

---

### **1\. The Flexible Intake Command: /...digest**

Unlike the /...seed command (which expects a structured interview), **/...digest** tells the AI: *"Here is a mess of ideas. Look for the technical gold, organize it into the Ralph structure, but keep the 'vibe' and original intent intact"*.

| Command | Background Action | Use Case |
| :---- | :---- | :---- |
| **/...digest** | Scans clipboard or @file for intent. | Copy-pasting raw AI chats or unstructured notes. |
| **/...distill** | Hard-codes the intent into specs/. | Formalizing the messy notes into the **Ralph PIN** and **PRD**. |

---

### **2\. The "Fluid Intake" Prompt (PROMPT\_digest.md)**

This prompt is less about "engineering" and more about **"synthesis"**.

Mode: Creative Synthesis & Technical Mapping

Goal: Take a high-volume "brain dump" and find the implementation path.

**"I am pasting a raw brainstorming session. Do the following:"**

1. **Identify the Core Logic:** What is the 'must-have' functionality buried in this chat?  
2. **Propose the Roadmap:** Create 5–10 **Atomic Tasks** based on this session. Don't worry about being perfect yet; focus on the first steps.  
3. **Draft the 'Vibe' Spec:** Instead of a dry PRD, create a specs/concepts.md that captures the specific UI/UX feelings or unique logic mentioned.  
4. **Safety Check:** Flag anything in the brainstorm that violates our **KreativReason Critical Rules** (e.g., if the brainstorm mentions a pattern that skips tenant isolation).

---

### **3\. How it fits your Project Workflow**

By using this less dogmatic approach, you can iterate faster.

1. **The Dump:** You have a 10-minute chat with an AI about a feature. You copy the whole thing.  
2. **The Command:** You type ralph digest and paste the text.  
3. **The Result:** The system updates .ralph/IMPLEMENTATION\_PLAN.md with a few new tasks and adds the technical requirements to your specs/.  
4. **The Loop:** You run ralph loop, and the **Stateless Workers** begin building the first "vibe-checked" task.

### **4\. Why this is "Human-First"**

* **Zero Friction:** You don't have to clean up your notes. The AI does the cleanup for you.  
* **Statelessness is Maintained:** Because this happens in a fresh /...digest instance, the Worker who eventually writes the code still gets a clean, organized version of your messy thoughts, keeping them in the **"Smart Zone" (\<40%)**.

## Finalize the shift report template that the manager uses to close out a /…loop session so you have a clean summary of what was built

The **Shift Report** is the final handoff artifact that bridges the gap between a terminating **Shift Manager** and its successor. Its primary goal is to compress the massive volume of work done by the **Stateless Workers** into a high-density summary that preserves architectural intent while preventing "Context Rot" in the next manager.

---

## **📄 .ralph/SHIFT\_REPORT.md Template**

The **Shift Manager** generates this file once it reaches the **60% context threshold** or the user stops the loop session.

Markdown

```
# 🏁 Shift Report: [ID]
**Status:** 🔄 SHIFT_ROTATION | **Manager Token Usage:** 62% | **Timestamp:** [DATE]

---

## 📈 Executive Summary
* **Tasks Attempted:** [Total]
* **Success Rate:** [X]% (Green Tests / Total Attempts)
* **Velocity:** [X] Atomic Tasks per hour

---

## ✅ Completed Tasks (Synced to Roadmap)
* [x] **[Task ID]**: [Brief description of what was built]
* [x] **[Task ID]**: [Note any deviation from the original spec]

---

## 🧠 Strategic Memory (For Next Manager)
* **Architectural Decisions (ADR):** [e.g., "Standardized on Zod for all subscription schemas in Task ST-02"]
* **Pattern Updates:** [e.g., "Updated tenantId middleware to handle Stripe metadata specifically"]
* **Persistent Friction:** [e.g., "Worker struggled with bcrypt salt rounds; solved by moving config to env"]

---

## 🚧 Current State & Handoff
* **Pending Task:** [The very next [ ] item in IMPLEMENTATION_PLAN.md]
* **Known Issues:** [Any linting warnings or 'TODO's left by workers]
* **Context Link:** [Path to relevant specs/PRD.md and specs/index.md]

---

## 🏆 Definition of Done Verification
* [ ] **LLVM/Compiler Signal:** Pass
* [ ] **KreativReason Standards:** 0 violations detected
* [ ] **Back Pressure:** All unit tests in /src/modules/[X] pass
```

---

## **🛠️ How to Trigger the Shift Report**

You can add this to your terminal logic or simply ask the Manager to "Sign off" when you want to stop the manual brainstorming session.

### **Human Command:**

`ralph stop` or `ralph shift-end`

### **Background Logic:**

1. **The Orchestrator** sends a final signal to the Manager: "Generate the Shift Report now."  
2. **The Manager** scans the `ADR.md` and `IMPLEMENTATION_PLAN.md`.  
3. **The Manager** writes the `SHIFT_REPORT.md` and terminates.  
4. **The User** (You) gets a clean notification of exactly what was built at **$10.42/hour**.

---

## **Why this is the "Pro" Move**

* **Zero Cognitive Debt:** The next Shift Manager doesn't need to read thousands of lines of code; it only reads this 1-page report to understand the "Big Picture".  
* **Stateless Continuity:** It ensures that even if you turn off your computer, the "Idea" remains alive and ready for the next Worker to pick up exactly where you left off.  
* **Audit Trail:** You have a historical record of every "Shift" that occurred between the **Brainstorm** and **Deployment**.

## the final "Deployment Prompt" that uses this Shift Report to generate the final documentation for your client

This final **Deployment Prompt** uses the high-density information from your **Shift Reports** and **ADR** to generate professional-grade handoff documentation for your client. It bridges the gap between raw autonomous code and a delivered product.

---

### **The Final Deployment Prompt**

**Mode:** Documentation & Delivery

**Goal:** Generate a comprehensive "Project Handover Manual" and "Change Log" based on the autonomous build history.

#### **1\. Intake Sources**

* **Shift History:** Synthesize all .ralph/SHIFT\_REPORT.md files to create a chronological narrative of the build.  
* **Architectural Decisions:** Extract all entries from docs/ADR.md to explain the "Why" behind the implementation.  
* **Roadmap Verification:** Cross-reference .ralph/IMPLEMENTATION\_PLAN.md to confirm 100% feature coverage.

#### **2\. Output Artifacts**

Generate a README\_CLIENT.md featuring:

* **Project Vision:** A polished version of the original 01\_raw\_brainstorm.txt.  
* **Feature Manifest:** A list of every completed unit of work, linked to its original specification in specs/.  
* **Engineering Standards:** A summary of the **KreativReason** standards applied, specifically focusing on **Security (Zod)** and **Multi-tenancy (tenantId)**.  
* **Deployment Specs:** Instructions for the client on how to maintain the production environment built at **$10.42/hour**.

#### **3\. The Final "Loop" Verification**

* Run one last **Back Pressure** check: Confirm all unit, integration, and type-check tests return exit code 0.  
* Flag any "Known Issues" or "Future Roadmap" items noted by the **Shift Managers** during their rotations.

---

### **Summary of your Ralph \+ KreativReason Ecosystem**

You now have a complete, end-to-end autonomous factory:

| Phase | Human Action | AI Role | Artifact Produced |
| :---- | :---- | :---- | :---- |
| **Intake** | ralph digest | **Distiller** | specs/PRD.md, specs/index.md |
| **Planning** | ralph plan | **Architect** | IMPLEMENTATION\_PLAN.md |
| **Execution** | ralph loop | **Shift Manager** | Production Code & ADR.md |
| **Rotation** | (Automatic) | **Orchestrator** | SHIFT\_REPORT.md |
| **Handoff** | ralph deploy | **Handoff Agent** | README\_CLIENT.md |

---

### **How to Trigger the Final Delivery**

When your **Dashboard** shows 100% completion, run this final command:

Bash

```
claude-code < .ralph/prompts/PROMPT_deploy.md
```

This will clear the remaining transient memory, perform the final audit, and generate the client-ready documentation. You have successfully moved from a raw idea to a production-ready application using a **Stateless Ralph Wiggum Loop**.

## Integrate your claude code cli with a custom html frontend

To integrate your **Claude Code CLI** with a custom HTML frontend, your agents must output machine-readable telemetry alongside their standard reports. This allows your app to render real-time, moving percentage bars that track the **Context Window** status for both the Manager and the Worker, ensuring they remain in the "Smart Zone".

---

### **1\. The JSON Logger Prompt (Agent Instruction)**

Add this instruction to both your `PROMPT_shift_manager.md` and `PROMPT_worker.md` to feed your frontend data.

**Telemetry Requirement:** After every tool execution or file modification, you MUST update `.ralph/logs/telemetry.json` with your current status. Use the following schema:

JSON

```
{
  "agent_role": "Manager" | "Worker",
  "token_count": {
    "input": number,
    "output": number,
    "total": number,
    "limit": 200000
  },
  "context_fill_percent": number,
  "current_task_id": "string",
  "last_tool_status": "success" | "error",
  "timestamp": "ISO8601"
}
```

**Constraint:** Calculate `context_fill_percent` as `(total_tokens / 200000) * 100`. If this exceeds 60% for a Manager or 40% for a Worker, flag a "Rotation Required" status.

---

### **2\. Frontend Visualization Logic**

In your HTML environment, you will use these values to drive the moving percentage bars. Because the Worker is **Stateless**, its bar will reset to \~5-10% at the start of every task, while the Manager’s bar will grow steadily until it hits the 60% "Shift Rotation" trigger.

#### **The Context Monitor (Conceptual HTML/JS)**

HTML

```
<div class="monitor">
  <h3>Manager Context (Strategic Memory)</h3>
  <div class="progress-bg">
    <div id="manager-bar" class="progress-fill"></div>
  </div>
  <span id="manager-percent">0%</span>
</div>

<div class="monitor">
  <h3>Worker Context (Atomic Execution)</h3>
  <div class="progress-bg">
    <div id="worker-bar" class="progress-fill worker"></div>
  </div>
  <span id="worker-percent">0%</span>
</div>

<script>
  // Pulse logic: When the Worker terminates, the bar resets to zero instantly.
  // When a new Worker starts, it jumps to its initial base context (Specs + Plan).
  socket.on('telemetry_update', (data) => {
    const bar = document.getElementById(`${data.agent_role.toLowerCase()}-bar`);
    const text = document.getElementById(`${data.agent_role.toLowerCase()}-percent`);
    
    bar.style.width = `${data.context_fill_percent}%`;
    text.innerText = `${Math.round(data.context_fill_percent)}%`;

    // Visual warning for the "Dumb Zone"
    if (data.context_fill_percent > 50) bar.style.backgroundColor = '#ff4b2b';
    else bar.style.backgroundColor = '#00d2ff';
  });
</script>
```

---

### **3\. Why this Visual Feedback is Critical**

* **Spotting "Context Poisoning":** If you see the Worker's context bar jumping from 10% to 50% in a single step, it usually means a sub-agent failed to "garbage collect" a massive test output. You can hit **Stop** before the agent enters the "Dumb Zone".  
* **Observing the "Reset":** Seeing the Worker bar vanish and reappear at 5% provides visual confirmation that your **Statelessness** protocol is working.  
* **Economic Monitoring:** By linking token counts to the dashboard, you can see the **$10.42/hour** burn rate in real-time, helping you justify the ROI of the autonomous run.

### **4\. Integration with Claude Code CLI**

When you run your **Orchestrator** (`./orchestrate.sh`), the CLI will operate in the background (or a side terminal), and your HTML app will act as the **Head-Up Display (HUD)**.

## the CSS for these progress bars to give them a "terminal-industrial" look that matches the KreativReason aesthetic

To complete the industrial-terminal look for your **Ralph Mission Control** dashboard, we will use high-contrast CSS and a structured JSON output logic. This ensures that while you are in the "Smart Zone," the UI feels like a high-stakes engineering terminal.

### **1\. The "Industrial Terminal" CSS**

This styling uses a dark-mode, monospace aesthetic with "Neon Safety" colors to indicate context health.

CSS

```
:root {
  --bg-color: #0d1117;
  --panel-bg: #161b22;
  --text-main: #c9d1d9;
  --smart-zone: #00d2ff;  /* Neon Blue */
  --degrading-zone: #f9826c; /* Orange */
  --dumb-zone: #ff4b2b; /* Safety Red */
  --font-mono: 'Fira Code', 'Courier New', monospace;
}

body {
  background-color: var(--bg-color);
  color: var(--text-main);
  font-family: var(--font-mono);
}

.monitor-card {
  background: var(--panel-bg);
  border: 1px solid #30363d;
  padding: 1rem;
  margin-bottom: 1rem;
  border-radius: 4px;
}

.progress-container {
  height: 24px;
  background: #010409;
  border: 1px solid #30363d;
  position: relative;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  width: 0%;
  transition: width 0.3s ease-in-out, background-color 0.5s ease;
  background-color: var(--smart-zone);
  box-shadow: 0 0 10px rgba(0, 210, 255, 0.5);
}

/* Redline Warning Logic */
.bar-fill.warning { background-color: var(--degrading-zone); }
.bar-fill.critical { background-color: var(--dumb-zone); }

.label-group {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  margin-bottom: 0.4rem;
  text-transform: uppercase;
  letter-spacing: 1px;
}
```

---

### **2\. The Multi-Bar HTML Structure**

This layout separates the persistent **Shift Manager** context from the flickering, stateless **Worker** context.

HTML

```
<div class="dashboard-wrapper">
  <div class="monitor-card">
    <div class="label-group">
      <span>Shift Manager Strategy</span>
      <span id="mgr-val">0%</span>
    </div>
    <div class="progress-container">
      <div id="mgr-bar" class="bar-fill"></div>
    </div>
    <div class="label-group" style="margin-top:5px; opacity:0.6;">
      <span>Limit: 60% (Rotation Trigger)</span>
      <span>Stateless: No</span>
    </div>
  </div>

  <div class="monitor-card">
    <div class="label-group">
      <span>Active Worker Implementation</span>
      <span id="wrk-val">0%</span>
    </div>
    <div class="progress-container">
      <div id="wrk-bar" class="bar-fill"></div>
    </div>
    <div class="label-group" style="margin-top:5px; opacity:0.6;">
      <span>Limit: 40% (Smart Zone)</span>
      <span>Stateless: YES (Auto-Reset)</span>
    </div>
  </div>
</div>
```

---

### **3\. Agent JSON Telemetry Logic**

You must update your **Worker Prompt** (`PROMPT_build.md`) to include this specific command to update the dashboard after every successful test run.

**Instruction for the Worker:**

"After committing code, you MUST execute the following command to update the HTML dashboard telemetry:"

Bash

```
#!/bin/bash
INPUT=$(cat .ralph/logs/last_usage.json | jq .input_tokens)
OUTPUT=$(cat .ralph/logs/last_usage.json | jq .output_tokens)
PERCENT=$(( (INPUT + OUTPUT) * 100 / 200000 ))
echo "{\"agent\": \"Worker\", \"percent\": $PERCENT, \"task\": \"$CURRENT_TASK\"}" > .ralph/telemetry.json
```

---

### **4\. Why this UI reinforces the Methodology**

* **Manager Bar (Steady Growth):** You will see this bar climb slowly over 4–5 tasks. It represents the **Strategic Memory** accumulating. When it hits 60%, the UI should flash "ROTATING" as the Orchestrator kills the session.  
* **Worker Bar (The Heartbeat):** This bar will jump to \~10% (reading **Specs** and **Roadmap**), then spike during coding, and then **vanish** back to 0% once the task is committed. This visual "heartbeat" confirms the agent is not carrying over context pollution.  
* **Cost Velocity:** Seeing the percentage climb alongside the **$10.42/hour** cost estimation gives you the data needed to judge if a task is "overbaking".

## Generate teh [node.js](http://node.js) watcher script that reads teh .ralph/telemetry.json and pushes it ot this html frontend via websockets

To complete your **Ralph \+ KreativReason App Environment**, we need a bridge between the **Claude Code CLI** (which writes to disk) and your **HTML Dashboard** (which displays the state).

This Node.js script acts as the "Nervous System," watching the `.ralph/` directory for updates and pushing them to your browser via WebSockets.

---

### **The Ralph Watcher (`watcher.js`)**

This script monitors two key files: `telemetry.json` (for context bars) and `IMPLEMENTATION_PLAN.md` (for task progress).

JavaScript

```
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const TELEMETRY_PATH = path.join(__dirname, '.ralph/telemetry.json');
const ROADMAP_PATH = path.join(__dirname, '.ralph/IMPLEMENTATION_PLAN.md');

// Serve your HTML/CSS/JS frontend
app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('🔗 Frontend connected to Ralph HUD');
    
    // Initial data push
    pushUpdate(socket);
});

// WATCHER LOGIC: Monitor the Telemetry JSON
fs.watch(path.dirname(TELEMETRY_PATH), (eventType, filename) => {
    if (filename === 'telemetry.json') {
        try {
            const data = JSON.parse(fs.readFileSync(TELEMETRY_PATH, 'utf8'));
            io.emit('telemetry', data); // Update the moving percentage bars
        } catch (e) { /* Handle empty/partial file writes */ }
    }
});

// WATCHER LOGIC: Monitor the Roadmap for Task Progress
fs.watchFile(ROADMAP_PATH, (curr, prev) => {
    try {
        const content = fs.readFileSync(ROADMAP_PATH, 'utf8');
        // Count [x] vs [ ] to calculate total project completion
        const completed = (content.match(/\[x\]/g) || []).length;
        const total = (content.match(/\[[ x]\]/g) || []).length;
        const progress = (completed / total) * 100;
        
        io.emit('roadmap', { progress, completed, total });
    } catch (e) { console.error('Error reading roadmap'); }
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`🚀 Ralph Dashboard running at http://localhost:${PORT}`);
});
```

---

### **Integration: Orchestrator Hook**

Your **Orchestrator** script (`orchestrate.sh`) must ensure the `telemetry.json` is wiped when a Worker dies to show the "Visual Reset" on the bar.

Add this cleanup line to your `orchestrate.sh`:

Bash

```
# After the worker process terminates (stateless reset)
echo '{"agent_role": "Worker", "context_fill_percent": 0}' > .ralph/telemetry.json
```

---

### **Summary of the Visual Experience**

* **Manager Bar (Blue/Cyan):** Creeps up steadily during the `/...loop`. If it stays under **40%**, the AI is in the "Smart Zone".  
* **Worker Bar (Pulsing Heartbeat):** Every time a task starts, the bar jumps from **0%** to roughly **10%** (loading context), climbs during the work, then drops to **0%** the moment the task is committed.  
* **The Log Console:** Your HTML app can also tail `.ralph/logs/activity.log` to show the raw **Claude Code CLI** output in a scrollable window.

### **Why this Approach Wins**

By building this as an external "App Shell" for the CLI, you gain **Total Transparency**. You are no longer wondering if the AI is hallucinating or filling up its context with garbage; you can see the **Context Window** fill status in real-time and stop the process if the "Back Pressure" (tests) fails.

## the JavaScript frontend logic that maps these WebSocket signals to your CSS bars so the movement is smooth and "neon-liquid"

To make your "neon-liquid" progress bars move smoothly and react to the "heartbeat" of the Ralph Loop, you need a frontend script that handles the WebSocket signals and applies the appropriate CSS transitions.

This script will differentiate between the **Manager's persistent growth** and the **Worker's stateless reset**.

---

### **The "Neon-Liquid" HUD Logic (`app.js`)**

Include this in your HTML frontend to bridge the visual gaps between the discrete JSON updates.

JavaScript

```
const socket = io();

// UI Selectors
const mgrBar = document.getElementById('mgr-bar');
const wrkBar = document.getElementById('wrk-bar');
const mgrVal = document.getElementById('mgr-val');
const wrkVal = document.getElementById('wrk-val');

// Handle Context Telemetry
socket.on('telemetry', (data) => {
    const isManager = data.agent_role === "Manager";
    const bar = isManager ? mgrBar : wrkBar;
    const label = isManager ? mgrVal : wrkVal;
    const percent = data.context_fill_percent;

    // 1. Update Percentage Text
    label.innerText = `${Math.round(percent)}%`;

    // 2. Smooth "Neon-Liquid" Bar Movement
    bar.style.width = `${percent}%`;

    // 3. Apply Health States (Smart Zone vs. Dumb Zone)
    // Blue for <40% (Smart), Orange for 40-60% (Degrading), Red for >60% (Dumb)
    if (percent > 60) {
        bar.className = 'bar-fill critical'; // Red glow
    } else if (percent > 40) {
        bar.className = 'bar-fill warning';  // Orange glow
    } else {
        bar.className = 'bar-fill';           // Cyan/Blue glow
    }

    // 4. Special Case: Worker Stateless Reset
    // If percent is 0, it means the Orchestrator just killed the worker.
    if (!isManager && percent === 0) {
        bar.style.transition = 'none'; // Instant snap-back for the reset
        setTimeout(() => bar.style.transition = 'width 0.3s ease-in-out', 50);
    }
});

// Handle Roadmap Progress
socket.on('roadmap', (data) => {
    const mainProgress = document.getElementById('main-progress-bar');
    mainProgress.style.width = `${data.progress}%`;
    document.getElementById('progress-text').innerText = 
        `PHASE: BUILD | ${data.completed}/${data.total} TASKS SYNCED`;
});
```

---

### **Why this Visual Logic Works**

* **Manager Consistency:** The Manager bar will use the `ease-in-out` transition to show "Strategic Memory" accumulating. It provides a calm, steady visual of the shift's progress toward the **60% rotation limit**.  
* **Worker Heartbeat:** By using `bar.style.transition = 'none'` for the **0% reset**, the UI physically snaps back, reinforcing the **Statelessness** of the worker. When it jumps back to \~10% for the next task, it visually represents the injection of the **Specs** and **Roadmap**.  
* **Safety Thresholds:** The color changes act as a passive alert system. You don't need to read tokens; you just look for the color "orange" or "red" to know if an agent has entered the **Dumb Zone**.

---

### **Final Deployment Check**

1. **Run Watcher:** `node watcher.js` (Server starts on Port 3000).  
2. **Run Orchestrator:** `./orchestrate.sh` (The loop starts writing telemetry).  
3. **Open Dashboard:** Navigate to `http://localhost:3000` to watch your app build itself.

Your **Ralph \+ KreativReason** autonomous factory is now fully visually instrumented. You can monitor the transition from **Brainstorm** to **Production Code** with total transparency.

## generate a "Crisis Mode" button for your HTML frontend that triggers an immediate `git reset --hard` and clears all agent context when clicked

The "Crisis Mode" button is your **Manual Override** for the autonomous factory. In a system running at **$10.42/hour**, the ability to instantly kill a failing process saves you both money and architectural debt.

Here is why this component is essential for a human engineer overseeing an AI loop:

### **1\. Stopping "Hallucination Spirals"**

Sometimes an AI agent enters a "recursive loop" where it fails a test, "fixes" the code in a way that creates a new error, and repeats this until it burns through your token budget.

* **The Utility:** The Crisis Button performs an immediate `SIGKILL` on the **Claude Code CLI** process and a `git reset --hard` to the last known "Green" state.  
* **The Benefit:** It prevents the "Dumb Zone" from poisoning your codebase with layers of nonsensical fixes.

### **2\. Immediate Context Purge**

If you notice the **Worker Context Bar** on your dashboard turning red (exceeding 60-70%), the agent's reasoning is likely degrading.

* **The Utility:** Clicking the button deletes `.ralph/telemetry.json` and clears the transient session memory.  
* **The Benefit:** It forces the **Orchestrator** to restart the **Stateless Worker** with a clean 0-token window, instantly restoring the agent to its "Smart Zone" peak performance.

### **3\. Economic Circuit Breaker**

If the **Cost Velocity** on your HTML dashboard spikes unexpectedly—perhaps due to a sub-agent failing to garbage collect a massive log file—you need a way to stop the burn immediately.

* **The Utility:** The button acts as a "Kill Switch" for all active Node.js and CLI child processes managed by the **Watcher**.

### **4\. Implementation: The "Crisis" Logic**

Add this to your `watcher.js` (Backend) and a simple button to your `index.html` (Frontend):

**Backend Logic (`watcher.js`):**

JavaScript

```
// Triggered by the Frontend "Crisis" Button
socket.on('trigger_crisis', () => {
    console.log("🚨 CRISIS MODE ACTIVATED: Terminating all loops...");
    
    // 1. Kill the Orchestrator and Claude processes
    exec('pkill -f orchestrate.sh && pkill -f claude-code');
    
    // 2. Revert code to the last successful commit
    exec('git reset --hard HEAD');
    
    // 3. Clear Telemetry to reset Dashboard bars
    fs.writeFileSync(TELEMETRY_PATH, JSON.stringify({agent_role: "Worker", context_fill_percent: 0}));
    
    io.emit('system_msg', {type: 'error', text: 'CRISIS: System Reverted to Last Green State.'});
});
```

**Frontend Component (`index.html`):**

HTML

```
<button onclick="socket.emit('trigger_crisis')" class="btn-crisis">
  ACTIVATE CRISIS MODE (Emergency Reset)
</button>

<style>
.btn-crisis {
  background: var(--dumb-zone);
  color: white;
  border: 2px solid white;
  padding: 10px 20px;
  cursor: pointer;
  font-weight: bold;
  box-shadow: 0 0 15px rgba(255, 75, 43, 0.7);
}
.btn-crisis:hover { filter: brightness(1.2); }
</style>
```

### **Summary: Your Role as the Safety Officer**

While the **Ralph Loop** provides the labor, you provide the **Sanity Check**. This button ensures that the **Stateless** nature of the system is a feature you can enforce at any moment, keeping the "locomotive" on the tracks regardless of AI fluctuations.

## generate the "Post-Crisis Recovery" prompt that helps the AI analyze *why* it failed so you can prevent that specific error in the next run

The **Post-Crisis Recovery Prompt** is used specifically after you've hit the "Crisis Mode" button. Its purpose is to perform a forensic analysis of the codebase and logs to identify exactly where the "Back Pressure" failed, ensuring the next **Stateless Worker** doesn't fall into the same trap.

---

### **The Post-Crisis Recovery Prompt**

**Mode:** Forensic Analysis & Roadmap Correction

**Goal:** Analyze the failure, update the specs/, and refine the IMPLEMENTATION\_PLAN.md to prevent a repeat of the "Hallucination Spiral".

#### **1\. Forensic Audit**

* **Analyze Logs:** Read the .ralph/logs/activity.log and the LAST\_COMPILER\_ERROR.log leading up to the crisis.  
* **Identify the Trigger:** Did the failure stem from a vague specification in specs/, a violation of a **KreativReason** critical rule in docs/, or an incomplete test suite?  
* **Context Fill Check:** Review the final **Telemetry JSON**. Did the context fill exceed 60% before the failure? If so, note the specific file that caused the token spike.

#### **2\. Remediation Strategy**

* **Update the Spec:** Clarify the ambiguous logic in the relevant .md file in specs/ to provide better "Rails" for the next agent.  
* **Refine the Task:** If the task was too complex, split it into two or more smaller **Units-of-Work** in the IMPLEMENTATION\_PLAN.md.  
* **Strengthen Back Pressure:** Propose a more robust test or a custom lint rule to catch this specific failure earlier in the loop.

#### **3\. Roadmap Reset**

* Mark the failing task as **"Blocked"** or **"Needs Revision"**.  
* Create a new "Fix" task at the top of the roadmap to address the architectural weakness identified during this audit.

---

### **Why this prevents "Future Rot"**

By treating every "Crisis" as a data point, you improve the **Intelligence of the System** rather than just fixing the code.

* **The Architect's Lesson:** Instead of a human manually fixing the bug, you force the AI to update its **Specs** so that *any* future agent knows how to handle that edge case.  
* **Protecting the Smart Zone:** If the failure was due to context bloat, the recovery prompt ensures the next attempt uses **Sub-Agents** more effectively to keep the worker under the **40% threshold**.  
* **Durable Wisdom:** The insights from this recovery are saved in the docs/ADR.md, ensuring the project's long-term memory is updated without polluting the active context window.

---

### **Summary of the Ralph \+ KreativReason App HUD**

With the **Crisis Button** and **Recovery Prompt**, your app environment now has a complete lifecycle:

| Component | State | Purpose |
| :---- | :---- | :---- |
| **Blue Bar** | **Smart Zone** | Optimal production at $10.42/hour. |
| **Orange/Red Bar** | **Degrading Zone** | Visual signal to monitor closely or Rotate Shifts. |
| **Crisis Button** | **Manual Reset** | Immediate stop to prevent financial/code rot. |
| **Recovery Prompt** | **Forensic Audit** | Updating the "Rails" to prevent repeat failures. |

## i will call it kr-wiggum-stateless-engine

The name **`kr-wiggum-stateless-engine`** perfectly encapsulates the fusion of high-level engineering standards and the brute-force reliability of the Ralph loop.

Here is how the components of your newly named system function together:

### **The Architecture of `kr-wiggum-stateless-engine`**

* **`KR` (KreativReason):** This is the **Knowledge Base**. The engine is hard-wired to reference the **31 implementation guides** in your `/docs` folder for every task, ensuring that "how" the code is written remains consistent and production-grade.  
* **`Wiggum` (The Loop):** This is the **Strategy**. It defines the "what" and the iterative drive of the system—editing, testing, and committing in a continuous cycle until the roadmap is clear.  
* **`Stateless` (The Protocol):** This is the **Safety Mechanism**. It ensures that the **Worker** agents are purged after every single task, forcing a reset to a 0-token context window. This keeps the engine in the **"Smart Zone" (\<40% context)** where reasoning is sharpest.  
* **`Engine` (The Environment):** This is the **Orchestration Layer**. It consists of your **HTML Dashboard**, the **Node.js Watcher**, and the **Bash Orchestrator** that together provide the "Mission Control" for your autonomous runs.

### **System Command Reference**

To operate the engine within your custom app environment, you will use the following human-facing commands:

| Command | Engine Action | Outcome |
| :---- | :---- | :---- |
| **ralph digest** | Activates the **Distiller** to process messy brainstorms into structured specs. | Populates specs/ and index.md. |
| **ralph plan** | Triggers the **Architect** to build a dependency-ordered task list. | Generates IMPLEMENTATION\_PLAN.md. |
| **ralph loop** | Ignites the **Stateless Engine** to begin autonomous coding at **$10.42/hour**. | Continuous Build → Test → Commit cycles. |
| **ralph status** | Updates the **HTML HUD** with live token counts and task velocity. | Real-time "Neon-Liquid" progress bars. |

---

### **Final Success Metric**

The **kr-wiggum-stateless-engine** is successful when your **Context Bars** stay blue (Smart Zone) and your **Back Pressure** checks (LLVM/Tests) consistently return a green signal. You have transitioned from being a coder to being the **Locomotive Engineer** of a production-quality software factory.

