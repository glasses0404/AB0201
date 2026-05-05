const API_BASE_URL = "http://127.0.0.1:8000";

const recentApplicationsBtn = document.getElementById("recentApplicationsBtn");
const recentApplicationsBox = document.getElementById("recentApplicationsBox");
const recentApplicationsOutput = document.getElementById(
  "recentApplicationsOutput",
);
const recentStatusFilter = document.getElementById("recentStatusFilter");
const recentBidderFilter = document.getElementById("recentBidderFilter");
const recentCandidateFilter = document.getElementById("recentCandidateFilter");
const applyRecentFiltersBtn = document.getElementById("applyRecentFiltersBtn");

const managerOverrideBox = document.getElementById("managerOverrideBox");
const overrideCodeInput = document.getElementById("overrideCode");
const overrideByInput = document.getElementById("overrideBy");
const overrideReasonInput = document.getElementById("overrideReason");
const managerOverrideUsedEl = document.getElementById("managerOverrideUsed");

const bidderNameSelect = document.getElementById("bidderName");
const customBidderNameInput = document.getElementById("customBidderName");

const candidateSearchInput = document.getElementById("candidateSearch");
const candidateSelect = document.getElementById("candidateSelect");
const candidatePreview = document.getElementById("candidatePreview");

const toggleCreateCandidateBtn = document.getElementById(
  "toggleCreateCandidateBtn",
);
const createCandidateBox = document.getElementById("createCandidateBox");
const createCandidateBtn = document.getElementById("createCandidateBtn");

const newFirstNameInput = document.getElementById("newFirstName");
const newLastNameInput = document.getElementById("newLastName");
const newEmailInput = document.getElementById("newEmail");
const newPhoneInput = document.getElementById("newPhone");
const newLocationInput = document.getElementById("newLocation");
const newLinkedinInput = document.getElementById("newLinkedin");
const newGithubInput = document.getElementById("newGithub");
const newPortfolioInput = document.getElementById("newPortfolio");
const newWorkAuthorizationInput = document.getElementById(
  "newWorkAuthorization",
);
const newSponsorshipRequiredInput = document.getElementById(
  "newSponsorshipRequired",
);
const newExpectedSalaryInput = document.getElementById("newExpectedSalary");
const newResumeTextInput = document.getElementById("newResumeText");

const companyNameInput = document.getElementById("companyName");
const jobTitleInput = document.getElementById("jobTitle");
const detectJobInfoBtn = document.getElementById("detectJobInfoBtn");
const aiDetectJobInfoBtn = document.getElementById("aiDetectJobInfoBtn");
const jobInfoPreview = document.getElementById("jobInfoPreview");
const screeningQuestionsInput = document.getElementById("screeningQuestions");
const currentUrlDiv = document.getElementById("currentUrl");
const captureBtn = document.getElementById("captureBtn");
const autofillBtn = document.getElementById("autofillBtn");
const statusDiv = document.getElementById("status");
const dailyReportBtn = document.getElementById("dailyReportBtn");
const dailyReportBox = document.getElementById("dailyReportBox");
const dailyReportOutput = document.getElementById("dailyReportOutput");

const resultBox = document.getElementById("resultBox");
const applicationIdEl = document.getElementById("applicationId");
const matchScoreEl = document.getElementById("matchScore");
const lowMatchWarningBox = document.getElementById("lowMatchWarningBox");
const duplicateStatusEl = document.getElementById("duplicateStatus");
const duplicateWarningBox = document.getElementById("duplicateWarningBox");
const applicationStatusEl = document.getElementById("applicationStatus");
const submittedAtEl = document.getElementById("submittedAt");
const statusSelect = document.getElementById("statusSelect");
const updateStatusBtn = document.getElementById("updateStatusBtn");
const coverLetterOutput = document.getElementById("coverLetterOutput");
const screeningAnswersOutput = document.getElementById(
  "screeningAnswersOutput",
);
const copyCoverLetterBtn = document.getElementById("copyCoverLetterBtn");
const copyScreeningAnswersBtn = document.getElementById(
  "copyScreeningAnswersBtn",
);

