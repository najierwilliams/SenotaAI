import type { LunaClaim, LunaClaimEvidence, LunaClaimRevision } from "@shared/lunaCognitive";

export type LunaClaimInspection = {
  claimId: string;
  statement: string;
  truthState: LunaClaim["truthState"];
  lifecycleState: LunaClaim["lifecycleState"];
  confidence: number;
  assumptions: string[];
  evidence: {
    supportingCount: number;
    contradictingCount: number;
    contextCount: number;
    derivedFromCount: number;
    sourceAnchorCount: number;
  };
  revisionCount: number;
  latestRevisionKind: LunaClaimRevision["revisionKind"] | null;
  requiresReview: boolean;
};

/**
 * Produces an inspectable claim view from persisted records only. It does not choose a winning
 * source, elevate truth, or infer a scientific conclusion from aggregate counts.
 */
export function inspectLunaClaim(input: {
  claim: LunaClaim;
  evidence: LunaClaimEvidence[];
  revisions: LunaClaimRevision[];
}): LunaClaimInspection {
  const evidence = input.evidence.filter(item => item.claimId === input.claim.id);
  const revisions = input.revisions
    .filter(item => item.claimId === input.claim.id)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const count = (role: LunaClaimEvidence["evidenceRole"]) => evidence.filter(item => item.evidenceRole === role).length;
  const sourceAnchorCount = evidence.filter(item => item.sourceMemoryId || item.sourceObjectId || item.sourceRelationshipId).length;
  const contradictingCount = count("CONTRADICTS");
  return {
    claimId: input.claim.id,
    statement: input.claim.statement,
    truthState: input.claim.truthState,
    lifecycleState: input.claim.lifecycleState,
    confidence: input.claim.confidence,
    assumptions: input.claim.assumptions,
    evidence: {
      supportingCount: count("SUPPORTS"),
      contradictingCount,
      contextCount: count("CONTEXT"),
      derivedFromCount: count("DERIVED_FROM"),
      sourceAnchorCount,
    },
    revisionCount: revisions.length,
    latestRevisionKind: revisions[0]?.revisionKind ?? null,
    requiresReview: input.claim.lifecycleState === "REQUIRES_REVIEW" || contradictingCount > 0 || sourceAnchorCount === 0,
  };
}

export function inspectLunaClaims(input: {
  claims: LunaClaim[];
  evidence: LunaClaimEvidence[];
  revisions: LunaClaimRevision[];
  limit?: number;
}) {
  const limit = Math.min(Math.max(input.limit ?? 30, 1), 100);
  return input.claims
    .slice()
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, limit)
    .map(claim => inspectLunaClaim({ claim, evidence: input.evidence, revisions: input.revisions }));
}
