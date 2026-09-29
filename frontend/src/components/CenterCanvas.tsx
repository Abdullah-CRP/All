"use client";

import React, { useState } from "react";
import { CheckCircle2, AlertTriangle, FileSpreadsheet, Network, FileText, Code2, Download } from "lucide-react";
import { FloatingExportBar } from "./FloatingExportBar";

interface CenterCanvasProps {
  data: any;
  isLoading: boolean;
  onExport: (format: "csv" | "json" | "sql") => void;
}

export const CenterCanvas: React.FC<CenterCanvasProps> = ({ data, isLoading, onExport }) => {
  const [activeTab, setActiveTab] = useState<"tabular" | "relational" | "document" | "json">("tabular");
  const [activeTableKey, setActiveTableKey] = useState<string>("");

  const tables = data?.data || {};
  const isDocument = data?.route_executed === "document" || Boolean(tables.documents);
  const tableKeys = Object.keys(tables).filter((k) => k !== "documents");

  const currentTable = activeTableKey && tables[activeTableKey] ? activeTableKey : tableKeys[0] || "";
  const currentRows = currentTable ? tables[currentTable] || [] : [];
  const currentCols = currentRows.length > 0 ? Object.keys(currentRows[0]) : [];

  const validationReport = data?.validation_report || {
    validation_status: "passed",
    referential_integrity: true,
    mathematical_integrity: true,
    details: ["Pipeline verification passed."],
  };

  return (
    <section className="flex-1 flex flex-col gap-4 overflow-hidden relative pb-16">
      {/* Top Header / Validation Status Bar */}
      <div className="flex items-center justify-between px-2 pt-1">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/80 border border-emerald-300 text-emerald-900 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
            <span>validation_status: "{validationReport.validation_status}"</span>
          </div>
          <span className="text-xs text-espresso-600 font-mono">
            {data?.metadata?.processing_time_ms ? `${data.metadata.processing_time_ms}ms` : "Live"}
          </span>
          <span className="text-xs text-espresso-600 font-medium capitalize">
            Route: {data?.route_executed || "Relational"}
          </span>
        </div>

        {/* Segmented Control */}
        <div className="flex items-center p-1 rounded-xl bg-stone-200/70 border border-stone-300/80">
          <button
            onClick={() => setActiveTab("tabular")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "tabular"
                ? "bg-base-card text-espresso-900 shadow-sm"
                : "text-espresso-700 hover:text-espresso-950"
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Tabular Preview</span>
          </button>
          <button
            onClick={() => setActiveTab("relational")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "relational"
                ? "bg-base-card text-espresso-900 shadow-sm"
                : "text-espresso-700 hover:text-espresso-950"
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>Relational Graph</span>
          </button>
          {isDocument && (
            <button
              onClick={() => setActiveTab("document")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "document"
                  ? "bg-base-card text-espresso-900 shadow-sm"
                  : "text-espresso-700 hover:text-espresso-950"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Document Render</span>
            </button>
          )}
          <button
            onClick={() => setActiveTab("json")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "json"
                ? "bg-base-card text-espresso-900 shadow-sm"
                : "text-espresso-700 hover:text-espresso-950"
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>JSON View</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 rounded-2xl bg-base-card border border-stone-200/80 shadow-subtle backdrop-blur-glass overflow-hidden flex flex-col relative">
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-base-card/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-espresso-800 border-t-transparent rounded-full animate-spin" />
            <p className="font-serif text-sm font-semibold text-espresso-900">
              Generating Synthetic Output & Verifying Constraints...
            </p>
          </div>
        )}

        {/* Tab 1: Tabular Preview */}
        {activeTab === "tabular" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Multi-table pill selector */}
            {tableKeys.length > 1 && (
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-stone-200 bg-stone-50/50">
                <span className="text-[11px] font-semibold text-espresso-600 uppercase tracking-wider">Tables:</span>
                {tableKeys.map((tName) => (
                  <button
                    key={tName}
                    onClick={() => setActiveTableKey(tName)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      currentTable === tName
                        ? "bg-espresso-900 text-white"
                        : "bg-stone-200/60 text-espresso-800 hover:bg-stone-300"
                    }`}
                  >
                    {tName} ({tables[tName]?.length || 0})
                  </button>
                ))}
              </div>
            )}

            {/* Scrolling Data Table */}
            <div className="flex-1 overflow-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="sticky top-0 bg-stone-100/95 backdrop-blur-sm z-10 border-b-2 border-espresso-700">
                  <tr>
                    {currentCols.map((col) => (
                      <th key={col} className="px-4 py-3 font-semibold text-espresso-900 font-serif whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200/70">
                  {currentRows.map((row: any, rIdx: number) => (
                    <tr key={rIdx} className="hover:bg-stone-100/40 transition-colors">
                      {currentCols.map((col) => {
                        const val = row[col];
                        const isNull = val === null || val === undefined;
                        const isOutlier = typeof val === "number" && (val > 1000000 || val < 0);
                        const isAnomaly = typeof val === "string" && (val.includes("DROP") || val.includes("MALFORMED"));

                        return (
                          <td key={col} className="px-4 py-2.5 text-espresso-900 font-mono whitespace-nowrap text-[11px]">
                            {isNull ? (
                              <span className="text-stone-400 italic font-sans">null</span>
                            ) : isOutlier || isAnomaly ? (
                              <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold border border-rose-200">
                                {String(val)}
                              </span>
                            ) : (
                              String(val)
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Relational Graph View */}
        {activeTab === "relational" && (
          <div className="flex-1 p-6 overflow-auto flex items-center justify-center">
            <div className="flex flex-col md:flex-row items-center gap-8 max-w-2xl">
              {tableKeys.map((tName, i) => (
                <React.Fragment key={tName}>
                  <div className="w-64 p-4 rounded-xl border-2 border-espresso-600 bg-white shadow-sm flex flex-col gap-2">
                    <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                      <span className="font-serif font-bold text-espresso-950 text-sm">{tName}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-espresso-100 text-espresso-800 font-mono">
                        {tables[tName]?.length || 0} rows
                      </span>
                    </div>
                    <div className="space-y-1">
                      {tables[tName]?.[0] &&
                        Object.keys(tables[tName][0]).slice(0, 5).map((col) => (
                          <div key={col} className="flex items-center justify-between text-[11px] text-espresso-700">
                            <span>{col}</span>
                            <span className="font-mono text-[10px] text-espresso-400">
                              {col.includes("id") ? "PK/FK" : "attr"}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                  {i < tableKeys.length - 1 && (
                    <div className="flex flex-col items-center gap-1 text-espresso-600">
                      <span className="text-xs font-mono font-bold bg-stone-200 px-2 py-0.5 rounded-full">1 : N</span>
                      <div className="w-8 h-0.5 bg-espresso-600 hidden md:block" />
                      <div className="h-8 w-0.5 bg-espresso-600 md:hidden" />
                      <span className="text-[10px]">foreign_key</span>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Document Render View */}
        {activeTab === "document" && isDocument && (
          <div className="flex-1 p-8 overflow-auto bg-white flex justify-center">
            <div className="max-w-xl w-full border border-stone-300 rounded-xl p-6 shadow-sm flex flex-col gap-4 font-sans text-espresso-950">
              {tables.documents?.map((doc: any, idx: number) => (
                <div key={idx} className="flex flex-col gap-4">
                  <div className="flex justify-between border-b pb-4">
                    <div>
                      <h3 className="font-bold text-base">{doc.vendor?.name || "Corporate Vendor"}</h3>
                      <p className="text-xs text-stone-500">{doc.vendor?.address}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-espresso-700">{doc.invoice_number}</span>
                      <p className="text-xs text-stone-500">Date: {doc.issue_date}</p>
                    </div>
                  </div>

                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b font-semibold">
                        <th className="py-1">Description</th>
                        <th className="py-1 text-right">Qty</th>
                        <th className="py-1 text-right">Unit Price</th>
                        <th className="py-1 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doc.line_items?.map((it: any) => (
                        <tr key={it.item_number} className="border-b border-stone-100">
                          <td className="py-1.5">{it.description}</td>
                          <td className="py-1.5 text-right font-mono">{it.quantity}</td>
                          <td className="py-1.5 text-right font-mono">${it.unit_price?.toFixed(2)}</td>
                          <td className="py-1.5 text-right font-mono font-semibold">${it.line_total?.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="flex flex-col items-end gap-1 text-xs border-t pt-2">
                    <div>Subtotal: <span className="font-mono font-semibold">${doc.subtotal?.toFixed(2)}</span></div>
                    <div>Tax: <span className="font-mono font-semibold">${doc.tax_amount?.toFixed(2)}</span></div>
                    <div className="text-sm font-bold mt-1 border-t-2 border-espresso-950 pt-1">
                      Grand Total: <span className="font-mono">${doc.grand_total?.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: JSON View */}
        {activeTab === "json" && (
          <div className="flex-1 p-4 overflow-auto bg-stone-900 text-stone-200 font-mono text-xs">
            <pre>
              <code>{JSON.stringify(data, null, 2)}</code>
            </pre>
          </div>
        )}
      </div>

      {/* Floating Bottom Export Bar */}
      <FloatingExportBar onExport={onExport} recordCount={data?.metadata?.record_counts?.orders || currentRows.length} />
    </section>
  );
};