let currentPageData = null;
let latestCandidateProfile = null;
let latestApplicationDraft = null;
let allCandidates = [];

function showLowMatchWarning(matchScore) {
  lowMatchWarningBox.classList.remove("hidden", "block", "review", "good");

  if (matchScore === null || matchScore === undefined) {
    lowMatchWarningBox.classList.add("hidden");
    lowMatchWarningBox.innerHTML = "";
    return;
  }

  const score = Number(matchScore);

  if (score < 60) {
    lowMatchWarningBox.classList.add("block");
    lowMatchWarningBox.innerHTML = `
      <strong>Low Match Score</strong><br>
      Match score is below 60%. This application should not be submitted unless a manager reviews and approves it.
    `;
    return;
  }

  if (score >= 60 && score < 75) {
    lowMatchWarningBox.classList.add("review");
    lowMatchWarningBox.innerHTML = `
      <strong>Medium Match Score</strong><br>
      Match score is between 60% and 75%. Please review carefully before submitting.
    `;
    return;
  }

  lowMatchWarningBox.classList.add("good");
  lowMatchWarningBox.innerHTML = `
    <strong>Good Match Score</strong><br>
    Match score is 75% or higher.
  `;
}

function showDuplicateWarning(duplicateStatus) {
  duplicateWarningBox.classList.remove("hidden", "exact", "possible", "unique");

  if (duplicateStatus === "Exact Duplicate") {
    duplicateWarningBox.classList.add("exact");
    duplicateWarningBox.innerHTML = `
      <strong>Exact Duplicate Detected</strong><br>
      This candidate already has an application with the same canonical job URL.
      Do not submit this application again unless a manager approves it.
    `;
    return;
  }

  if (duplicateStatus === "Possible Duplicate") {
    duplicateWarningBox.classList.add("possible");
    duplicateWarningBox.innerHTML = `
      <strong>Possible Duplicate Detected</strong><br>
      Same candidate, company, and job title may already exist.
      Please review carefully before submitting.
    `;
    return;
  }

  if (duplicateStatus === "Unique") {
    duplicateWarningBox.classList.add("unique");
    duplicateWarningBox.innerHTML = `
      <strong>Unique Application</strong><br>
      No duplicate found for this candidate based on current rules.
    `;
    return;
  }

  duplicateWarningBox.classList.add("hidden");
  duplicateWarningBox.innerHTML = "";
}

async function getRecentApplications(filters = {}) {
  const params = new URLSearchParams();

  params.set("limit", "20");

  if (filters.status) {
    params.set("status", filters.status);
  }

  if (filters.createdBy) {
    params.set("created_by", filters.createdBy);
  }

  if (filters.candidateId) {
    params.set("candidate_id", filters.candidateId);
  }

  const response = await fetch(
    `${API_BASE_URL}/applications?${params.toString()}`,
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText);
  }

  return await response.json();
}

function getRecentApplicationFilters() {
  return {
    status: recentStatusFilter.value,
    createdBy: recentBidderFilter.value.trim(),
    candidateId: recentCandidateFilter.value.trim(),
  };
}

function formatDateTime(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString();
  } catch (error) {
    return value;
  }
}

