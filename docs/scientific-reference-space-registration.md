# Scientific Reference-Space Registration and Coordinate-Resolved Targeting

**Status:** Implemented foundation; lower-scale spatial operation remains deliberately disabled.  
**Scope:** Luna Brain observation context, scientific dataset layer, target resolver, nanobot capability gate, Inspector, panel, workspace gate, and AI-facing read-only actions.

## Decision Summary

Luna now models **reference spaces**, **coordinate transforms**, **spatial targets**, and **capability diagnostics** explicitly. Research confirmed that EBRAINS/Julich and Allen have provider-side spatial information, but the current Luna GLB exposes only a local rendering coordinate frame with **no documented scientific registration** to MNI/ICBM, BigBrain, or an Allen donor MR space. The registered CELLxGENE Human Brain Cell Atlas is transcriptomic/dissection metadata rather than a coordinate-resolved human spatial dataset. Consequently, this milestone does **not** enable Tissue, Cellular, or Molecular navigation.

> A provider’s spatial data and a coordinate-resolved Luna target are distinct facts. Luna enables an operation only when every required mapping is documented and executable.

## Registered Reference Spaces

| ID | Provider | Kind | Units / resolution | Coordinate convention | Current Luna relation |
|---|---|---|---|---|---|
| `luna-viewer-local` | Luna | Viewer-local | Unknown / not declared | Luna application rendering coordinates | Macro selected mesh targets resolve here; it is not MNI. |
| `ebrains-mni-icbm-152-2009c` | EBRAINS | Template | Millimetres / provider-dependent | Provider MNI/ICBM template coordinates | No validated MNI-to-Luna registration. |
| `ebrains-bigbrain` | BigBrain | Histological | Micrometres / 20 μm | Provider histological coordinates | No validated BigBrain-to-Luna registration. |
| `allen-human-donor-mr` | Allen Institute | Donor-native | Millimetres / 1 mm isotropic donor T1 acquisition | Donor MR volume coordinates | No validated donor-MR-to-Luna registration. |
| `cellxgene-human-brain-anatomical-annotation` | CELLxGENE | Annotation | Not a coordinate system | Not applicable | Human Brain Cell Atlas tissue/dissection metadata only. |

## Transform Registry

| Transform | Type | Status | Validation and limitation |
|---|---|---|---|
| Luna Local → EBRAINS MNI ICBM 152 2009c | Unavailable | Unavailable | No validated GLB reference-space registration exists; Luna never estimates one from scale, orientation, bounds, or mesh geometry. |
| EBRAINS MNI ICBM 152 2009c → Luna Local | Unavailable | Unavailable | Explicit inbound record used by Tissue capability diagnostics. |
| Allen donor MR → EBRAINS MNI ICBM 152 2009c | Provider service | Provider-documented | Allen documents donor-specific registration; Luna retains it as provenance only and supplies no executable provider parameters or path to Luna Local. |
| Same declared reference-space ID → itself | Identity | Resolved | The transformation service copies finite coordinates only when the reference-space ID and, when supplied, declared version match. |

The server-side transformation service validates reference-space IDs, versions, finite coordinate values, and units when a source space declares units. It returns a structured `unavailable` result for unknown spaces, version mismatch, incompatible units, unavailable registration, and provider transforms lacking executable parameters. It does not apply an affine, nonlinear, lookup, or atlas-derived mapping unless parameters and provenance are registered.

## Provider Capability Assessment

| Scale | Registered dataset | Provider spatial evidence | Luna target result | Nanobot status |
|---|---|---|---|---|
| Macro | Luna Macro Anatomy Model | Selected active GLB mesh world-space target | Resolved only in `luna-viewer-local`; no external scientific transform claimed | **Enabled simulation** for all existing mission types when a selected mesh target exists. |
| Tissue | Julich-Brain Cytoarchitectonic Atlas | Probabilistic 3D regional maps in provider reference spaces, including MNI ICBM 152 2009c | **Unavailable.** Region/map evidence is retained with a source-map and derivation label; no point is invented and MNI → Luna is unavailable | **Disabled.** |
| Cellular | Human Brain Cell Atlas v1.0 via CELLxGENE | Registered collection provides single-nucleus/transcriptomic and dissection metadata, not registered human 3D cell coordinates | **Unavailable.** | **Disabled.** |
| Subcellular | Human cortical EM fragment | Sample-scoped human cortical fragment without whole-brain canonical mapping | **Unavailable.** | **Disabled.** |
| Molecular | Allen Human Brain Atlas microarray | Donor MR sample locations and donor/MNI registration provenance | **Unavailable.** Provider sample provenance is not a Luna coordinate; no donor/MNI → Luna path exists | **Disabled.** |

