# Repository Guidelines

## Project Structure & Module Organization
This Next.js 14 app keeps feature code in `src`. Routes and layouts live in `src/app`, shared UI in `src/components`, hooks in `src/hooks`, server actions in `src/api`, utilities in `src/lib`, and locale resources under `src/locales`. Playwright assets live in `tests/e2e`, grouped by flow with shared helpers in `shared` and `pom`. The `ui/` package holds reusable shadcn-inspired primitives and should stay framework-agnostic. Static assets belong in `public/`.

## Build, Test, and Development Commands
- `pnpm install` – install dependencies; do not mix npm or yarn.
- `pnpm dev` (`pnpm dev-turbo` for large refactors) – run the local dev server.
- `pnpm build` then `pnpm start` – validate the production bundle before releases.
- `pnpm lint` – run Next.js/ESLint; fix issues before committing.
- `pnpm test:unit`, `pnpm test:unit:watch`, `pnpm test:unit:coverage` – execute Jest suites; keep coverage above existing baselines.
- `pnpm test` or `pnpm test:ui` – launch Playwright flows; the default target executes `pretest` cleanup.
- `pnpm tsc-all` – Run typescript in all the project.

## Coding Style & Naming Conventions
TypeScript is strict; prefer explicit types at module boundaries. Use two-space indentation, trailing commas where valid, and PascalCase component files (e.g., `CustomerForm.tsx`). Import from `@/*` (source) or `@/e2e/*` (tests) instead of relative paths. Keep Tailwind utilities inline; extract helpers only for widely reused patterns. Run `pnpm lint --fix` before staging.

## Testing Guidelines
Unit and integration specs live beside code in `__tests__` folders with `.test.ts` suffixes and run through `ts-jest`. Playwright suites under `tests/e2e/flow-*` represent customer journeys; share common fixtures via `tests/e2e/shared`. Capture new snapshots only after `pnpm test` creates a fresh `.data/.generated` tree. Every PR that alters user flows should attach the Playwright HTML report plus updated Jest results.

## Commit & Pull Request Guidelines
Write imperative commits referencing the ticket when available (e.g., `dev.713: add subscriber group screen`); squash fixups locally. Pull requests must include a summary, linked issue, screenshots for UI work, and a checklist of commands run (`pnpm lint`, `pnpm test`, etc.). Request review from the owning squad and wait for green CI before merging to `dev`.

## Environment & Configuration Tips
Runtime configuration relies on `next-runtime-env`; document required keys in `.env.example` and avoid hardcoded secrets. When adding static media, store it in `public/` and reference it with `next/image`. Update the Dockerfiles when dependency changes alter build behaviour to keep container and local environments aligned.

## Guidelines to resolve problems
# Think Before Coding
**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

1. State your assumptions explicitly. If uncertain, ask.
2. If multiple interpretations exist, present them - don't pick silently.
3. If a simpler approach exists, say so. Push back when warranted.
4. If something is unclear, stop. Name what's confusing. Ask.
5. Analyze if the change you are proposing is sensible to affect other files. 

# Simplicity First
**Minimum code that solves the problem. Nothing speculative.**

1. No features beyond what was asked.
2. No abstractions for single-use code.
3. No "flexibility" or "configurability" that wasn't requested.
4. No error handling for impossible scenarios.
5. If you write 200 lines and it could be 50, rewrite it.
6. Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

# Surgical Changes
**Touch only what you must. Clean up only your own mess.**

When editing existing code:

1. Don't "improve" adjacent code, comments, or formatting.
2. Don't refactor things that aren't broken.
3. Match existing style, even if you'd do it differently.
4. If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

1. Remove imports/variables/functions that YOUR changes made unused.
2. Don't remove pre-existing dead code unless asked.
3. The test: Every changed line should trace directly to the user's request.

# Goal-Driven Execution
**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

1. "Add validation" → "Write tests for invalid inputs, then make them pass"
2. "Fix the bug" → "Write a test that reproduces it, then make it pass"
3. "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

## Use the model only for judgment calls
Use me for: classification, drafting, summarization, extraction.
Do NOT use me for: routing, retries, deterministic transforms.
If code can answer, code answers.

## Token budgets are not advisory
Per-task: 4,000 tokens. Per-session: 30,000 tokens.
If approaching budget, summarize and start fresh.
Surface the breach. Do not silently overrun.

## Surface conflicts, don't average them
If two patterns contradict, pick one (more recent / more tested).
Explain why. Flag the other for cleanup.
Don't blend conflicting patterns.

## Read before you write
Before adding code, read exports, immediate callers, shared utilities.
"Looks orthogonal" is dangerous. If unsure why code is structured a way, ask.

## Tests verify intent, not just behavior
Tests must encode WHY behavior matters, not just WHAT it does.
A test that can't fail when business logic changes is wrong.

## Checkpoint after every significant step
Summarize what was done, what's verified, what's left.
Don't continue from a state you can't describe back.
If you lose track, stop and restate.

## Match the codebase's conventions, even if you disagree
Conformance > taste inside the codebase.
If you genuinely think a convention is harmful, surface it. Don't fork silently.

## Fail loud
"Completed" is wrong if anything was skipped silently.
"Tests pass" is wrong if any were skipped.
Default to surfacing uncertainty, not hiding it.