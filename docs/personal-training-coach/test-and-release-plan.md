# Personal Training Coach — test specification and release plan
Baseline: a8e191115b1bcbb32e2bfe19376d804974ee51e9 (4.1.1). Companion: [Discovery/HLD/ADR/audit](discovery.md). Status: proposed, not executed.
## 1. Test protocol
First run the existing baseline suite on the exact SHA with synthetic fixtures only. Characterization tests assert observed behavior, including reproducible defects explicitly marked as such. New desired-behavior tests assert the target contracts, not merely the current implementation; record expected failures separately, without suppressing regressions or turning them into permanent acceptable results. For every case capture test ID, SHA, fixture, actual and expected result, execution environment, and failure reason. Test pure functions and their callers, then both PWA surfaces in fresh browser profiles. Fix nondeterminism (injected clock, dates, equipment config); use frozen inputs/deep equality to detect mutation. Never use live training data, tokens, private PDFs or backups.
Coverage labels: E = existing related test explicitly inspected; P = partial coverage/adjacent test, extend; N = new target scenario (existing file is suggested location, not proof of coverage). E is source-level coverage, not a pass result. Paths below are relative to tests/. Target behaviors are proposals; characterization expected actual results will be recorded after execution. For unknown fields retain raw record; don't silently replace invalid with zero.
## 2. Matrix of 62 scenarios
### A — Data Quality (10)
| ID | Fixture / action | Target assertion | Existing test file / coverage |
|---|---|---|---|
| DQ-001 | RIR numeric 0, normal working row | valid; 0 retained, no automatic increase solely on failure | adaptive-integration.test.cjs E |
| DQ-002 | RIR null/absent | missing; not comparable for automatic weight increase | trainer-preparation.test.cjs E; progress-v2.test.cjs E |
| DQ-003 | RIR empty string/whitespace | missing; never zero or failure effort | progress-v2.test.cjs P; unified-fatigue-e1rm-warmup.test.cjs N |
| DQ-004 | RIR -1, 8, 2.5, true, invalid string | invalid; no progression based on it | progress-v2.test.cjs E; trainer-preparation.test.cjs P; fatigue N |
| DQ-005 | setType:R | warmup, excluded from working PR/progression | unified-fatigue-e1rm-warmup.test.cjs E |
| DQ-006 | legacy type:R | same warmup interpretation in all consumers | progression-v2.test.cjs P; unified-fatigue-e1rm-warmup.test.cjs N |
| DQ-007 | type:warmup | warmup across consumers; test conflict with setType:W separately | unified-fatigue-e1rm-warmup.test.cjs P |
| DQ-008 | type and setType absent | legacy working with provenance; raw preserved | unified-fatigue-e1rm-warmup.test.cjs E |
| DQ-009 | reliable:false or unreliable:true | ineligible for trusted recommendation/PR; raw retained | trainer-preparation.test.cjs E; progress-v2.test.cjs P |
| DQ-010 | NaN/Infinity, malformed dates, future date, nonnumeric or negative loads | no invalid computation or recommendation; no crash or mutation | progress-v2.test.cjs P; adaptive-adapter.test.cjs P; state-validator.test.mjs P |
### B — Training Metrics (8)
| ID | Fixture / action | Target assertion | Existing test file / coverage |
|---|---|---|---|
| TM-001 | 70 kg × 10, RIR 2 | e1RM 98 kg (Epley with reserve); estimator equal across modules | unified-fatigue-e1rm-warmup.test.cjs P; progress-v2.test.cjs E |
| TM-002 | 70 kg × 12, RIR 2 | out_of_range under proposed effective reps <=12; no trend based on invalid sample | progress-v2.test.cjs P; progression-v2.test.cjs N |
| TM-003 | warmup 20×10, working 100×5 | total 700, working 500 kg×reps; preserve old total meaning | unified-fatigue-e1rm-warmup.test.cjs P; summary.test.mjs P |
| TM-004 | prior trusted 60×5; unreliable 100×5 | no trusted new strength record/e1RM from unreliable row | progress-v2.test.cjs N; trainer-preparation.test.cjs P |
| TM-005 | plank 45 s | seconds only; no e1RM or invented reps | timed-analytics.test.mjs E |
| TM-006 | same movement, barbell vs machine / changed config | no direct strength comparison without verified equivalent equipment and convention | trainer-drafts.test.cjs P; adaptive-adapter.test.cjs P |
| TM-007 | 10 reps per side, 5 cycles, 5 breaths | preserve unit; 20 bilateral reps where explicitly per-side; no cross-unit total | calisthenics-programs.test.cjs P; summary.test.mjs P |
| TM-008 | standard, recovery with higher weight, standard | recovery visible in totals, excluded from standard strength trend; verify live PR and monthly logic | progress-v2.test.cjs E; session-mode.test.cjs E; modules/records.js N |
### C — Progression & Safety (14)
| ID | Fixture / action | Target assertion | Existing test file / coverage |
|---|---|---|---|
| PS-001 | all planned working sets 12 @ RIR 2, valid comparable history, suitable step | eligible double progression; no assertion of guaranteed benefit | trainer-preparation.test.cjs E; adaptive-prescription.test.cjs E |
| PS-002 | one row below lower rep target | no automatic weight increase | trainer-preparation.test.cjs E |
| PS-003 | missing RIR in one required row | no automatic weight increase | progression-v2.test.cjs E; adaptive-prescription.test.cjs E |
| PS-004 | recent/current pain flag | all automatic apply paths blocked; advise review, manual recording allowed | adaptive-integration.test.cjs P; adaptive-browser.cjs P |
| PS-005 | changed equipment flag or configuration after recommendation | invalidate earlier recommendation; no load transfer | trainer-preparation.test.cjs P; trainer-drafts.test.cjs P |
| PS-006 | equipment unknown, null, arbitrary string | never default to barbell for recommendation; block unsupported weight progression across callers | progression-v2.test.cjs P; adaptive-prescription.test.cjs P |
| PS-007 | weight 20, physical step 5 (25%); invalid step inputs | no automatic weight increase above configured policy cap; invalid config not fabricated | progression-v2.test.cjs E; adaptive-prescription.test.cjs E |
| PS-008 | seed-28 assisted pull-up, assistance 40 kg | no ordinary weight-increase recommendation or misleading strength PR; initially manual assistance only | trainer-preparation.test.cjs N; progression-v2.test.cjs N |
| PS-009 | warmup then 70/65 kg working pyramid | per-set context preserved, no blanket replacement | adaptive-prescription.test.cjs E; adaptive-integration.test.cjs E |
| PS-010 | latest slot skipped/substituted, adaptive rejects, older history suggests increase | distinguish hard block from insufficient evidence; no conflicting fallback increase | adaptive-adapter.test.cjs P; adaptive-integration.test.cjs N |
| PS-011 | switch to recovery after draft/standalone card built | no automatic increase, revalidate at apply; preserve user edits | trainer-drafts.test.cjs P; adaptive-browser.cjs P; advisor-stage3.test.cjs N |
| PS-012 | pain/readiness flag after recommendation rendered or restored | stale proposal invalidated across apply paths | adaptive-browser.cjs P; trainer-drafts.test.cjs N |
| PS-013 | one completed row, apply suggestion to remaining rows | completed history and raw row unchanged | trainer-drafts.test.cjs E; adaptive-browser.cjs P |
| PS-014 | manually edit proposed weight, refresh/reopen or mode change | never overwrite edited row; explanation does not misrepresent manual edit | trainer-drafts.test.cjs E; adaptive-integration.test.cjs E |
### D — Anatomy & Muscle Load (10)
| ID | Fixture / action | Target assertion | Existing test file / coverage |
|---|---|---|---|
| ML-001 | standing/seated calf raises, all six seed calf IDs | calf group retained; distinguish gastrocnemius/soleus without fabricated ratios | muscle-mapping.test.cjs P |
| ML-002 | pec deck and cable fly | no unjustified triceps contribution | muscle-mapping.test.cjs E |
| ML-003 | side raise vs front raise | distinct deltoid region in knowledge model | muscle-mapping.test.cjs P |
| ML-004 | row vs pulldown, same group | horizontal vs vertical pull; not equivalent solely by muscle | muscle-mapping.test.cjs N |
| ML-005 | shrugs | trapezius, not mistaken shoulder press | muscle-mapping.test.cjs P |
| ML-006 | cali mobility/breathing | no hypertrophy working sets; separate activity classification | calisthenics-programs.test.cjs P; muscle-mapping.test.cjs N |
| ML-007 | warmup vs working reps and timed; RIR null/invalid | explicit separate policy; no accidental failure effort; don't assume all warmups identical | unified-fatigue-e1rm-warmup.test.cjs P; timed-analytics.test.mjs P |
| ML-008 | custom unknown exercise | explicit fallback/unknown; no false anatomical precision | unified-fatigue-e1rm-warmup.test.cjs E; exercise-catalog-shared.test.cjs P |
| ML-009 | alias and canonical history each with distinct actual set | each real set counted once; preserve original ID; never deduplicate by exercise ID alone | exercise-migration.test.mjs P; exercise-identity.test.mjs P |
| ML-010 | every 103 seed + 64 cali definition and aliases; same exercise with 2 vs 4 working sets | all contracts complete or marked unknown, valid taxonomy; dose differs appropriately | muscle-mapping.test.cjs P; exercise-catalog-shared.test.cjs P; new knowledge audit N |
### E — Workout Context (8)
| ID | Fixture / action | Target assertion | Existing test file / coverage |
|---|---|---|---|
| WC-001 | perform slot 3 then 2 | plan unchanged, actual order retained | plan-extras.test.mjs P; summary.test.mjs P |
| WC-002 | defer busy slot, return | no duplicate exercise or series; original slot stable | plan-extras.test.mjs P |
| WC-003 | edit previously completed row | original execution provenance retained; editedAt distinct; legacy time unknown | plan-extras.test.mjs P; new context tests N |
| WC-004 | no actual rest timing, only saved at and timer target | actual rest unknown, no exact inferred interval | trainer-regression.test.mjs P; new context tests N |
| WC-005 | swap after partial series | original results retained, new exercise distinct, no automatic load transfer | trainer-drafts.test.cjs P; plan-extras.test.mjs P |
| WC-006 | rename plan, stable ID | history still belongs to original plan; name fallback legacy only if unambiguous | adaptive-adapter.test.cjs P; advisor-stage1.test.cjs N |
| WC-007 | changed plan revision/slot; same exercise in different plan | strict context or explicit fallback limited to manual/hold, no unjustified progression | adaptive-adapter.test.cjs P; trainer-preparation.test.cjs P |
| WC-008 | long gap and first return | no stale automatic escalation; trend restarts with history retained | progress-v2.test.cjs P; adaptive-adapter.test.cjs P |
### F — Storage, PWA & Release (12)
| ID | Fixture / action | Target assertion | Existing test file / coverage |
|---|---|---|---|
| SR-001 | synthetic 4.1.1 backup -> candidate | sessions, settings, plans, raw values unchanged | upgrade-browser.cjs P; preview-upgrade-browser.cjs P (old baseline currently 4.1.0) |
| SR-002 | active 4.1.1 workout, reload candidate | rows, drafts, timers, plan context preserved; defer migration | exercise-migration.test.mjs E; trainer-drafts.test.cjs P; upgrade-browser.cjs P |
| SR-003 | raw legacy and v1 envelope backups | imports preserve required/optional fields and valid records | storage-regression.test.mjs P; backup-local.test.mjs P |
| SR-004 | malformed/truncated JSON, invalid typed records | controlled rejection, no write | storage-regression.test.mjs E; state-validator-integration.test.mjs P |
| SR-005 | simulated quota/write/backup failure | previous valid data retained, no success message | exercise-migration.test.mjs E; plan-extras.test.mjs E; storage-recovery-guard.test.mjs P |
| SR-006 | candidate creates new rows, revert to 4.1.1, reopen/export | new results survive; prove additive compatibility | upgrade-browser.cjs P; preview-upgrade-browser.cjs P |
| SR-007 | install/cache then offline navigation | core workout and reports available, no network requirement | adaptive-browser.cjs E; technique-offline.test.mjs P |
| SR-008 | partial precache failure / mixed versions | reject bad install, preserve known-good cache; verify current worker/version | service-worker.test.mjs E; staging-release.test.cjs P |
| SR-009 | write staging with production storage/cache sentinels, and vice versa | other surface unchanged; separate profiles; note same-origin boundary | adaptive-browser.cjs E; staging-release.test.cjs E; service-worker.test.mjs E |
| SR-010 | tamper candidate root/preview asset or SHA | fail before deployment; all release files checked, no dynamic self-derived expectations | staging-release.test.cjs P; scripts/verify-staging-release.cjs P |
| SR-011 | malformed PDF/DOCX + valid synthetic documents | safe rejection, valid import unchanged | security-import.test.mjs E; security-real-documents.test.mjs P; security-browser.cjs P |
| SR-012 | two tabs, stale snapshot attempts save after newer update | no silent overwrite; conflict/reload or safe merge, explicit recovery | storage-regression.test.mjs N; storage-recovery-browser.cjs N |
All 62 IDs: 10+8+14+10+8+12. Several assertions require future features and must not be required to pass on 4.1.1. Assign phase-specific gates; characterize P0 current behavior first. Add separate cases for unknown/invalid enums and boundary steps where needed. No execution in Discovery.

