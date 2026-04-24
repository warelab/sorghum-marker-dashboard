const data = window.MARKER_DASHBOARD_DATA;

const state = {
  activeTab: "summary",
  selectedGroup: "",
  search: "",
  trait: "All",
  chrom: "All",
  priority: "All",
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
  tabButtons: document.querySelectorAll("[data-tab]"),
  tabPanels: document.querySelectorAll("[data-panel]"),
  groupCards: document.querySelector("#groupCards"),
  chooseGroupCards: document.querySelector("#chooseGroupCards"),
  selectedGroupBanner: document.querySelector("#selectedGroupBanner"),
  reviewGate: document.querySelector("#reviewGate"),
  reviewWorkspace: document.querySelector("#reviewWorkspace"),
  reviewGroupHeader: document.querySelector("#reviewGroupHeader"),
  traitFilter: document.querySelector("#traitFilter"),
  chromFilter: document.querySelector("#chromFilter"),
  priorityFilter: document.querySelector("#priorityFilter"),
  searchInput: document.querySelector("#searchInput"),
  resetFilters: document.querySelector("#resetFilters"),
  exportCsv: document.querySelector("#exportCsv"),
  selectAllVisible: document.querySelector("#selectAllVisible"),
  clearSelection: document.querySelector("#clearSelection"),
  selectAllCheckbox: document.querySelector("#selectAllCheckbox"),
  selectedCount: document.querySelector("#selectedCount"),
  reviewerName: document.querySelector("#reviewerName"),
  reviewerSource: document.querySelector("#reviewerSource"),
  selectedMarker: document.querySelector("#selectedMarker"),
  feedbackDecision: document.querySelector("#feedbackDecision"),
  feedbackComment: document.querySelector("#feedbackComment"),
  saveFeedback: document.querySelector("#saveFeedback"),
  exportFeedback: document.querySelector("#exportFeedback"),
  clearFeedback: document.querySelector("#clearFeedback"),
  feedbackStatus: document.querySelector("#feedbackStatus"),
  feedbackCount: document.querySelector("#feedbackCount"),
  traitBars: document.querySelector("#traitBars"),
  chromosomeBars: document.querySelector("#chromosomeBars"),
  catalogBody: document.querySelector("#catalogBody"),
  visibleCount: document.querySelector("#visibleCount"),
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

function groupRows() {
  const bySource = new Map();
  data.catalog.forEach((row) => {
    if (!bySource.has(row.source)) bySource.set(row.source, []);
    bySource.get(row.source).push(row);
  });

  return data.collaborators
    .map((collaborator) => {
      const source = collaborator.source || collaborator.collaborator;
      const rows = bySource.get(source) || [];
      return {
        collaborator: collaborator.collaborator || source,
        source,
        count: Number(collaborator.count || rows.length || 0),
        reviewable: rows.length,
        focus: collaborator.focus || "Marker review",
        catalogScope: collaborator.catalogScope || "Curated catalog",
        reviewed: rows.filter((row) => feedbackFor(row.canonicalId)).length,
      };
    })
    .filter((row) => row.source)
    .sort((a, b) => b.count - a.count || a.source.localeCompare(b.source));
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
    els.traitBars,
    data.traitCounts.slice(0, 12).map((row) => ({
      name: row.name,
      count: row.count,
    })),
  );
  renderChromosomes();
}

