# Luna Brain Spatial Registration Completion Assessment

**Date:** August 25, 2026

**Registration status:** **NOT ESTABLISHED**

**Decision:** No Luna GLB → external scientific-reference transform was created, serialized, executed, or exposed.

## A. Registration source used

The only authoritative source asset presently available in Luna is the repository-local byte-identical copy of HuBMAP Human Reference Atlas **Brain-female v1.1 `Allen_F_Brain.glb`**, SHA-256 `c5711a1a8bc62ca930b8bcf076def15315c11f5ad9bc7901e51f698406d38dbc`. HRA metadata establishes the raw asset’s placement into HRA Brain-Female and the HRA CCF body reference context. This is a reference-object placement, not a medical-image or neuroimaging template registration. [1] [2]

## B. Why the source is authoritative—and its limit

HRA’s linked-data graph, release metadata, raw GLB directory, historical companion FBX, crosswalk, and published 3D reference-object workflow establish the asset’s HRA source, HRA/UBERON metadata, and reference-body placements. They do **not** establish a source-volume checksum, mesh-generation project, source-coordinate convention, vertex-to-voxel correspondence, Allen graph-16 label mapping, or an affine/deformation from this exact GLB to an image/atlas space.

> A source attribution (“mirrored and resized from Allen Human Reference Atlas data”) is not a spatial correspondence artifact. It cannot supply landmark coordinates, validation residuals, handedness, origin, unit convention, or a reusable transform.

## C. Source coordinate system

The exact GLB’s raw accessor values, node transforms, and Babylon/Maya exporter metadata exist only as file geometry. The public HRA source record does not declare a medical/scientific origin, axes, handedness, raw unit convention, or anatomical orientation that can be used for image registration. The GLB has 282 Allen-named mesh nodes plus an optic-chiasm mesh, while the Allen 2020 volume contains 141 non-background labels; that cardinality and name overlap are descriptive only.

The existing HRA raw-GLB → Brain-Female placement uses a published HRA reference-object transform. Luna’s browser subsequently centers and visually scales the loaded group for presentation. Neither operation is a coordinate conversion to MNI, ICBM, Allen volume, BigBrain, Julich-Brain, cellular, or molecular space.

## D. Target reference-space assessment

| Candidate | What is established | Why it is not a Luna target today |
|---|---|---|
| HRA Brain-Female / HRA CCF body | Exact GLB placement into HRA reference-object/body context | It is the strongest established Luna relationship but is not an external neuroimaging provider coordinate space |
| Allen Human Reference Atlas 3D 2020 / ICBM 2009b Symmetric | Official annotation volume has 0.5 mm RAS NIfTI frame and 141 labels | No exact GLB ↔ annotation-volume generation/correspondence artifact |
| EBRAINS / Julich-Brain MNI ICBM 152 2009c Asymmetric | Provider dataset/reference-space context is available | No Luna ↔ 2009c transform; 2009b and 2009c must not be conflated |
| BigBrain / ICBM 2009b | BigBrain-native transformation resources exist | They apply to BigBrain source representations, not to Luna’s HRA GLB |
| Allen donor-MR / MNI routes | Allen provider documents donor/sample pathways | They do not apply to the HRA mirrored/resized reference-object GLB |

The most defensible current target is therefore **HRA Brain-Female / HRA CCF body**, with status **ESTABLISHED only for HRA reference-object placement**. It is not sufficient to resolve provider coordinates, scientific observations, or nanobot targets in Luna.

## E–M. Transform, methodology, landmarks, and errors

There is no permissible GLB → Allen/ICBM/EBRAINS/BigBrain/Julich transform.

| Required registration item | Result |
|---|---|
| Transform type / parameters / file / hash | None; `transformArtifact: null` |
| Registration method | None; no source coordinate convention or source-to-target correspondence |
| Registration landmarks | 0 valid source-target pairs |
| Independent validation landmarks | 0 |
| Mean, median, RMS, maximum landmark error | Not computable; no validated pairs |
| Surface or Hausdorff error | Not computable; no matched source/target surfaces/provenance |
| Region-level mapping accuracy | Not computable; semantic candidates are not a spatial mapping |
| Orientation / handedness / origin / scale verification | Not possible for an external image space from the published GLB record |

A new rigid, affine, surface, or deformable registration must **not** be constructed from bounds, node names, shape similarity, viewer presentation coordinates, mesh centres, manually eyeballed landmarks, HRA scene placement, or a few unverified points. Those methods would fail the required evidence threshold before independent hold-out validation can even be defined.

## N. Structure-registration table

No provider structure relationship is promoted to `EXACT`, `ONE_TO_ONE`, `PROBABILISTIC`, or coordinate-resolved. The present machine-readable equivalent is the existing canonical mapping guard: for a non-Luna provider, every Luna structure remains `query-required` / **UNMAPPED for spatial purposes** unless a provider-specific, ontology-backed mapping artifact is supplied.

