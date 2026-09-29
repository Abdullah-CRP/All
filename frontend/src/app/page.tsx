"use client";

import React, { useState, useEffect } from "react";
import { CustomCursor } from "../components/CustomCursor";
import { DynamicBackground } from "../components/DynamicBackground";
import { LeftSidebar } from "../components/LeftSidebar";
import { RightSidebar } from "../components/RightSidebar";
import { CenterCanvas } from "../components/CenterCanvas";
import { generateSyntheticData, GenerationConfig, SynthesisPayload } from "../lib/api";

const PRESET_TEMPLATES: Record<string, any> = {
  relational_ecommerce: {
    route: "relational",
    business_context: "E-Commerce multi-table customer order relationships",
    schemas: [
      {
        table_name: "customers",
        row_count: 5,
        columns: [
          { name: "customer_id", type: "integer", is_primary_key: true },
          { name: "full_name", type: "string" },
          { name: "email", type: "email" },
          { name: "city", type: "address" },
        ],
      },
      {
        table_name: "orders",
        row_count: 20,
        columns: [
          { name: "order_id", type: "uuid", is_primary_key: true },
          { name: "customer_id", type: "integer", foreign_key_target: "customers.customer_id" },
          { name: "order_date", type: "datetime" },
          { name: "order_total", type: "currency" },
          { name: "status", type: "string" },
        ],
      },
    ],
  },
  document_invoice: {
    route: "document",
    document_template: "invoice",
    business_context: "Cloud infrastructure invoices with exact mathematical reconciliation",
    schemas: [],
  },
  document_statement: {
    route: "document",
    document_template: "bank_statement",
    business_context: "Commercial bank statement ledger reconciliation",
    schemas: [],
  },
  tabular_fintech: {
    route: "tabular",
    business_context: "FinTech risk scoring with privacy masking and noise",
    schemas: [
      {
        table_name: "credit_applicants",
        row_count: 20,
        columns: [
          { name: "applicant_id", type: "uuid", is_primary_key: true },
          { name: "full_name", type: "string" },
          { name: "email", type: "email" },
          { name: "credit_score", type: "integer" },
          { name: "annual_salary", type: "currency" },
        ],
      },
    ],
  },
};

export default function WorkspacePage() {
  const [selectedTemplate, setSelectedTemplate] = useState("relational_ecommerce");
  const [route, setRoute] = useState("auto");
  const [schemas, setSchemas] = useState<any[]>(PRESET_TEMPLATES.relational_ecommerce.schemas);
  const [config, setConfig] = useState<GenerationConfig>({
    row_count: 20,
    document_volume: 2,
    edge_case_rate: 0.05,
    privacy_controls: [{ column: "email", action: "mask", mask_char: "*" }],
    locale_settings: {
      locale: "en_US",
      currency: "USD",
      currency_symbol: "$",
      tax_rate: 0.0825,
    },
  });

  const [isLoading, setIsLoading] = useState(false);
  const [generatedOutput, setGeneratedOutput] = useState<any>(null);

  const handleSelectTemplate = (tmplKey: string) => {
    setSelectedTemplate(tmplKey);
    const tmpl = PRESET_TEMPLATES[tmplKey];
    if (tmpl) {
      setRoute(tmpl.route);
      setSchemas(tmpl.schemas || []);
    }
  };

  const handleUploadSchema = (rawContent: string) => {
    try {
      const parsed = JSON.parse(rawContent);
      if (parsed.schemas) {
        setSchemas(parsed.schemas);
      } else if (Array.isArray(parsed)) {
        setSchemas(parsed);
      }
      if (parsed.route) setRoute(parsed.route);
      if (parsed.config) setConfig((prev) => ({ ...prev, ...parsed.config }));
    } catch (e) {
      console.warn("Raw CSV or non-JSON uploaded, using inferred schema.");
    }
  };

  const executeGeneration = async () => {
    setIsLoading(true);
    const payload: SynthesisPayload = {
      route: route as any,
      business_context: PRESET_TEMPLATES[selectedTemplate]?.business_context,
      document_template: PRESET_TEMPLATES[selectedTemplate]?.document_template,
      config,
      schemas: schemas.length > 0 ? schemas : undefined,
    };

    try {
      const result = await generateSyntheticData(payload);
      setGeneratedOutput(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = (format: "csv" | "json" | "sql") => {
    if (!generatedOutput) return;
    const dataStr =
      format === "json"
        ? JSON.stringify(generatedOutput.data, null, 2)
        : format === "sql"
        ? generateSqlDump(generatedOutput.data)
        : generateCsv(generatedOutput.data);

    const blob = new Blob([dataStr], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hackdata_synthetic_export.${format}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const generateSqlDump = (data: any) => {
    let sql = "-- HackDataV2 Synthetic SQL Dump\n";
    Object.keys(data).forEach((table) => {
      const rows = data[table];
      if (Array.isArray(rows) && rows.length > 0) {
        rows.forEach((r) => {
          const cols = Object.keys(r).join(", ");
          const vals = Object.values(r)
            .map((v) => (v === null ? "NULL" : typeof v === "number" ? v : `'${String(v).replace(/'/g, "''")}'`))
            .join(", ");
          sql += `INSERT INTO ${table} (${cols}) VALUES (${vals});\n`;
        });
      }
    });
    return sql;
  };

  const generateCsv = (data: any) => {
    const firstTable = Object.keys(data)[0];
    const rows = data[firstTable] || [];
    if (!rows.length) return "";
    const cols = Object.keys(rows[0]);
    let csv = cols.join(",") + "\n";
    rows.forEach((r: any) => {
      csv += cols.map((c) => JSON.stringify(r[c] ?? "")).join(",") + "\n";
    });
    return csv;
  };

  useEffect(() => {
    executeGeneration();
  }, [selectedTemplate]);

  return (
    <div className="min-h-screen w-full relative flex flex-col p-6 overflow-hidden">
      {/* Framer Motion Custom Fluid Cursor */}
      <CustomCursor />

      {/* Dynamic Beige Parallax Background */}
      <DynamicBackground />

      {/* Main 3-Zone Workspace */}
      <main className="flex-1 flex gap-6 max-w-[1720px] w-full mx-auto h-[calc(100vh-3rem)]">
        {/* Zone 1: Left Sidebar (Ingestion & Schema - Steps 1 & 2) */}
        <LeftSidebar
          schemas={schemas}
          onUploadSchema={handleUploadSchema}
          selectedTemplate={selectedTemplate}
          onSelectTemplate={handleSelectTemplate}
        />

        {/* Zone 3: Center Canvas (Live Preview & Export - Steps 4 & 5) */}
        <CenterCanvas data={generatedOutput} isLoading={isLoading} onExport={handleExport} />

        {/* Zone 2: Right Sidebar (Configuration Console - Step 3) */}
        <RightSidebar
          config={config}
          onChangeConfig={setConfig}
          onGenerate={executeGeneration}
          isLoading={isLoading}
          route={route}
          onChangeRoute={setRoute}
        />
      </main>
    </div>
  );
}
