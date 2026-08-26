# Luna Scientific Mapping Review

## Review status

This package records the current scientifically defensible mapping state. **No HRA/UBERON record has been promoted to user-reviewed approval in this release.** The 102 exact source-supported records retain `evidence-backed-requires-review`; the 181 remaining mesh-backed records retain `unmapped` with non-ontology triage only. No ontology identifier, parent relationship, provider region, or coordinate was derived from a display name, visual similarity, GLB position, bounds, or viewer presentation space.

| Category | Count | Status |
|---|---:|---|
| Luna mesh-backed structures inventoried | 283 | Complete inventory |
| HRA Brain-Female v1.1 graph → UBERON exact subpath relations | 102 | Evidence-backed, requires user review |
| User-reviewed approved canonical mappings | 0 | No user approval supplied |
| FMA records | 0 | Not declared in the source graph evidence |
| Explicitly unmapped structures | 181 | Preserved without invented ontology identity |
| Authoritative Luna canonical → Julich mappings | 0 | No public provider/ontology crosswalk found |
| Luna → MNI registrations | 0 | Not established |

## Canonical identity evidence

The authoritative canonical anatomy service is the single application boundary for Luna structure identity. It only returns an UBERON identity when a Luna GLB node matches the official HRA Brain-Female v1.1 graph `file_subpath` exactly and the corresponding HRA entity declares `representation_of`. Each returned identity retains the HRA entity URI, source version, source URL, exact-subpath review method, evidence text, and review-required status.

The unmapped records are triaged as anatomical structures requiring ontology lookup, vessels/tracts/ventricles requiring a specific ontology, composite/reference objects, or unknown. Triage is explicitly not an ontology mapping.

## Julich-Brain v3.1

The primary scientific atlas is **Julich-Brain Atlas cytoarchitectonic maps v3.1**, DOI `10.25493/KNSN-XB4`. The verified provider reference for volume observations is **MNI ICBM 152 2009c Nonlinear Asymmetric**. The same release has Colin27 and fsaverage products, which remain distinct; no transform is silently composed between them. Julich v3.1 publishes probability maps, gap maps, and maximum probability maps, but those maps are provider-space resources. [1]

The siibra documentation exposes Julich parcellation hierarchy and provider identifiers, including parent/child cytoarchitectonic regions. It does not provide an authoritative UBERON/FMA/HRA → Julich crosswalk for Luna. Therefore the application’s `JULICH_STRUCTURE_MAPPINGS` registry deliberately contains no inferred mappings. Luna structure observations remain `structure-context`, while MNI 2009c coordinates explicitly supplied to the provider assignment endpoint may be handled as provider-space queries only. [2]

## Multiscale contexts

| Scale | Context | Evidence category | Coordinate boundary | Licence status |
|---|---|---|---|---|
| Tissue | BigBrain linked Julich context | Provider scientific context | Provider-space only; no Luna relation | Review required |
| Molecular | Julich receptor architectonics | Provider scientific context | Provider-space only; no Luna structure mapping | Review required |
| Molecular | Allen Human Brain Atlas | Sample-scoped spatial data | Allen donor/sample points only | Review required |
| Cellular | Human-brain spatial data | No dataset selected | Unavailable pending donor/sample/space verification | Review required |
| Subcellular | Microscopy/EM sample | No dataset selected | Unavailable; no whole-brain Luna system | Review required |

The active observation service has been corrected to reject name-derived CELLxGENE and Allen provider assignments. A future cellular or molecular observation must be linked through an explicit provider sample/structure identifier and must retain donor, region, sample, coordinate system, resolution, provenance, and licence terms.

## Evidence tiers and targets

| Evidence tier | Current use | Coordinate state | Operational state |
|---|---|---|---|
| `structure-context` | HRA/UBERON identity and scoped reference context | `null` | Non-operational |
| `region-probabilistic` | Reserved for an evidence-backed Julich region and actual provider probabilistic context | Provider-space only if documented | Observation-only unless future explicit rule permits otherwise |
| `point-validated` | Reserved for documented provider sample/point records with space, registration method, uncertainty, provenance, and licence | Provider/sample coordinate only | Candidate for future scientific simulation evaluation; not enabled now |

Macro remains a visual mesh simulation. The target contract distinguishes visual-mesh, structure-context, and scientific-coordinate targets. Lower-scale targets remain disabled because no Luna structure has a validated scientific coordinate.

## Production browser evidence

The latest production deployment rendered the landing page and successfully entered `/luna/brain`, showing the brain workspace, viewer canvas, 283-structure Navigator, Inspector, Nanobot panel, top-level menus, and panel minimize/close controls. A subsequent Navigator interaction transitioned the automation browser to `about:blank`. Consequently, the initial route render is verified but full interaction acceptance is **not passed**. The detailed record is retained in `docs/.next-milestone-browser-acceptance.md`.

## User action required

A qualified user or domain reviewer must review the 102 source-supported HRA/UBERON entries in `docs/luna-structure-crosswalk-review.md` before any entry can become reviewed/approved. A future authoritative ontology-to-Julich mapping source is required before adding a Luna → Julich mapping record. The prior HRA maintainer correspondence request remains necessary before considering any Luna → MNI registration.

## References

[1] [EBRAINS — Julich-Brain Atlas, cytoarchitectonic maps v3.1](https://search.kg.ebrains.eu/instances/f1fe19e8-99bd-44bc-9616-a52850680777)

[2] [siibra — Find brain regions in a parcellation](https://siibra-python.readthedocs.io/en/v1/examples/01_atlases_and_parcellations/003_find_regions.html)

[3] [HRA Brain-Female v1.1 graph](https://cdn.humanatlas.io/digital-objects/ref-organ/brain-female/v1.1/graph.json)
