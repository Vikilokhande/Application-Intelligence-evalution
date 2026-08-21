import type { FormEvent } from "react";
import { useState } from "react";
import { CheckCircle2, Info, Lock, Mail, ShieldCheck, Sparkles, UserCheck } from "lucide-react";

import { api } from "../services/api";

export function LoginPage({ onLoginSuccess }: { onLoginSuccess: (user: { email: string; role: string }) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("senior_reviewer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const token = await api.getToken(email, role);
      onLoginSuccess({ email: token.user_id, role: token.role });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex h-screen max-h-screen w-screen items-center justify-center overflow-hidden bg-[#F8FAFC] p-3 text-[#0F172A]">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-32 right-0 h-[500px] w-[500px] rounded-full bg-[#0D9488]/[0.12] blur-3xl" />
        <div className="absolute top-1/2 -left-32 h-[450px] w-[450px] rounded-full bg-[#0284C7]/[0.10] blur-3xl" />
        <div className="absolute -bottom-32 right-1/4 h-[400px] w-[400px] rounded-full bg-[#10B981]/[0.08] blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm space-y-4">
        <div className="space-y-1 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#0F766E] text-white shadow-md">
            <ShieldCheck size={26} aria-hidden="true" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-[#0F172A]">Application Intelligence</h1>
          <p className="text-xs font-bold text-[#0F766E]">Directorate Review Platform</p>
          <p className="text-[10px] text-[#64748B]">Directorate of Environment & Climate Change</p>
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-sky-200 bg-white/90 p-2.5 text-[11px] text-sky-900 shadow-sm backdrop-blur-md">
          <Info size={14} className="mt-0.5 shrink-0 text-sky-700" />
          <div>
            <span className="block font-bold">Authorized Gateway Access</span>
            Internal reviewer access for decision support and audit review.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="panel space-y-3 rounded-xl border-[#CBD5E1] bg-white p-4 shadow-lg">
          <div>
            <label className="field-label mb-1 flex items-center gap-1 text-[11px]">
              <Mail size={13} className="text-[#0F766E]" /> Work Email Address
            </label>
            <input
              type="email"
              required
              className="w-full px-2.5 py-1.5 text-xs font-semibold"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="reviewer@directorate.gov.in"
            />
          </div>

          <div>
            <label className="field-label mb-1 flex items-center gap-1 text-[11px]">
              <Lock size={13} className="text-[#0F766E]" /> Authorized Password
            </label>
            <input
              type="password"
              required
              className="w-full px-2.5 py-1.5 text-xs font-semibold"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Development password"
            />
          </div>

          <div>
            <label className="field-label mb-1 flex items-center gap-1 text-[11px]">
              <UserCheck size={13} className="text-[#0F766E]" /> Reviewer Designation
            </label>
            <select className="w-full px-2.5 py-1.5 text-xs font-bold" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="admin">ADMINISTRATOR</option>
              <option value="senior_reviewer">SENIOR REVIEWER</option>
              <option value="expert_reviewer">EXPERT REVIEWER</option>
              <option value="normal_reviewer">CASE REVIEWER</option>
            </select>
          </div>

          {error && <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">{error}</div>}

          <button type="submit" disabled={loading} className="primary-button h-9 w-full text-xs font-bold shadow-sm disabled:opacity-60">
            <CheckCircle2 size={15} /> {loading ? "Signing In..." : "Sign In to Review Workspace"}
          </button>
        </form>

        <div className="rounded-lg border border-teal-200 bg-[#F0FDF4] p-2 text-center shadow-sm">
          <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-[#0F766E]">
            <Sparkles size={12} /> AI ASSISTS - HUMAN DECIDES
          </div>
          <div className="mt-0.5 text-[9px] font-medium text-[#475569]">Authorized Decision Support Engine</div>
        </div>
      </div>
    </div>
  );
}
