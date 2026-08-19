import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("streamdown", () => ({ Streamdown: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

import { AIChatBox } from "./AIChatBox";

describe("chat canon source selection", () => {
  it("exposes a canon action for the specific user request and not the assistant response", () => {
    Object.assign(globalThis, { React });
    const html = renderToStaticMarkup(<AIChatBox
      messages={[
        { role: "user", content: "Mira should never reveal the archivist's name until trust is earned." },
        { role: "assistant", content: "I can prepare that as canon." },
      ]}
      onSendMessage={vi.fn()}
      onSelectMessageForCanon={vi.fn()}
    />);

    expect(html).toContain("Use selected request for NPC canon");
    expect(html).toContain("Use this request for NPC canon: Mira should never reveal the archivist");
    expect(html).not.toContain("Use this request for NPC canon: I can prepare that as canon.");
  });
});
