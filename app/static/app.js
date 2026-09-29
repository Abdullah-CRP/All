// HackDataV2 Frontend Application Logic

let currentGeneratedData = null;
let currentActiveTable = null;

// Built-in Template Payloads
const TEMPLATES = {
  relational_ecommerce: {
    route: "relational",
    business_context: "E-Commerce retail platform with strict 1:N referential customer orders",
    config: {
      row_count: 20,
      edge_case_rate: 0.05,
      privacy_controls: [
        { column: "email", action: "mask", mask_char: "*" }
      ],
      locale_settings: {
        locale: "en_US",
        currency: "USD",
        currency_symbol: "$",
        tax_rate: 0.0825
      }
    },
    schemas: [
      {
        table_name: "customers",
        row_count: 8,
        columns: [
          { name: "customer_id", type: "integer", is_primary_key: true },
          { name: "full_name", type: "string" },
          { name: "email", type: "email" },
          { name: "city", type: "address" },
          { name: "signup_date", type: "datetime" }
        ]
      },
      {
        table_name: "orders",
        row_count: 20,
        columns: [
          { name: "order_id", type: "uuid", is_primary_key: true },
          { name: "customer_id", type: "integer", foreign_key_target: "customers.customer_id" },
          { name: "order_date", type: "datetime" },
          { name: "order_total", type: "currency", min_value: 35.0, max_value: 1250.0 },
          { name: "status", type: "string", allowed_values: ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED"] }
        ]
      }
    ],
    relations: [
      {
        parent_table: "customers",
        child_table: "orders",
        parent_key: "customer_id",
        child_key: "customer_id",
        cardinality: "1:N"
      }
    ]
  },

  document_invoice: {
    route: "document",
    document_template: "invoice",
    business_context: "B2B SaaS Cloud enterprise monthly invoices with exact line-item reconciliation",
    config: {
      document_volume: 3,
      edge_case_rate: 0.0,
      privacy_controls: [],
      locale_settings: {
        locale: "en_US",
        currency: "USD",
        currency_symbol: "$",
        tax_rate: 0.0825
      }
    }
  },

  document_statement: {
    route: "document",
    document_template: "bank_statement",
    business_context: "Commercial corporate treasury bank statements with reconciled running balance ledger",
    config: {
      document_volume: 2,
      edge_case_rate: 0.0,
      privacy_controls: [],
      locale_settings: {
        locale: "en_US",
        currency: "USD",
        currency_symbol: "$",
        tax_rate: 0.0
      }
    }
  },

  tabular_fintech: {
    route: "tabular",
    business_context: "FinTech risk scoring dataset with privacy masking and differential noise",
    config: {
      row_count: 25,
      edge_case_rate: 0.08,
      privacy_controls: [
        { column: "email", action: "mask", mask_char: "*" },
        { column: "annual_salary", action: "differential_noise", noise_epsilon: 0.3 }
      ],
      locale_settings: {
        locale: "en_US",
        currency: "USD",
        currency_symbol: "$",
        tax_rate: 0.0825
      }
    },
    schemas: [
      {
        table_name: "credit_applicants",
        row_count: 25,
        columns: [
          { name: "applicant_id", type: "uuid", is_primary_key: true },
          { name: "full_name", type: "string" },
          { name: "email", type: "email" },
          { name: "credit_score", type: "integer", min_value: 450, max_value: 850 },
          { name: "annual_salary", type: "currency", min_value: 42000, max_value: 220000 },
          { name: "risk_tier", type: "string", allowed_values: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] }
        ]
      }
    ]
  }
};

document.addEventListener("DOMContentLoaded", () => {
  initUI();
  loadTemplate("relational_ecommerce");
  // Automatically trigger first generation on load
  executePipeline();
});

