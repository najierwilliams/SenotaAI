# Luna Knowledge Space Architecture

## Extension model

The cognitive system is an additive extension of the released Knowledge Space. Knowledge Space remains the durable object, folder, placement, relationship, source, version, and audit layer. Luna adds a separate cognitive state layer for working memory, plans, projects, goals, task graphs, worker records, attention, reflections, recovery, schedules, and cognitive history. The two layers share the same owner-scoped workspace rather than duplicating data or creating a second identity system.

| Existing Knowledge Space responsibility | Cognitive extension | Boundary retained |
|---|---|---|
| Objects, folders, placements, references, relationships | Memories link to source-object identifiers; worker reports are stored as explicitly inferred notes. | One underlying source object is not duplicated merely to appear in more than one folder. |
| Source/provenance and scientific metadata | Worker context keeps source and truth labels; model outputs are bounded working reports. | No worker may overwrite a provider snapshot or promote inference to scientific authority. |
| Object versions and audit events | Cognitive subjects receive cognitive versions; tool activity writes immutable cognitive audit events. | History is appended and never silently overwritten. |
| Owner session and server-only persistence | Cognitive API uses the same dedicated Knowledge Space owner session and fixed owner scope. | No generic OAuth account, browser database credential, or exposure of service credentials. |
| Mission/activity/approval foundation | Cognitive missions persist a dependency graph, worker assignment, budgets, attention, and recovery. | The released one-worker on-demand path remains distinct and is not described as multi-worker autonomy. |

## Verified database scope

The applied cognitive migration is additive. It created 16 `luna_*` cognitive tables and did not replace or modify the released `luna_knowledge_*` tables or scientific/provider tables. RLS is enabled on all cognitive tables; no direct browser-role policy was introduced. Server procedures access the owner workspace only after the dedicated knowledge-owner session is validated.

> **Database verification result:** 16/16 expected cognitive tables were present; all had RLS enabled; required foreign keys, 13 indexes, nine update triggers, and the immutable cognitive-audit trigger/function were present.

## Linking Brain, Knowledge, and Science

A Brain object may link to a Knowledge Space record by stable object identity and by existing HRA/UBERON context. A Knowledge Space record can direct the user back to the Brain viewer by identity. This relationship is organizational and informational; it does not imply that the visual HRA GLB is registered to MNI or that an identifier is a coordinate transform.

The Scientific Review Center and existing scientific registry remain authoritative only within their provider-preserving evidence model. The cognitive controlled registry tool can read reviewed in-process metadata for bounded context, but it cannot modify provider/source records, issue an external provider call, invent a citation, construct a HRA-to-MNI transform, or create a clinical/biological target.

| Scientific boundary | Cognitive treatment |
|---|---|
| HRA Brain-Female v1.1 visual GLB | Retained as checksum-bound HRA source context. |
| Luna-native/raw GLB ↔ MNI 2009c | `NOT_ESTABLISHED`; never emitted or estimated. |
| HRA ↔ Julich ontology mapping | Unavailable; retained conclusion is 0 authoritative / 0 probabilistic / 0 requires-domain-review / 102 unmapped. |
| Macro nanobot visual system | Visual simulation only; unrelated to worker completion or biological action. |

## Worker-report provenance

When a future configured durable runtime completes a worker step, the worker may create an allowed report output. The Knowledge Space note is marked `AI_INFERENCE`/`INFERRED`, named as a **software worker handoff**, and retains the worker actor plus cognitive mission identifier in the audit detail. A memory record is created only for roles whose contract explicitly permits a memory output. This prevents role escalation and avoids classifying a worker handoff as a nanobot report, provider fact, or scientific source record.

## Interface integration

The Cognitive Console is an additive Knowledge Space panel. It reports only persisted self-state, objectives, worker counts, task counts, attention, mission status, memory, reflection, and recovery records. A runtime card discloses the actual configured/unavailable state. Controls create real persisted state but do not pretend to run background work in the browser or request handler.

The next release-validation step is to deploy the console/API code, unlock the owner session in production, and verify that its displayed data come from the new owner-scoped tables. The console must show `WAITING_FOR_RUNTIME`, rather than a fabricated running state, until a durable runtime returns a real run identifier.
