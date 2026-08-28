# Luna Pre-Game Cognitive Production Notes

## 2026-08-28 — Deployment and console readiness

Git commit `2237081eb62a1c9bf2b9978f3c83b005d927ac92` deployed as Vercel production deployment `dpl_E2cJKaw38cnAo2Mg6nHK2NZpYZro` at `https://senota-m8zuahmbq-senota-s-projects.vercel.app/`. The deployment reached `READY` for the expected `main` commit.

The owner unlocked the separate Knowledge Space session through the deployed UI. The deployed Luna Cognitive Console loaded successfully: Vercel Queue runtime reports `CONFIGURED`; the new pre-game section reported zero pre-game records before acceptance; it exposed the durable source-ingestion and bounded-maintenance controls; and mission labels display `max concurrent workers` rather than implying a total-worker budget. The console continued to show HRA→MNI/HRA→Julich safety text and did not show a new autonomous candidate.

The read-only production schema verifier output supplied by the owner reported `PASS` for all 28 expected table-security rows, the owner-scope aggregate, the extended cognitive-version contract, and the HRA mapping scientific invariant. No pre-game acceptance data has been created at this note point.

## 2026-08-28 — Source ingestion acceptance fixture

Through the deployed owner-only Cognitive Console, a temporary source note labelled `PRE_GAME_ACCEPTANCE_20260828` was submitted. Its content was explicitly limited to internal software validation and expressly excluded dispatch, external source query, scientific/clinical/biological/physical/financial/account action, coordinates, and HRA/MNI/Julich assertions. The deployed UI returned the success notice: `Luna recorded and boundedly assessed the source input.`

The UI did not immediately refresh its aggregate counters in the same rendered view, so the next acceptance step is a reload/read-only snapshot verification before relying on any displayed count. No mission was created or dispatched by this input action.

After an owner-console refresh, the new production snapshot showed exactly `1` input, `1` experience, `1` focus assignment, `1` uncertainty record, `1` profiled gap, `1` active curiosity item, and `3` bounded computational-state observations. It showed `0` contradictions and `0` learning records, as expected for a non-correction source. The top attention assessment was `WARNING` with score `0.674`, importance `0.55`, and uncertainty `0.68`. The Console explicitly stated that no automatic mission was created, and the existing M5 next-candidate state remained `NO ACTION`.

The owner invoked the displayed `Run bounded maintenance` control. Its response will be verified from a refreshed read-only console snapshot; it remains designed not to dispatch workers or missions.

## 2026-08-28 — Bounded maintenance acceptance after focus-history correction

The owner applied `20260828_luna_pre_game_focus_replacement_fix.sql`; its read-only verifier returned `FOCUS_REPLACEMENT_TRIGGER ... PASS`, confirming that the focus row may only move once from a null replacement timestamp to a timestamp with all other fields unchanged.

The deployed owner console then ran bounded maintenance successfully. It returned: `Bounded maintenance reviewed 3 record(s) and retained a durable report.` The input/experience/attention counters did not create additional source records, and the Console still reported `1` active focus assignment. The existing M5 action panel remained `NO ACTION`; no mission, Queue message, worker, external call, scientific record, provider mapping, or HRA/MNI/Julich state was created or modified by this maintenance acceptance.