function initUI() {
  // Edge case slider display
  const slider = document.getElementById("edge-case-input");
  const sliderVal = document.getElementById("edge-case-val");
  slider.addEventListener("input", (e) => {
    sliderVal.textContent = `${e.target.value}%`;
    updateConfigFromControls();
  });

  // Row count input
  document.getElementById("row-count-input").addEventListener("change", updateConfigFromControls);
  document.getElementById("route-select").addEventListener("change", updateConfigFromControls);
  document.getElementById("locale-select").addEventListener("change", updateConfigFromControls);

  // Template selector buttons
  document.querySelectorAll(".template-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".template-pill").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      loadTemplate(btn.dataset.template);
    });
  });

  // Format JSON button
  document.getElementById("btn-format-json").addEventListener("click", () => {
    const editor = document.getElementById("json-editor");
    try {
      const parsed = JSON.parse(editor.value);
      editor.value = JSON.stringify(parsed, null, 2);
    } catch (err) {
      alert("Invalid JSON: " + err.message);
    }
  });

  // Execute Pipeline button
  document.getElementById("btn-execute-pipeline").addEventListener("click", executePipeline);

  // Export dropdown
  const exportBtn = document.getElementById("btn-export-dropdown");
  const exportMenu = document.getElementById("export-menu");
  exportBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    exportMenu.classList.toggle("hidden");
  });
  document.addEventListener("click", () => exportMenu.classList.add("hidden"));

  document.getElementById("export-csv").addEventListener("click", () => downloadExport("csv"));
  document.getElementById("export-json").addEventListener("click", () => downloadExport("json"));
  document.getElementById("export-md").addEventListener("click", () => downloadExport("markdown"));

  // Tabs
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      const targetPane = document.getElementById(btn.dataset.tab);
      if (targetPane) targetPane.classList.add("active");
    });
  });

  // Audit toggle
  const auditToggle = document.getElementById("audit-toggle");
  const auditContent = document.getElementById("audit-content");
  const auditArrow = document.getElementById("audit-toggle-arrow");
  auditToggle.addEventListener("click", () => {
    const isHidden = auditContent.style.display === "none";
    auditContent.style.display = isHidden ? "flex" : "none";
    auditArrow.textContent = isHidden ? "▼" : "▶";
  });
}

function loadTemplate(templateKey) {
  const payload = TEMPLATES[templateKey];
  if (!payload) return;

  const editor = document.getElementById("json-editor");
  editor.value = JSON.stringify(payload, null, 2);

  // Sync controls with template
  document.getElementById("route-select").value = payload.route || "auto";
  if (payload.config) {
    if (payload.config.row_count) {
      document.getElementById("row-count-input").value = payload.config.row_count;
    }
    if (payload.config.edge_case_rate !== undefined) {
      const ratePct = Math.round(payload.config.edge_case_rate * 100);
      document.getElementById("edge-case-input").value = ratePct;
      document.getElementById("edge-case-val").textContent = `${ratePct}%`;
    }
  }
}

function updateConfigFromControls() {
  const editor = document.getElementById("json-editor");
  try {
    const payload = JSON.parse(editor.value);
    payload.route = document.getElementById("route-select").value;
    if (!payload.config) payload.config = {};
    payload.config.row_count = parseInt(document.getElementById("row-count-input").value) || 20;
    payload.config.edge_case_rate = parseFloat(document.getElementById("edge-case-input").value) / 100.0;
    
    const localeParts = document.getElementById("locale-select").value.split("|");
    if (!payload.config.locale_settings) payload.config.locale_settings = {};
    payload.config.locale_settings.currency = localeParts[0];
    payload.config.locale_settings.currency_symbol = localeParts[1];
    payload.config.locale_settings.tax_rate = parseFloat(localeParts[2]);

    editor.value = JSON.stringify(payload, null, 2);
  } catch (e) {
    // Keep typing in JSON without error disruption
  }
}

async function animatePipelineSteps() {
  const nodes = [1, 2, 3, 4, 5];
  for (const n of nodes) {
    const el = document.getElementById(`step-node-${n}`);
    const conn = document.getElementById(`connector-${n}`);
    if (el) el.className = "step-node active";
    await new Promise(r => setTimeout(r, 60));
    if (el) el.className = "step-node completed";
    if (conn) conn.className = "step-connector active";
  }
}

async function executePipeline() {
  const btn = document.getElementById("btn-execute-pipeline");
  const spinner = document.getElementById("action-spinner");
  btn.disabled = true;
  spinner.classList.remove("hidden");

  let payload;
  try {
    payload = JSON.parse(document.getElementById("json-editor").value);
  } catch (err) {
    alert("JSON Syntax Error: " + err.message);
    btn.disabled = false;
    spinner.classList.add("hidden");
    return;
  }

  // Visual animation of pipeline
  animatePipelineSteps();

  try {
    const response = await fetch("/api/v1/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${await response.text()}`);
    }

    const result = await response.json();
    currentGeneratedData = result;
    renderResults(result);
  } catch (error) {
    alert("Generation Failed: " + error.message);
  } finally {
    btn.disabled = false;
    spinner.classList.add("hidden");
  }
}

