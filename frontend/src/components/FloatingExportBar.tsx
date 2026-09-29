"use client";

import React from "react";
import { Download, FileCode, FileSpreadsheet, Database } from "lucide-react";
import { Magnetic } from "./Magnetic";

interface FloatingExportBarProps {
  onExport: (format: "csv" | "json" | "sql") => void;
  recordCount: number;
}

export const FloatingExportBar: React.FC<FloatingExportBarProps> = ({ onExport, recordCount }) => {
  return (
    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20">
      <div className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-base-card/95 border border-stone-300/80 shadow-magnetic backdrop-blur-md">
        <div className="flex items-center gap-2 pr-3 border-r border-stone-300">
          <Download className="w-4 h-4 text-espresso-800" />
          <span className="text-xs font-serif font-bold text-espresso-950">Export Dataset</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-200 text-espresso-700 font-mono">
            {recordCount} rows
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Magnetic strength={0.2}>
            <button
              onClick={() => onExport("csv")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-espresso-900 bg-stone-200/80 hover:bg-stone-300 transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </Magnetic>

          <Magnetic strength={0.2}>
            <button
              onClick={() => onExport("json")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-espresso-900 bg-stone-200/80 hover:bg-stone-300 transition-colors"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>JSON</span>
            </button>
          </Magnetic>

          <Magnetic strength={0.2}>
            <button
              onClick={() => onExport("sql")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-espresso-900 bg-stone-200/80 hover:bg-stone-300 transition-colors"
            >
              <Database className="w-3.5 h-3.5" />
              <span>SQL Dump</span>
            </button>
          </Magnetic>
        </div>
      </div>
    </div>
  );
};
