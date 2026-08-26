import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  JULICH_STRUCTURE_MAPPINGS,
  JULICH_STRUCTURE_MAPPING_POLICY,
  getJulichStructureMappingSummary,
} from "../server/scientificData/julichStructureMappingRegistry";

const outputPath = resolve(process.cwd(), "docs/julich-structure-mapping-report.md");
const summary = getJulichStructureMappingSummary();

const tableRows = JULICH_STRUCTURE_MAPPINGS
  .slice()
  .sort((left, right) => left.lunaStructureName.localeCompare(right.lunaStructureName))
  .map((record) => [
    record.lunaStructureName,
    record.hraId,
    record.uberonId,
    record.mappingStatus,
    record.mappingType,
    record.julichRegionId ?? "—",
    record.evidenceTier,
    record.sourceVersion,
    record.referenceSpace,
    "No verified external ontology-to-Julich relation; no mapping inferred.",
  ].map((value) => String(value).replaceAll("|", "\\|")).join(" | "));

const report = `# Approved Luna Identity → Julich-Brain v3.1 Classification Report

**Generated:** 2026-08-26  
**Registry:** \`server/scientificData/julichStructureMappingRegistry.ts\`  
**Scope:** The exact 102 HRA Brain-Female v1.1 → UBERON identities that the user attested as reviewed and approved on 2026-08-26. The 181 source-unmapped Luna records are intentionally outside this report.

## Result

The approved anatomy identities are valid source-backed HRA/UBERON identity records. The current evidence does **not** provide a published HRA, UBERON, or FMA to Julich-Brain region crosswalk. Therefore every record is explicitly classified as \`UNMAPPED\`; no name-, mesh-, visual-, HRA-placement-, or coordinate-derived relation has been added.

| Classification | Count |
|---|---:|
| Approved identity records considered | ${summary.totalApproved} |
| \`AUTHORITATIVE\` Julich relations | ${summary.authoritative} |
| \`PROBABILISTIC\` Julich relations | ${summary.probabilistic} |
| \`REQUIRES_DOMAIN_REVIEW\` candidate relations | ${summary.requiresDomainReview} |
| \`UNMAPPED\` relations | ${summary.unmapped} |

> **Interpretation.** \`UNMAPPED\` is an explicit evidence result, not a missing implementation. Julich-Brain v3.1 provider maps and coordinate assignment remain independently usable only in their declared MNI ICBM 152 2009c Nonlinear Asymmetric provider space. They do not establish Luna GLB/viewer/HRA placement to MNI or to Julich-Brain.

## Source and provider context

The provider policy uses Julich-Brain v3.1, provider parcellation \`${JULICH_STRUCTURE_MAPPING_POLICY.providerParcellationId}\`, in **${JULICH_STRUCTURE_MAPPING_POLICY.referenceSpace}**. The verified provider catalog exposes labelled and statistical maps as provider-hosted metadata; Luna does not download, bundle, render, or redistribute them. The CC BY-NC-SA 4.0 license and required attribution remain attached to the provider context.[1]

The siibra API offers explicit coordinate assignment operations for an independently supplied finite MNI millimetre point. That capability is intentionally not composed with a Luna coordinate or selected mesh.[2] The checked Julich/siibra provider metadata uses provider-native region identifiers and does not publish a populated HRA/UBERON/FMA correspondence. The registry should be amended only with a versioned, citable canonical ontology ↔ Julich relation or an explicitly reviewed scientific mapping artifact.

BigBrain is recorded separately as a provider-scoped microscopic reference. Published BigBrain-to-template work must not be composed into a Luna transform in the absence of a documented Luna registration.[3]

## Per-record classification

| Luna structure / GLB node | HRA entity | UBERON | Status | Type | Julich region ID | Evidence tier | Provider version | Provider reference space | Notes |
|---|---|---|---|---|---|---|---|---|---|
| ${tableRows.join("\n| ")} |

## Implementation safeguards

The client and server keep source evidence immutable. The direct MNI → Julich form accepts only user-entered finite millimetre coordinates in the named MNI provider space; no Luna, GLB, viewer, or HRA coordinate is supplied or converted. The \`UNMAPPED\` classification does not enable a spatial target, lower-scale scientific operation, or nanobot mission.

## References

[1]: ${JULICH_STRUCTURE_MAPPING_POLICY.source} "EBRAINS Knowledge Graph — Julich-Brain v3.1"
[2]: https://siibra-api-stable.apps.hbp.eu/v3_0/redoc "siibra API documentation"
[3]: https://pmc.ncbi.nlm.nih.gov/articles/PMC6797784/ "BigBrain registration publication"
`;

writeFileSync(outputPath, report, "utf8");
console.log(`Wrote ${outputPath} with ${JULICH_STRUCTURE_MAPPINGS.length} rows.`);
