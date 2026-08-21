import type { FormEvent } from "react";
import { useState } from "react";
import { Info, Lock, Mail, ShieldCheck, Sparkles, UserCheck } from "lucide-react";

import { api } from "../services/api";

export function LoginPage({ onLoginSuccess }: { onLoginSuccess: (user: { user_id: string; role: string }) => void }) {
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
      onLoginSuccess({ user_id: token.user_id, role: token.role });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0F766E] text-white shadow-md">
            <ShieldCheck size={32} aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#0F172A]">
            Application Intelligence
          </h1>
          <p className="text-sm font-semibold text-[#0F766E]">Directorate Review Platform</p>
          <p className="text-xs text-[#64748B]">Directorate of Environment & Climate Change</p>
        </div>

        <div className="flex items-start gap-2.5 rounded-xl border border-sky-200 bg-sky-50/80 p-3 text-xs text-sky-900">
          <Info size={16} className="mt-0.5 shrink-0 text-sky-700" />
          <div>
            <span className="block font-bold">Internal Enterprise Platform</span>
            Sign-in requests a backend-issued development JWT. Production deployments should connect the same interface to the identity provider.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="panel space-y-5 border-[#CBD5E1] p-6 shadow-md">
          <div>
            <label className="field-label flex items-center gap-1.5">
              <Mail size={14} className="text-[#0F766E]" /> Work Email
            </label>
            <input
              type="email"
              required
              className="w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="reviewer@directorate.gov.in"
            />
          </div>

          <div>
            <label className="field-label flex items-center gap-1.5">
              <Lock size={14} className="text-[#0F766E]" /> Password
            </label>
            <input
              type="password"
              required
              className="w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Development password"
            />
          </div>

          <div>
            <label className="field-label flex items-center gap-1.5">
              <UserCheck size={14} className="text-[#0F766E]" /> Authorized Reviewer Role
            </label>
            <select className="w-full" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="admin">ADMINISTRATOR</option>
              <option value="senior_reviewer">SENIOR REVIEWER</option>
              <option value="expert_reviewer">EXPERT REVIEWER</option>
              <option value="normal_reviewer">CASE REVIEWER</option>
            </select>
          </div>

          {error && <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">{error}</div>}

          <button type="submit" disabled={loading} className="primary-button h-11 w-full text-base font-bold disabled:opacity-60">
            {loading ? "Signing In..." : "Sign In to Review Workspace"}
          </button>
        </form>

        <div className="rounded-xl border border-teal-200 bg-[#F0FDF4] p-3 text-center shadow-sm">
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-[#0F766E]">
            <Sparkles size={14} /> AI ASSISTS - HUMAN DECIDES
          </div>
          <div className="mt-1 text-[11px] font-medium text-[#475569]">
            Authorized Government Review & Decision Support Engine
          </div>
        </div>
      </div>
    </div>
  );
}
