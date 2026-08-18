import { trpc } from "@/lib/trpc";
import { KeyRound, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export function PasswordGate() {
  const utils = trpc.useUtils();
  const status = trpc.auth.status.useQuery(undefined, { retry: false });
  const setup = trpc.auth.setup.useMutation();
  const login = trpc.auth.login.useMutation();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");

  const configured = Boolean(status.data?.configured);
  const busy = status.isLoading || setup.isPending || login.isPending;

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      if (!configured) {
        await setup.mutateAsync({ password, confirmPassword: confirmation });
        setPassword("");
        setConfirmation("");
        await utils.auth.status.invalidate();
        toast.success("Password created. Sign in to unlock SenotaAI.");
      } else {
        await login.mutateAsync({ password });
        setPassword("");
        await utils.auth.me.invalidate();
        toast.success("SenotaAI unlocked.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to complete password verification.");
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-[#050912] p-5 text-slate-100">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-cyan-200/10 bg-slate-950/80 p-7 shadow-[0_30px_90px_rgba(0,0,0,.45)] sm:p-9">
        <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(84,234,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(84,234,255,.08)_1px,transparent_1px)] [background-size:28px_28px]" />
        <div className="relative">
          <div className="mb-7 flex size-12 items-center justify-center rounded-2xl bg-cyan-300 text-slate-950 shadow-[0_0_30px_rgba(65,232,255,.22)]">
            {configured ? <KeyRound className="size-6" /> : <ShieldCheck className="size-6" />}
          </div>
          <p className="text-xs font-semibold uppercase tracking-[.22em] text-cyan-200">SenotaAI · private access</p>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">{configured ? "Enter your password" : "This page is password protected"}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">{configured ? "Enter the owner password to unlock your autonomous agent console." : "Create the one owner password for this SenotaAI workspace. It is stored as a secure hash and is never shown again."}</p>

          <form className="mt-7 space-y-5" onSubmit={submit}>
            <div className="space-y-2">
              <Label htmlFor="senota-password">Password</Label>
              <Input id="senota-password" autoComplete={configured ? "current-password" : "new-password"} type="password" value={password} onChange={event => setPassword(event.target.value)} minLength={12} required placeholder={configured ? "Enter your password" : "At least 12 characters"} />
            </div>
            {!configured ? <div className="space-y-2"><Label htmlFor="senota-confirm-password">Confirm password</Label><Input id="senota-confirm-password" autoComplete="new-password" type="password" value={confirmation} onChange={event => setConfirmation(event.target.value)} minLength={12} required placeholder="Repeat your password" /></div> : null}
            <Button className="w-full bg-cyan-300 text-slate-950 hover:bg-cyan-200" size="lg" disabled={busy}>{busy ? "Verifying access…" : configured ? "Sign in" : "Create password"}</Button>
          </form>
          {!configured ? <p className="mt-5 text-xs leading-5 text-slate-500">Use letters and numbers. After creation, this page will switch to the sign-in screen.</p> : null}
        </div>
      </div>
    </div>
  );
}
