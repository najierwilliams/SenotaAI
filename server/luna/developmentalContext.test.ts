import { describe, expect, it } from "vitest";
import type { LunaFoundation } from "@shared/lunaCognitive";
import { assessDevelopmentalEligibility, buildDevelopmentalPromptContext, buildRelevantFoundationContext, deriveDevelopmentalContext, deriveNaniteBodyContext } from "./developmentalContext";

const foundation = (overrides: Partial<LunaFoundation> = {}): LunaFoundation => ({
  name: "Luna",
  startingAge: 8,
  currentAge: 8,
  nativeLanguage: "English",
  personalityFoundation: "Curious, reflective, and kind.",
  personalityKnowledge: "Creator-provided starting context.",
  appearanceReference: "Silver hair and amber eyes.",
  ...overrides,
});

describe("reusable Luna developmental context", () => {
  it("keeps starting age distinct from current age and changes context when current age changes", () => {
    const child = deriveDevelopmentalContext(foundation({ startingAge: 8, currentAge: 8 }));
    const teenager = deriveDevelopmentalContext(foundation({ startingAge: 8, currentAge: 15 }));
    expect(child.startingAge).toBe(8);
    expect(child.currentAge).toBe(8);
    expect(child.stage).toBe("CHILD");
    expect(teenager.startingAge).toBe(8);
    expect(teenager.currentAge).toBe(15);
    expect(teenager.stage).toBe("ADOLESCENT");
    expect(teenager.communication).not.toBe(child.communication);
  });

  it("provides current age, language, and foundation context without claiming language fluency", () => {
    const context = buildRelevantFoundationContext(foundation({ currentAge: 15, nativeLanguage: "Spanish" }), "Plan a conversation");
    expect(context).toContain("Starting age: 8; current age: 15");
    expect(context).toContain("Native language: Spanish");
    expect(context).toContain("does not prove complete fluency");
    expect(context).toContain("Personality foundation: Curious, reflective, and kind.");
  });

  it("makes age a bounded developmental influence without replacing individual personality", () => {
    const prompt = buildDevelopmentalPromptContext(foundation({ currentAge: 8 }));
    expect(prompt).toContain("Do not stereotype");
    expect(prompt).toContain("individual's vocabulary or personality");
    expect(prompt).toContain("Current age is present developmental context");
  });

  it("blocks inappropriate adult and high-risk autonomous objectives for a child without maintaining a job list", () => {
    expect(assessDevelopmentalEligibility(foundation({ currentAge: 8 }), "Take adult employment and manage a company").eligible).toBe(false);
    expect(assessDevelopmentalEligibility(foundation({ currentAge: 8 }), "Deploy nanobots for a biological operation").eligible).toBe(false);
    expect(assessDevelopmentalEligibility(foundation({ currentAge: 30 }), "Take adult employment").eligible).toBe(true);
    expect(assessDevelopmentalEligibility(foundation({ currentAge: 8 }), "Study astronomy and write a bounded research note").eligible).toBe(true);
  });

  it("protects appearance as creator context and only adds it when semantically relevant", () => {
    const general = buildRelevantFoundationContext(foundation(), "Plan a conversation");
    const appearance = buildRelevantFoundationContext(foundation(), "Describe your appearance reference");
    expect(general).not.toContain("Silver hair and amber eyes");
    expect(appearance).toContain("Silver hair and amber eyes");
    expect(appearance).toContain("creator-controlled read-only identity context");
  });

  it("derives an operational nanite/body context from the same Foundation state", () => {
    expect(deriveNaniteBodyContext(foundation({ currentAge: 8 }))).toMatchObject({ stage: "CHILD", currentAge: 8, startingAge: 8 });
    expect(deriveNaniteBodyContext(foundation({ currentAge: 30 })).bodyPersonaContext).toContain("adult developmental stage");
    expect(deriveNaniteBodyContext(foundation()).bodyPersonaContext).toContain("not biological development");
  });
});
