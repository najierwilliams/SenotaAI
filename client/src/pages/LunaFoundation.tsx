import { trpc } from "@/lib/trpc";
import { Save, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

const fieldClass = "mt-2 h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none transition focus:border-cyan-300/50";
const areaClass = "mt-2 min-h-28 w-full resize-y rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm leading-6 text-white outline-none transition focus:border-cyan-300/50";

export default function LunaFoundation() {
  const utils = trpc.useUtils();
  const { data: selfState, isLoading } = trpc.knowledge.cognitive.foundation.get.useQuery();
  const { data: connections } = trpc.agent.connections.useQuery();
  const update = trpc.knowledge.cognitive.foundation.update.useMutation({
    onSuccess: (result) => {
      setForm(result.self.foundation);
      void Promise.all([
        utils.knowledge.cognitive.foundation.get.invalidate(),
        utils.knowledge.cognitive.home.invalidate(),
        utils.knowledge.cognitive.snapshot.invalidate(),
      ]);
    },
  });
  const [form, setForm] = useState({ name: "Luna", startingAge: 0, currentAge: 0, nativeLanguage: "English", personalityFoundation: "", personalityKnowledge: "", appearanceReference: "" });
  useEffect(() => {
    if (!selfState) return;
    setForm(selfState.foundation);
  }, [selfState]);
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm(current => ({ ...current, [key]: value }));
  const save = () => update.mutate(form);

  return <div className="senota-page mx-auto flex w-full max-w-6xl flex-col gap-6">
    <section className="senota-hero-grid relative overflow-hidden rounded-[1.75rem] border border-cyan-300/15 bg-card/70 px-6 py-7 sm:px-8">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300"><Sparkles className="size-4" /> Luna / Foundation</div><h1 className="font-display text-3xl font-semibold tracking-[-0.045em] text-white sm:text-4xl">The beginning of Luna.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Set the creator-controlled starting point. Luna develops her personality and understanding from this foundation; these fields are not a permanently fixed personality definition.</p></div><div className="flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-semibold text-emerald-200"><ShieldCheck className="size-3.5" /> Creator controlled</div></div>
    </section>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <section className="space-y-6 rounded-[1.5rem] border border-white/10 bg-card/70 p-5 sm:p-7">
        <div><h2 className="text-lg font-semibold text-white">Identity</h2><p className="mt-1 text-sm text-slate-500">Persistent starting information for Luna.</p></div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Name<input value={form.name} onChange={e => set("name", e.target.value)} className={fieldClass} disabled={isLoading} /></label><label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Starting age<input type="number" min={0} max={150} value={form.startingAge} onChange={e => set("startingAge", Number(e.target.value))} className={fieldClass} disabled={isLoading} /></label><label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Current age<input type="number" min={0} max={150} value={form.currentAge} onChange={e => set("currentAge", Number(e.target.value))} className={fieldClass} disabled={isLoading} /></label><label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Native language<input value={form.nativeLanguage} onChange={e => set("nativeLanguage", e.target.value)} className={fieldClass} disabled={isLoading} /></label></div>
        <div><h2 className="text-lg font-semibold text-white">Personality foundation</h2><p className="mt-1 text-sm text-slate-500">Creator-provided starting principles that Luna can reflect on and develop from.</p><textarea value={form.personalityFoundation} onChange={e => set("personalityFoundation", e.target.value)} className={areaClass} disabled={isLoading} /></div>
        <div><h2 className="text-lg font-semibold text-white">Personality knowledge</h2><p className="mt-1 text-sm text-slate-500">Initial context and knowledge the cognitive core may use as a starting point.</p><textarea value={form.personalityKnowledge} onChange={e => set("personalityKnowledge", e.target.value)} className={areaClass} disabled={isLoading} /></div>
        <div><h2 className="text-lg font-semibold text-white">Future appearance reference</h2><p className="mt-1 text-sm text-slate-500">A protected creator reference for future embodiment. Body and clothing systems are not part of this milestone.</p><textarea value={form.appearanceReference} onChange={e => set("appearanceReference", e.target.value)} className={areaClass} disabled={isLoading} /></div>
        <div className="flex items-center justify-between gap-3"><div><p className="text-xs text-slate-500">Changes are saved to the authenticated Knowledge Space owner’s Luna cognitive state.</p>{update.isSuccess ? <p className="mt-1 text-xs text-emerald-200">Saved and refreshed from the authoritative Luna state.</p> : null}</div><button onClick={save} disabled={isLoading || update.isPending} className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-50"><Save className="size-4" /> {update.isPending ? "Saving…" : "Save foundation"}</button></div>{update.error ? <p className="text-sm text-rose-300">{update.error.message}</p> : null}
      </section>
      <aside className="space-y-4"><section className="rounded-[1.5rem] border border-white/10 bg-card/70 p-5"><h2 className="text-sm font-semibold text-white">Luna state</h2><div className="mt-4 space-y-3 text-sm"><div className="flex justify-between gap-3"><span className="text-slate-500">Current age</span><span className="font-medium text-cyan-100">{selfState?.foundation.currentAge ?? "—"}</span></div><div className="flex justify-between gap-3"><span className="text-slate-500">Development</span><span className="font-medium text-emerald-200">Evolving from foundation</span></div><div className="flex justify-between gap-3"><span className="text-slate-500">Safety authority</span><span className="font-medium text-emerald-200">Independent</span></div><div className="flex justify-between gap-3"><span className="text-slate-500">Reasoning brain</span><span className={connections?.ollamaConfigured ? "font-medium text-emerald-200" : "font-medium text-slate-500"}>{connections?.ollamaConfigured ? "Available" : "Not configured"}</span></div></div></section><section className="rounded-[1.5rem] border border-amber-300/15 bg-amber-300/[0.04] p-5"><h2 className="text-sm font-semibold text-amber-100">Boundary</h2><p className="mt-2 text-xs leading-5 text-slate-400">The independent failsafe is outside Luna’s trust boundary. This dashboard shows status only; Luna cannot read, edit, disable, or rewrite it.</p></section></aside>
    </div>
  </div>;
}
