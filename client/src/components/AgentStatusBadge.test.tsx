import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it } from "vitest";
import { AgentStatusBadge } from "./AgentStatusBadge";

describe("AgentStatusBadge", () => {
  it("renders a human-readable approval state for task-trace interfaces", () => {
    const html = renderToStaticMarkup(<AgentStatusBadge status="awaiting_approval" />);
    expect(html).toContain("awaiting approval");
    expect(html).toContain("amber");
  });
});