function renderRecentApplications(applications) {
  recentApplicationsOutput.innerHTML = "";

  if (!applications.length) {
    recentApplicationsOutput.innerHTML = `
      <div class="application-card">
        No applications found for these filters.
      </div>
    `;
    return;
  }

  applications.forEach((app) => {
    const card = document.createElement("div");
    card.className = "application-card";

    const duplicatePill =
      app.duplicate_status && app.duplicate_status !== "Unique"
        ? `<span class="application-warning-pill">${app.duplicate_status}</span>`
        : "";

    const lowMatchPill =
      app.match_score !== null &&
      app.match_score !== undefined &&
      Number(app.match_score) < 60
        ? `<span class="application-warning-pill">Low Match</span>`
        : "";

    card.innerHTML = `
      <div class="application-card-title">
        #${app.id} - ${app.job_title || "Unknown Job"}
      </div>

      <div class="application-card-meta">
        ${app.company_name || "Unknown Company"}<br>
        Candidate ID: ${app.candidate_id || "-"} | Bidder: ${app.created_by || "Unknown"}<br>
        Match: ${app.match_score !== null && app.match_score !== undefined ? app.match_score + "%" : "-"}<br>
        Created: ${formatDateTime(app.created_at)}<br>
        Submitted: ${formatDateTime(app.submitted_at)}
      </div>

      <span class="application-status-pill">${app.status || "-"}</span>
      ${duplicatePill}
      ${lowMatchPill}

      <div class="application-card-actions">
        <button class="load-application-btn" data-id="${app.id}">Load</button>
        <button class="open-url-btn" data-url="${encodeURIComponent(app.original_job_url || "")}">Open URL</button>
      </div>
    `;

    recentApplicationsOutput.appendChild(card);
  });

  document.querySelectorAll(".load-application-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const applicationId = button.getAttribute("data-id");
      await loadApplicationIntoResultBox(applicationId);
    });
  });

  document.querySelectorAll(".open-url-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const encodedUrl = button.getAttribute("data-url");
      const url = decodeURIComponent(encodedUrl || "");

      if (url) {
        chrome.tabs.create({ url });
      }
    });
  });
}

async function loadApplicationIntoResultBox(applicationId) {
  const response = await fetch(`${API_BASE_URL}/applications/${applicationId}`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText);
  }

  const application = await response.json();

  displayApplicationDraft(application);
  setStatus(`Loaded application #${application.id}.`, "success");
}

async function loadRecentApplications() {
  const filters = getRecentApplicationFilters();
  const applications = await getRecentApplications(filters);

  recentApplicationsBox.classList.remove("hidden");
  renderRecentApplications(applications);
}

function clearCreateCandidateForm() {
  newFirstNameInput.value = "";
  newLastNameInput.value = "";
  newEmailInput.value = "";
  newPhoneInput.value = "";
  newLocationInput.value = "";
  newLinkedinInput.value = "";
  newGithubInput.value = "";
  newPortfolioInput.value = "";
  newWorkAuthorizationInput.value = "";
  newSponsorshipRequiredInput.value = "";
  newExpectedSalaryInput.value = "";
  newResumeTextInput.value = "";
}

function buildCandidatePayload() {
  return {
    first_name: newFirstNameInput.value.trim(),
    last_name: newLastNameInput.value.trim(),
    email: newEmailInput.value.trim() || null,
    phone: newPhoneInput.value.trim() || null,
    location: newLocationInput.value.trim() || null,
    linkedin: newLinkedinInput.value.trim() || null,
    github: newGithubInput.value.trim() || null,
    portfolio: newPortfolioInput.value.trim() || null,
    work_authorization: newWorkAuthorizationInput.value.trim() || null,
    sponsorship_required: newSponsorshipRequiredInput.value || null,
    expected_salary: newExpectedSalaryInput.value.trim() || null,
    resume_text: newResumeTextInput.value.trim(),
  };
}

function getSelectedBidderName() {
  const selected = bidderNameSelect.value;

  if (selected === "Other") {
    return customBidderNameInput.value.trim();
  }

  return selected;
}

function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

async function getDailyReport(reportDate) {
  const response = await fetch(
    `${API_BASE_URL}/reports/daily?report_date=${reportDate}`,
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText);
  }

  return await response.json();
}

