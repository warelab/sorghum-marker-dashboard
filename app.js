const data = window.MARKER_DASHBOARD_DATA;

const state = {
  search: "",
  source: "All",
  trait: "All",
  chrom: "All",
  priority: "All",
  selectedMarkerId: "",
};

const STORAGE_KEYS = {
  feedback: "sorghum-marker-feedback-v1",
  reviewer: "sorghum-marker-reviewer-v1",
};

const els = {
  totalMarkers: document.querySelector("#totalMarkers"),
  curatedMarkers: document.querySelector("#curatedMarkers"),
  arrayPanelMarkers: document.querySelector("#arrayPanelMarkers"),
  collaborators: document.querySelector("#collaborators"),
  dataSourceCount: document.querySelector("#dataSourceCount"),
  sourceFilter: document.querySelector("#sourceFilter"),
  traitFilter: document.querySelector("#traitFilter"),
  chromFilter: document.querySelector("#chromFilter"),
  priorityFilter: document.querySelector("#priorityFilter"),
  searchInput: document.querySelector("#searchInput"),
  resetFilters: document.querySelector("#resetFilters"),
  exportCsv: document.querySelector("#exportCsv"),
  reviewerName: document.querySelector("#reviewerName"),
  reviewerSource: document.querySelector("#reviewerSource"),
  selectedMarker: document.querySelector("#selectedMarker"),
  feedbackDecision: document.querySelector("#feedbackDecision"),
  feedbackComment: document.querySelector("#feedbackComment"),
  saveFeedback: document.querySelector("#saveFeedback"),
  exportFeedback: document.querySelector("#exportFeedback"),
  clearFeedback: document.querySelector("#clearFeedback"),
  feedbackCount: document.querySelector("#feedbackCount"),
  collaboratorBars: document.querySelector("#collaboratorBars"),
  traitBars: document.querySelector("#traitBars"),
  priorityBars: document.querySelector("#priorityBars"),
  chromosomeBars: document.querySelector("#chromosomeBars"),
  regionBars: document.querySelector("#regionBars"),
  denseGenes: document.querySelector("#denseGenes"),
  catalogBody: document.querySelector("#catalogBody"),
  visibleCount: document.querySelector("#visibleCount"),
};

const format = new Intl.NumberFormat("en-US");
let feedbackItems = loadJson(STORAGE_KEYS.feedback, []);
let reviewer = loadJson(STORAGE_KEYS.reviewer, { name: "", source: "All" });

function uniqueValues(key) {
  return [...new Set(data.catalog.map((row) => row[key]).filter(Boolean))].sort((a, b) => {
    const na = Number(a);
    const nb = Number(b);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return String(a).localeCompare(String(b));
  });
}

