import { AIChatBox, type Message } from "@/components/AIChatBox";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { BrainCircuit, Github, Rocket, Sparkles } from "lucide-react";
import { useState } from "react";

type DirectMessage = { role: "user" | "assistant"; content: string };

const suggestedPrompts = [
  "Plan a production-ready React app for my idea.",
  "Review this coding task and propose the safest execution plan.",
  "Help me debug an error in my project.",
];

export default function Home() {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const chat = trpc.agent.chat.useMutation();
  const { data: connections } = trpc.agent.connections.useQuery(undefined, { retry: false });

  const sendMessage = (content: string) => {
    const nextMessages = [...messages, { role: "user" as const, content }];
    setMessages(nextMessages);
    chat.mutate({ messages: nextMessages }, {
      onSuccess: response => {
        setMessages(current => [...current, {
          role: "assistant",
          content: response.content || "I completed the reasoning pass but did not receive a displayable response. Please try again.",
        }]);
      },
    });
  };

  return (
    <div className="senota-page mx-auto flex w-full max-w-6xl flex-col gap-5">
      <section className="senota-hero-grid relative overflow-hidden rounded-[1.75rem] border border-cyan-300/15 bg-card/70 px-6 py-7 sm:px-8">
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300"><Sparkles className="size-4" /> SenotaAI / Direct chat</div>
            <h1 className="font-display text-3xl font-semibold tracking-[-0.045em] text-white sm:text-4xl">Talk directly to your<br /><span className="text-white/45">software agent.</span></h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Ask for architecture, code, debugging, or an execution plan. SenotaAI will keep destructive and deployment actions in confirmation mode by default.</p>
          </div>
          <Badge className="w-fit border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-cyan-100">No sign-in required</Badge>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_220px]">
        <div className="min-w-0">
          <AIChatBox
            messages={messages}
            onSendMessage={sendMessage}
            isLoading={chat.isPending}
            height="min(66vh, 680px)"
            placeholder="Ask SenotaAI to plan, code, or debug..."
            emptyStateMessage="Start a direct conversation with SenotaAI."
            suggestedPrompts={suggestedPrompts}
          />
          {chat.error ? <p className="mt-3 rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-200">{chat.error.message}</p> : null}
        </div>
        <aside className="space-y-3">
          <p className="px-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Agent readiness</p>
          <Readiness label="Reasoning brain" active={Boolean(connections?.ollamaConfigured)} icon={BrainCircuit} />
          <Readiness label="GitHub workspace" active={Boolean(connections?.githubConfigured)} icon={Github} />
          <Readiness label="Vercel deploys" active={Boolean(connections?.vercelConfigured)} icon={Rocket} />
          <p className="rounded-xl border border-white/10 bg-white/[0.025] p-4 text-xs leading-5 text-slate-500">Chat works without dashboard storage. Task history, memory, and schedules reappear automatically when the project database is available.</p>
        </aside>
      </section>
    </div>
  );
}

function Readiness({ label, active, icon: Icon }: { label: string; active: boolean; icon: typeof BrainCircuit }) {
  return <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-card/60 p-4"><div className={`grid size-9 place-items-center rounded-lg ${active ? "bg-emerald-300/10 text-emerald-300" : "bg-white/5 text-slate-500"}`}><Icon className="size-4" /></div><div><p className="text-sm font-medium text-slate-200">{label}</p><p className="mt-1 text-xs text-slate-500">{active ? "Ready" : "Unavailable"}</p></div></div>;
}