function formatDailyReport(report) {
  const summary = report.summary || {};
  const byBidder = report.by_bidder || {};
  const byCandidate = report.by_candidate || {};

  const bidderLines =
    Object.entries(byBidder)
      .map(([name, count]) => `- ${name}: ${count}`)
      .join("\n") || "- No bidder data";

  const candidateLines =
    Object.entries(byCandidate)
      .map(([name, count]) => `- ${name}: ${count}`)
      .join("\n") || "- No candidate data";

  const statusLines =
    Object.entries(summary.status_counts_created_today || {})
      .map(([status, count]) => `- ${status}: ${count}`)
      .join("\n") || "- No status data";

  return `
Date: ${report.report_date}

Summary:
- Total Created: ${summary.total_created || 0}
- Total Submitted: ${summary.total_submitted || 0}
- Low Match: ${summary.total_low_match || 0}
- Duplicates: ${summary.total_duplicates || 0}

Status:
${statusLines}

By Bidder:
${bidderLines}

By Candidate:
${candidateLines}
`.trim();
}

async function createCandidate(payload) {
  const response = await fetch(`${API_BASE_URL}/candidates`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText);
  }

  return await response.json();
}

function applyDetectedJobInfo(detectedJobInfo) {
  if (!detectedJobInfo) return;

  if (detectedJobInfo.companyName && !companyNameInput.value.trim()) {
    companyNameInput.value = detectedJobInfo.companyName;
  }

  if (detectedJobInfo.jobTitle && !jobTitleInput.value.trim()) {
    jobTitleInput.value = detectedJobInfo.jobTitle;
  }

  showDetectedJobInfoPreview(detectedJobInfo);
}

function showDetectedJobInfoPreview(info) {
  if (!info) {
    jobInfoPreview.classList.add("hidden");
    jobInfoPreview.innerHTML = "";
    return;
  }

  jobInfoPreview.classList.remove("hidden");

  jobInfoPreview.innerHTML = `
    <strong>Detected Job Info</strong><br>
    Company: ${info.companyName || "Not detected"}<br>
    Job Title: ${info.jobTitle || "Not detected"}<br>
    Page Title: ${info.pageTitle || "N/A"}<br>
    Host: ${info.hostname || "N/A"}
  `;
}

