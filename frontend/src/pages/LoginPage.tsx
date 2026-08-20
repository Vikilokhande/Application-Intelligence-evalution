import { ShieldCheck, Sparkles, Lock, Mail, UserCheck, Info } from "lucide-react";

import type { FormEvent } from "react";
import { useState } from "react";

export function LoginPage({ onLoginSuccess }: { onLoginSuccess: (user: { email: string; role: string }) => void }) {
  const [email, setEmail] = useState("reviewer@directorate.gov.in");
  const [password, setPassword] = useState("••••••••••••");
  const [role, setRole] = useState("SENIOR_REVIEWER");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onLoginSuccess({ email, role });
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0F766E] text-white shadow-md">
            <ShieldCheck size={32} aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#0F172A]">
            Application Intelligence
          </h1>
          <p className="text-sm font-semibold text-[#0F766E]">
            Directorate Review Platform
          </p>
          <p className="text-xs text-[#64748B]">
            Directorate of Environment & Climate Change
          </p>
        </div>

        {/* Notice Badge: Internal Platform & Auth Status */}
        <div className="rounded-xl border border-sky-200 bg-sky-50/80 p-3 text-xs text-sky-900 flex items-start gap-2.5">
          <Sparkles size={16} className="text-sky-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Internal Enterprise Platform</span>
            Backend authentication endpoint is pending integration. Click <span className="font-semibold text-sky-900">Sign In</span> to enter the authorized reviewer workspace.
          </div>
        </div>

        {/* Login Form Card */}
        <form onSubmit={handleSubmit} className="panel space-y-5 p-6 shadow-md border-[#CBD5E1]">
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
            />
          </div>

          <div>
            <label className="field-label flex items-center gap-1.5">
              <UserCheck size={14} className="text-[#0F766E]" /> Authorized Reviewer Role
            </label>
            <select
              className="w-full"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="ADMIN">ADMINISTRATOR</option>
              <option value="SENIOR_REVIEWER">SENIOR REVIEWER</option>
              <option value="EXPERT_REVIEWER">EXPERT REVIEWER</option>
              <option value="REVIEWER">CASE REVIEWER</option>
            </select>
          </div>

          <button type="submit" className="primary-button w-full h-11 text-base font-bold">
            Sign In to Review Workspace
          </button>
        </form>

        {/* Core Principle Footer */}
        <div className="rounded-xl border border-teal-200 bg-[#F0FDF4] p-3 text-center shadow-sm">
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-[#0F766E]">
            <Sparkles size={14} /> AI ASSISTS • HUMAN DECIDES
          </div>
          <div className="mt-1 text-[11px] font-medium text-[#475569]">
            Authorized Government Review & Decision Support Engine
          </div>
        </div>
      </div>
    </div>
  );
}
