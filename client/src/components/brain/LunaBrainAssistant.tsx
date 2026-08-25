import {
  useEffect,
  useState,
} from "react";

import {
  AIChatBox,
  type Message,
} from "@/components/AIChatBox";

import {
  executeLunaBrainMissionPlan,
  interpretLunaBrainCommand,
  type NanobotMissionPlan,
} from "./anatomy/LunaBrainOrchestrator";

import {
  subscribeToLunaBrainState,
  type LunaBrainState,
} from "./anatomy/LunaBrainActions";

const SUGGESTED_PROMPTS = [
  "What am I looking at?",
  "Switch to tissue.",
  "What dataset is being used?",
  "Plan a diagnostic nanobot to the hippocampus.",
  "How is the nanobot doing?",
];

function isConfirmation(
  message: string,
): boolean {
  return /^(?:confirm|yes|approve|execute|go ahead)$/i.test(
    message.trim(),
  );
}

export default function LunaBrainAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "I am in **Assisted** mode. I can inspect the live Luna Brain context, change a presentation scale, explain data and spatial limits, and prepare a Macro simulation mission. I always request confirmation before deployment.",
    },
  ]);
  const [pendingPlan, setPendingPlan] =
    useState<NanobotMissionPlan | null>(null);
  const [state, setState] =
    useState<LunaBrainState | null>(null);

  useEffect(() =>
    subscribeToLunaBrainState(setState),
  []);

  const cancelPendingPlan = () => {
    if (!pendingPlan) {
      return;
    }

    setPendingPlan(null);
    setMessages([
      ...messages,
      {
        role: "assistant",
        content:
          "The pending mission plan was cancelled. No deployment occurred.",
      },
    ]);
  };

  const onSendMessage = (content: string) => {
    const nextMessages: Message[] = [
      ...messages,
      { role: "user", content },
    ];

    let response;

    if (pendingPlan && isConfirmation(content)) {
      response = executeLunaBrainMissionPlan(
        pendingPlan,
        pendingPlan.confirmationToken,
      );
      setPendingPlan(response.plan);
    } else {
      response = interpretLunaBrainCommand(content);
      setPendingPlan(response.plan);
    }

    setMessages([
      ...nextMessages,
      {
        role: "assistant",
        content: response.message,
      },
    ]);
  };

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-violet-300/20 bg-[#0b0d14]/95 shadow-2xl backdrop-blur-xl">
      <header className="border-b border-white/10 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-200/80">
              Luna Brain Assistant
            </p>
            <p className="mt-1 text-xs text-white/75">
              Assisted, state-grounded control
            </p>
          </div>
          <span className="rounded-full border border-violet-300/20 bg-violet-300/10 px-2 py-1 text-[9px] text-violet-100">
            {state?.autonomy ?? "assisted"}
          </span>
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-white/45">
          {state
            ? `${state.observationContext.scaleLabel} · ${state.observationContext.datasetLabel ?? "dataset unavailable"} · ${state.selectedStructure?.displayName ?? "no structure selected"}`
            : "Waiting for the live Luna Brain controller."}
        </p>
      </header>

      <div className="min-h-0 flex-1 p-3">
        <AIChatBox
          messages={messages}
          onSendMessage={onSendMessage}
          height="100%"
          placeholder="Ask Luna about this brain..."
          emptyStateMessage="Use a grounded Luna Brain command."
          suggestedPrompts={SUGGESTED_PROMPTS}
        />
      </div>

      {pendingPlan && (
        <footer className="border-t border-amber-300/15 bg-amber-300/[0.035] px-4 py-3 text-[10px] leading-relaxed text-amber-100/80">
          <p>
            Pending plan: {pendingPlan.missionType} → {pendingPlan.targetStructureName}. Confirm to execute the supported Macro simulation, or cancel to discard this plan without deploying.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => onSendMessage("confirm")}
              className="rounded-md border border-amber-200/25 bg-amber-300/10 px-2 py-1 text-[10px] font-medium text-amber-50 transition hover:bg-amber-300/20"
            >
              Confirm mission
            </button>
            <button
              type="button"
              onClick={cancelPendingPlan}
              className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              Cancel plan
            </button>
          </div>
        </footer>
      )}
    </section>
  );
}
