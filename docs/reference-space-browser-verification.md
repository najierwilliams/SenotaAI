# Reference-Space Registration Browser Verification

**Local route:** `http://localhost:3001/luna/brain`  
**Verification scope:** Existing Luna Brain workspace after the reference-space registration integration.

## Runtime API Verification

A live request to:

```text
/api/brain-science/observation?scale=tissue&structureId=allen_hippocampus_l&structureName=Hippocampus
```

returned the Julich-Brain Tissue dataset, MNI ICBM 152 2009c reference-space metadata, an unavailable `ebrains-mni-to-luna` transform record, a `region` spatial target with no coordinate, and the explicit reason:

> Tissue atlas maps are available in provider reference spaces, but no validated reference-space registration into Luna Local exists.

No Luna coordinate was returned for the provider region.

## Browser Acceptance Findings

| Workflow | Verified result |
|---|---|
| Macro workspace load | Luna Brain, Anatomical Navigator, workspace menus, and Macro observation context mounted successfully. |
| Tissue selection | The existing Scales menu switched the live workspace to Tissue. |
| Lower-scale disclosure | The observation banner displayed `Simulation visualization — spatial operation unavailable.` followed by the precise MNI/Luna registration reason. |
| Anatomy Navigator | The existing Tissue navigator showed Julich provider observations, MNI ICBM 152 2009c, and `Spatial Target Unavailable` with the same precise reason. |
| Nanobot Panel | The existing Nanobot Panel displayed the Tissue dataset context and disabled `Deploy scout`, `Diagnostic`, `Repair`, and `Monitor`. |
| Return to Macro | The Scales menu restored Macro observation and the Anatomical Navigator remained available. |

## Automated Validation

| Command | Outcome |
|---|---|
| Focused reference-space / science / mission suite | Passed: 4 files, 21 tests. |
| `pnpm exec vite build` | Passed. |
| `pnpm build` | Passed. |
| `git diff --check` | Passed. |
| `pnpm test` | 162 passed, 2 skipped, 14 failed in 12 known environment-dependent NPC/Supabase/administrator-session tests. The new reference-space suites passed. |

The full-suite failures are unchanged in kind from the pre-existing environment limitations: missing Supabase nanite configuration and NPC administrator session context. They do not occur in the scientific data, transform, canonical mapping, or nanobot mission tests.