function renderResults(result) {
  // Update verification banner
  const valPill = document.getElementById("validation-pill");
  const valText = document.getElementById("validation-text");
  const routePill = document.getElementById("route-pill");
  const timePill = document.getElementById("time-pill");
  const anomaliesPill = document.getElementById("anomalies-pill");

  const isPassed = result.validation_status === "passed";
  valPill.className = `validation-badge ${isPassed ? "status-passed" : "status-failed"}`;
  valText.textContent = `validation_status: "${result.validation_status}"`;
  routePill.textContent = `Route: ${result.route_executed.toUpperCase()}`;
  timePill.textContent = `Execution: ${result.metadata.processing_time_ms}ms`;
  anomaliesPill.textContent = `Edge Cases: ${result.validation_report.edge_cases_injected}`;

  // Update audit logs
  const auditLogs = result.validation_report.details || [];
  const auditContent = document.getElementById("audit-content");
  auditContent.innerHTML = auditLogs.map(log => `
    <div class="audit-item verified">
      <span class="check-icon">✓</span>
      <span>${log}</span>
    </div>
  `).join("");

  // Update Raw JSON Tab
  document.getElementById("raw-json-code").textContent = JSON.stringify(result, null, 2);

  // Table Tabs & Render
  const data = result.data || {};
  const isDocumentRoute = result.route_executed === "document" && data.documents;
  const docTabBtn = document.getElementById("doc-render-tab-btn");

  if (isDocumentRoute) {
    docTabBtn.style.display = "inline-block";
    docTabBtn.click();
    renderDocumentView(data.documents);
  } else {
    docTabBtn.style.display = "none";
    document.querySelector('[data-tab="tab-preview"]').click();
    renderTableView(data);
  }
}

function renderTableView(tablesData) {
  const tableKeys = Object.keys(tablesData);
  if (tableKeys.length === 0) return;

  const subTableSelector = document.getElementById("sub-table-selector");
  subTableSelector.innerHTML = "";

  currentActiveTable = tableKeys[0];

  tableKeys.forEach(tName => {
    const pill = document.createElement("button");
    pill.className = `sub-table-pill ${tName === currentActiveTable ? "active" : ""}`;
    pill.textContent = `${tName} (${tablesData[tName].length})`;
    pill.addEventListener("click", () => {
      document.querySelectorAll(".sub-table-pill").forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      currentActiveTable = tName;
      displayRows(tablesData[tName]);
    });
    subTableSelector.appendChild(pill);
  });

  displayRows(tablesData[currentActiveTable]);
}

function displayRows(rows) {
  const thead = document.getElementById("data-table-head");
  const tbody = document.getElementById("data-table-body");
  thead.innerHTML = "";
  tbody.innerHTML = "";

  if (!rows || rows.length === 0) return;

  const cols = Object.keys(rows[0]);
  const headerTr = document.createElement("tr");
  cols.forEach(c => {
    const th = document.createElement("th");
    th.textContent = c;
    headerTr.appendChild(th);
  });
  thead.appendChild(headerTr);

  rows.forEach(r => {
    const tr = document.createElement("tr");
    cols.forEach(c => {
      const td = document.createElement("td");
      const val = r[c];

      if (val === null || val === undefined) {
        td.innerHTML = `<span class="badge-null">null</span>`;
      } else if (typeof val === "number" && (val > 1000000 || val < 0)) {
        td.innerHTML = `<span class="badge-edge-case">${val}</span>`;
      } else if (typeof val === "string" && (val.includes("DROP TABLE") || val.includes("MALFORMED") || val.includes("1970-00-00"))) {
        td.innerHTML = `<span class="badge-edge-case">${escapeHtml(val)}</span>`;
      } else {
        td.textContent = val;
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  document.getElementById("table-stats-info").innerHTML = `
    <span>Rows: ${rows.length}</span> &bull; <span>Columns: ${cols.length}</span> &bull; <span style="color:var(--accent-emerald);">Pandas Validated</span>
  `;
}

function renderDocumentView(documents) {
  const container = document.getElementById("document-preview-box");
  if (!documents || documents.length === 0) {
    container.innerHTML = "<p>No documents generated.</p>";
    return;
  }

  container.innerHTML = documents.map(doc => {
    if (doc.rendered_html) {
      return doc.rendered_html;
    }
    return `<div class="invoice-container"><h3>${doc.document_type}: ${doc.account_number || doc.document_id}</h3><pre>${JSON.stringify(doc, null, 2)}</pre></div>`;
  }).join("<hr style='margin: 40px 0; border: none; border-top: 2px dashed #cbd5e1;'>");
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function downloadExport(format) {
  if (!currentGeneratedData) {
    alert("Please generate synthetic data before exporting.");
    return;
  }

  try {
    const response = await fetch(`/api/v1/export/${format}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: currentGeneratedData.data })
    });

    if (!response.ok) throw new Error("Export failed");

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hackdata_v2_export.${format === "markdown" ? "md" : format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (err) {
    alert("Export download error: " + err.message);
  }
}
