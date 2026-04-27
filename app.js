const data = window.MARKER_DASHBOARD_DATA;

const state = {
  selectedGroup: "",
  currentMarkerId: "",
  search: "",
  trait: "All",
  chrom: "All",
};

const STORAGE_KEYS = {
  feedback: "sorghum-marker-feedback-v1",
  reviewer: "sorghum-marker-reviewer-v1",
};

const feedbackFormConfig = window.FEEDBACK_FORM_CONFIG || {
  enabled: false,
  formActionUrl: "",
  entryIds: {},
};

const els = {
  totalMarkers: document.querySelector("#totalMarkers"),
  curatedMarkers: document.querySelector("#curatedMarkers"),
  arrayPanelMarkers: document.querySelector("#arrayPanelMarkers"),
  collaborators: document.querySelector("#collaborators"),
  dataSourceCount: document.querySelector("#dataSourceCount"),
  selectedGroupBanner: document.querySelector("#selectedGroupBanner"),
  queueTitle: document.querySelector("#queueTitle"),
  traitFilter: document.querySelector("#traitFilter"),
  chromFilter: document.querySelector("#chromFilter"),
  searchInput: document.querySelector("#searchInput"),
  markerSelect: document.querySelector("#markerSelect"),
  resetFilters: document.querySelector("#resetFilters"),
  exportCsv: document.querySelector("#exportCsv"),
  selectAllVisible: document.querySelector("#selectAllVisible"),
  clearSelection: document.querySelector("#clearSelection"),
  selectAllCheckbox: document.querySelector("#selectAllCheckbox"),
  selectedCount: document.querySelector("#selectedCount"),
  reviewerName: document.querySelector("#reviewerName"),
  reviewerSource: document.querySelector("#reviewerSource"),
  currentMarkerPanel: document.querySelector("#currentMarkerPanel"),
  selectedMarker: document.querySelector("#selectedMarker"),
  feedbackDecision: document.querySelector("#feedbackDecision"),
  feedbackComment: document.querySelector("#feedbackComment"),
  saveFeedback: document.querySelector("#saveFeedback"),
  exportFeedback: document.querySelector("#exportFeedback"),
  clearFeedback: document.querySelector("#clearFeedback"),
  feedbackStatus: document.querySelector("#feedbackStatus"),
  feedbackCount: document.querySelector("#feedbackCount"),
  catalogBody: document.querySelector("#catalogBody"),
  visibleCount: document.querySelector("#visibleCount"),
  karyotypePlot: document.querySelector("#karyotypePlot"),
  karyotypeSummary: document.querySelector("#karyotypeSummary"),
};

const format = new Intl.NumberFormat("en-US");
let feedbackItems = loadJson(STORAGE_KEYS.feedback, []);
let reviewer = loadJson(STORAGE_KEYS.reviewer, { name: "", source: "All" });
const selectedMarkerIds = new Set();

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

