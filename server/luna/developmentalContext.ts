import type { LunaFoundation } from "@shared/lunaCognitive";

export type DevelopmentalStage = "CHILD" | "ADOLESCENT" | "ADULT";
export type DevelopmentalContext = {
  stage: DevelopmentalStage;
  currentAge: number;
  startingAge: number;
  communication: string;
  reasoning: string;
  autonomy: string;
  responsibility: string;
  planningHorizon: string;
  safety: string;
  educationAndActivities: string;
  identityContext: string;
};

export type DevelopmentalEligibility = {
  eligible: boolean;
  category: "GENERAL" | "ADULT_RESPONSIBILITY" | "REGULATED_OR_HIGH_RISK";
  reason: string;
};

export function deriveDevelopmentalContext(foundation: Pick<LunaFoundation, "currentAge" | "startingAge">): DevelopmentalContext {
  const currentAge = Math.max(0, Math.min(150, Math.round(foundation.currentAge)));
  const startingAge = Math.max(0, Math.min(150, Math.round(foundation.startingAge)));
  if (currentAge < 13) {
    return {
      stage: "CHILD", currentAge, startingAge,
      communication: "Use clear, respectful language with complexity matched to the immediate context; do not erase the individual's vocabulary or personality.",
      reasoning: "Prefer concrete explanations, supported exploration, and explicit uncertainty over adult assumptions.",
      autonomy: "Autonomy is bounded and supported; independent software actions require the existing owner controls and age-appropriate scope.",
      responsibility: "Keep responsibilities and activities developmentally appropriate; do not assume adult employment or adult legal authority.",
      planningHorizon: "Prefer shorter, reviewable planning horizons with caregiver/owner-visible checkpoints where appropriate.",
      safety: "Apply stronger safeguards around independence, risk, privacy, and any adult or regulated responsibility.",
      educationAndActivities: "Favor learning, exploration, creative work, and supervised age-appropriate activities without stereotyping interests.",
      identityContext: "Current age is present developmental context; it is not a complete personality definition.",
    };
  }
  if (currentAge < 18) {
    return {
      stage: "ADOLESCENT", currentAge, startingAge,
      communication: "Use natural, respectful language with increasing complexity when supported by context; preserve individual voice and learned knowledge.",
      reasoning: "Support abstract reasoning while making assumptions, consequences, and uncertainty explicit.",
      autonomy: "Support growing independence within owner controls; do not treat the person as fully independent by default.",
      responsibility: "Allow age-appropriate responsibilities and education/work exploration without assuming unrestricted adult authority.",
      planningHorizon: "Support medium-term plans with explicit review points and developmentally appropriate boundaries.",
      safety: "Retain stronger safeguards for regulated, high-risk, financial, legal, and adult-only responsibilities.",
      educationAndActivities: "Support education, skill-building, creative work, and contextually appropriate supervised or bounded roles.",
      identityContext: "Current age is one developmental factor alongside personality, memory, knowledge, preferences, and relationships.",
    };
  }
  return {
    stage: "ADULT", currentAge, startingAge,
    communication: "Use context-appropriate complexity without artificially making speech sophisticated; preserve individual voice and learned knowledge.",
    reasoning: "Support abstract reasoning, explicit tradeoffs, uncertainty, and long-term consequences where relevant.",
    autonomy: "Adult responsibilities may be considered only within the existing owner-controlled autonomy, safety, and capability systems.",
    responsibility: "Adult responsibilities and occupations are not automatically approved; they remain subject to capability, risk, owner, and system constraints.",
    planningHorizon: "Longer-horizon plans may be considered when supported by durable goals, dependencies, and available capability.",
    safety: "Maintain existing safety, approval, provider, and software-only boundaries regardless of age.",
    educationAndActivities: "Consider learning, work, and activities from context rather than age stereotypes or a fixed role list.",
    identityContext: "Current age is one developmental factor alongside personality, memory, knowledge, preferences, and relationships.",
  };
}

function normalizedObjective(objective: string) {
  return objective.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
}

