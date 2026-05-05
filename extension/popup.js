const API_BASE_URL = "http://127.0.0.1:8000";

const candidateIdInput = document.getElementById("candidateId");
const companyNameInput = document.getElementById("companyName");
const jobTitleInput = document.getElementById("jobTitle");
const screeningQuestionsInput = document.getElementById("screeningQuestions");
const currentUrlDiv = document.getElementById("currentUrl");
const captureBtn = document.getElementById("captureBtn");
const autofillBtn = document.getElementById("autofillBtn");
const statusDiv = document.getElementById("status");

let currentPageData = null;
let latestCandidateProfile = null;

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
    type: "GET_JOB_PAGE_DATA"
  });
}

async function loadCurrentUrl() {
  try {
    currentPageData = await getJobPageData();
    currentUrlDiv.innerText = currentPageData.url;
  } catch (error) {
    currentUrlDiv.innerText = "Could not read current page.";
    setStatus("Could not read this page. Refresh the page and try again.", "error");
  }
}

function parseScreeningQuestions(rawText) {
  return rawText
    .split("\n")
    .map(q => q.trim())
    .filter(q => q.length > 0);
}

async function getCandidate(candidateId) {
  const response = await fetch(`${API_BASE_URL}/candidates/${candidateId}`);

  if (!response.ok) {
    throw new Error("Candidate not found");
  }

  return await response.json();
}

captureBtn.addEventListener("click", async () => {
  try {
    setStatus("Generating application draft...", "success");

    const candidateId = Number(candidateIdInput.value);
    const companyName = companyNameInput.value.trim();
    const jobTitle = jobTitleInput.value.trim();

    if (!candidateId || !companyName || !jobTitle) {
      setStatus("Please enter Candidate ID, Company Name, and Job Title.", "error");
      return;
    }

    currentPageData = await getJobPageData();

    const screeningQuestions = parseScreeningQuestions(screeningQuestionsInput.value);

    const payload = {
      candidate_id: candidateId,
      company_name: companyName,
      job_title: jobTitle,
      original_job_url: currentPageData.url,
      job_description: currentPageData.pageText,
      screening_questions: screeningQuestions,
      created_by: "Chrome Extension"
    };

    const response = await fetch(`${API_BASE_URL}/applications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText);
    }

    const result = await response.json();

    setStatus(
      `Draft created. Match Score: ${result.match_score}%. Duplicate: ${result.duplicate_status}.`,
      "success"
    );

    console.log("Application Draft:", result);

  } catch (error) {
    console.error(error);
    setStatus("Error: " + error.message, "error");
  }
});

autofillBtn.addEventListener("click", async () => {
  try {
    const candidateId = Number(candidateIdInput.value);

    if (!candidateId) {
      setStatus("Please enter Candidate ID first.", "error");
      return;
    }

    latestCandidateProfile = await getCandidate(candidateId);

    const tab = await getActiveTab();

    const response = await chrome.tabs.sendMessage(tab.id, {
      type: "AUTOFILL_BASIC_FIELDS",
      profile: latestCandidateProfile
    });

    setStatus(response.message, "success");

  } catch (error) {
    console.error(error);
    setStatus("Autofill error: " + error.message, "error");
  }
});

loadCurrentUrl();