function setOptions(select, values, label = "All") {
  select.innerHTML = "";
  [label, ...values].forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

function barList(target, rows, options = {}) {
  const max = Math.max(...rows.map((row) => row.count), 1);
  target.innerHTML = rows
    .map((row) => {
      const width = Math.max((row.count / max) * 100, 2);
      const meta = row.meta ? `<span class="bar-meta">${row.meta}</span>` : "";
      return `
        <div class="bar-item">
          <div class="bar-label">${escapeHtml(row.name)}${meta}</div>
          <div class="bar-track"><div class="bar-fill" style="--w: ${width}%"></div></div>
          <div class="bar-value">${format.format(row.count)}${options.percent ? "%" : ""}</div>
        </div>
      `;
    })
    .join("");
}

function renderStaticCharts() {
  barList(
    els.collaboratorBars,
    data.collaborators.map((row) => ({
      name: row.collaborator,
      count: row.count,
      meta: `${row.source} · ${row.catalogScope} · ${row.focus}`,
    })),
  );

  barList(
    els.traitBars,
    data.traitCounts.slice(0, 12).map((row) => ({
      name: row.name,
      count: row.count,
    })),
  );

  barList(
    els.priorityBars,
    data.priorityCounts
      .filter((row) => row.name !== "Unspecified")
      .sort((a, b) => Number(a.name) - Number(b.name))
      .map((row) => ({
        name: `Priority ${row.name}`,
        count: row.count,
      })),
  );

  const regionRows = data.regionSummary.map((row) => ({
    name: row.region_class,
    count: Number(row.n_markers || 0),
    meta: `${Math.round(Number(row.fraction_of_total || 0) * 100)}% of annotated markers`,
  }));
  barList(els.regionBars, regionRows);

  renderChromosomes();
  renderDenseGenes();
}

function renderChromosomes() {
  const rows = data.chromosomeCounts
    .filter((row) => row.name !== "Unspecified" && row.name !== "-")
    .sort((a, b) => Number(a.name) - Number(b.name));
  const max = Math.max(...rows.map((row) => row.count), 1);
  els.chromosomeBars.innerHTML = rows
    .map((row) => {
      const height = Math.max((row.count / max) * 190, 8);
      return `
        <div class="chromosome">
          <strong>${format.format(row.count)}</strong>
          <div class="column" style="--h: ${height}px"></div>
          <span>Chr ${escapeHtml(row.name)}</span>
        </div>
      `;
    })
    .join("");
}

function renderDenseGenes() {
  els.denseGenes.innerHTML = data.denseGenes
    .slice(0, 8)
    .map(
      (row) => `
      <div class="gene">
        <div>
          <strong>${escapeHtml(row.gene_name || row.gene_id)}</strong>
          <span>Chr ${escapeHtml(row.chrom)} · ${escapeHtml(row.total_markers)} markers</span>
        </div>
        <strong>${Number(row.marker_density_per_kb).toFixed(2)}/kb</strong>
      </div>
    `,
    )
    .join("");
}

function filteredCatalog() {
  const query = state.search.trim().toLowerCase();
  return data.catalog.filter((row) => {
    if (state.source !== "All" && row.source !== state.source) return false;
    if (state.trait !== "All" && row.trait !== state.trait) return false;
    if (state.chrom !== "All" && row.chrom !== state.chrom) return false;
    if (state.priority !== "All" && row.priority !== state.priority) return false;
    if (!query) return true;
    return [row.canonicalId, row.trait, row.locus, row.chrom, row.source, row.evidence, row.markerType]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });
}

function renderTable() {
  const rows = filteredCatalog();
  els.visibleCount.textContent = format.format(rows.length);
  els.catalogBody.innerHTML = rows
    .map(
      (row) => `
      <tr>
        <td><strong>${escapeHtml(row.canonicalId)}</strong></td>
        <td>${escapeHtml(row.trait)}</td>
        <td><strong>${escapeHtml(row.locus)}</strong><br>${escapeHtml(row.markerType || "")}</td>
        <td>${escapeHtml(row.chrom)}</td>
        <td>${formatPosition(row)}</td>
        <td>${row.priority ? `P${escapeHtml(row.priority)}` : ""}</td>
        <td>${escapeHtml(row.source)}</td>
        <td>${escapeHtml(row.evidence)}</td>
        <td>
          <button class="row-action" type="button" data-marker-id="${escapeHtml(row.canonicalId)}">
            ${feedbackFor(row.canonicalId) ? "Edit" : "Review"}
          </button>
        </td>
      </tr>
    `,
    )
    .join("");
}

function formatPosition(row) {
  if (!row.posStart) return "";
  if (!row.posEnd || row.posEnd === row.posStart) return format.format(row.posStart);
  return `${format.format(row.posStart)}-${format.format(row.posEnd)}`;
}

function exportCsv() {
  const rows = filteredCatalog();
  const headers = [
    "canonicalId",
    "originalName",
    "trait",
    "markerType",
    "chrom",
    "posStart",
    "posEnd",
    "ref",
    "alt",
    "priority",
    "source",
    "sourceCode",
    "evidence",
  ];
  downloadCsv("filtered_sorghum_markers.csv", headers, rows);
}

function selectMarker(markerId) {
  const marker = data.catalog.find((row) => row.canonicalId === markerId);
  if (!marker) return;
  state.selectedMarkerId = markerId;
  const existing = feedbackFor(markerId);
  els.selectedMarker.innerHTML = `
    <strong>${escapeHtml(marker.canonicalId)}</strong>
    <span>${escapeHtml(marker.trait)} · ${escapeHtml(marker.locus)} · ${escapeHtml(marker.source)}</span>
  `;
  els.feedbackDecision.value = existing?.decision || "confirm";
  els.feedbackComment.value = existing?.comment || "";
  els.feedbackComment.focus();
}

function saveFeedback() {
  if (!state.selectedMarkerId) {
    els.selectedMarker.innerHTML = "<span>Select a marker from the table before saving feedback.</span>";
    return;
  }

  reviewer = {
    name: els.reviewerName.value.trim(),
    source: els.reviewerSource.value,
  };
  localStorage.setItem(STORAGE_KEYS.reviewer, JSON.stringify(reviewer));

  const marker = data.catalog.find((row) => row.canonicalId === state.selectedMarkerId);
  const item = {
    canonicalId: state.selectedMarkerId,
    originalName: marker?.originalName || marker?.locus || "",
    trait: marker?.trait || "",
    source: marker?.source || "",
    reviewerName: reviewer.name,
    reviewerGroup: reviewer.source === "All" ? "" : reviewer.source,
    decision: els.feedbackDecision.value,
    comment: els.feedbackComment.value.trim(),
    reviewedAt: new Date().toISOString(),
  };

  feedbackItems = feedbackItems.filter((entry) => entry.canonicalId !== state.selectedMarkerId);
  feedbackItems.push(item);
  feedbackItems.sort((a, b) => a.canonicalId.localeCompare(b.canonicalId));
  localStorage.setItem(STORAGE_KEYS.feedback, JSON.stringify(feedbackItems));
  updateFeedbackCount();
  renderTable();
}

function exportFeedbackCsv() {
  const headers = [
    "canonicalId",
    "originalName",
    "trait",
    "source",
    "reviewerName",
    "reviewerGroup",
    "decision",
    "comment",
    "reviewedAt",
  ];
  downloadCsv("sorghum_marker_feedback.csv", headers, feedbackItems);
}

function clearFeedback() {
  if (!feedbackItems.length) return;
  const confirmed = window.confirm("Clear all saved feedback in this browser?");
  if (!confirmed) return;
  feedbackItems = [];
  localStorage.removeItem(STORAGE_KEYS.feedback);
  updateFeedbackCount();
  renderTable();
}

function feedbackFor(markerId) {
  return feedbackItems.find((entry) => entry.canonicalId === markerId);
}

function updateFeedbackCount() {
  els.feedbackCount.textContent = format.format(feedbackItems.length);
}

function loadJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function downloadCsv(filename, headers, rows) {
  const csv = [headers.join(",")]
    .concat(
      rows.map((row) =>
        headers
          .map((header) => {
            const value = row[header] ?? "";
            return `"${String(value).replaceAll('"', '""')}"`;
          })
          .join(","),
      ),
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function bindFilters() {
  els.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    renderTable();
  });
  [
    [els.sourceFilter, "source"],
    [els.traitFilter, "trait"],
    [els.chromFilter, "chrom"],
    [els.priorityFilter, "priority"],
  ].forEach(([select, key]) => {
    select.addEventListener("change", (event) => {
      state[key] = event.target.value;
      renderTable();
    });
  });
  els.resetFilters.addEventListener("click", () => {
    state.search = "";
    state.source = "All";
    state.trait = "All";
    state.chrom = "All";
    state.priority = "All";
    els.searchInput.value = "";
    els.sourceFilter.value = "All";
    els.traitFilter.value = "All";
    els.chromFilter.value = "All";
    els.priorityFilter.value = "All";
    renderTable();
  });
  els.exportCsv.addEventListener("click", exportCsv);
  els.catalogBody.addEventListener("click", (event) => {
    const button = event.target.closest("[data-marker-id]");
    if (!button) return;
    selectMarker(button.dataset.markerId);
  });
  els.saveFeedback.addEventListener("click", saveFeedback);
  els.exportFeedback.addEventListener("click", exportFeedbackCsv);
  els.clearFeedback.addEventListener("click", clearFeedback);
  els.reviewerName.addEventListener("input", () => {
    reviewer.name = els.reviewerName.value.trim();
    localStorage.setItem(STORAGE_KEYS.reviewer, JSON.stringify(reviewer));
  });
  els.reviewerSource.addEventListener("change", () => {
    reviewer.source = els.reviewerSource.value;
    localStorage.setItem(STORAGE_KEYS.reviewer, JSON.stringify(reviewer));
  });
}

function init() {
  els.totalMarkers.textContent = format.format(data.totals.totalMarkers);
  els.curatedMarkers.textContent = format.format(data.totals.curatedMarkers);
  els.arrayPanelMarkers.textContent = format.format(data.totals.arrayPanelMarkers);
  els.collaborators.textContent = format.format(data.totals.collaborators);
  els.dataSourceCount.textContent = `${data.generatedFrom.length} sources`;

  setOptions(els.sourceFilter, uniqueValues("source"));
  setOptions(els.traitFilter, uniqueValues("trait"));
  setOptions(els.chromFilter, uniqueValues("chrom"));
  setOptions(els.priorityFilter, uniqueValues("priority"));
  setOptions(els.reviewerSource, uniqueValues("source"));
  els.reviewerName.value = reviewer.name || "";
  els.reviewerSource.value = reviewer.source || "All";

  bindFilters();
  renderStaticCharts();
  updateFeedbackCount();
  renderTable();
}

init();
