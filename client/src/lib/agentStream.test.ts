import { describe, expect, it } from "vitest";
import { parseAgentSseFrames } from "./agentStream";

describe("live agent stream parsing", () => {
  it("parses task status and trace events from a multi-frame SSE chunk", () => {
    const parsed = parseAgentSseFrames('event: agent\ndata: {"taskId":3,"status":"running"}\n\nevent: agent\ndata: {"taskId":3,"step":{"sequence":2,"kind":"write_repository_file","title":"Updated source","status":"completed"}}\n\n');
    expect(parsed.remainder).toBe("");
    expect(parsed.events).toHaveLength(2);
    expect(parsed.events[1]?.step?.title).toBe("Updated source");
  });

  it("keeps a partial frame buffered until its delimiter arrives", () => {
    const parsed = parseAgentSseFrames('event: agent\ndata: {"taskId":3');
    expect(parsed.events).toEqual([]);
    expect(parsed.remainder).toContain("taskId");
  });
});