Semantic candidates such as hippocampal head/body/tail, caudate, putamen, thalamus, corpus callosum and cerebellar regions are useful only for future artifact discovery. They are not evidence that a Luna mesh vertex, centroid, volume, or visual point belongs to a provider region.

## O–R. Provenance, versions, licences, and formal status

The formal Luna reference-registration record already includes the exact HRA asset hash, source URL/version, target-space distinction, null transform artifact, validation status `unavailable`, and concrete blockers. The strict coordinate service rejects every Luna ↔ provider request without a validated record, an executable registered artifact, transform ID, units, and provenance.

The HRA GLB source is CC BY 4.0 according to its existing registry record. The Allen annotation package, BigBrain, Julich-Brain and EBRAINS materials have their own dataset/API terms; no derivative mesh, volume, registration grid, or provider data was redistributed in this assessment. BigBrain and evaluated Julich materials previously identified for visual use require CC BY-NC-SA 4.0 review. [1] [3] [4]

## S–U. Coordinate-resolved scales and nanobot capability

No new observation scale is coordinate-resolved by this assessment. Macro remains a presentation-model simulation with HRA reference-object provenance. Tissue, Cellular, Molecular and Subcellular remain unable to create a Luna coordinate target because provider availability and provider coordinates are not a validated Luna mapping.

No nanobot capability was enabled. Macro missions remain explicitly simulated and use mesh-derived presentation targets. Lower-scale operations remain disabled or unavailable. A later registration alone would still be insufficient to enable them without a licensed spatial dataset, exact dataset version, validated canonical mapping, provider target geometry/coordinates, quantified uncertainty, domain-of-validity check, and explicit mission capability approval.

## V. Exact missing artifact and manual action

The blocker is **not** the absence of a generic MNI template, a large BigBrain volume, or a downloadable viewer asset. The missing evidence is an authoritative, versioned, checksum-bound correspondence that binds the exact HRA `Allen_F_Brain.glb` (or documented byte-identical predecessor) to the exact Allen Human Reference Atlas 3D 2020 annotation volume or another source image/surface in a declared scientific frame.

The requested artifact must provide all of the following:

1. Source and target asset identifiers, versions and SHA-256 checksums.
2. Source and target coordinate conventions, units, axes, handedness and origin.
3. A mesh-generation / surface-extraction workflow or per-vertex/per-voxel correspondence showing how the specific GLB arose from the target annotation/source volume.
4. A serialized affine/nonlinear transform or source geometry in that frame, with software version and method.
5. Independent, held-out bilateral and midline anatomical landmarks with residual metrics.
6. Licence, attribution and redistribution/computational-use terms.

The correct manual action is to request this artifact from the HRA Brain-Female / reference-object maintainer or the original model-production team. The attached prior provenance report includes a ready-to-send maintainer request. **No dataset download is currently requested**, because downloading the 348 MB MNI 2009b archive, 780 MB BigBrain grid, multi-gigabyte NIfTI volumes, or terabyte BigBrain source cannot create the missing GLB correspondence. None should be committed to Git or Git LFS for this purpose.

If the maintainer supplies a source volume and a documented GLB-generation record, the future reproducible pipeline must fetch those exact source assets outside Git, verify checksums, run the provider-authorized transformation/surface workflow, hold back independent landmarks, reproduce the supplied transform hash and quantitative errors, and only then change status to `VALIDATED`. No threshold has been selected now because there is no approved method or validation package from which to derive one.

## W. Remaining limitations and application behavior

The stronger alternative is already active: retain the current visual GLB; retain its checksum-pinned HRA placement; expose EBRAINS/Julich/BigBrain as read-only provider context; label **Provider spatial context: available** and **Luna registration: not established**; and reject coordinate conversions and lower-scale operations. The existing visual application remains fully functional without a registration.

This is a completion result, not an architecture deferral: the available authoritative sources were traced and evaluated, and the requested registration cannot be scientifically constructed today because its indispensable source correspondence and validation package do not exist in the published record.

## References

[1]: https://purl.humanatlas.io/ref-organ/brain-female/v1.1 "HRA Brain-Female v1.1"
[2]: https://cdn.humanatlas.io/digital-objects/ref-organ/brain-female/v1.1/graph.json "HRA Brain-Female v1.1 graph"
[3]: https://download.alleninstitute.org/informatics-archive/allen_human_reference_atlas_3d_2020/version_1/ "Allen Human Reference Atlas 3D 2020 package"
[4]: https://ftp.bigbrainproject.org/bigbrain-ftp/License.txt "BigBrain licence"