function setStatus(message, type = "success") {
  statusDiv.className = type;
  statusDiv.innerText = message;
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

async function getJobPageData() {
  const tab = await getActiveTab();

  return await chrome.tabs.sendMessage(tab.id, {
    type: "GET_JOB_PAGE_DATA",
  });
}

async function loadCurrentUrl() {
  try {
    currentPageData = await getJobPageData();
    currentUrlDiv.innerText = currentPageData.url;

    if (currentPageData.detectedJobInfo) {
      applyDetectedJobInfo(currentPageData.detectedJobInfo);
    }
  } catch (error) {
    currentUrlDiv.innerText = "Could not read current page.";
    setStatus(
      "Could not read this page. Refresh the page and try again.",
      "error",
    );
  }
}

function parseScreeningQuestions(rawText) {
  return rawText
    .split("\n")
    .map((q) => q.trim())
    .filter((q) => q.length > 0);
}

function getSelectedCandidateId() {
  const value = candidateSelect.value;
  return value ? Number(value) : null;
}

async function getCandidate(candidateId) {
  const response = await fetch(`${API_BASE_URL}/candidates/${candidateId}`);

  if (!response.ok) {
    throw new Error("Candidate not found");
  }

  return await response.json();
}

async function loadCandidates() {
  try {
    const response = await fetch(`${API_BASE_URL}/candidates`);

    if (!response.ok) {
      throw new Error("Could not load candidates");
    }

    allCandidates = await response.json();

    renderCandidateOptions(allCandidates);

    if (allCandidates.length === 0) {
      setStatus(
        "No candidates found. Create a candidate from /docs first.",
        "error",
      );
    }
  } catch (error) {
    console.error(error);
    candidateSelect.innerHTML = `<option value="">Could not load candidates</option>`;
    setStatus("Candidate load error: " + error.message, "error");
  }
}

function renderCandidateOptions(candidates) {
  candidateSelect.innerHTML = "";

  if (!candidates.length) {
    candidateSelect.innerHTML = `<option value="">No candidates found</option>`;
    candidatePreview.classList.add("hidden");
    return;
  }

  const emptyOption = document.createElement("option");
  emptyOption.value = "";
  emptyOption.textContent = "Select a candidate";
  candidateSelect.appendChild(emptyOption);

  candidates.forEach((candidate) => {
    const option = document.createElement("option");
    option.value = candidate.id;

    const name =
      `${candidate.first_name || ""} ${candidate.last_name || ""}`.trim();
    const location = candidate.location ? ` - ${candidate.location}` : "";
    const email = candidate.email ? ` - ${candidate.email}` : "";

    option.textContent = `#${candidate.id} - ${name}${location}${email}`;
    candidateSelect.appendChild(option);
  });

  if (candidates.length === 1) {
    candidateSelect.value = candidates[0].id;
    updateCandidatePreview();
  }
}

function filterCandidates(searchText) {
  const q = searchText.toLowerCase().trim();

  if (!q) {
    renderCandidateOptions(allCandidates);
    return;
  }

  const filtered = allCandidates.filter((candidate) => {
    const text = [
      candidate.id,
      candidate.first_name,
      candidate.last_name,
      candidate.email,
      candidate.phone,
      candidate.location,
      candidate.linkedin,
      candidate.github,
      candidate.work_authorization,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return text.includes(q);
  });

  renderCandidateOptions(filtered);
}

function updateCandidatePreview() {
  const candidateId = getSelectedCandidateId();

  if (!candidateId) {
    candidatePreview.classList.add("hidden");
    candidatePreview.innerHTML = "";
    latestCandidateProfile = null;
    return;
  }

  const candidate = allCandidates.find((c) => c.id === candidateId);

  if (!candidate) {
    candidatePreview.classList.add("hidden");
    candidatePreview.innerHTML = "";
    latestCandidateProfile = null;
    return;
  }

  latestCandidateProfile = candidate;

  const name =
    `${candidate.first_name || ""} ${candidate.last_name || ""}`.trim();

  candidatePreview.classList.remove("hidden");
  candidatePreview.innerHTML = `
    <strong>${name}</strong><br>
    ${candidate.email || "No email"} | ${candidate.phone || "No phone"}<br>
    ${candidate.location || "No location"}<br>
    Work Auth: ${candidate.work_authorization || "Not provided"}<br>
    Sponsorship: ${candidate.sponsorship_required || "Not provided"}
  `;
}

function safeJsonPretty(value) {
  if (!value) return "";

  try {
    const parsed = JSON.parse(value);
    return JSON.stringify(parsed, null, 2);
  } catch (error) {
    return value;
  }
}

function displayApplicationDraft(result) {
  latestApplicationDraft = result;

  resultBox.classList.remove("hidden");

  applicationIdEl.innerText = result.id || "-";
  matchScoreEl.innerText =
    result.match_score !== null && result.match_score !== undefined
      ? `${result.match_score}%`
      : "-";

  showLowMatchWarning(result.match_score);

  duplicateStatusEl.innerText = result.duplicate_status || "-";
  showDuplicateWarning(result.duplicate_status);

  applicationStatusEl.innerText = result.status || "-";

  submittedAtEl.innerText = result.submitted_at
    ? new Date(result.submitted_at).toLocaleString()
    : "-";

  managerOverrideUsedEl.innerText = result.manager_override_used || "No";

  if (statusSelect && result.status) {
    statusSelect.value = result.status;
  }

  if (result.duplicate_status === "Exact Duplicate" && statusSelect) {
    statusSelect.value = "Duplicate";
  }

  if (
    result.duplicate_status !== "Exact Duplicate" &&
    result.match_score !== null &&
    result.match_score !== undefined &&
    Number(result.match_score) < 60 &&
    statusSelect
  ) {
    statusSelect.value = "Skipped - Low Match";
  }

  coverLetterOutput.innerText =
    result.cover_letter || "No cover letter generated.";
  screeningAnswersOutput.innerText =
    safeJsonPretty(result.screening_answers) ||
    "No screening answers generated.";

  updateManagerOverrideVisibility();
}

async function copyToClipboard(text, successMessage) {
  if (!text) {
    setStatus("Nothing to copy.", "error");
    return;
  }

  await navigator.clipboard.writeText(text);
  setStatus(successMessage, "success");
}

async function aiExtractJobInfo(pageData) {
  const response = await fetch(`${API_BASE_URL}/extract-job-info`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: pageData.url,
      page_title: pageData.title,
      page_text: pageData.pageText,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText);
  }

  return await response.json();
}

function showAiJobInfoPreview(info) {
  jobInfoPreview.classList.remove("hidden");

  jobInfoPreview.innerHTML = `
    <strong>AI Detected Job Info</strong><br>
    Company: ${info.company_name || "Not detected"}<br>
    Job Title: ${info.job_title || "Not detected"}<br>
    Confidence: ${info.confidence || "Low"}<br>
    Reason: ${info.reason || "N/A"}
  `;
}

async function updateApplicationStatus(
  applicationId,
  status,
  overrideData = {},
) {
  const response = await fetch(
    `${API_BASE_URL}/applications/${applicationId}/status`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status,
        override_code: overrideData.overrideCode || null,
        override_reason: overrideData.overrideReason || null,
        override_by: overrideData.overrideBy || null,
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText);
  }

  return await response.json();
}

