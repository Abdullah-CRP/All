"use client";

import React from "react";
import { Sliders, ShieldCheck, Globe, Play, Loader2 } from "lucide-react";
import { Magnetic } from "./Magnetic";
import { GenerationConfig } from "../lib/api";

interface RightSidebarProps {
  config: GenerationConfig;
  onChangeConfig: (config: GenerationConfig) => void;
  onGenerate: () => void;
  isLoading: boolean;
  route: string;
  onChangeRoute: (r: any) => void;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  config,
  onChangeConfig,
  onGenerate,
  isLoading,
  route,
  onChangeRoute,
}) => {
  const updateConfig = (key: keyof GenerationConfig, val: any) => {
    onChangeConfig({ ...config, [key]: val });
  };

  const hasMasking = config.privacy_controls.some((p) => p.action === "mask");
  const hasDifferentialNoise = config.privacy_controls.some((p) => p.action === "differential_noise");
  const hasHashing = config.privacy_controls.some((p) => p.action === "hash");

  const togglePrivacy = (action: "mask" | "differential_noise" | "hash") => {
    let updated = [...config.privacy_controls];
    const exists = updated.some((p) => p.action === action);
    if (exists) {
      updated = updated.filter((p) => p.action !== action);
    } else {
      if (action === "mask") updated.push({ column: "email", action: "mask", mask_char: "*" });
      if (action === "differential_noise") updated.push({ column: "salary", action: "differential_noise", noise_epsilon: 0.3 });
      if (action === "hash") updated.push({ column: "applicant_id", action: "hash" });
    }
    updateConfig("privacy_controls", updated);
  };

  return (
    <aside className="w-80 flex-shrink-0 flex flex-col gap-4">
      {/* Top Header */}
      <div className="flex items-center justify-between px-2 pt-1">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-espresso-800" />
          <h2 className="font-serif text-base font-bold text-espresso-950">Configuration</h2>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-200 text-espresso-700 font-mono">Step 2 & 3</span>
      </div>

      {/* Main Controls Card */}
      <div className="p-5 rounded-2xl bg-base-card border border-stone-200/80 shadow-subtle backdrop-blur-glass flex flex-col gap-5">
        {/* Pipeline Route Target */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-espresso-600">
            Pipeline Route
          </label>
          <select
            value={route}
            onChange={(e) => onChangeRoute(e.target.value)}
            className="w-full bg-stone-100/80 border border-stone-300 rounded-xl px-3 py-2 text-xs font-medium text-espresso-900 focus:outline-none focus:border-espresso-800 transition-colors"
          >
            <option value="auto">Auto-Detect via RAG</option>
            <option value="relational">Relational (1:1, 1:N, N:M)</option>
            <option value="tabular">Tabular (Single Entity)</option>
            <option value="document">Document (Invoices / Ledgers)</option>
          </select>
        </div>

        {/* Row Count Slider */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-espresso-600">
              Total Row Count
            </label>
            <span className="text-xs font-mono font-bold text-espresso-900 bg-stone-200/80 px-2 py-0.5 rounded">
              {config.row_count}
            </span>
          </div>
          <input
            type="range"
            min="5"
            max="150"
            value={config.row_count}
            onChange={(e) => updateConfig("row_count", parseInt(e.target.value))}
            className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-espresso-900"
          />
        </div>

        {/* Edge-Case Injection Slider */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-espresso-600">
              Edge-Case Rate
            </label>
            <span className="text-xs font-mono font-bold text-espresso-900 bg-stone-200/80 px-2 py-0.5 rounded">
              {Math.round(config.edge_case_rate * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="30"
            value={Math.round(config.edge_case_rate * 100)}
            onChange={(e) => updateConfig("edge_case_rate", parseInt(e.target.value) / 100)}
            className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-espresso-900"
          />
          <p className="text-[10px] text-espresso-500">Injects nulls, outliers & format anomalies for robust QA</p>
        </div>

        <div className="h-px bg-stone-200 my-1" />

        {/* Privacy Controls Toggles */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-espresso-700" />
            <label className="text-[11px] font-semibold uppercase tracking-wider text-espresso-600">
              Privacy Controls
            </label>
          </div>

          <div className="space-y-2">
            {[
              { id: "mask", label: "Column-Level Masking", desc: "e****l@company.com", active: hasMasking },
              { id: "differential_noise", label: "Differential Noise (ε=0.3)", desc: "Laplacian noise on numeric fields", active: hasDifferentialNoise },
              { id: "hash", label: "SHA-256 Hashing", desc: "Salted cryptographic hex tokens", active: hasHashing },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => togglePrivacy(p.id as any)}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                  p.active
                    ? "bg-espresso-50 border-espresso-400 text-espresso-950"
                    : "bg-stone-100/50 border-stone-200 text-espresso-700 hover:bg-stone-200/40"
                }`}
              >
                <div>
                  <div className="text-xs font-medium">{p.label}</div>
                  <div className="text-[10px] text-espresso-500">{p.desc}</div>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                    p.active ? "bg-espresso-900 border-espresso-900 text-white" : "border-stone-400 bg-white"
                  }`}
                >
                  {p.active && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="h-px bg-stone-200 my-1" />

        {/* Locale Settings */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-espresso-700" />
            <label className="text-[11px] font-semibold uppercase tracking-wider text-espresso-600">
              Locale & Tax Rules
            </label>
          </div>
          <select
            value={`${config.locale_settings.currency}|${config.locale_settings.currency_symbol}|${config.locale_settings.tax_rate}`}
            onChange={(e) => {
              const [curr, sym, tax] = e.target.value.split("|");
              updateConfig("locale_settings", {
                ...config.locale_settings,
                currency: curr,
                currency_symbol: sym,
                tax_rate: parseFloat(tax),
              });
            }}
            className="w-full bg-stone-100/80 border border-stone-300 rounded-xl px-3 py-2 text-xs font-medium text-espresso-900 focus:outline-none focus:border-espresso-800 transition-colors"
          >
            <option value="USD|$|0.0825">USD ($) - US Sales Tax 8.25%</option>
            <option value="EUR|€|0.19">EUR (€) - EU Standard VAT 19.0%</option>
            <option value="GBP|£|0.20">GBP (£) - UK Standard VAT 20.0%</option>
            <option value="CAD|C$|0.13">CAD (C$) - Ontario HST 13.0%</option>
          </select>
        </div>
      </div>

      {/* Prominent Heavy Espresso Brown Action CTA */}
      <Magnetic strength={0.25} className="w-full">
        <button
          onClick={onGenerate}
          disabled={isLoading}
          className="w-full py-4 px-6 rounded-2xl bg-espresso-900 hover:bg-espresso-950 active:scale-[0.98] text-base-card font-serif text-sm font-bold tracking-wide shadow-card hover:shadow-magnetic transition-all flex items-center justify-center gap-2.5 disabled:opacity-75 disabled:pointer-events-none"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-stone-200" />
              <span>Synthesizing Data...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-stone-200 text-stone-200" />
              <span>Generate Data</span>
            </>
          )}
        </button>
      </Magnetic>
    </aside>
  );
};