## 3. Branch and PR inventory
Checked main, open PRs, branch listing and relevant compare results on 2026-11-28.
| Ref | Ahead / behind main | Disposition |
|---|---|---|
| PR 84 test/calisthenics-programs-4.0.0, f9052f76ec03e3e41678c482fbde41fc1c1343a4 | 10 / 163 | 3 files (workflow and program tests); evaluate only useful nonduplicate test changes |
| PR 61 feature/powerbuilding-plans, ed1ef603bbc71a038b5fb3ca953e91526c05b43a | 5 / 375 | Functional changes incl. trainer, root/preview and plans; exclude from technical phase |
| PR 34 test/stage7-regression-guardrails-20261121, 01b0fe553ae61a5bbe353ab82c0adf76bb4340ca | 7 / 583 | Old regression workflow, package/config/E2E; select only missing tests, no blind merge |
| ci/release-gate, 33438adebfc1fe9b65fa28fe3df2e25970570fd0 | 14 / 255 | Existing release artifact/evidence/gate work; evaluate selectively; no activation, settings changes or merge |
No suitable existing Discovery docs branch found. New docs/personal-training-coach-discovery created from baseline; do not touch other branches, PRs or main. Re-check exact SHA, active PRs and staging baseline before 4.1.2. Preserve any unmerged work.
## 4. 4.1.2 — CI/CD & characterization, scope
1. Establish baseline of all applicable current workflows and test commands on exact production commit. Record results; separate infrastructure failures from product failures. Read current workflow triggers, existing release-controls and test coverage; use one appropriate isolated branch, never overwrite open work.
2. Resolve release-specific hardcoded assumptions in scripts/verify-staging-release.cjs and tests/release-surfaces.cjs for future candidates. Preserve independent pinned expected values, allowlist, baseline/candidate SHA, strict comparison of complete intended runtime tree, root/preview parity where required, cache and storage keys. Do not let the untrusted candidate define its own expected baseline; do not weaken SHA-specific regression, permissions or artifact validation. No settings changes; no release activation.
3. Reuse relevant nonduplicate tests from PR 34 and 84 only after comparing assertions with current tests. Inspect older ci/release-gate safeguards for compatibility; no wholesale cherry-pick or unrelated dependency updates.
4. Implement baseline characterization for DQ, TM, P0 PS and affected ML cases using actual modules; synthetic fixtures, deterministic clock, immutable inputs. Capture known defects separately. Add candidate test specs for future behavior; keep required CI green on known baseline without skip/continue-on-error bypass. Fail on unexpected behavior. Do not fix runtime here.
5. Verify production/staging regression independently, artifact dry run without publishing, tamper rejection, upgrade/rollback and cache/offline/isolation checks, security import regression. Include existing full suites and any added required test. Record exact head, results and exclusions with justification.
6. Deliver documentation, test evidence, residual risk and PR review; confirm diff limited to approved tests, CI/scripts and docs. No runtime, preview runtime, application version bump or data schema change. 4.1.2 is a working technical milestone label, not a deployed app version. No merge or deployment without separate authorization. Staging publishing would require its own explicit scope and approval in the current request.
Acceptance: verified baseline and candidate SHAs; actual characterization results, all required CI passes or explicit blocker; no weakened gate; full runtime tree unchanged; no production/staging publication; separate approval before merge. If P0 cannot be reproduced, retain hypothesis with evidence/limits, not a claimed bug.