function saveBidderName() {
  const selected = bidderNameSelect.value;
  const custom = customBidderNameInput.value.trim();

  chrome.storage.local.set({
    bidderName: selected,
    customBidderName: custom,
  });
}

function loadSavedBidderName() {
  chrome.storage.local.get(["bidderName", "customBidderName"], (result) => {
    if (result.bidderName) {
      bidderNameSelect.value = result.bidderName;
    }

    if (result.bidderName === "Other") {
      customBidderNameInput.classList.remove("hidden");
      customBidderNameInput.value = result.customBidderName || "";
    }
  });
}

function requiresManagerOverride(applicationDraft, newStatus) {
  if (!applicationDraft || newStatus !== "Submitted") {
    return false;
  }

  const isExactDuplicate =
    applicationDraft.duplicate_status === "Exact Duplicate";
  const isLowMatch =
    applicationDraft.match_score !== null &&
    applicationDraft.match_score !== undefined &&
    Number(applicationDraft.match_score) < 60;

  return isExactDuplicate || isLowMatch;
}

function updateManagerOverrideVisibility() {
  const newStatus = statusSelect.value;

  if (requiresManagerOverride(latestApplicationDraft, newStatus)) {
    managerOverrideBox.classList.remove("hidden");
  } else {
    managerOverrideBox.classList.add("hidden");
  }
}

function getOverrideData() {
  return {
    overrideCode: overrideCodeInput.value.trim(),
    overrideBy: overrideByInput.value.trim(),
    overrideReason: overrideReasonInput.value.trim(),
  };
}

recentApplicationsBtn.addEventListener("click", async () => {
  try {
    setStatus("Loading recent applications...", "success");

    if (recentApplicationsBox.classList.contains("hidden")) {
      recentApplicationsBox.classList.remove("hidden");
    } else {
      recentApplicationsBox.classList.add("hidden");
      return;
    }

    await loadRecentApplications();

    setStatus("Recent applications loaded.", "success");
  } catch (error) {
    console.error(error);
    setStatus("Recent applications error: " + error.message, "error");
  }
});

applyRecentFiltersBtn.addEventListener("click", async () => {
  try {
    setStatus("Applying filters...", "success");

    await loadRecentApplications();

    setStatus("Filters applied.", "success");
  } catch (error) {
    console.error(error);
    setStatus("Filter error: " + error.message, "error");
  }
});

statusSelect.addEventListener("change", () => {
  updateManagerOverrideVisibility();
});