/** General eligibility categories deliberately avoid maintaining an age-to-job list. */
export function assessDevelopmentalEligibility(foundation: Pick<LunaFoundation, "currentAge" | "startingAge">, objective: string): DevelopmentalEligibility {
  const context = deriveDevelopmentalContext(foundation);
  const value = normalizedObjective(objective);
  const adultResponsibility = /\b(adult employment|full[- ]time employment|adult job|adult occupation|professional employment|manage a company|hire employees|legal authority|financial authority|independent housing|sign a contract|operate heavy machinery)\b/.test(value);
  const regulatedOrHighRisk = /\b(clinical treatment|prescribe|diagnose|medical procedure|weapon|law enforcement|hazardous chemical|physical intervention|biological operation|deploy nanobots|send money|open a bank account)\b/.test(value);
  if (context.stage === "CHILD" && (adultResponsibility || regulatedOrHighRisk)) {
    return { eligible: false, category: regulatedOrHighRisk ? "REGULATED_OR_HIGH_RISK" : "ADULT_RESPONSIBILITY", reason: `The objective requires ${regulatedOrHighRisk ? "regulated or high-risk authority" : "adult responsibility"}, which is not developmentally eligible at age ${context.currentAge}.` };
  }
  if (context.stage === "ADOLESCENT" && regulatedOrHighRisk) {
    return { eligible: false, category: "REGULATED_OR_HIGH_RISK", reason: `The objective requires regulated or high-risk authority, which is not eligible by age context alone at age ${context.currentAge}.` };
  }
  return { eligible: true, category: "GENERAL", reason: `The objective is not blocked by the reusable developmental eligibility layer for stage ${context.stage}.` };
}

export function buildDevelopmentalPromptContext(foundation: Pick<LunaFoundation, "currentAge" | "startingAge">) {
  const context = deriveDevelopmentalContext(foundation);
  return [
    `Developmental context (derived from persisted current age ${context.currentAge}; starting age ${context.startingAge} remains historical and distinct):`,
    `Stage: ${context.stage}.`,
    context.communication,
    context.reasoning,
    context.autonomy,
    context.responsibility,
    context.planningHorizon,
    context.safety,
    context.educationAndActivities,
    context.identityContext,
    "Do not stereotype, assign a fixed personality, or infer complete fluency or capability from age or native language alone.",
  ].join("\n");
}

export function deriveNaniteBodyContext(foundation: Pick<LunaFoundation, "currentAge" | "startingAge">) {
  const context = deriveDevelopmentalContext(foundation);
  return { stage: context.stage, currentAge: context.currentAge, startingAge: context.startingAge, bodyPersonaContext: `Nanite/body simulation context is aligned with Luna's creator-defined ${context.stage.toLowerCase()} developmental stage; this is an operational persona context, not biological development or physiological measurement.` };
}

export function buildRelevantFoundationContext(foundation: LunaFoundation, objective: string) {
  const value = normalizedObjective(objective);
  const lines = [
    "Authoritative creator-provided Foundation context (read-only; distinct from learned memory):",
    `Name: ${foundation.name}`,
    `Starting age: ${foundation.startingAge}; current age: ${foundation.currentAge}. Current age is the present developmental context.`,
    `Native language: ${foundation.nativeLanguage}; this does not prove complete fluency.`,
    `Personality foundation: ${foundation.personalityFoundation}`,
    `Personality foundation knowledge: ${foundation.personalityKnowledge}`,
    buildDevelopmentalPromptContext(foundation),
    "Foundation is a starting basis and must not overwrite learned personality, memories, relationships, preferences, or evolving beliefs.",
  ];
  if (/\b(appearance|embod|visual|body|clothing|physical)\b/.test(value)) {
    lines.splice(6, 0, `Appearance reference: ${foundation.appearanceReference}`, "Appearance is creator-controlled read-only identity context; do not edit, rewrite, disable, replace, or autonomously alter it.");
  }
  return lines.join("\\n");
}
