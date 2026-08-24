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

interface LandingPageProps {
  onLaunchControlRoom: () => void;
}

export function LandingPage({ onLaunchControlRoom }: LandingPageProps) {
  function scrollToHowItWorks() {
    const el = document.getElementById("how-it-works");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
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
              <span>DECC REVIEW PORTAL</span>
              <span className="h-1.5 w-1.5 rounded-full bg-[#C59B27]" />
            </div>
            <div className="font-sans text-xs sm:text-sm text-[#94A3B8] tracking-tight">
              Environmental Application Review & Decision Support • Government Portal
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <nav className="hidden md:flex items-center gap-5 text-xs font-semibold text-[#CBD5E1]">
            <button
              onClick={scrollToHowItWorks}
              className="hover:text-[#FFFFFF] transition-colors focus:outline-none"
            >
              How It Works
            </button>
          </nav>

          <button
            onClick={onLaunchControlRoom}
            className="flex items-center gap-2 rounded-[6px] bg-[#C59B27] px-4 py-2 font-sans text-xs font-bold text-[#0A2540] transition-colors hover:bg-[#b0881e] focus:outline-none focus:ring-2 focus:ring-[#C59B27] shadow-xs"
          >
            <span>Launch Control Room</span>
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
            <span>MAHARASHTRA STATE ENVIRONMENTAL CLEARANCE PORTAL</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#0A2540] tracking-tight leading-tight">
            Transform Environmental Clearance Reviews From Months to{" "}
            <span className="bg-gradient-to-r from-[#0EA5E9] via-[#0284C7] to-[#0A2540] bg-clip-text text-transparent">
              Minutes
            </span>
          </h1>

          <p className="text-sm sm:text-base text-[#475569] max-w-2xl mx-auto leading-relaxed font-sans">
            Extract structured data from application packages, verify PAN/GSTIN/Aadhaar entities against registry databases, and complete official reviews in minutes.
          </p>

          <div className="pt-1 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onLaunchControlRoom}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-[6px] bg-[#0A2540] px-7 py-3 font-sans text-sm font-bold text-[#FFFFFF] transition-all hover:bg-[#153454] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#0A2540]"
            >
              <span>Launch Control Room</span>
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
                Process Comparison
              </h2>
            </div>
            <div className="font-sans text-[11px] text-[#64748B]">
              Traditional Paperwork vs. DECC Control Room Automated Verification
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
                    MANUAL DOCUMENT PROCESS
                  </span>
                </div>
                <span className="font-sans text-[10px] font-semibold text-[#DC2626] border border-[#FCA5A5] bg-[#FEF2F2] px-2 py-0.5 rounded-[4px] shrink-0">
                  UNVERIFIED PROCESS
                </span>
              </div>

              {/* Full Image Banner with Smooth Shaded Borders */}
              <div className="relative overflow-hidden rounded-[8px] border border-[#CBD5E1] bg-[#F8FAFC] shadow-2xs group">
                <img
                  src="/assets/before_paperwork.png"
                  alt="Manual document paperwork backlog with clock"
                  className="w-full h-48 sm:h-52 object-cover object-center transition-transform duration-500 group-hover:scale-103"
                />
                {/* Smooth Soft Outer & Inner Edge Shading Overlay */}
                <div className="absolute inset-0 shadow-[inset_0_0_16px_rgba(0,0,0,0.2)] rounded-[8px] pointer-events-none" />
                <div className="absolute inset-0 ring-1 ring-black/10 rounded-[8px] pointer-events-none" />
              </div>

              {/* Red X Checklist Items */}
              <ul className="space-y-2.5 text-xs text-[#0F172A]">
                {[
                  "Manual document verification",
                  "Multiple departments & delays",
                  "Inconsistent rule application",
                  "Limited data & site verification",
                  "Long review cycles",
                  "High risk of human error",
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
                  Months of Delay • High Uncertainty • Manual Errors
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
                    DECC CONTROL ROOM VERIFICATION
                  </span>
                </div>
                <span className="font-sans text-[10px] font-semibold text-[#15803D] border border-[#86EFAC] bg-[#DCFCE7] px-2 py-0.5 rounded-[4px] shrink-0">
                  VERIFIED BY SYSTEM
                </span>
              </div>

              {/* Full Image Banner with Smooth Shaded Borders */}
              <div className="relative overflow-hidden rounded-[8px] border border-[#0A2540]/30 bg-[#F8FAFC] shadow-2xs group">
                <img
                  src="/assets/after_digital.png"
                  alt="Digital DECC Control Room verification workspace"
                  className="w-full h-48 sm:h-52 object-cover object-center transition-transform duration-500 group-hover:scale-103"
                />
                {/* Smooth Soft Outer & Inner Edge Shading Overlay */}
                <div className="absolute inset-0 shadow-[inset_0_0_16px_rgba(10,37,64,0.2)] rounded-[8px] pointer-events-none" />
                <div className="absolute inset-0 ring-1 ring-[#0A2540]/15 rounded-[8px] pointer-events-none" />
              </div>

              {/* Green Check Checklist Items */}
              <ul className="space-y-2.5 text-xs text-[#0F172A]">
                {[
                  "Automated document extraction & verification",
                  "Single-window workflow with real-time tracking",
                  "100% consistent state environmental rule checks",
                  "Entity & Registry verification (PAN, GSTIN, Aadhaar, Land Registry)",
                  "Under 3-minute average review cycles",
                  "Forensic accuracy with complete audit logging",
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
                  Minutes • Accuracy • Transparency • Trust
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
              Platform Core Capabilities
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
                <h3 className="font-sans text-xs font-bold text-[#0A2540]">AI-Powered Verification</h3>
                <p className="font-sans text-[11px] text-[#475569] mt-1 leading-relaxed">
                  Extract structured data from complex 450+ page EIA reports with clause-level citations.
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
                <h3 className="font-sans text-xs font-bold text-[#0A2540]">Registry Integration</h3>
                <p className="font-sans text-[11px] text-[#475569] mt-1 leading-relaxed">
                  Cross-reference applicant details against PAN, GSTIN, Aadhaar, and land registry records.
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
                <h3 className="font-sans text-xs font-bold text-[#0A2540]">Rule Automation</h3>
                <p className="font-sans text-[11px] text-[#475569] mt-1 leading-relaxed">
                  Evaluate 14/14 state environmental compliance rules automatically with instant pass/fail validation.
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
                <h3 className="font-sans text-xs font-bold text-[#0A2540]">Audit & Traceability</h3>
                <p className="font-sans text-[11px] text-[#475569] mt-1 leading-relaxed">
                  Complete timestamped audit trail recording every system extraction, rule evaluation, and human reviewer decision.
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
              How It Works
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
                <h3 className="font-sans text-xs font-bold text-[#0A2540]">1. Upload Documents & Maps</h3>
                <p className="font-sans text-[11px] text-[#475569] mt-0.5 leading-relaxed">
                  Import PDF environmental reports, site maps, and certificates automatically into the system.
                </p>
              </div>
              <div className="pt-1.5 border-t border-[#E2E8F0] font-mono text-[9px] text-[#64748B]">
                INPUT: PDF & SITE MAPS
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
                <h3 className="font-sans text-xs font-bold text-[#0A2540]">2. Verify Entities & Rules</h3>
                <p className="font-sans text-[11px] text-[#475569] mt-0.5 leading-relaxed">
                  Cross-reference applicant data against official registries and scheme rulebooks.
                </p>
              </div>
              <div className="pt-1.5 border-t border-[#E2E8F0] font-mono text-[9px] text-[#64748B]">
                CHECKS: REGISTRY & RULES
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
                <h3 className="font-sans text-xs font-bold text-[#0A2540]">3. Calculate Compliance Rating</h3>
                <p className="font-sans text-[11px] text-[#475569] mt-0.5 leading-relaxed">
                  Generate an instant risk score with direct links back to specific document clauses.
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
                <h3 className="font-sans text-xs font-bold text-[#0A2540]">4. Officer Makes the Final Call</h3>
                <p className="font-sans text-[11px] text-[#475569] mt-0.5 leading-relaxed">
                  A person always reviews and decides — the AI only assists, never approves or rejects automatically.
                </p>
              </div>
              <div className="pt-1.5 border-t border-[#86EFAC]/60 font-sans text-[10px] text-[#15803D] font-bold">
                FINAL: HUMAN OFFICER DECISION
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
            <span className="font-semibold">Environmental Application Review & Decision Support • Government Platform</span>
          </div>
          <div className="font-mono text-[11px] text-[#94A3B8]">AI ASSISTS • HUMAN DECIDES</div>
        </div>
      </footer>
    </div>
  );
}
