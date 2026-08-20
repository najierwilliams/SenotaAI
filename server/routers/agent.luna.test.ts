import { describe, expect, it, vi } from "vitest";

const { isValidNpcAdminSession, isNpcMemoryCloudReady, runNpcPreviewDialogue } = vi.hoisted(() => ({ isValidNpcAdminSession: vi.fn(), isNpcMemoryCloudReady: vi.fn(), runNpcPreviewDialogue: vi.fn() }));
vi.mock("../npcMemory/adminAuth", () => ({ NPC_ADMIN_COOKIE: "senota_npc_admin", isValidNpcAdminSession }));
vi.mock("../npcMemory/supabase", () => ({ isNpcMemoryCloudReady }));
vi.mock("../npcMemory/previewDialogue", () => ({ runNpcPreviewDialogue }));

const { agentRouter } = await import("./agent");
const playerId = "e3f8edc7-6a3a-437d-9d8e-afd23e6fbc50";
function caller(cookie = "") { return agentRouter.createCaller({ user: null, req: { headers: { cookie } } } as never); }

describe("Luna preview workspace bridge", () => {
  it("rejects public calls before any NPC preview work", async () => {
    isValidNpcAdminSession.mockResolvedValue(false);
    await expect(caller().luna.chat({ playerId, message: "Hello Luna." })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(runNpcPreviewDialogue).not.toHaveBeenCalled();
  });

  it("binds an unlocked preview call to Luna and the browser player identity", async () => {
    isValidNpcAdminSession.mockResolvedValue(true);
    isNpcMemoryCloudReady.mockReturnValue(true);
    runNpcPreviewDialogue.mockResolvedValue({ npcId: "luna001", displayName: "Luna", content: "I see you.", memoriesUsed: 0, memorySaved: true });
    await expect(caller("senota_npc_admin=session").luna.chat({ playerId, message: "Hello Luna.", remember: true })).resolves.toMatchObject({ npcId: "luna001", content: "I see you." });
    expect(runNpcPreviewDialogue).toHaveBeenCalledWith({ playerId, message: "Hello Luna.", remember: true, npcId: "luna001" });
  });

  it("enforces Luna’s compact numeric response format at the tRPC response boundary", async () => {
    isValidNpcAdminSession.mockResolvedValue(true);
    isNpcMemoryCloudReady.mockReturnValue(true);
    runNpcPreviewDialogue.mockResolvedValue({ npcId: "luna001", displayName: "Luna", content: "I try to emulate humanity.", memoriesUsed: 0, memorySaved: true });
    const message = "Luna, on a scale of 0–100, how human do you feel? Answer with only the number and one short sentence.";
    await expect(caller("senota_npc_admin=session").luna.chat({ playerId, message })).resolves.toMatchObject({ content: "70% — I try to emulate humanity." });
  });
});
