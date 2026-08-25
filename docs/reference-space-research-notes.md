# Reference-Space Research Notes

## EBRAINS / siibra / Julich-Brain

Official EBRAINS describes siibra-api as an HTTP API that provides structured queries for parcellations, brain regions, available data features, reference templates, parcellation maps, and regional datasets. The EBRAINS Multilevel Human Brain Atlas publishes probabilistic three-dimensional maps and supports multiple reference spaces, including MNI Colin27 and ICBM 152 2009c. It integrates BigBrain with MNI and FreeSurfer reference spaces. The Julich-Brain dataset record specifies that its v1.18 maximum-probability map is available in MNI ICBM 152 2009c nonlinear asymmetric and Colin27 spaces; its underlying maps remain probability maps rather than exact boundaries.

The siibra coordinate-assignment documentation demonstrates an important directionality: a known coordinate in `mni152` may be probabilistically assigned to Julich regions. It does **not** document a universal region-to-single-point strategy; any such target must preserve its source/threshold/derivation and should remain a region unless an explicit provider-derived centroid or coordinate is queried.

The existing Luna model has no registered external transform, so these provider capabilities do not justify enabling a Julich target in Luna Local coordinates.

Sources:

1. https://ebrains.eu/data-tools-services/tools/siibra-api
2. https://ebrains.eu/data-tools-services/brain-atlases/human-brain
3. https://siibra-python.readthedocs.io/en/latest/examples/05_anatomical_assignment/001_coordinates.html
4. https://search.kg.ebrains.eu/instances/Dataset/4ac9f0bc-560d-47e0-8916-7b24da9bb0ce

## Allen Human Brain Atlas

Official Allen documentation states that Human Brain Atlas microarray sampling sites were mapped into each donor's individual MR image space and that all brains were registered to MNI space for cross-individual comparison. API sample output includes the donor, a sample `(x,y,z)` location in the MR volume in millimetres, and assigned structure provenance. Allen further documents donor-specific MR-to-MNI registration: in-cranio T1 scans use FreeSurfer affine registration; ex-cranio scans are first rigidly aligned with FSL and then non-rigidly aligned with ANTs. The API describes an `Alignment3d` model for the 3-D affine MR-to-MNI transform and provides download/query pathways for donor MR and transform data.

This supports provider-side donor/MNI sample provenance, but it does **not** establish a transform from the existing Luna GLB's local rendering coordinates to donor MR or MNI. Therefore Allen samples cannot become navigational targets in Luna until a separately documented Luna registration is available.

Sources:

1. https://brain-map.org/support/documentation/human-brain-atlas-api
2. https://brain-map.org/support/documentation/human-brain-atlas-microarray-data
3. https://brain-map.org/support/documentation/human-brain-atlas-magnetic-resonance-images-mri
4. https://brain-map.org/support/documentation/allen-human-brain-reference-atlas

## CELLxGENE / Human Brain Cell Atlas

The registered Human Brain Cell Atlas v1.0 is a single-nucleus transcriptomic census from three postmortem donors and approximately 100 dissections. Its official collection describes biologically meaningful partitions by cell type, supercluster, and brain-region dissection. It does not declare a three-dimensional reference coordinate system or per-cell physical coordinates for the registered human collection. It therefore supports anatomical/contextual dataset discovery, not a CellularSpatialTarget in Luna.

CELLxGENE itself can display spatial data when an individual dataset contains cells' `(x,y)` coordinates. A separate CELLxGENE collection demonstrates this capability for a **mouse** whole-brain MERFISH atlas registered to Allen mouse CCFv3. It is both species- and reference-space-incompatible with Luna’s human local GLB, so it cannot enable human cellular navigation.

Sources:

1. https://cellxgene.cziscience.com/collections/283d65eb-dd53-496d-adb7-7570c7caa443
2. https://cellxgene.cziscience.com/docs/04__Analyze%20Public%20Data/4_1__Hosted%20Tutorials
3. https://cellxgene.cziscience.com/collections/0cca8620-8dee-45d0-aef5-23f032a5cf09
4. https://data.humancellatlas.org/hca-bio-networks/nervous-system/atlases/brain-v1-0

## Research conclusion

Current provider research confirms provider-side spatial capability for selected EBRAINS/Julich maps and Allen donor/MNI samples, but **no scientific registration exists for the current Luna Local GLB coordinate frame**. The registered Human Brain Cell Atlas remains non-spatial. Consequently, the scientifically defensible implementation target is an explicit reference-space/transform/spatial-target foundation that reports lower-scale targets as unavailable with precise provenance and capability reasoning, while retaining Macro mesh-derived simulation targeting. It must not enable Tissue, Cellular, or Molecular navigation until a documented Luna registration and applicable spatial target source are added.