## Region and Probability Policy

Julich-Brain regions remain represented as `region` targets, not points. The target record identifies a provider probabilistic cytoarchitectonic source map and records no coordinate or probability threshold because Luna has not performed a provider query that derives one. A future centroid or map-derived coordinate must record its derivation method, source map, threshold, reference space, and confidence; it must still pass a documented registration into Luna Local before use by navigation.

## Capability Gate

The spatial capability state reports these conditions separately:

| Gate condition | Required for operation |
|---|---|
| Dataset usable | Yes |
| Provider spatial information available | Yes |
| Provider reference space known | Yes |
| Canonical-to-provider structure mapping verified | Yes |
| Documented, executable transform into Luna Local | Yes |
| Coordinate resolved in Luna Local | Yes |
| Target type supported by the mission | Yes |

The first unmet scientific condition is included as a human-readable reason in `BrainObservationContext`, the Anatomy Navigator, Anatomical Inspector, Nanobot Panel, workspace menus, and the mission-engine rejection. Mission snapshots retain the spatial target, reference-space, transform, and capability objects, so later view-only scale transitions cannot rewrite historical provenance.

## Architecture

```text
Observation Context
  ├─ BrainStructureRegistry canonical identity
  ├─ Scientific dataset registry and provider adapter
  ├─ BrainReferenceSpace
  ├─ BrainCoordinateTransform / transformCoordinate()
  ├─ BrainSpatialTarget + BrainSpatialCapability
  └─ NanobotTargetResolver
       └─ Nanobot mission capability gate
            └─ Mission provenance/history
```

The `NanobotActions` facade now exposes read-only structured target resolution, target capability, spatial target, reference-space, and dataset-provenance queries. It does not receive React setters and cannot create Three.js objects or fabricate a coordinate.

## Future Enablement Requirements

No manual action is required for this implemented foundation. Lower-scale operation must remain disabled until a future integration supplies, at minimum, all of the following: a provider-supported target dataset, a stable canonical structure mapping, exact reference-space/version metadata, executable transform parameters into Luna Local or a newly documented replacement viewer frame, coordinate validation, target derivation/provenance, and appropriate provider licensing/terms acceptance where required.

For a future tissue target, provider probabilistic map retrieval must remain server-side and bounded. The application must not download full atlas volumes, BigBrain, H5AD collections, or EM source data into the client simply to make a visual approximation.

## Sources

[1] [EBRAINS siibra API](https://ebrains.eu/data-tools-services/tools/siibra-api)  
[2] [EBRAINS Multilevel Human Brain Atlas](https://ebrains.eu/data-tools-services/brain-atlases/human-brain)  
[3] [Julich-Brain Atlas dataset record](https://search.kg.ebrains.eu/instances/Dataset/4ac9f0bc-560d-47e0-8916-7b24da9bb0ce)  
[4] [siibra coordinate assignment example](https://siibra-python.readthedocs.io/en/latest/examples/05_anatomical_assignment/001_coordinates.html)  
[5] [Allen Human Brain Atlas API](https://brain-map.org/support/documentation/human-brain-atlas-api)  
[6] [CELLxGENE Human Brain Cell Atlas v1.0](https://cellxgene.cziscience.com/collections/283d65eb-dd53-496d-adb7-7570c7caa443)  
[7] [CELLxGENE Explorer spatial-data documentation](https://cellxgene.cziscience.com/docs/04__Analyze%20Public%20Data/4_1__Hosted%20Tutorials)
