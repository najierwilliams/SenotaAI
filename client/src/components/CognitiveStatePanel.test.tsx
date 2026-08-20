import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CognitiveStatePanel } from "./CognitiveStatePanel";

describe("CognitiveStatePanel guidance", () => {
  it("explains the review workflow in plain language and exposes dialog-based actions", () => {
    const markup = renderToStaticMarkup(<CognitiveStatePanel npcs={[{ npcId: "luna001", displayName: "Luna" }]} />);

    expect(markup).toContain("Luna’s learning workspace");
    expect(markup).toContain("Add a note");
    expect(markup).toContain("Create a review");
    expect(markup).toContain("Choose what stays");
    expect(markup).toContain("What “evidence” means:");
    expect(markup).toContain("Get Luna’s next steps");
    expect(markup).toContain("Make a review card");
    expect(markup).not.toContain("Describe the concrete, evidence-backed experience to analyze.");
  });
});
