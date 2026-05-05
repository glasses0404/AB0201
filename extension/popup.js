const API_BASE_URL = "http://127.0.0.1:8000";

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

const resultBox = document.getElementById("resultBox");
const applicationIdEl = document.getElementById("applicationId");
const matchScoreEl = document.getElementById("matchScore");
const duplicateStatusEl = document.getElementById("duplicateStatus");
const applicationStatusEl = document.getElementById("applicationStatus");
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

  duplicateStatusEl.innerText = result.duplicate_status || "-";
  applicationStatusEl.innerText = result.status || "-";

  coverLetterOutput.innerText =
    result.cover_letter || "No cover letter generated.";
  screeningAnswersOutput.innerText =
    safeJsonPretty(result.screening_answers) ||
    "No screening answers generated.";
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

    const candidateId = getSelectedCandidateId();
    let companyName = companyNameInput.value.trim();
    let jobTitle = jobTitleInput.value.trim();

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
      created_by: "Chrome Extension",
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

loadCurrentUrl();
loadCandidates();
