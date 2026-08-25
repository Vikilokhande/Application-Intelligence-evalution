import type { FormEvent } from "react";
import { useState } from "react";
import { CheckCircle2, Lock, Mail, ShieldCheck, UserCheck, Sparkles, Activity, Database, ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "../services/api";
import { LanguageSelector } from "../components/LanguageSelector";

export function LoginPage({ onLoginSuccess, onBack }: { onLoginSuccess: (user: { email: string; role: string }) => void; onBack?: () => void; }) {
  const { t } = useTranslation();
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
      setError(err instanceof Error ? err.message : t("common.error", "Sign in failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F8FAFC] text-[#0F172A] font-sans">
      {/* LEFT PANEL - Branding & Context (Navy) */}
      <div className="hidden lg:flex lg:w-[40%] flex-col justify-between bg-[#0A2540] p-10 text-[#FFFFFF] relative overflow-hidden">
        {/* Subtle Background Accent */}
        <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
          <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0,0 L100,100 M20,0 L100,80 M40,0 L100,60" stroke="#FFFFFF" strokeWidth="0.5" fill="none" />
          </svg>
        </div>

        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[8px] border border-[#C59B27]/40 bg-[#C59B27]/20 text-[#C59B27]">
              <ShieldCheck size={28} />
            </div>
            <div>
              <h1 className="font-sans text-lg font-bold tracking-wide text-[#FFFFFF] uppercase">
                {t("login.brand_title", "DECC REVIEW PORTAL")}
              </h1>
              <p className="text-xs text-[#94A3B8]">{t("login.brand_subtitle", "Environmental Application Review & Decision Support")}</p>
            </div>
          </div>

          <div className="space-y-4 pt-10">
            <h2 className="text-3xl font-extrabold leading-tight text-[#FFFFFF]">
              {t("login.headline", "Official Control Room Access")}
            </h2>
            <p className="text-[#CBD5E1] text-sm leading-relaxed max-w-sm">
              {t("login.subheadline", "Secure access for authorized environmental reviewers and officers.")}
            </p>

            {/* Feature Highlights */}
            <div className="pt-8 space-y-6">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#16A34A]/20 text-[#4ADE80] border border-[#16A34A]/30 shrink-0">
                  <CheckCircle2 size={16} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-[#FFFFFF]">{t("login.feat1_title", "Automated Extraction")}</h3>
                  <p className="text-xs text-[#94A3B8] mt-1 leading-relaxed">{t("login.feat1_desc", "Instant AI parsing of complex 400+ page EIA documents.")}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0284C7]/20 text-[#38BDF8] border border-[#0284C7]/30 shrink-0">
                  <Activity size={16} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-[#FFFFFF]">{t("login.feat2_title", "Instant Rule Validation")}</h3>
                  <p className="text-xs text-[#94A3B8] mt-1 leading-relaxed">{t("login.feat2_desc", "Cross-check against 14 state environmental guidelines automatically.")}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#8B5CF6]/20 text-[#A78BFA] border border-[#8B5CF6]/30 shrink-0">
                  <Database size={16} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-[#FFFFFF]">{t("login.feat3_title", "Entity Registry Check")}</h3>
                  <p className="text-xs text-[#94A3B8] mt-1 leading-relaxed">{t("login.feat3_desc", "Real-time verification against PAN, GSTIN, and Aadhaar databases.")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex flex-col gap-4">
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-[#C59B27]/30 bg-[#C59B27]/10 px-3.5 py-1.5 text-xs font-bold text-[#C59B27]">
            <Sparkles size={14} />
            <span>{t("common.app_tagline", "AI ASSISTS - HUMAN DECIDES")}</span>
          </div>
          <p className="text-[10px] text-[#64748B] uppercase tracking-wider font-mono">
            {t("login.network_badge", "SECURE GOVERNMENT NETWORK V2.4")}
          </p>
        </div>
      </div>

      {/* RIGHT PANEL - Login Form (White) */}
      <div className="flex flex-1 items-center justify-center bg-[#F8FAFC] p-6 shadow-[inset_1px_0_0_rgba(0,0,0,0.05)] relative">
        {/* Top bar with Back button and LanguageSelector */}
        <div className="absolute top-6 left-6 right-6 lg:left-10 lg:right-10 flex items-center justify-between">
          {onBack ? (
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-sm font-semibold text-[#64748B] hover:text-[#0A2540] transition-colors focus:outline-none"
              aria-label={t("common.back", "Back")}
            >
              <ArrowLeft size={16} />
              <span>{t("common.back", "Back")}</span>
            </button>
          ) : <div />}
          <LanguageSelector variant="light" />
        </div>

        <div className="w-full max-w-md space-y-8 rounded-[12px] border border-[#E2E8F0] bg-[#FFFFFF] p-8 shadow-sm">
          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-2xl font-bold text-[#0A2540]">{t("login.form_title", "Officer Authentication")}</h2>
            <p className="text-sm text-[#475569]">{t("login.form_subtitle", "Enter your official credentials to access the review workspace.")}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              {/* Email Input */}
              <label className="block">
                <span className="mb-1.5 flex items-center gap-1.5 font-sans text-xs font-bold text-[#475569] uppercase tracking-wider">
                  <Mail size={14} className="text-[#0A2540]" />
                  {t("login.email_label", "Official Email Address")}
                </span>
                <input
                  type="email"
                  required
                  className="w-full rounded-[6px] border border-[#CBD5E1] !bg-white px-3.5 py-2.5 font-sans text-sm !text-slate-900 placeholder-[#94A3B8] transition-colors focus:border-[#0A2540] focus:outline-none focus:ring-1 focus:ring-[#0A2540]"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("login.email_placeholder", "officer@decc.maharashtra.gov.in")}
                />
              </label>

              {/* Password Input */}
              <label className="block">
                <span className="mb-1.5 flex items-center gap-1.5 font-sans text-xs font-bold text-[#475569] uppercase tracking-wider">
                  <Lock size={14} className="text-[#0A2540]" />
                  {t("login.password_label", "Password / Security Key")}
                </span>
                <input
                  type="password"
                  required
                  className="w-full rounded-[6px] border border-[#CBD5E1] !bg-white px-3.5 py-2.5 font-sans text-sm !text-slate-900 placeholder-[#94A3B8] transition-colors focus:border-[#0A2540] focus:outline-none focus:ring-1 focus:ring-[#0A2540]"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("login.password_placeholder", "••••••••••••")}
                />
              </label>

              {/* Role Select */}
              <label className="block">
                <span className="mb-1.5 flex items-center gap-1.5 font-sans text-xs font-bold text-[#475569] uppercase tracking-wider">
                  <UserCheck size={14} className="text-[#0A2540]" />
                  {t("login.role_label", "Designated Role")}
                </span>
                <select
                  className="w-full rounded-[6px] border border-[#CBD5E1] !bg-white px-3.5 py-2.5 font-sans text-sm font-semibold !text-slate-900 transition-colors focus:border-[#0A2540] focus:outline-none focus:ring-1 focus:ring-[#0A2540]"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="senior_reviewer" className="bg-white text-[#0F172A]">
                    {t("login.role_senior", "Senior Environmental Reviewer")}
                  </option>
                  <option value="technical_officer" className="bg-white text-[#0F172A]">
                    {t("login.role_technical", "Technical Verification Officer")}
                  </option>
                </select>
              </label>
            </div>

            {error && (
              <div className="rounded-[6px] border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3 text-sm font-medium text-[#DC2626]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-[6px] bg-[#0A2540] px-4 py-3 font-sans text-sm font-bold text-[#FFFFFF] transition-colors hover:bg-[#153454] focus:outline-none focus:ring-2 focus:ring-[#0A2540] focus:ring-offset-2 disabled:opacity-70"
            >
              <CheckCircle2 size={16} />
              <span>{loading ? t("login.authenticating", "Verifying Credentials...") : t("login.sign_in_btn", "Sign In to Control Room")}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

