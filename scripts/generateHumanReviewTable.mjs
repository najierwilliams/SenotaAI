import { readFileSync, writeFileSync } from "node:fs";

const artifact = JSON.parse(readFileSync("docs/luna-hra-structure-crosswalk-evidence.json", "utf8"));
const records = artifact.records.filter((record) => record.mappingStatus === "EVIDENCE_BACKED");
const esc = (value) => String(value ?? "—").replaceAll("|", "\\|");
const rows = records.map((record) => [
  `\`${record.lunaStructureId}\``,
  esc(record.lunaSourceName),
  `\`${record.lunaSourceName}\``,
  `[HRA entity](${record.hraEntityId})`,
  esc(record.sourceVersion),
  esc(record.canonicalStructureId),
  esc(record.hraEntityLabel),
  `[Exact graph file_subpath → representation_of](${record.provenance})`,
  "Exact HRA v1.1 graph file_subpath equality join",
  "EVIDENCE_BACKED · REQUIRES_USER_REVIEW",
  "REVIEW",
  "Do not approve automatically; verify HRA entity, UBERON meaning, laterality, and intended product use.",
].map((cell) => `| ${cell} `).join("") + "|");

const highConfidence = records.filter((record) => !/(complex|region|matter|part_of|body)/i.test(record.lunaSourceName));
const composite = records.filter((record) => /(complex|region|matter|part_of|body)/i.test(record.lunaSourceName));
const unmapped = artifact.records.filter((record) => record.mappingStatus === "UNMAPPED");
const markdown = [
  "# Luna Structure Crosswalk — Human Review Table",
  "",
  "This review package contains **one row per exact source-supported HRA Brain-Female v1.1 → UBERON record**. The rows are not approvals. Each remains evidence-backed and requires a human/domain review before a reviewed approval can be recorded.",
  "",
  "## Review summary",
  "",
  "| Group | Count | Interpretation | Recommended action |",
  "|---|---:|---|---|",
  `| A. High-confidence direct anatomical identities | ${highConfidence.length} | Exact graph-to-GLB evidence with no composite naming signal | REVIEW |`,
  `| B. Structures requiring human review | ${records.length} | All source-supported records require explicit review | REVIEW |`,
  `| C. Ambiguous/composite source labels | ${composite.length} | Source-supported but may represent broad/composite anatomical scope | REVIEW |`,
  `| D. Structures with no mapping | ${unmapped.length} | No exact HRA graph-to-UBERON evidence | Keep UNMAPPED |`,
  "",
  "## Evidence-backed records — human review required",
  "",
  "| Luna structure ID | Luna structure name | GLB node/path | HRA entity | HRA version | UBERON ID | UBERON canonical name | Exact evidence/source | Mapping method | Review status | Recommended action | Notes |",
  "|---|---|---|---|---|---|---|---|---|---|---|---|",
  ...rows,
  "",
  "## Review rule",
  "",
  "A reviewer may record `APPROVED` only after confirming the exact GLB node/path, HRA entity, declared `representation_of` relation, UBERON meaning, laterality or scope, and intended use. Approval remains an anatomical identity decision only: it does not establish Luna-to-MNI registration, a Luna-to-Julich mapping, a provider coordinate, or a lower-scale nanobot capability.",
  "",
  "## Source",
  "",
  "[HRA Brain-Female v1.1 graph](https://cdn.humanatlas.io/digital-objects/ref-organ/brain-female/v1.1/graph.json)",
  "",
].join("\n");
writeFileSync("docs/luna-structure-crosswalk-review-table.md", markdown);
console.log(JSON.stringify({ evidenceBacked: records.length, highConfidence: highConfidence.length, composite: composite.length, unmapped: unmapped.length }, null, 2));
