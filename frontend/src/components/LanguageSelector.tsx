import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Globe, Check, ChevronDown } from "lucide-react";

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  enabled: boolean;
}

export const LANGUAGES: LanguageOption[] = [
  { code: "en", name: "English", nativeName: "English", enabled: true },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", enabled: true },
  { code: "mr", name: "Marathi", nativeName: "मराठी", enabled: false },
  { code: "bn", name: "Bengali", nativeName: "বাংলা", enabled: false },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்", enabled: false },
  { code: "te", name: "Telugu", nativeName: "తెలుగు", enabled: false },
  { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી", enabled: false },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ", enabled: false },
];

export function LanguageSelector({
  variant = "dark",
  className = "",
}: {
  variant?: "dark" | "light";
  className?: string;
}) {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLangCode = i18n.language?.split("-")[0] || "en";
  const activeLang = LANGUAGES.find((l) => l.code === currentLangCode) || LANGUAGES[0];

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSelectLanguage = (lang: LanguageOption) => {
    if (!lang.enabled) return;
    i18n.changeLanguage(lang.code);
    try {
      localStorage.setItem("i18nextLng", lang.code);
    } catch {
      // ignore storage errors
    }
    setIsOpen(false);
  };

  const isDark = variant === "dark";

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={t("common.select_language", "Select Language")}
        className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all focus:outline-none focus:ring-2 ${
          isDark
            ? "border border-slate-700 bg-white/10 text-[#CBD5E1] hover:bg-white/15 hover:text-white focus:ring-[#C59B27]"
            : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-[#0A2540] shadow-2xs focus:ring-[#0A2540]"
        }`}
      >
        <Globe
          size={14}
          className={isDark ? "text-[#C59B27]" : "text-[#0A2540]"}
          aria-hidden="true"
        />
        <span className="truncate max-w-[90px] sm:max-w-none">
          {activeLang.nativeName}
        </span>
        <ChevronDown
          size={12}
          className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""} ${
            isDark ? "text-slate-400" : "text-slate-500"
          }`}
          aria-hidden="true"
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 mt-1.5 w-64 origin-top-right rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl ring-1 ring-black/5 z-50 animate-fade-in font-sans text-slate-800"
        >
          {/* Header */}
          <div className="px-3 py-2 border-b border-slate-100 mb-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {t("common.select_language", "Select Language")}
            </p>
          </div>

          <div className="max-h-72 overflow-y-auto space-y-0.5 pr-0.5">
            {LANGUAGES.map((lang) => {
              const isSelected = lang.code === currentLangCode;

              if (lang.enabled) {
                return (
                  <button
                    key={lang.code}
                    role="menuitem"
                    onClick={() => handleSelectLanguage(lang)}
                    className={`group flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-colors text-left ${
                      isSelected
                        ? "bg-[#0A2540] text-white"
                        : "text-slate-700 hover:bg-slate-100 hover:text-[#0A2540]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{lang.nativeName}</span>
                      <span
                        className={`text-[11px] ${
                          isSelected ? "text-slate-300" : "text-slate-400"
                        }`}
                      >
                        ({lang.name})
                      </span>
                    </div>
                    {isSelected && (
                      <Check size={14} className="text-[#C59B27] shrink-0" aria-hidden="true" />
                    )}
                  </button>
                );
              }

              // Disabled / Coming Soon languages
              return (
                <div
                  key={lang.code}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs text-slate-400 opacity-60 cursor-not-allowed select-none"
                  title={`${lang.name} (${t("common.coming_soon", "Coming Soon")})`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-400">{lang.nativeName}</span>
                    <span className="text-[11px] text-slate-400">({lang.name})</span>
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md border border-slate-200 shrink-0">
                    {t("common.coming_soon", "Coming Soon")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