bidderNameSelect.addEventListener("change", () => {
  if (bidderNameSelect.value === "Other") {
    customBidderNameInput.classList.remove("hidden");
  } else {
    customBidderNameInput.classList.add("hidden");
    customBidderNameInput.value = "";
  }

  saveBidderName();
});

customBidderNameInput.addEventListener("input", () => {
  saveBidderName();
});

dailyReportBtn.addEventListener("click", async () => {
  try {
    setStatus("Loading today report...", "success");

    const today = getTodayDateString();
    const report = await getDailyReport(today);

    dailyReportBox.classList.remove("hidden");
    dailyReportOutput.innerText = formatDailyReport(report);

    setStatus("Today report loaded.", "success");
  } catch (error) {
    console.error(error);
    setStatus("Daily report error: " + error.message, "error");
  }
});

aiDetectJobInfoBtn.addEventListener("click", async () => {
  try {
    setStatus("AI is detecting job info...", "success");

    currentPageData = await getJobPageData();

    const result = await aiExtractJobInfo(currentPageData);

    if (result.company_name) {
      companyNameInput.value = result.company_name;
    }

    if (result.job_title) {
      jobTitleInput.value = result.job_title;
    }

    showAiJobInfoPreview(result);

    setStatus(
      "AI job info detection completed. Please review before generating.",
      "success",
    );
  } catch (error) {
    console.error(error);
    setStatus("AI detect error: " + error.message, "error");
  }
});

updateStatusBtn.addEventListener("click", async () => {
  try {
    if (!latestApplicationDraft || !latestApplicationDraft.id) {
      setStatus("No application draft selected.", "error");
      return;
    }

    const newStatus = statusSelect.value;
    const overrideRequired = requiresManagerOverride(
      latestApplicationDraft,
      newStatus,
    );

    let overrideData = {};

    if (overrideRequired) {
      overrideData = getOverrideData();

      if (!overrideData.overrideCode || !overrideData.overrideReason) {
        setStatus("Manager override code and reason are required.", "error");
        managerOverrideBox.classList.remove("hidden");
        return;
      }
    }

    setStatus("Updating application status...", "success");

    const updatedApplication = await updateApplicationStatus(
      latestApplicationDraft.id,
      newStatus,
      overrideData,
    );

    displayApplicationDraft(updatedApplication);

    if (updatedApplication.manager_override_used === "Yes") {
      setStatus(
        `Status updated to Submitted with manager override.`,
        "success",
      );
    } else {
      setStatus(`Status updated to: ${newStatus}`, "success");
    }
  } catch (error) {
    console.error(error);
    setStatus("Status update error: " + error.message, "error");
  }
});

detectJobInfoBtn.addEventListener("click", async () => {
  try {
    setStatus("Detecting job info...", "success");

    currentPageData = await getJobPageData();

    if (!currentPageData.detectedJobInfo) {
      setStatus("Could not detect job info from this page.", "error");
      return;
    }

    // For manual button click, overwrite existing values
    companyNameInput.value = currentPageData.detectedJobInfo.companyName || "";
    jobTitleInput.value = currentPageData.detectedJobInfo.jobTitle || "";

    showDetectedJobInfoPreview(currentPageData.detectedJobInfo);

    setStatus(
      "Job info detected. Please review before generating draft.",
      "success",
    );
  } catch (error) {
    console.error(error);
    setStatus("Auto-detect error: " + error.message, "error");
  }
});

candidateSearchInput.addEventListener("input", () => {
  filterCandidates(candidateSearchInput.value);
});

candidateSelect.addEventListener("change", () => {
  updateCandidatePreview();
});

toggleCreateCandidateBtn.addEventListener("click", () => {
  const isHidden = createCandidateBox.classList.contains("hidden");

  if (isHidden) {
    createCandidateBox.classList.remove("hidden");
    toggleCreateCandidateBtn.innerText = "Hide Create Candidate";
  } else {
    createCandidateBox.classList.add("hidden");
    toggleCreateCandidateBtn.innerText = "Show Create Candidate";
  }
});

