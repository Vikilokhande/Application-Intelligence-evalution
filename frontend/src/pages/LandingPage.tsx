// Structural Idea: A side-by-side comparative decision framework pairing manual paperwork friction against automated DECC Control Room verification around a central "VS" focal point.

import {
  Activity,
  ArrowRight,
  BrainCircuit,
  Check,
  CheckCircle2,
  Database,
  FileText,
  Gauge,
  Layers,
  MapPin,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageSelector } from "../components/LanguageSelector";

interface LandingPageProps {
  onLaunchControlRoom: () => void;
}

export function LandingPage({ onLaunchControlRoom }: LandingPageProps) {
  const { t } = useTranslation();

  function scrollToHowItWorks() {
    const el = document.getElementById("how-it-works");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] text-[#0F172A] font-sans antialiased flex flex-col">
      {/* Official Government Navbar */}
      <header className="h-16 shrink-0 border-b border-[#0A2540]/20 bg-[#0A2540] px-4 lg:px-8 flex items-center justify-between z-20 text-[#FFFFFF] shadow-sm sticky top-0">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-[#C59B27]/40 bg-[#C59B27]/20 text-[#C59B27] shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="font-sans text-sm sm:text-base font-bold tracking-wide text-[#FFFFFF] flex items-center gap-2">
              <span>{t("common.app_title", "DECC REVIEW PORTAL")}</span>
              <span className="h-1.5 w-1.5 rounded-full bg-[#C59B27]" />
            </div>
            <div className="font-sans text-xs sm:text-sm text-[#94A3B8] tracking-tight">
              {t("common.app_subtitle", "Environmental Application Review & Decision Support • Government Portal")}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-6">
          <nav className="hidden md:flex items-center gap-5 text-xs font-semibold text-[#CBD5E1]">
            <button
              onClick={scrollToHowItWorks}
              className="hover:text-[#FFFFFF] transition-colors focus:outline-none"
            >
              {t("landing.how_it_works", "How It Works")}
            </button>
          </nav>

          {/* Multilingual Selector */}
          <LanguageSelector variant="dark" />

          <button
            onClick={onLaunchControlRoom}
            className="flex items-center gap-2 rounded-[6px] bg-[#C59B27] px-4 py-2 font-sans text-xs font-bold text-[#0A2540] transition-colors hover:bg-[#b0881e] focus:outline-none focus:ring-2 focus:ring-[#C59B27] shadow-xs"
          >
            <span>{t("common.launch_control_room", "Launch Control Room")}</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </header>

      {/* Main Public Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 lg:px-8 py-6 lg:py-8 space-y-8 lg:space-y-12">
        {/* Plain Language Hero Section */}
        <section className="text-center max-w-4xl mx-auto space-y-4 pt-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#C59B27]/40 bg-[#FFFBEB] px-3.5 py-1 text-xs font-semibold text-[#B45309] shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-[#D97706]" />
            <span>{t("landing.badge", "MAHARASHTRA STATE ENVIRONMENTAL CLEARANCE PORTAL")}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#0A2540] tracking-tight leading-tight">
            {t("landing.hero_title", "Transform Environmental Clearance Reviews From Months to")}{" "}
            <span className="bg-gradient-to-r from-[#0EA5E9] via-[#0284C7] to-[#0A2540] bg-clip-text text-transparent">
              {t("landing.hero_title_accent", "Minutes")}
            </span>
          </h1>

          <p className="text-sm sm:text-base text-[#475569] max-w-2xl mx-auto leading-relaxed font-sans">
            {t("landing.hero_desc", "Extract structured data from application packages, verify PAN/GSTIN/Aadhaar entities against registry databases, and complete official reviews with AI-assisted decision support.")}
          </p>

          <div className="pt-1 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onLaunchControlRoom}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-[6px] bg-[#0A2540] px-7 py-3 font-sans text-sm font-bold text-[#FFFFFF] transition-all hover:bg-[#153454] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#0A2540]"
            >
              <span>{t("common.launch_control_room", "Launch Control Room")}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </section>

        {/* Before / After Comparison Panel with Centered "VS" Circle */}
        <section className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-[#0A2540]" />
              <h2 className="font-sans text-xs font-bold tracking-wide text-[#0A2540] uppercase">
                {t("landing.process_comparison", "Process Comparison")}
              </h2>
            </div>
            <div className="font-sans text-[11px] text-[#64748B]">
              {t("landing.process_comparison_sub", "Traditional Paperwork vs. DECC Control Room Automated Verification")}
            </div>
          </div>

          {/* Side-by-Side Comparison Container */}
          <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            {/* BEFORE: Manual Document Process (5 cols) */}
            <div className="lg:col-span-5 relative rounded-[10px] border border-[#CBD5E1] bg-[#FFFFFF] p-5 flex flex-col justify-between shadow-2xs space-y-4">
              {/* Header Label */}
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#DC2626]" />
                  <span className="font-sans text-xs font-bold tracking-wide text-[#DC2626] uppercase">
                    {t("landing.traditional_title", "Manual Document Process")}
                  </span>
                </div>
                <span className="font-sans text-[10px] font-semibold text-[#DC2626] border border-[#FCA5A5] bg-[#FEF2F2] px-2 py-0.5 rounded-[4px] shrink-0">
                  {t("landing.traditional_badge", "MANUAL FRICTION")}
                </span>
              </div>

              {/* Full Image Banner with Smooth Shaded Borders */}
              <div className="relative overflow-hidden rounded-[8px] border border-[#CBD5E1] bg-[#F8FAFC] shadow-2xs group">
                <img
                  src="/assets/before_paperwork.png"
                  alt="Manual document paperwork backlog with clock"
                  className="w-full h-48 sm:h-52 object-cover object-center transition-transform duration-500 group-hover:scale-103"
                />
                <div className="absolute inset-0 shadow-[inset_0_0_16px_rgba(0,0,0,0.2)] rounded-[8px] pointer-events-none" />
                <div className="absolute inset-0 ring-1 ring-black/10 rounded-[8px] pointer-events-none" />
              </div>

              {/* Red X Checklist Items */}
              <ul className="space-y-2.5 text-xs text-[#0F172A]">
                {[
                  t("landing.traditional_item1_desc", "Manual reading of lengthy Environmental Impact Assessment reports causes severe reviewer fatigue."),
                  t("landing.traditional_item2_desc", "Manual cross-referencing across separate PAN, GSTIN, and corporate portals leads to multi-week delays."),
                  t("landing.traditional_item3_desc", "Cumbersome paper-based workflows delay critical state infrastructure and industry investments."),
                  t("landing.traditional_item4_desc", "Differing reviewer interpretations produce inconsistent rule enforcement across districts."),
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5] shrink-0 mt-0.5 font-bold text-[11px]">
                      <X size={12} strokeWidth={3} />
                    </div>
                    <span className="text-[#475569] font-medium leading-tight">{item}</span>
                  </li>
                ))}
              </ul>

              {/* Summary Strip */}
              <div className="pt-3 border-t border-[#E2E8F0]">
                <div className="bg-[#FEF2F2] border border-[#FCA5A5] text-[#DC2626] font-semibold text-xs py-2 px-3 rounded-[6px] text-center">
                  {t("landing.traditional_item3_title", "3–6 Months Clearance Cycle")} • {t("common.high_risk", "High Risk")}
                </div>
              </div>
            </div>

            {/* CENTER: VS Circle Divider (2 cols) */}
            <div className="lg:col-span-2 flex items-center justify-center py-2">
              <div className="h-10 w-10 rounded-full bg-[#0A2540] text-[#FFFFFF] font-extrabold text-xs flex items-center justify-center border-2 border-white shadow-md z-10 shrink-0">
                VS
              </div>
            </div>

            {/* AFTER: DECC Control Room Verification (5 cols) */}
            <div className="lg:col-span-5 relative rounded-[10px] border border-[#0A2540]/30 bg-[#FFFFFF] p-5 flex flex-col justify-between shadow-sm space-y-4">
              {/* Header Label */}
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#16A34A]" />
                  <span className="font-sans text-xs font-bold tracking-wide text-[#0A2540] uppercase">
                    {t("landing.automated_title", "DECC Control Room Verification")}
                  </span>
                </div>
                <span className="font-sans text-[10px] font-semibold text-[#15803D] border border-[#86EFAC] bg-[#DCFCE7] px-2 py-0.5 rounded-[4px] shrink-0">
                  {t("landing.automated_badge", "AUTOMATED EFFICIENCY")}
                </span>
              </div>

              {/* Full Image Banner with Smooth Shaded Borders */}
              <div className="relative overflow-hidden rounded-[8px] border border-[#0A2540]/30 bg-[#F8FAFC] shadow-2xs group">
                <img
                  src="/assets/after_digital.png"
                  alt="Digital DECC Control Room verification workspace"
                  className="w-full h-48 sm:h-52 object-cover object-center transition-transform duration-500 group-hover:scale-103"
                />
                <div className="absolute inset-0 shadow-[inset_0_0_16px_rgba(10,37,64,0.2)] rounded-[8px] pointer-events-none" />
                <div className="absolute inset-0 ring-1 ring-[#0A2540]/15 rounded-[8px] pointer-events-none" />
              </div>

              {/* Green Check Checklist Items */}
              <ul className="space-y-2.5 text-xs text-[#0F172A]">
                {[
                  t("landing.automated_item1_desc", "Instant OCR and schema extraction across PDFs, spreadsheets, and drawings in seconds."),
                  t("landing.automated_item2_desc", "Automated verification against official PAN, GSTIN, and MCA registry databases with full audit logs."),
                  t("landing.automated_item3_desc", "Complete policy compliance verification and automated risk summaries generated instantly."),
                  t("landing.automated_item4_desc", "Every parameter extraction, validation rule check, and decision note is logged to an immutable ledger."),
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC] shrink-0 mt-0.5 font-bold text-[11px]">
                      <Check size={12} strokeWidth={3} />
                    </div>
                    <span className="text-[#0F172A] font-semibold leading-tight">{item}</span>
                  </li>
                ))}
              </ul>

              {/* Summary Strip */}
              <div className="pt-3 border-t border-[#E2E8F0]">
                <div className="bg-[#DCFCE7] border border-[#86EFAC] text-[#15803D] font-semibold text-xs py-2 px-3 rounded-[6px] text-center">
                  {t("landing.hero_title_accent", "Minutes")} • {t("landing.stat2_label", "Audit Traceability")} • {t("common.success", "Success")}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4 Feature Cards Section */}
        <section className="space-y-3 pt-2">
          <div className="flex items-center gap-2 pb-2 border-b border-[#E2E8F0]">
            <Activity size={16} className="text-[#0A2540]" />
            <h2 className="font-sans text-xs font-bold tracking-wide text-[#0A2540] uppercase">
              {t("landing.features_title", "Platform Capabilities")}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Feature 1 */}
            <div className="rounded-[10px] border border-[#E2E8F0] bg-[#FFFFFF] p-4 flex flex-col justify-between space-y-3 shadow-2xs hover:border-[#0A2540] transition-colors group">
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-[#0A2540]/20 bg-[#0A2540]/5 text-[#0A2540] group-hover:bg-[#0A2540] group-hover:text-[#FFFFFF] transition-colors">
                  <BrainCircuit size={18} />
                </div>
                <span className="font-mono text-[10px] text-[#64748B]">PARSER</span>
              </div>
              <div>
                <h3 className="font-sans text-xs font-bold text-[#0A2540]">{t("landing.feature1_title", "Automated Policy Cross-Reference")}</h3>
                <p className="font-sans text-[11px] text-[#475569] mt-1 leading-relaxed">
                  {t("landing.feature1_desc", "Cross-check application parameters against 14 state environmental guidelines and statutory thresholds.")}
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="rounded-[10px] border border-[#E2E8F0] bg-[#FFFFFF] p-4 flex flex-col justify-between space-y-3 shadow-2xs hover:border-[#0A2540] transition-colors group">
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-[#0A2540]/20 bg-[#0A2540]/5 text-[#0A2540] group-hover:bg-[#0A2540] group-hover:text-[#FFFFFF] transition-colors">
                  <MapPin size={18} />
                </div>
                <span className="font-mono text-[10px] text-[#64748B]">ENTITY REGISTRY</span>
              </div>
              <div>
                <h3 className="font-sans text-xs font-bold text-[#0A2540]">{t("login.feat3_title", "Entity Registry Check")}</h3>
                <p className="font-sans text-[11px] text-[#475569] mt-1 leading-relaxed">
                  {t("login.feat3_desc", "Real-time verification against PAN, GSTIN, and Aadhaar databases.")}
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="rounded-[10px] border border-[#E2E8F0] bg-[#FFFFFF] p-4 flex flex-col justify-between space-y-3 shadow-2xs hover:border-[#0A2540] transition-colors group">
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-[#0A2540]/20 bg-[#0A2540]/5 text-[#0A2540] group-hover:bg-[#0A2540] group-hover:text-[#FFFFFF] transition-colors">
                  <Gauge size={18} />
                </div>
                <span className="font-mono text-[10px] text-[#64748B]">RULES ENGINE</span>
              </div>
              <div>
                <h3 className="font-sans text-xs font-bold text-[#0A2540]">{t("landing.feature3_title", "Statutory Governance & Rules")}</h3>
                <p className="font-sans text-[11px] text-[#475569] mt-1 leading-relaxed">
                  {t("landing.feature3_desc", "Dynamic rule engine allowing administrators to update environmental compliance thresholds in real time.")}
                </p>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="rounded-[10px] border border-[#E2E8F0] bg-[#FFFFFF] p-4 flex flex-col justify-between space-y-3 shadow-2xs hover:border-[#0A2540] transition-colors group">
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-[#0A2540]/20 bg-[#0A2540]/5 text-[#0A2540] group-hover:bg-[#0A2540] group-hover:text-[#FFFFFF] transition-colors">
                  <Database size={18} />
                </div>
                <span className="font-mono text-[10px] text-[#64748B]">AUDIT LEDGER</span>
              </div>
              <div>
                <h3 className="font-sans text-xs font-bold text-[#0A2540]">{t("nav.audit_trail", "Audit Trail")}</h3>
                <p className="font-sans text-[11px] text-[#475569] mt-1 leading-relaxed">
                  {t("audit.subtitle", "Tamper-evident, immutable activity ledger for statutory compliance")}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4-Step Pipeline Strip ("How It Works") */}
        <section id="how-it-works" className="space-y-3 pt-2">
          <div className="flex items-center gap-2 pb-2 border-b border-[#E2E8F0]">
            <Layers size={16} className="text-[#0A2540]" />
            <h2 className="font-sans text-xs font-bold tracking-wide text-[#0A2540] uppercase">
              {t("landing.how_it_works", "How It Works")}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Step 1 */}
            <div className="rounded-[10px] border border-[#E2E8F0] bg-[#FFFFFF] p-3.5 flex flex-col justify-between space-y-2 shadow-2xs hover:border-[#0A2540] transition-colors group">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-bold text-[#C59B27] bg-[#FFFBEB] px-2 py-0.5 rounded border border-[#FDE68A]">
                  STEP 01
                </span>
                <FileText size={16} className="text-[#64748B] group-hover:text-[#0A2540] transition-colors" />
              </div>
              <div>
                <h3 className="font-sans text-xs font-bold text-[#0A2540]">1. {t("new_app.step2_label", "Documents")}</h3>
                <p className="font-sans text-[11px] text-[#475569] mt-0.5 leading-relaxed">
                  {t("new_app.upload_sub", "Attach all statutory clearance reports, identity documents, and technical proposals.")}
                </p>
              </div>
              <div className="pt-1.5 border-t border-[#E2E8F0] font-mono text-[9px] text-[#64748B]">
                INPUT: PDF, DOCX, XLSX
              </div>
            </div>

            {/* Step 2 */}
            <div className="rounded-[10px] border border-[#E2E8F0] bg-[#FFFFFF] p-3.5 flex flex-col justify-between space-y-2 shadow-2xs hover:border-[#0A2540] transition-colors group">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-bold text-[#C59B27] bg-[#FFFBEB] px-2 py-0.5 rounded border border-[#FDE68A]">
                  STEP 02
                </span>
                <MapPin size={16} className="text-[#64748B] group-hover:text-[#0A2540] transition-colors" />
              </div>
              <div>
                <h3 className="font-sans text-xs font-bold text-[#0A2540]">2. {t("validation.title", "Validation & Verification")}</h3>
                <p className="font-sans text-[11px] text-[#475569] mt-0.5 leading-relaxed">
                  {t("validation.subtitle", "Cross-document parameter consistency, registry checks, and contradiction detection")}
                </p>
              </div>
              <div className="pt-1.5 border-t border-[#E2E8F0] font-mono text-[9px] text-[#64748B]">
                CHECKS: PAN, GSTIN, RULES
              </div>
            </div>

            {/* Step 3 */}
            <div className="rounded-[10px] border border-[#E2E8F0] bg-[#FFFFFF] p-3.5 flex flex-col justify-between space-y-2 shadow-2xs hover:border-[#0A2540] transition-colors group">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-bold text-[#C59B27] bg-[#FFFBEB] px-2 py-0.5 rounded border border-[#FDE68A]">
                  STEP 03
                </span>
                <Gauge size={16} className="text-[#64748B] group-hover:text-[#0A2540] transition-colors" />
              </div>
              <div>
                <h3 className="font-sans text-xs font-bold text-[#0A2540]">3. {t("scoring.title", "AI Assessment & Explainability")}</h3>
                <p className="font-sans text-[11px] text-[#475569] mt-0.5 leading-relaxed">
                  {t("scoring.subtitle", "Predictive risk evaluation, compliance score, and feature attribution waterfalls")}
                </p>
              </div>
              <div className="pt-1.5 border-t border-[#E2E8F0] font-mono text-[9px] text-[#64748B]">
                OUTPUT: EXPLAINABLE SCORE
              </div>
            </div>

            {/* Step 4 - Human Decision Focus */}
            <div className="rounded-[10px] border border-[#86EFAC] bg-[#F0FDF4] p-3.5 flex flex-col justify-between space-y-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-bold text-[#15803D] bg-[#DCFCE7] px-2 py-0.5 rounded border border-[#86EFAC]">
                  STEP 04
                </span>
                <CheckCircle2 size={16} className="text-[#16A34A]" />
              </div>
              <div>
                <h3 className="font-sans text-xs font-bold text-[#0A2540]">4. {t("reviewer.title", "Reviewer Decision Cockpit")}</h3>
                <p className="font-sans text-[11px] text-[#475569] mt-0.5 leading-relaxed">
                  {t("common.app_tagline_desc", "Final clearance decisions are strictly made by the authorized reviewer.")}
                </p>
              </div>
              <div className="pt-1.5 border-t border-[#86EFAC]/60 font-sans text-[10px] text-[#15803D] font-bold">
                FINAL: {t("reviewer.officer_badge", "AUTHORIZED REVIEWER")}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Official Government Footer */}
      <footer className="mt-auto border-t border-[#0A2540]/20 bg-[#0A2540] py-3.5 px-4 lg:px-8 text-[#FFFFFF]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 font-sans text-xs text-[#94A3B8]">
          <div className="flex items-center gap-2 text-[#FFFFFF]">
            <span className="h-2 w-2 rounded-full bg-[#C59B27]" />
            <span className="font-semibold">{t("common.app_subtitle", "Environmental Application Review & Decision Support • Government Platform")}</span>
          </div>
          <div className="font-mono text-[11px] text-[#94A3B8]">{t("common.app_tagline", "AI ASSISTS · HUMAN DECIDES")}</div>
        </div>
      </footer>
    </div>
  );
}

