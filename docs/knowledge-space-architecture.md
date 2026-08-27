# Luna Knowledge Space Architecture

**Status:** Implemented as an owner-scoped, server-backed workspace foundation. The dedicated Supabase migration was applied and subsequently verified to expose all nine `luna_knowledge_*` tables with row-level security enabled. This document records the application contract and operating limits for the Knowledge Space release.

> **Scope:** Knowledge Space is a research and organization environment. It is not a biological-control system, a clinical system, a coordinate-targeting service, or evidence that the Luna visual model is spatially registered to MNI.

## Product role

Knowledge Space is a native Luna workspace for durable objects, evidence context, questions, working notes, relationships, report artifacts, and bounded on-demand worker missions. Its purpose is to make provenance and uncertainty inspectable, rather than collapsing user notes, provider records, AI inference, and scientific validation into one apparent level of truth.

| Area | Implemented behavior | Explicit boundary |
|---|---|---|
| Knowledge objects | Server-persisted, owner-scoped, versioned objects with typed source and truth states. | A user object cannot be written as `VERIFIED` or `PROVIDER_CONFIRMED`. |
| Folder hierarchy | Primary placement plus non-duplicating folder references. | Referencing an object does not create a second evidence record. |
| Relationships | Typed directed links with source type, truth state, confidence, evidence, and provenance. | New user links are proposed working relationships, not scientific mapping authority. |
| Provider context | Immutable source snapshots can be read and linked from notes or reports. | They cannot be edited or deleted through Knowledge Space. |
| Search and graph | Server-side object search and a selected-object one-hop graph. | The interface deliberately does not render the full graph by default. |
| Versioning and audit | Object snapshots are versioned; lifecycle, mission, and control events enter an immutable audit table. | Audit records reject update and delete operations at the database level. |
| Workers | A user dispatches a bounded on-demand worker, which saves an `AI_INFERENCE` / `INFERRED` report. | Workers do not browse, scrape providers, overwrite source records, or create authoritative scientific facts. |

## Persistence and ownership

The persistent store is the existing Supabase project, accessed only through the server using the existing server-side service-role configuration. The browser never receives that credential. Row-level security is enabled on every dedicated table and no browser-facing policy has been created. Knowledge Space is a **single-owner** workspace: the existing NPC-management administrator password is verified only by the server and mints a separate signed `knowledge-owner` cookie with an eight-hour lifetime. It does not reuse the NPC administrator cookie, create a general account, store the password in browser storage, or expose a credential to the client. Only that cookie permits a Knowledge Space query or mutation.

| Table | Responsibility |
|---|---|
| `luna_knowledge_workspaces` | One owner-scoped workspace and its autonomy preferences. |
| `luna_knowledge_objects` | Canonical knowledge objects, source/truth states, metadata, provenance, tags, and soft-delete state. |
| `luna_knowledge_placements` | Primary folder placement and secondary folder references without object duplication. |
| `luna_knowledge_relationships` | Typed directed object relationships and their evidence status. |
| `luna_knowledge_versions` | Immutable object-version snapshots for created, updated, restored, trashed, imported, and mission-output states. |
| `luna_knowledge_audit_events` | Immutable user/system action record. |
| `luna_knowledge_missions` | Worker objective, target, limits, state, stop request, and report reference. |
| `luna_knowledge_mission_activity` | Ordered worker activity events. |
| `luna_knowledge_approvals` | Separate review artifacts for future sensitive proposals. |

A workspace is seeded only after the single owner first opens Knowledge Space through the separate owner-session unlock. The seed provides organizational folders and immutable context records for the released HRA, MNI, and Julich boundaries. It does not import a Luna-to-MNI transform, create a Julich crosswalk, or modify the released 102 HRA/UBERON identities.

## Truth and provenance model

Every object and relationship carries a **source type** and a **truth state**. The interface displays truth state next to the content so a working hypothesis cannot silently resemble provider-confirmed evidence.

| Source type | Intended use |
|---|---|
| `USER_FACT`, `USER_NOTE`, `USER_HYPOTHESIS`, `USER_QUESTION`, `USER_DECISION` | Owner-authored working knowledge. |
| `PROVIDER_DATA`, `PUBLISHED_EVIDENCE` | Preserved source context recorded with provider/version/URL where known. |
| `AI_INFERENCE` | Bounded-worker output; it remains explicitly inferred. |
| `VALIDATED_RELATIONSHIP` | Reserved for a genuine validated source import, never created by an ordinary user or worker action. |