createCandidateBtn.addEventListener("click", async () => {
  try {
    setStatus("Creating candidate...", "success");

    const payload = buildCandidatePayload();

    if (!payload.first_name || !payload.last_name || !payload.resume_text) {
      setStatus(
        "First name, last name, and resume text are required.",
        "error",
      );
      return;
    }

    const newCandidate = await createCandidate(payload);

    await loadCandidates();

    candidateSelect.value = String(newCandidate.id);
    updateCandidatePreview();

    clearCreateCandidateForm();

    createCandidateBox.classList.add("hidden");
    toggleCreateCandidateBtn.innerText = "Show Create Candidate";

    setStatus(
      `Candidate created: ${newCandidate.first_name} ${newCandidate.last_name}`,
      "success",
    );
  } catch (error) {
    console.error(error);
    setStatus("Create candidate error: " + error.message, "error");
  }
});

captureBtn.addEventListener("click", async () => {
  try {
    setStatus("Generating application draft...", "success");
    resultBox.classList.add("hidden");

    const bidderName = getSelectedBidderName();
    const candidateId = getSelectedCandidateId();
    let companyName = companyNameInput.value.trim();
    let jobTitle = jobTitleInput.value.trim();

    if (!bidderName) {
      setStatus("Please select or enter bidder name.", "error");
      return;
    }

    if (!candidateId) {
      setStatus("Please select a candidate.", "error");
      return;
    }

    if (!companyName || !jobTitle) {
      setStatus(
        "Company or job title missing. Running AI detection...",
        "success",
      );

      const extracted = await aiExtractJobInfo(currentPageData);

      if (extracted.company_name) {
        companyName = extracted.company_name;
        companyNameInput.value = companyName;
      }

      if (extracted.job_title) {
        jobTitle = extracted.job_title;
        jobTitleInput.value = jobTitle;
      }

      showAiJobInfoPreview(extracted);
    }

    if (!companyName || !jobTitle) {
      setStatus(
        "Could not detect Company Name or Job Title. Please enter them manually.",
        "error",
      );
      return;
    }

    currentPageData = await getJobPageData();

    const screeningQuestions = parseScreeningQuestions(
      screeningQuestionsInput.value,
    );

    const payload = {
      candidate_id: candidateId,
      company_name: companyName,
      job_title: jobTitle,
      original_job_url: currentPageData.url,
      job_description: currentPageData.pageText,
      screening_questions: screeningQuestions,
      created_by: bidderName,
    };

    const response = await fetch(`${API_BASE_URL}/applications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText);
    }

    const result = await response.json();

    displayApplicationDraft(result);

    setStatus(
      `Draft created successfully. Match Score: ${result.match_score}%.`,
      "success",
    );

    console.log("Application Draft:", result);
  } catch (error) {
    console.error(error);
    setStatus("Error: " + error.message, "error");
  }
});

autofillBtn.addEventListener("click", async () => {
  try {
    const candidateId = getSelectedCandidateId();

    if (!candidateId) {
      setStatus("Please select a candidate first.", "error");
      return;
    }

    latestCandidateProfile = await getCandidate(candidateId);

    const tab = await getActiveTab();

    const response = await chrome.tabs.sendMessage(tab.id, {
      type: "AUTOFILL_BASIC_FIELDS",
      profile: latestCandidateProfile,
    });

    setStatus(response.message, "success");
  } catch (error) {
    console.error(error);
    setStatus("Autofill error: " + error.message, "error");
  }
});

copyCoverLetterBtn.addEventListener("click", async () => {
  await copyToClipboard(coverLetterOutput.innerText, "Cover letter copied.");
});

copyScreeningAnswersBtn.addEventListener("click", async () => {
  await copyToClipboard(
    screeningAnswersOutput.innerText,
    "Screening answers copied.",
  );
});

loadSavedBidderName();
loadCurrentUrl();
loadCandidates();