## 5. Definition of Ready / gates
A — start 4.1.2: standard checked, base checked, catalog inventory, HLD/ADR review, safety review, 62 scenarios and PR/branch inventory documented. Documentation-only diff must be verified; review recommendation conditional, no automatic merge/approval. Recheck main and branches at start. Full anatomy audit not prerequisite for tests-only work.
B — start 4.1.3: baseline characterization completed, actual P0 behavior verified, affected paths and target assertions agreed, CI release controls verified, rollback/compatibility plan. Separate hypotheses vs confirmed issues. Implement minimum safety policy and common validation first; no additional training features.
C — each feature release: affected ADRs accepted, relevant source and profiles validated, explicit metrics/contracts and safety invariants, old/new data tests and test plan, exact SHA, staging acceptance and rollback plan. All applicable tests pass before merge request, production explicitly approved; maintain data/cache isolation and verify live version only after permitted publication.
Architecture Review: positive conditional. 24 ADR reviewed (18 R, 6 C), 28 findings, 62 test scenarios, not tests passed. Full execution and individual anatomy review outstanding. Discovery documentation can be closed separately from runtime readiness.

## 6. Roadmap
| Milestone | Priority | Scope / exit condition |
|---|---|---|
| 4.1.2 | P0 | Tests and CI/CD only; exact baseline/candidate evidence and verified no-runtime diff |
| 4.1.3 | P0 | Data Quality & Safety; confirmed P0 fixed, shared classification/guards, compatible state |
| 4.2.0 | P1 | Knowledge Base & Muscle Mapping 2.0; audit relevant profiles and aliases, preserve visual atlas |
| 4.3.0 | P1 | Unified Training Metrics; consistent e1RM qualification, units, PR/tonnage and report regression |
| 4.4.0 | P1 | Smart Exercise Substitution; verified movement/equipment compatibility, no automatic weight transfer |
| 4.5.0 | P1 | Smart Workout Order; defer/resume, actual context, preserve plan |
| 4.6.0 | P1 | Context-Aware Progression; verified comparability and no conflicting suggestions |
| 4.7.0 | P1 | Muscle Volume & Balance; direct/indirect sets, activity classes, no physiological claims |
| 4.8.0 | P2 | Recovery & Readiness; calibrated heuristics with clear limits, opt-in mode changes |
| 4.9.0 | P2 | Technique & Calisthenics; verified instructions, units, variants |
| 5.0.0 | P2 | Integration and stabilization; full regression and acceptance |
Dependencies: 4.1.2 -> 4.1.3 -> 4.2/4.3 -> 4.4/4.5 -> 4.6/4.7 -> 4.8/4.9 -> 5.0. Versions and priorities proposed, not commitments or authorization. At each step report actions, tests run/not run, estimated progress, next step and risks; separate explicit production approval.