function setGroupOptions(select, values) {
  select.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "All";
  placeholder.textContent = "Choose group";
  select.appendChild(placeholder);
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

function catalogForSelectedGroup(applyFilters = true) {
  if (!state.selectedGroup) return [];
  const query = state.search.trim().toLowerCase();
  return data.catalog.filter((row) => {
    if (row.source !== state.selectedGroup) return false;
    if (!applyFilters) return true;
    if (state.trait !== "All" && row.trait !== state.trait) return false;
    if (state.chrom !== "All" && row.chrom !== state.chrom) return false;
    if (!query) return true;
    return [row.canonicalId, row.trait, row.locus, row.chrom, row.source, row.evidence, row.markerType]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });
}

function filteredCatalog() {
  return catalogForSelectedGroup(true);
}

function chromosomeValues() {
  return uniqueValues("chrom").filter((chrom) => chrom !== "-" && chrom !== "Unspecified");
}

function chromosomeExtentMap() {
  return data.catalog.reduce((acc, row) => {
    const chrom = row.chrom || "";
    const position = Number(row.posStart || row.posEnd || 0);
    if (!chrom || !position) return acc;
    acc[chrom] = Math.max(acc[chrom] || 0, position);
    return acc;
  }, {});
}

function findMarker(markerId) {
  return data.catalog.find((row) => row.canonicalId === markerId);
}

function renderGroupSummary() {
  const rows = catalogForSelectedGroup(false);
  const reviewed = rows.filter((row) => feedbackFor(row.canonicalId)).length;
  if (!state.selectedGroup) {
    els.queueTitle.textContent = "Pick a group to begin";
    els.selectedGroupBanner.innerHTML = `
      <strong>No group selected</strong>
      <span>Pick a group to load the review queue.</span>
    `;
    return;
  }
  els.queueTitle.textContent = `${state.selectedGroup} review queue`;
  els.selectedGroupBanner.innerHTML = `
    <strong>${escapeHtml(state.selectedGroup)}</strong>
    <span>${format.format(rows.length)} review rows, ${format.format(reviewed)} reviewed locally.</span>
  `;
}

function renderMarkerSelect(rows) {
  els.markerSelect.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = rows.length ? "Select a marker from visible queue" : "No markers available";
  els.markerSelect.appendChild(placeholder);

  rows.forEach((row) => {
    const option = document.createElement("option");
    option.value = row.canonicalId;
    option.textContent = `${row.canonicalId} | ${row.trait || "No trait"} | Chr ${row.chrom || "-"} | ${formatPosition(row) || "No coordinate"}`;
    els.markerSelect.appendChild(option);
  });

  if (state.currentMarkerId && rows.some((row) => row.canonicalId === state.currentMarkerId)) {
    els.markerSelect.value = state.currentMarkerId;
  } else {
    state.currentMarkerId = rows[0]?.canonicalId || "";
    els.markerSelect.value = state.currentMarkerId;
  }
}

function renderQueue() {
  renderGroupSummary();
  const rows = filteredCatalog();
  renderMarkerSelect(rows);
  renderKaryotype(rows);
  els.visibleCount.textContent = format.format(rows.length);
  els.selectedCount.textContent = `${format.format(selectedMarkerIds.size)} selected`;

  const visibleIds = rows.map((row) => row.canonicalId);
  const visibleSelectedCount = visibleIds.filter((id) => selectedMarkerIds.has(id)).length;
  els.selectAllCheckbox.checked = rows.length > 0 && visibleSelectedCount === rows.length;
  els.selectAllCheckbox.indeterminate = visibleSelectedCount > 0 && visibleSelectedCount < rows.length;

  if (!state.selectedGroup) {
    els.catalogBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-table">Choose a group to load markers.</td>
      </tr>
    `;
    renderCurrentMarker();
    renderSelectionSummary();
    return;
  }

  if (!rows.length) {
    els.catalogBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-table">No markers match the current filters.</td>
      </tr>
    `;
    renderCurrentMarker();
    renderSelectionSummary();
    return;
  }

  els.catalogBody.innerHTML = rows
    .map((row) => {
      const feedback = feedbackFor(row.canonicalId);
      const status = feedback
        ? `<span class="status-pill reviewed">${escapeHtml(decisionLabel(feedback.decision))}</span>`
        : `<span class="status-pill">Not reviewed</span>`;
      return `
        <tr class="${row.canonicalId === state.currentMarkerId ? "current-row" : ""}" data-marker-row="${escapeHtml(row.canonicalId)}">
          <td class="checkbox-col">
            <input type="checkbox" class="marker-checkbox" data-marker-id="${escapeHtml(row.canonicalId)}" ${selectedMarkerIds.has(row.canonicalId) ? "checked" : ""} aria-label="Select ${escapeHtml(row.canonicalId)}" />
          </td>
          <td><button class="link-action" type="button" data-focus-marker="${escapeHtml(row.canonicalId)}">${escapeHtml(row.canonicalId)}</button></td>
          <td>${escapeHtml(row.trait)}</td>
          <td>${escapeHtml(row.chrom)}</td>
          <td>${formatPosition(row)}</td>
          <td>${status}</td>
        </tr>
      `;
    })
    .join("");

  renderCurrentMarker();
  renderSelectionSummary();
}

function renderKaryotype(rows) {
  if (!state.selectedGroup) {
    els.karyotypeSummary.textContent = "Choose a group to view marker positions.";
    els.karyotypePlot.innerHTML = `<div class="karyotype-empty">No group selected</div>`;
    return;
  }

  const chromosomes = chromosomeValues();
  const extents = chromosomeExtentMap();
  const rowsByChrom = rows.reduce((acc, row) => {
    const chrom = row.chrom || "";
    if (!chrom) return acc;
    if (!acc[chrom]) acc[chrom] = [];
    acc[chrom].push(row);
    return acc;
  }, {});
  const plottedCount = rows.filter((row) => Number(row.posStart || row.posEnd || 0) > 0).length;
  els.karyotypeSummary.textContent = `${format.format(plottedCount)} marker positions shown for ${state.selectedGroup}.`;

  els.karyotypePlot.innerHTML = chromosomes
    .map((chrom) => {
      const chromRows = rowsByChrom[chrom] || [];
      const extent = Math.max(extents[chrom] || 1, 1);
      const ticks = chromRows
        .filter((row) => Number(row.posStart || row.posEnd || 0) > 0)
        .map((row) => {
          const position = Number(row.posStart || row.posEnd || 0);
          const top = Math.min(Math.max((position / extent) * 100, 0), 100);
          const classNames = [
            "marker-tick",
            selectedMarkerIds.has(row.canonicalId) ? "selected" : "",
            row.canonicalId === state.currentMarkerId ? "current" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return `<button class="${classNames}" type="button" data-karyotype-marker="${escapeHtml(row.canonicalId)}" style="--y: ${top}%" title="${escapeHtml(row.canonicalId)} | Chr ${escapeHtml(chrom)}:${formatPosition(row)}"></button>`;
        })
        .join("");

      return `
        <div class="chromosome-track">
          <div class="chromosome-label">Chr ${escapeHtml(chrom)}</div>
          <div class="chromosome-body" aria-label="Chromosome ${escapeHtml(chrom)} markers">
            ${ticks}
          </div>
          <div class="chromosome-count">${format.format(chromRows.length)}</div>
        </div>
      `;
    })
    .join("");
}

function renderCurrentMarker() {
  const marker = findMarker(state.currentMarkerId);
  if (!marker) {
    els.currentMarkerPanel.innerHTML = `
      <p class="eyebrow">Current marker</p>
      <h2>No marker selected</h2>
      <p>Select a marker from the dropdown or queue.</p>
    `;
    return;
  }

  const isSelected = selectedMarkerIds.has(marker.canonicalId);
  const feedback = feedbackFor(marker.canonicalId);
  els.currentMarkerPanel.innerHTML = `
    <p class="eyebrow">Current marker</p>
    <h2>${escapeHtml(marker.canonicalId)}</h2>
    <dl class="marker-facts">
      <div><dt>Trait</dt><dd>${escapeHtml(marker.trait)}</dd></div>
      <div><dt>Original name</dt><dd>${escapeHtml(marker.originalName || marker.locus || "")}</dd></div>
      <div><dt>Chromosome</dt><dd>${escapeHtml(marker.chrom)}</dd></div>
      <div><dt>Position</dt><dd>${formatPosition(marker)}</dd></div>
      <div><dt>Evidence</dt><dd>${escapeHtml(marker.evidence)}</dd></div>
    </dl>
    <button type="button" class="secondary" data-toggle-current="${escapeHtml(marker.canonicalId)}">${isSelected ? "Remove from selection" : "Add marker to selection"}</button>
    ${feedback ? `<p class="review-note">Saved locally: ${escapeHtml(decisionLabel(feedback.decision))}</p>` : ""}
  `;
}

function decisionLabel(value) {
  const labels = {
    confirm: "Confirmed",
    revise: "Revise",
    remove: "Remove",
    question: "Question",
  };
  return labels[value] || "Reviewed";
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
    "source",
    "sourceCode",
    "evidence",
  ];
  downloadCsv("filtered_sorghum_markers.csv", headers, rows);
}

function renderSelectionSummary() {
  const selectedRows = data.catalog.filter((row) => selectedMarkerIds.has(row.canonicalId));
  els.selectedCount.textContent = `${format.format(selectedRows.length)} selected`;
  if (!selectedRows.length) {
    els.feedbackDecision.value = "confirm";
    els.feedbackComment.value = "";
    els.selectedMarker.innerHTML = "<span>No markers selected</span>";
    return;
  }

  const existing = selectedRows.length === 1 ? feedbackFor(selectedRows[0].canonicalId) : null;
  if (existing) {
    els.feedbackDecision.value = existing.decision || "confirm";
    els.feedbackComment.value = existing.comment || "";
  } else {
    els.feedbackDecision.value = "confirm";
    els.feedbackComment.value = "";
  }

  const preview = selectedRows
    .slice(0, 4)
    .map((row) => row.canonicalId)
    .join(", ");
  const suffix = selectedRows.length > 4 ? ` + ${selectedRows.length - 4} more` : "";
  els.selectedMarker.innerHTML = `
    <strong>${format.format(selectedRows.length)} markers selected</strong>
    <span>${escapeHtml(preview + suffix)}</span>
  `;
}

function focusMarker(markerId, selectMarker = false) {
  if (!markerId) return;
  state.currentMarkerId = markerId;
  if (selectMarker) selectedMarkerIds.add(markerId);
  renderQueue();
}

function toggleMarkerSelection(markerId) {
  state.currentMarkerId = markerId;
  if (selectedMarkerIds.has(markerId)) {
    selectedMarkerIds.delete(markerId);
  } else {
    selectedMarkerIds.add(markerId);
  }
  renderQueue();
}

function selectAllVisibleMarkers() {
  filteredCatalog().forEach((row) => selectedMarkerIds.add(row.canonicalId));
  renderQueue();
}

function clearSelection() {
  selectedMarkerIds.clear();
  renderQueue();
}

async function saveFeedback() {
  if (!selectedMarkerIds.size) {
    els.selectedMarker.innerHTML = "<span>Select one or more markers before submitting feedback.</span>";
    setFeedbackStatus("Select one or more markers before submitting.", "warning");
    return;
  }

  reviewer = {
    name: els.reviewerName.value.trim(),
    source: state.selectedGroup || els.reviewerSource.value,
  };
  localStorage.setItem(STORAGE_KEYS.reviewer, JSON.stringify(reviewer));

  const reviewedAt = new Date().toISOString();
  const items = data.catalog
    .filter((row) => selectedMarkerIds.has(row.canonicalId))
    .map((marker) => createFeedbackItem(marker, reviewedAt));

  saveFeedbackItemsLocally(items);
  updateFeedbackCount();
  renderQueue();

  if (!isFeedbackFormConfigured()) {
    selectedMarkerIds.clear();
    renderQueue();
    setFeedbackStatus(`Saved ${format.format(items.length)} markers locally. Export CSV backup.`, "warning");
    return;
  }

  els.saveFeedback.disabled = true;
  setFeedbackStatus(`Submitting ${format.format(items.length)} markers.`, "pending");
  try {
    await submitFeedbackItemsToGoogleForm(items);
    selectedMarkerIds.clear();
    renderQueue();
    setFeedbackStatus(`Submitted ${format.format(items.length)} markers.`, "success");
  } catch (error) {
    selectedMarkerIds.clear();
    renderQueue();
    setFeedbackStatus("Submission failed; export CSV backup.", "error");
  } finally {
    els.saveFeedback.disabled = false;
  }
}

function createFeedbackItem(marker, reviewedAt) {
  return {
    canonicalId: marker.canonicalId,
    originalName: marker.originalName || marker.locus || "",
    trait: marker.trait || "",
    source: marker.source || "",
    reviewerName: reviewer.name,
    reviewerGroup: reviewer.source === "All" ? "" : reviewer.source,
    decision: els.feedbackDecision.value,
    comment: els.feedbackComment.value.trim(),
    reviewedAt,
  };
}

function saveFeedbackItemsLocally(items) {
  const itemIds = new Set(items.map((item) => item.canonicalId));
  feedbackItems = feedbackItems.filter((entry) => !itemIds.has(entry.canonicalId));
  feedbackItems.push(...items);
  feedbackItems.sort((a, b) => a.canonicalId.localeCompare(b.canonicalId));
  localStorage.setItem(STORAGE_KEYS.feedback, JSON.stringify(feedbackItems));
}

function isFeedbackFormConfigured() {
  if (!feedbackFormConfig.enabled) return false;
  if (!feedbackFormConfig.formActionUrl || feedbackFormConfig.formActionUrl.includes("FORM_ID")) return false;
  const requiredFields = [
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
  return requiredFields.every((field) => {
    const entryId = feedbackFormConfig.entryIds?.[field] || "";
    return /^entry\.\d+$/.test(entryId) && !entryId.match(/^entry\.(\d)\1+$/);
  });
}

async function submitFeedbackItemsToGoogleForm(items) {
  for (const item of items) {
    await submitFeedbackItemToGoogleForm(item);
  }
}

async function submitFeedbackItemToGoogleForm(item) {
  const formData = new FormData();
  Object.entries(feedbackFormConfig.entryIds).forEach(([field, entryId]) => {
    formData.append(entryId, item[field] || "");
  });
  await fetch(feedbackFormConfig.formActionUrl, {
    method: "POST",
    mode: "no-cors",
    body: formData,
  });
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
  renderQueue();
}

function feedbackFor(markerId) {
  return feedbackItems.find((entry) => entry.canonicalId === markerId);
}

function updateFeedbackCount() {
  els.feedbackCount.textContent = format.format(feedbackItems.length);
}

function setFeedbackStatus(message, status = "ready") {
  els.feedbackStatus.textContent = message;
  els.feedbackStatus.dataset.status = status;
}

function selectGroup(source) {
  if (!source || source === "All") {
    state.selectedGroup = "";
    reviewer.source = "All";
  } else {
    state.selectedGroup = source;
    reviewer.source = source;
  }
  selectedMarkerIds.clear();
  state.currentMarkerId = "";
  resetMarkerFilters(false);
  els.reviewerSource.value = reviewer.source;
  localStorage.setItem(STORAGE_KEYS.reviewer, JSON.stringify(reviewer));
  renderQueue();
}

function resetMarkerFilters(render = true) {
  state.search = "";
  state.trait = "All";
  state.chrom = "All";
  els.searchInput.value = "";
  els.traitFilter.value = "All";
  els.chromFilter.value = "All";
  if (render) renderQueue();
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

function bindEvents() {
  els.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    selectedMarkerIds.clear();
    state.currentMarkerId = "";
    renderQueue();
  });

  els.markerSelect.addEventListener("change", (event) => {
    focusMarker(event.target.value, true);
  });

  [
    [els.traitFilter, "trait"],
    [els.chromFilter, "chrom"],
  ].forEach(([select, key]) => {
    select.addEventListener("change", (event) => {
      state[key] = event.target.value;
      selectedMarkerIds.clear();
      state.currentMarkerId = "";
      renderQueue();
    });
  });

  els.resetFilters.addEventListener("click", () => resetMarkerFilters(true));
  els.exportCsv.addEventListener("click", exportCsv);
  els.selectAllVisible.addEventListener("click", selectAllVisibleMarkers);
  els.clearSelection.addEventListener("click", clearSelection);
  els.selectAllCheckbox.addEventListener("change", (event) => {
    if (event.target.checked) {
      selectAllVisibleMarkers();
      return;
    }
    filteredCatalog().forEach((row) => selectedMarkerIds.delete(row.canonicalId));
    renderQueue();
  });
  els.catalogBody.addEventListener("click", (event) => {
    const checkbox = event.target.closest(".marker-checkbox");
    if (checkbox) {
      toggleMarkerSelection(checkbox.dataset.markerId);
      return;
    }
    const focusButton = event.target.closest("[data-focus-marker]");
    if (focusButton) {
      focusMarker(focusButton.dataset.focusMarker);
    }
  });
  els.karyotypePlot.addEventListener("click", (event) => {
    const tick = event.target.closest("[data-karyotype-marker]");
    if (!tick) return;
    focusMarker(tick.dataset.karyotypeMarker);
  });
  els.currentMarkerPanel.addEventListener("click", (event) => {
    const button = event.target.closest("[data-toggle-current]");
    if (!button) return;
    toggleMarkerSelection(button.dataset.toggleCurrent);
  });
  els.saveFeedback.addEventListener("click", saveFeedback);
  els.exportFeedback.addEventListener("click", exportFeedbackCsv);
  els.clearFeedback.addEventListener("click", clearFeedback);
  els.reviewerName.addEventListener("input", () => {
    reviewer.name = els.reviewerName.value.trim();
    localStorage.setItem(STORAGE_KEYS.reviewer, JSON.stringify(reviewer));
  });
  els.reviewerSource.addEventListener("change", () => {
    selectGroup(els.reviewerSource.value);
  });
}

function init() {
  els.totalMarkers.textContent = format.format(data.totals.totalMarkers);
  els.curatedMarkers.textContent = format.format(data.totals.curatedMarkers);
  els.arrayPanelMarkers.textContent = format.format(data.totals.arrayPanelMarkers);
  els.collaborators.textContent = format.format(data.totals.collaborators);
  els.dataSourceCount.textContent = `${data.generatedFrom.length} sources`;

  const sources = uniqueValues("source");
  setOptions(els.traitFilter, uniqueValues("trait"));
  setOptions(els.chromFilter, uniqueValues("chrom"));
  setGroupOptions(els.reviewerSource, sources);
  els.reviewerName.value = reviewer.name || "";
  if (reviewer.source && reviewer.source !== "All" && sources.includes(reviewer.source)) {
    state.selectedGroup = reviewer.source;
    els.reviewerSource.value = reviewer.source;
  } else {
    reviewer.source = "All";
    els.reviewerSource.value = "All";
  }

  bindEvents();
  updateFeedbackCount();
  setFeedbackStatus(
    isFeedbackFormConfigured() ? "Ready to submit." : "Form not connected; CSV backup enabled.",
    isFeedbackFormConfigured() ? "ready" : "warning",
  );
  renderQueue();
}

init();