The application blocks user and worker attempts to assign `VERIFIED` or `PROVIDER_CONFIRMED`. This retains flexibility for research notes and evidence review without permitting the interface to claim that it has independently validated an identity, a provider mapping, a coordinate relation, or a biomedical result.

## Bounded on-demand worker behavior

The first release offers the requested on-demand mode. Dispatch creates a persisted mission and immediately invokes one server-side worker run. The worker receives only the objective and selected Knowledge Space context, then creates a separate inferred report. It is constrained to a maximum of 12 steps, two retries, one worker, and two minutes. Its activity and outcome are retained server-side.

| Control | Outcome |
|---|---|
| **Dispatch** | Creates and starts a bounded, on-demand mission. |
| **Run now** | Starts a remaining queued mission. |
| **Stop mission(s)** | Marks active/queued work as cancelled and records the event. |
| **Clear queue** | Cancels queued work without deleting its audit history. |
| **Pause all** | Prevents new mission creation until resumed. |
| **Disable autonomy** | Selects manual mode and pauses the worker queue. |
| **Autonomy levels** | Manual, Suggest, On demand, and a future non-destructive maintenance configuration are explained in the UI. |

The worker prompt prohibits external browsing and provider scraping. It also prohibits unsupported transforms, targeting coordinates, medical use, physical nanotechnology, tissue/cellular/molecular manipulation, and biological capability claims. A worker report is a Knowledge Space artifact, not an instruction or target for the existing Macro simulation.

## Scientific and nanobot preservation contract

The current released scientific claims are unchanged. The immutable HRA Brain-Female GLB remains presentation data in its documented HRA context. The P33 quality gate remains **`NOT_ESTABLISHED`** for any Luna-native to **MNI ICBM 152 2009c Nonlinear Asymmetric** relation. Knowledge Space cannot emit a Luna coordinate, query Julich from Luna geometry, or make a registration claim. Julich structure mapping also remains a distinct ontology result of **0 authoritative / 0 probabilistic / 0 requires-domain-review / 102 unmapped**.

The pre-existing nanobot system remains a **Macro visual simulation**. Knowledge Space worker activity is software-only research/organization work. It neither enables tissue, cellular, molecular, subcellular, therapeutic, nor point-validated biological operations.

## Deferred and deliberately absent capabilities

The current implementation deliberately does not upload arbitrary file bytes because the repository’s configured storage helper is presently unresolved in the existing type-check path. Dataset/document records can be persisted as objects with provenance and source links. A later attachment feature must use a dedicated server-side storage path, retain metadata in Knowledge Space, validate filenames/content types, and avoid storing file bytes in the database.

The maintenance autonomy level is designed as a preference and is not a background crawler. No recurring provider check, watch process, uncontrolled scrape, external publication, provider-source replacement, scientific identity change, spatial registration change, or license-sensitive operation is automatically executed. Those actions require a future provider-specific implementation with rate limits, terms, licenses, authentication, bounded retries, and a separate evidence review process.

## Validation record

The focused Knowledge Space, P33 coordinate, scientific observation, and Luna command suites passed together. The production build compiled the React workspace, server router, Supabase repository, and worker runner. Full deployment acceptance will verify the authenticated first-open seed, durable object write, reference/link workflow, worker report lifecycle, and the continued P33/Macro safety display against the deployed service.

## Key project references

| File | Purpose |
|---|---|
| `supabase/migrations/20260827_knowledge_space.sql` | Dedicated database schema, indexes, immutability trigger, and RLS. |
| `shared/knowledgeSpace.ts` | Shared typed object, truth, provenance, relationship, mission, and health contract. |
| `server/knowledgeSpace/supabase.ts` | Server-only Supabase repository and single-owner scope enforcement. |
| `server/knowledgeSpace/ownerAuth.ts` | Separate eight-hour `knowledge-owner` session derived from server-side verification of the existing NPC-management administrator password. |
| `server/knowledgeSpace/missionRunner.ts` | Bounded on-demand report runner with scientific/nanobot safety prompt. |
| `server/routers/knowledge.ts` | Authenticated Knowledge Space API. |
| `client/src/pages/KnowledgeSpace.tsx` | Responsive workspace, graph, review, and worker interface. |
| `docs/luna-spatial-registration-review.md` | Released P33 spatial-registration evidence and `NOT_ESTABLISHED` conclusion. |