function renderChromosomes() {
  const rows = data.chromosomeCounts
    .filter((row) => row.name !== "Unspecified" && row.name !== "-")
    .sort((a, b) => Number(a.name) - Number(b.name));
  const max = Math.max(...rows.map((row) => row.count), 1);
  els.chromosomeBars.innerHTML = rows
    .map((row) => {
      const height = Math.max((row.count / max) * 170, 8);
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

function renderGroupCards() {
  const rows = groupRows();
  els.groupCards.innerHTML = rows.map((row) => groupCardTemplate(row, false)).join("");
  els.chooseGroupCards.innerHTML = rows.map((row) => groupCardTemplate(row, true)).join("");
  renderSelectedGroupBanner();
}

function groupCardTemplate(row, selectable) {
  const isSelected = row.source === state.selectedGroup;
  const progress = row.reviewable ? Math.round((row.reviewed / row.reviewable) * 100) : 0;
  const reviewAction = row.reviewable
    ? `<button type="button" class="group-select${selectable ? "" : " secondary"}" data-group="${escapeHtml(row.source)}">${isSelected ? "Selected" : selectable ? "Review this group" : "Open group"}</button>`
    : `<button type="button" class="group-select secondary" disabled>Summary only</button>`;
  const reviewableStat =
    row.reviewable === row.count
      ? ""
      : `
        <strong>${format.format(row.reviewable)}</strong>
        <span>review rows</span>
      `;
  return `
    <article class="group-card${isSelected ? " selected" : ""}">
      <div>
        <p class="eyebrow">${escapeHtml(row.catalogScope)}</p>
        <h3>${escapeHtml(row.source)}</h3>
        <p>${escapeHtml(row.focus)}</p>
      </div>
      <div class="group-stats">
        <strong>${format.format(row.count)}</strong>
        <span>markers</span>
        ${reviewableStat}
        <strong>${format.format(row.reviewed)}</strong>
        <span>reviewed locally</span>
      </div>
      <div class="progress-line" aria-label="${progress}% reviewed locally"><span style="--w: ${progress}%"></span></div>
      ${reviewAction}
    </article>
  `;
}

function renderSelectedGroupBanner() {
  if (!state.selectedGroup) {
    els.selectedGroupBanner.innerHTML = `
      <p class="eyebrow">Current group</p>
      <strong>No group selected</strong>
      <span>Pick a group below to unlock the review table.</span>
    `;
    return;
  }

  const rows = catalogForSelectedGroup(false);
  const reviewed = rows.filter((row) => feedbackFor(row.canonicalId)).length;
  els.selectedGroupBanner.innerHTML = `
    <p class="eyebrow">Current group</p>
    <strong>${escapeHtml(state.selectedGroup)}</strong>
    <span>${format.format(rows.length)} markers, ${format.format(reviewed)} reviewed locally.</span>
  `;
}

function filteredCatalog() {
  return catalogForSelectedGroup(true);
}

function catalogForSelectedGroup(applyFilters) {
  if (!state.selectedGroup) return [];
  const query = state.search.trim().toLowerCase();
  return data.catalog.filter((row) => {
    if (row.source !== state.selectedGroup) return false;
    if (!applyFilters) return true;
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

function renderReviewHeader() {
  if (!state.selectedGroup) {
    els.reviewGate.hidden = false;
    els.reviewWorkspace.hidden = true;
    return;
  }

  const rows = catalogForSelectedGroup(false);
  const reviewed = rows.filter((row) => feedbackFor(row.canonicalId)).length;
  els.reviewGate.hidden = true;
  els.reviewWorkspace.hidden = false;
  els.reviewGroupHeader.innerHTML = `
    <div>
      <p class="eyebrow">Reviewing group</p>
      <h2>${escapeHtml(state.selectedGroup)}</h2>
      <p>${format.format(rows.length)} total markers. ${format.format(reviewed)} have feedback saved in this browser.</p>
    </div>
    <button class="secondary jump-tab" type="button" data-tab="choose">Switch group</button>
  `;
}

function renderTable() {
  renderReviewHeader();
  const rows = filteredCatalog();
  els.visibleCount.textContent = format.format(rows.length);
  const visibleIds = rows.map((row) => row.canonicalId);
  const visibleSelectedCount = visibleIds.filter((id) => selectedMarkerIds.has(id)).length;
  els.selectedCount.textContent = `${format.format(selectedMarkerIds.size)} selected`;
  els.selectAllCheckbox.checked = rows.length > 0 && visibleSelectedCount === rows.length;
  els.selectAllCheckbox.indeterminate = visibleSelectedCount > 0 && visibleSelectedCount < rows.length;

  if (!state.selectedGroup) {
    els.catalogBody.innerHTML = "";
    renderSelectionSummary();
    return;
  }

  if (!rows.length) {
    els.catalogBody.innerHTML = `
      <tr>
        <td colspan="9" class="empty-table">No markers match the current search and filters.</td>
      </tr>
    `;
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
        <tr>
          <td class="checkbox-col">
            <input type="checkbox" class="marker-checkbox" data-marker-id="${escapeHtml(row.canonicalId)}" ${selectedMarkerIds.has(row.canonicalId) ? "checked" : ""} aria-label="Select ${escapeHtml(row.canonicalId)}" />
          </td>
          <td><strong>${escapeHtml(row.canonicalId)}</strong></td>
          <td>${escapeHtml(row.trait)}</td>
          <td><strong>${escapeHtml(row.locus)}</strong><br>${escapeHtml(row.markerType || "")}</td>
          <td>${escapeHtml(row.chrom)}</td>
          <td>${formatPosition(row)}</td>
          <td>${row.priority ? `P${escapeHtml(row.priority)}` : ""}</td>
          <td>${escapeHtml(row.evidence)}</td>
          <td>
            <button class="row-action" type="button" data-marker-id="${escapeHtml(row.canonicalId)}">
              ${selectedMarkerIds.has(row.canonicalId) ? "Selected" : "Select"}
            </button>
            ${status}
          </td>
        </tr>
      `;
    })
    .join("");
  renderSelectionSummary();
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
    "priority",
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
    .slice(0, 5)
    .map((row) => row.canonicalId)
    .join(", ");
  const suffix = selectedRows.length > 5 ? ` + ${selectedRows.length - 5} more` : "";
  els.selectedMarker.innerHTML = `
    <strong>${format.format(selectedRows.length)} markers selected</strong>
    <span>${escapeHtml(preview + suffix)}</span>
  `;
}

function toggleMarkerSelection(markerId) {
  if (selectedMarkerIds.has(markerId)) {
    selectedMarkerIds.delete(markerId);
  } else {
    selectedMarkerIds.add(markerId);
  }
  renderTable();
}

function selectAllVisibleMarkers() {
  filteredCatalog().forEach((row) => selectedMarkerIds.add(row.canonicalId));
  renderTable();
}

function clearSelection() {
  selectedMarkerIds.clear();
  renderTable();
}

async function saveFeedback() {
  if (!selectedMarkerIds.size) {
    els.selectedMarker.innerHTML = "<span>Select one or more markers before submitting feedback.</span>";
    setFeedbackStatus("Select one or more markers before submitting.", "warning");
    switchTab("review");
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
  renderGroupCards();
  renderTable();

  if (!isFeedbackFormConfigured()) {
    selectedMarkerIds.clear();
    renderAll();
    setFeedbackStatus(`Saved ${format.format(items.length)} markers locally. Export CSV backup.`, "warning");
    return;
  }

  els.saveFeedback.disabled = true;
  setFeedbackStatus(`Submitting ${format.format(items.length)} markers.`, "pending");
  try {
    await submitFeedbackItemsToGoogleForm(items);
    selectedMarkerIds.clear();
    renderAll();
    setFeedbackStatus(`Submitted ${format.format(items.length)} markers.`, "success");
  } catch (error) {
    selectedMarkerIds.clear();
    renderAll();
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
  renderAll();
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
  resetMarkerFilters(false);
  els.reviewerSource.value = reviewer.source;
  localStorage.setItem(STORAGE_KEYS.reviewer, JSON.stringify(reviewer));
  switchTab(state.selectedGroup ? "review" : "choose");
  renderAll();
}

function switchTab(tab) {
  state.activeTab = tab;
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tab);
  });
  els.tabPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.panel === tab);
  });
}

function resetMarkerFilters(render = true) {
  state.search = "";
  state.trait = "All";
  state.chrom = "All";
  state.priority = "All";
  els.searchInput.value = "";
  els.traitFilter.value = "All";
  els.chromFilter.value = "All";
  els.priorityFilter.value = "All";
  if (render) renderTable();
}

function renderAll() {
  renderGroupCards();
  renderTable();
  renderSelectionSummary();
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
  document.addEventListener("click", (event) => {
    const tabButton = event.target.closest("[data-tab]");
    if (tabButton) {
      switchTab(tabButton.dataset.tab);
      return;
    }
    const groupButton = event.target.closest("[data-group]");
    if (groupButton) {
      selectGroup(groupButton.dataset.group);
    }
  });

  els.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    selectedMarkerIds.clear();
    renderTable();
  });

  [
    [els.traitFilter, "trait"],
    [els.chromFilter, "chrom"],
    [els.priorityFilter, "priority"],
  ].forEach(([select, key]) => {
    select.addEventListener("change", (event) => {
      state[key] = event.target.value;
      selectedMarkerIds.clear();
      renderTable();
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
    renderTable();
  });
  els.catalogBody.addEventListener("click", (event) => {
    const checkbox = event.target.closest(".marker-checkbox");
    if (checkbox) {
      toggleMarkerSelection(checkbox.dataset.markerId);
      return;
    }
    const button = event.target.closest("[data-marker-id]");
    if (!button) return;
    toggleMarkerSelection(button.dataset.markerId);
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
  setOptions(els.priorityFilter, uniqueValues("priority"));
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
  renderStaticCharts();
  updateFeedbackCount();
  setFeedbackStatus(
    isFeedbackFormConfigured() ? "Ready to submit." : "Form not connected; CSV backup enabled.",
    isFeedbackFormConfigured() ? "ready" : "warning",
  );
  switchTab("summary");
  renderAll();
}

init();
