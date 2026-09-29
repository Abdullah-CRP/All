"use client";

import React, { useState } from "react";
import { UploadCloud, Database, Table, Key, FileText, ChevronDown, ChevronRight, Layers } from "lucide-react";

interface LeftSidebarProps {
  schemas: any[];
  onUploadSchema: (content: string) => void;
  selectedTemplate: string;
  onSelectTemplate: (tmpl: string) => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  schemas,
  onUploadSchema,
  selectedTemplate,
  onSelectTemplate,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({
    customers: true,
    orders: true,
  });

  const toggleTable = (tableName: string) => {
    setExpandedTables((prev) => ({ ...prev, [tableName]: !prev[tableName] }));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onUploadSchema(event.target.result as string);
        }
      };
      reader.readAsText(files[0]);
    }
  };

  return (
    <aside className="w-80 flex-shrink-0 flex flex-col gap-4">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-2 pt-1">
        <div className="w-9 h-9 rounded-xl bg-espresso-900 flex items-center justify-center text-base-card shadow-card">
          <Database className="w-5 h-5 text-stone-200" />
        </div>
        <div>
          <h1 className="font-serif text-lg font-bold tracking-tight text-espresso-950 flex items-center gap-1.5">
            HackData<span className="text-xs px-1.5 py-0.5 rounded-md bg-espresso-100 text-espresso-800 font-mono">V2</span>
          </h1>
          <p className="text-[11px] text-espresso-600 font-sans tracking-wide">Synthetic Data Platform</p>
        </div>
      </div>

      {/* Preset Scenarios */}
      <div className="p-4 rounded-2xl bg-base-card border border-stone-200/80 shadow-subtle backdrop-blur-glass">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4 text-espresso-700" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-espresso-800">Scenarios</h2>
        </div>
        <div className="flex flex-col gap-1.5">
          {[
            { id: "relational_ecommerce", label: "Relational E-Commerce (1:N)" },
            { id: "document_invoice", label: "Corporate Invoices (Reconciled)" },
            { id: "document_statement", label: "Bank Statement (Ledger)" },
            { id: "tabular_fintech", label: "FinTech Risk (Privacy Protected)" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => onSelectTemplate(item.id)}
              className={`text-left px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                selectedTemplate === item.id
                  ? "bg-espresso-900 text-base-card shadow-sm"
                  : "text-espresso-700 hover:bg-stone-200/60"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`p-5 rounded-2xl border-2 border-dashed transition-all text-center flex flex-col items-center justify-center gap-2 bg-base-card/60 backdrop-blur-glass ${
          isDragOver
            ? "border-espresso-800 bg-espresso-50/50 scale-[1.01]"
            : "border-stone-300 hover:border-espresso-500"
        }`}
      >
        <div className="w-10 h-10 rounded-full bg-stone-200/70 flex items-center justify-center text-espresso-800">
          <UploadCloud className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs font-semibold text-espresso-900">Drag & Drop Schema or CSV</p>
          <p className="text-[11px] text-espresso-500 mt-0.5">JSON schema, sample dataset, or business rules</p>
        </div>
        <label className="cursor-pointer mt-1 px-3 py-1 rounded-lg bg-stone-200/80 hover:bg-stone-300 text-espresso-800 text-[11px] font-medium transition-colors">
          Browse File
          <input
            type="file"
            accept=".json,.csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (evt) => {
                  if (evt.target?.result) onUploadSchema(evt.target.result as string);
                };
                reader.readAsText(file);
              }
            }}
          />
        </label>
      </div>

      {/* Inferred Schema Tree View */}
      <div className="flex-1 p-4 rounded-2xl bg-base-card border border-stone-200/80 shadow-subtle backdrop-blur-glass overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-stone-200">
          <div className="flex items-center gap-2">
            <Table className="w-4 h-4 text-espresso-700" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-espresso-800">Inferred Schema</h2>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-200 text-espresso-700 font-mono">RAG Step 1</span>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 space-y-2 text-xs">
          {schemas && schemas.length > 0 ? (
            schemas.map((table) => {
              const isOpen = expandedTables[table.table_name] ?? true;
              return (
                <div key={table.table_name} className="border border-stone-200/70 rounded-xl overflow-hidden bg-white/40">
                  <button
                    onClick={() => toggleTable(table.table_name)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-stone-100/70 hover:bg-stone-200/60 transition-colors"
                  >
                    <div className="flex items-center gap-2 font-medium text-espresso-900">
                      {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-espresso-600" /> : <ChevronRight className="w-3.5 h-3.5 text-espresso-600" />}
                      <span>{table.table_name}</span>
                    </div>
                    <span className="text-[10px] text-espresso-500 font-mono">{table.columns?.length || 0} cols</span>
                  </button>

                  {isOpen && (
                    <div className="p-2 space-y-1 bg-white/30 border-t border-stone-100">
                      {table.columns?.map((col: any) => (
                        <div key={col.name} className="flex items-center justify-between px-2 py-1 rounded hover:bg-stone-100/50 text-[11px]">
                          <div className="flex items-center gap-1.5 text-espresso-800">
                            {col.is_primary_key ? (
                              <Key className="w-3 h-3 text-amber-800" />
                            ) : col.foreign_key_target ? (
                              <Key className="w-3 h-3 text-espresso-500 opacity-60" />
                            ) : (
                              <div className="w-1.5 h-1.5 rounded-full bg-stone-300" />
                            )}
                            <span className={col.is_primary_key ? "font-semibold" : ""}>{col.name}</span>
                          </div>
                          <span className="text-[10px] text-espresso-500 font-mono">{col.type}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-center text-espresso-500 text-xs">
              <FileText className="w-6 h-6 stroke-[1.5] mb-2 text-stone-400" />
              <p>Document pipeline active</p>
              <span className="text-[10px] text-espresso-400">Exact mathematical reconciliation</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
