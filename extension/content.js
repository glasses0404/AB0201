const AUTOBIDDER_API_BASE_URL = "http://127.0.0.1:8000";

let autobidderDetectedJobPage = null;
let autobidderFloatingPanel = null;
let autobidderAutoAnalysisStarted = false;
let autobidderLatestScreeningFields = [];

function createAutobidderFloatingPanel() {
  if (document.getElementById("autobidder-floating-panel")) {
    return;
  }

  const panel = document.createElement("div");
  panel.id = "autobidder-floating-panel";

  panel.innerHTML = `
  <div id="autobidder-panel-header">
    <div>
      <strong>Autobidder</strong>
      <div id="autobidder-panel-subtitle">Job assistant</div>
    </div>
    <button id="autobidder-close-btn">×</button>
  </div>

  <div id="autobidder-panel-body">
    <div id="autobidder-job-info">
      Waiting for job page analysis...
    </div>

    <div id="autobidder-progress-area">
      <div id="autobidder-current-row">
        <div id="autobidder-spinner"></div>
        <div id="autobidder-current-step">Ready</div>
      </div>

      <div id="autobidder-progress-log"></div>
    </div>

    <div id="autobidder-actions">
      <button id="autobidder-run-analysis-btn">Analyze Job</button>
      <button id="autobidder-autofill-btn">Autofill Fields + Resume + Answers</button>
      <button id="autobidder-copy-cover-letter-btn">Copy Cover Letter</button>
      <button id="autobidder-mark-submitted-btn">Mark Submitted + Sync</button>
    </div>

    <div id="autobidder-result-box"></div>
  </div>
`;

  const style = document.createElement("style");
  style.innerHTML = `
  #autobidder-floating-panel {
    position: fixed;
    right: 20px;
    bottom: 20px;
    width: 390px;
    max-height: 680px;
    overflow-y: auto;
    background: #ffffff;
    color: #111827;
    border: 1px solid #d1d5db;
    border-radius: 16px;
    box-shadow: 0 16px 45px rgba(0,0,0,0.22);
    z-index: 2147483647;
    font-family: Arial, sans-serif;
    font-size: 13px;
  }

  #autobidder-panel-header {
    background: #111827;
    color: white;
    padding: 12px 14px;
    border-radius: 16px 16px 0 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  #autobidder-panel-subtitle {
    font-size: 11px;
    opacity: 0.8;
    margin-top: 2px;
  }

  #autobidder-close-btn {
    background: transparent;
    color: white;
    border: none;
    font-size: 22px;
    cursor: pointer;
    line-height: 1;
  }

  #autobidder-panel-body {
    padding: 12px;
  }

  #autobidder-job-info {
    background: #f3f4f6;
    border: 1px solid #e5e7eb;
    padding: 9px;
    border-radius: 10px;
    margin-bottom: 10px;
    line-height: 1.4;
  }

  #autobidder-progress-area {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    padding: 9px;
    margin-bottom: 10px;
  }

  #autobidder-current-row {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 22px;
  }

  #autobidder-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid #e5e7eb;
    border-top: 2px solid #2563eb;
    border-radius: 50%;
    animation: autobidder-spin 0.8s linear infinite;
    display: none;
    flex-shrink: 0;
  }

  @keyframes autobidder-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  #autobidder-current-step {
    font-size: 12px;
    font-weight: bold;
    color: #111827;
  }

  #autobidder-progress-log {
    margin-top: 8px;
    max-height: 130px;
    overflow-y: auto;
    font-size: 12px;
    line-height: 1.45;
  }

  .autobidder-log-line {
    padding: 3px 0;
    border-bottom: 1px solid #eef2f7;
  }

  .autobidder-log-success {
    color: #166534;
  }

  .autobidder-log-error {
    color: #991b1b;
  }

  .autobidder-log-warning {
    color: #92400e;
  }

  .autobidder-log-info {
    color: #374151;
  }

  .autobidder-log-loading {
    color: #1d4ed8;
  }

  #autobidder-actions {
    display: grid;
    gap: 8px;
    margin-bottom: 10px;
  }

  #autobidder-panel-body button {
    width: 100%;
    padding: 9px;
    border: none;
    border-radius: 9px;
    background: #2563eb;
    color: white;
    cursor: pointer;
    font-size: 13px;
  }

  #autobidder-panel-body button:hover {
    background: #1d4ed8;
  }

  #autobidder-panel-body button:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }

  #autobidder-result-box {
    margin-top: 10px;
    white-space: pre-wrap;
    font-size: 12px;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    padding: 9px;
    border-radius: 10px;
    max-height: 360px;
    overflow-y: auto;
  }

  .autobidder-good {
    color: #166534;
    font-weight: bold;
  }

  .autobidder-warning {
    color: #92400e;
    font-weight: bold;
  }

  .autobidder-danger {
    color: #991b1b;
    font-weight: bold;
  }
      .autobidder-job-info-layout {
    display: grid;
    grid-template-columns: 1fr 118px;
    gap: 10px;
    align-items: center;
  }

  .autobidder-job-info-left {
    line-height: 1.45;
    min-width: 0;
  }

  .autobidder-score-card {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 86px;
  }

  .autobidder-score-placeholder {
    width: 96px;
    height: 66px;
    border: 1px dashed #d1d5db;
    border-radius: 10px;
    color: #6b7280;
    font-size: 11px;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    line-height: 1.3;
    background: #ffffff;
  }

  .autobidder-gauge-wrap {
    width: 105px;
    text-align: center;
  }

  .autobidder-gauge {
    position: relative;
    width: 86px;
    height: 45px;
    overflow: hidden;
    margin: 0 auto 2px auto;
  }

  .autobidder-gauge-bg {
    position: absolute;
    width: 86px;
    height: 86px;
    border: 9px solid #e5e7eb;
    border-radius: 50%;
    box-sizing: border-box;
  }

  .autobidder-gauge-fill {
    position: absolute;
    width: 86px;
    height: 86px;
    border: 9px solid #2563eb;
    border-radius: 50%;
    box-sizing: border-box;
    clip-path: inset(0 0 50% 0);
    transform-origin: 50% 50%;
    transition: transform 0.5s ease;
  }

  .autobidder-gauge-center {
    position: absolute;
    left: 30px;
    top: 24px;
    width: 26px;
    height: 26px;
    background: #111827;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .autobidder-gauge-check {
    color: white;
    font-size: 14px;
    font-weight: bold;
  }

  .autobidder-score-number {
    font-size: 20px;
    font-weight: bold;
    line-height: 1.1;
  }

  .autobidder-score-label {
    font-size: 11px;
    color: #4b5563;
    margin-top: 1px;
  }
`;

  document.documentElement.appendChild(style);
  document.body.appendChild(panel);

  autobidderFloatingPanel = panel;

  document
    .getElementById("autobidder-close-btn")
    .addEventListener("click", () => {
      panel.remove();
    });

  document
    .getElementById("autobidder-run-analysis-btn")
    .addEventListener("click", async () => {
      await runAutobidderPageAnalysis();
    });

  document
    .getElementById("autobidder-autofill-btn")
    .addEventListener("click", async () => {
      await runAutobidderAutofillFromPanel();
    });
  document
    .getElementById("autobidder-mark-submitted-btn")
    .addEventListener("click", async () => {
      await runAutobidderMarkSubmittedAndSync();
    });

  document
    .getElementById("autobidder-copy-cover-letter-btn")
    .addEventListener("click", async () => {
      const resultBox = document.getElementById("autobidder-result-box");

      const storageData = await new Promise((resolve) => {
        chrome.storage.local.get(["latestOnPageApplicationDraft"], resolve);
      });

      const draft = storageData.latestOnPageApplicationDraft;

      if (!draft || !draft.cover_letter) {
        resultBox.innerText = "No cover letter found. Click Analyze Job first.";
        return;
      }

      await navigator.clipboard.writeText(draft.cover_letter);

      resultBox.innerText = "Cover letter copied to clipboard.";
    });
}

function getPanelElement(id) {
  return document.getElementById(id);
}

function setPanelButtonsDisabled(disabled) {
  const buttonIds = [
    "autobidder-run-analysis-btn",
    "autobidder-autofill-btn",
    "autobidder-copy-cover-letter-btn",
    "autobidder-mark-submitted-btn",
  ];

  buttonIds.forEach((id) => {
    const button = getPanelElement(id);
    if (button) {
      button.disabled = disabled;
    }
  });
}

function clearPanelProgress() {
  const log = getPanelElement("autobidder-progress-log");
  const currentStep = getPanelElement("autobidder-current-step");
  const spinner = getPanelElement("autobidder-spinner");

  if (log) {
    log.innerHTML = "";
  }

  if (currentStep) {
    currentStep.innerText = "Ready";
  }

  if (spinner) {
    spinner.style.display = "none";
  }
}

function setPanelLoading(isLoading, message = "") {
  const spinner = getPanelElement("autobidder-spinner");
  const currentStep = getPanelElement("autobidder-current-step");

  if (spinner) {
    spinner.style.display = isLoading ? "block" : "none";
  }

  if (currentStep && message) {
    currentStep.innerText = message;
  }

  setPanelButtonsDisabled(isLoading);
}

function setPanelStep(message) {
  const spinner = getPanelElement("autobidder-spinner");
  const currentStep = getPanelElement("autobidder-current-step");

  if (spinner) {
    spinner.style.display = "block";
  }

  if (currentStep) {
    currentStep.innerText = message;
  }
}

function addPanelLog(message, type = "info") {
  const log = getPanelElement("autobidder-progress-log");

  if (!log) return;

  const line = document.createElement("div");
  line.className = `autobidder-log-line autobidder-log-${type}`;

  const iconMap = {
    success: "✓",
    error: "✕",
    warning: "!",
    loading: "⏳",
    info: "•",
  };

  const icon = iconMap[type] || "•";

  line.innerText = `${icon} ${message}`;

  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
}

function finishPanelProgress(message = "Done.") {
  const spinner = getPanelElement("autobidder-spinner");
  const currentStep = getPanelElement("autobidder-current-step");

  if (spinner) {
    spinner.style.display = "none";
  }

  if (currentStep) {
    currentStep.innerText = message;
  }

  setPanelButtonsDisabled(false);
  addPanelLog(message, "success");
}

function failPanelProgress(message = "Something went wrong.") {
  const spinner = getPanelElement("autobidder-spinner");
  const currentStep = getPanelElement("autobidder-current-step");

  if (spinner) {
    spinner.style.display = "none";
  }

  if (currentStep) {
    currentStep.innerText = message;
  }

  setPanelButtonsDisabled(false);
  addPanelLog(message, "error");
}

function getFieldLabel(input) {
  let labelText = "";

  if (input.id) {
    const label = document.querySelector(`label[for="${input.id}"]`);
    if (label) labelText += " " + label.innerText;
  }

  const parentLabel = input.closest("label");
  if (parentLabel) labelText += " " + parentLabel.innerText;

  const ariaLabel = input.getAttribute("aria-label");
  if (ariaLabel) labelText += " " + ariaLabel;

  const placeholder = input.getAttribute("placeholder");
  if (placeholder) labelText += " " + placeholder;

  const name = input.getAttribute("name");
  if (name) labelText += " " + name;

  const nearbyText = input.closest("div, section, fieldset")?.innerText || "";
  if (nearbyText && nearbyText.length < 500) {
    labelText += " " + nearbyText;
  }

  return labelText.replace(/\s+/g, " ").trim();
}

function detectScreeningFields() {
  const fields = [];

  const elements = Array.from(
    document.querySelectorAll(
      "textarea, input[type='text'], input[type='number'], select",
    ),
  );

  elements.forEach((el, index) => {
    const label = getFieldLabel(el);

    if (!label || label.length < 5) return;

    const lower = label.toLowerCase();

    const looksLikeScreening =
      lower.includes("?") ||
      lower.includes("authorized") ||
      lower.includes("sponsorship") ||
      lower.includes("experience") ||
      lower.includes("years") ||
      lower.includes("salary") ||
      lower.includes("relocate") ||
      lower.includes("remote") ||
      lower.includes("why") ||
      lower.includes("describe") ||
      lower.includes("explain");

    if (!looksLikeScreening) return;

    const fieldId = `autobidder-field-${index}`;
    el.setAttribute("data-autobidder-field-id", fieldId);

    let options = [];

    if (el.tagName.toLowerCase() === "select") {
      options = Array.from(el.options)
        .map((option) => option.textContent.trim())
        .filter(Boolean);
    }

    fields.push({
      fieldId,
      fieldType: el.tagName.toLowerCase(),
      inputType: el.getAttribute("type") || "",
      label,
      options,
    });
  });

  return fields;
}

function setNativeValue(element, value) {
  const valueSetter = Object.getOwnPropertyDescriptor(element, "value")?.set;
  const prototype = Object.getPrototypeOf(element);
  const prototypeValueSetter = Object.getOwnPropertyDescriptor(
    prototype,
    "value",
  )?.set;

  if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
    prototypeValueSetter.call(element, value);
  } else if (valueSetter) {
    valueSetter.call(element, value);
  } else {
    element.value = value;
  }

  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

function clickMatchingRadio(fieldId, answerText) {
  const radios = Array.from(
    document.querySelectorAll(
      `input[type="radio"][data-autobidder-field-id="${fieldId}"]`,
    ),
  );

  if (!radios.length) {
    return false;
  }

  const normalizedAnswer = String(answerText || "")
    .toLowerCase()
    .trim();

  for (const radio of radios) {
    const label = findLabelText(radio).toLowerCase();
    const value = String(radio.value || "").toLowerCase();

    const isMatch =
      label === normalizedAnswer ||
      value === normalizedAnswer ||
      label.includes(normalizedAnswer) ||
      normalizedAnswer.includes(label) ||
      (normalizedAnswer.startsWith("yes") &&
        (label.includes("yes") || value === "yes")) ||
      (normalizedAnswer.startsWith("no") &&
        (label.includes("no") || value === "no"));

    if (isMatch) {
      radio.click();
      radio.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
  }

  return false;
}

function setMatchingCheckbox(fieldId, answerText) {
  const checkbox = document.querySelector(
    `input[type="checkbox"][data-autobidder-field-id="${fieldId}"]`,
  );

  if (!checkbox) {
    return false;
  }

  const answer = String(answerText || "").toLowerCase();

  const shouldCheck =
    answer.includes("yes") ||
    answer.includes("agree") ||
    answer.includes("true") ||
    answer.includes("checked") ||
    answer.includes("i consent") ||
    answer.includes("i acknowledge");

  checkbox.checked = shouldCheck;
  checkbox.dispatchEvent(new Event("input", { bubbles: true }));
  checkbox.dispatchEvent(new Event("change", { bubbles: true }));

  return true;
}

function fillScreeningAnswers(answers) {
  const filled = [];
  const skipped = [];

  answers.forEach((answer) => {
    if (answer.manual_review_required) {
      skipped.push({
        fieldId: answer.fieldId,
        question: answer.question,
        reason: "Manual review required",
      });
      return;
    }

    if (answer.fieldType === "radio") {
      const clicked = clickMatchingRadioOption(answer);

      if (clicked) {
        filled.push({
          fieldId: answer.fieldId,
          question: answer.question,
          value: answer.selected_option_label || answer.answer,
        });
      } else {
        skipped.push({
          fieldId: answer.fieldId,
          question: answer.question,
          reason: "No matching radio option",
        });
      }

      return;
    }

    if (answer.fieldType === "checkbox") {
      const checked = setMatchingCheckboxOption(answer);

      if (checked) {
        filled.push({
          fieldId: answer.fieldId,
          question: answer.question,
          value: answer.selected_option_label || answer.answer,
        });
      } else {
        skipped.push({
          fieldId: answer.fieldId,
          question: answer.question,
          reason: "Checkbox field not found",
        });
      }

      return;
    }

    const field = document.querySelector(
      `[data-autobidder-field-id="${answer.fieldId}"]`,
    );

    if (!field) {
      skipped.push({
        fieldId: answer.fieldId,
        question: answer.question,
        reason: "Field not found",
      });
      return;
    }

    const tag = field.tagName.toLowerCase();

    if (tag === "select") {
      const selected = setMatchingSelectOption(field, answer);

      if (selected) {
        filled.push({
          fieldId: answer.fieldId,
          question: answer.question,
          value: answer.selected_option_label || answer.answer,
        });
      } else {
        skipped.push({
          fieldId: answer.fieldId,
          question: answer.question,
          reason: "No matching select option",
        });
      }

      return;
    }

    if (tag === "textarea" || tag === "input") {
      setNativeValue(field, answer.answer);

      filled.push({
        fieldId: answer.fieldId,
        question: answer.question,
        value: answer.answer,
      });

      return;
    }

    skipped.push({
      fieldId: answer.fieldId,
      question: answer.question,
      reason: "Unsupported field type",
    });
  });

  return {
    success: true,
    filled,
    skipped,
  };
}

async function hasActiveCandidateAndBidder() {
  const active = await getActiveCandidateFromStorage();

  return Boolean(active && active.candidateId);
}

async function maybeStartAutoAnalysis() {
  if (autobidderAutoAnalysisStarted) {
    return;
  }

  const hasActiveCandidate = await hasActiveCandidateAndBidder();

  if (!hasActiveCandidate) {
    const resultBox = document.getElementById("autobidder-result-box");

    if (resultBox) {
      resultBox.innerText =
        "Select an active candidate in the extension popup first. Then refresh this job page.";
    }

    return;
  }

  autobidderAutoAnalysisStarted = true;

  setTimeout(async () => {
    await runAutobidderPageAnalysis();
  }, 500);
}

async function getActiveCandidateFromStorage() {
  return new Promise((resolve) => {
    chrome.storage.local.get(
      ["activeCandidateId", "activeBidderName"],
      (result) => {
        resolve({
          candidateId: result.activeCandidateId,
          bidderName: result.activeBidderName,
        });
      },
    );
  });
}

function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const length = binaryString.length;
  const bytes = new Uint8Array(length);

  for (let i = 0; i < length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes.buffer;
}

function isLikelyResumeUploadInput(input) {
  if (!input || input.type !== "file") {
    return false;
  }

  const label = findLabelText(input);
  const accept = (input.getAttribute("accept") || "").toLowerCase();
  const name = (input.getAttribute("name") || "").toLowerCase();
  const id = (input.getAttribute("id") || "").toLowerCase();

  const combined = `${label} ${accept} ${name} ${id}`.toLowerCase();

  return (
    combined.includes("resume") ||
    combined.includes("cv") ||
    combined.includes("curriculum") ||
    combined.includes("upload") ||
    combined.includes(".pdf") ||
    combined.includes(".doc") ||
    combined.includes(".docx")
  );
}

function findResumeFileInput() {
  const fileInputs = Array.from(
    document.querySelectorAll('input[type="file"]'),
  );

  if (!fileInputs.length) {
    return null;
  }

  const resumeInput = fileInputs.find(isLikelyResumeUploadInput);

  if (resumeInput) {
    return resumeInput;
  }

  if (fileInputs.length === 1) {
    return fileInputs[0];
  }

  return null;
}

function uploadResumeFileToPage(resumeData) {
  const input = findResumeFileInput();

  if (!input) {
    return {
      success: false,
      message: "Could not find a resume upload field on this page.",
    };
  }

  const arrayBuffer = base64ToArrayBuffer(resumeData.base64Data);

  const file = new File([arrayBuffer], resumeData.fileName, {
    type: resumeData.fileType || "application/octet-stream",
  });

  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);

  input.files = dataTransfer.files;

  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));

  return {
    success: true,
    message: `Resume uploaded: ${resumeData.fileName}`,
  };
}

async function postJson(pathOrUrl, payload) {
  let path = pathOrUrl;

  if (pathOrUrl.startsWith(AUTOBIDDER_API_BASE_URL)) {
    path = pathOrUrl.replace(AUTOBIDDER_API_BASE_URL, "");
  }

  const response = await chrome.runtime.sendMessage({
    type: "BACKEND_POST_JSON",
    path,
    payload,
  });

  if (!response || !response.success) {
    throw new Error(response?.message || "Backend request failed.");
  }

  return response.data;
}

async function runAutobidderPageAnalysis() {
  const resultBox = document.getElementById("autobidder-result-box");
  const jobInfoBox = document.getElementById("autobidder-job-info");

  try {
    clearPanelProgress();
    setPanelLoading(true, "Starting job analysis...");
    addPanelLog("Reading current job page", "loading");

    resultBox.innerText = "Analyzing job page...";

    const pageData = {
      url: window.location.href,
      page_title: document.title,
      page_text: getVisiblePageText(),
    };

    addPanelLog("Page content captured", "success");

    setPanelStep("Checking active candidate...");
    const active = await getActiveCandidateFromStorage();

    if (!active.candidateId) {
      failPanelProgress("No active candidate selected.");
      resultBox.innerText =
        "Please open the extension popup and select an active candidate first.";
      return;
    }

    addPanelLog(`Active candidate found: #${active.candidateId}`, "success");

    setPanelStep("Detecting job posting...");
    const detection = await postJson(
      `${AUTOBIDDER_API_BASE_URL}/detect-job-page`,
      pageData,
    );

    if (!detection.is_job_posting) {
      failPanelProgress("This page does not look like a job posting.");
      resultBox.innerText = `This page does not look like a job posting.\nReason: ${detection.reason}`;
      return;
    }

    addPanelLog("Job posting detected", "success");

    const atsType = getAtsType();

    jobInfoBox.innerHTML = `
      <strong>Job Posting Detected</strong><br>
      Company: ${detection.company_name || "Unknown"}<br>
      Title: ${detection.job_title || "Unknown"}<br>
      ATS: ${atsType}<br>
      Confidence: ${detection.confidence}
    `;

    setPanelStep("Detecting screening questions...");

    const screeningFields = detectAllScreeningFieldsForAts(atsType);

    autobidderLatestScreeningFields = screeningFields;

    addPanelLog(
      `Detected ${screeningFields.length} screening questions`,
      "success",
    );

    setPanelStep("Creating application draft...");
    addPanelLog("Generating match score and cover letter", "loading");

    const applicationPayload = {
      candidate_id: Number(active.candidateId),
      company_name: detection.company_name || "Unknown Company",
      job_title: detection.job_title || "Unknown Job",
      original_job_url: window.location.href,
      job_description: getVisiblePageText(),
      screening_questions: screeningFields.map((field) => field.label),
      created_by: active.bidderName || "On-page Assistant",
    };

    jobInfoBox.innerHTML = `
  <div class="autobidder-job-info-layout">
    <div class="autobidder-job-info-left">
      <strong>Job Posting Detected</strong><br>
      Company: ${detection.company_name || "Unknown"}<br>
      Title: ${detection.job_title || "Unknown"}<br>
      ATS: ${atsType}<br>
      Confidence: ${detection.confidence}
    </div>

    <div class="autobidder-score-card">
      <div class="autobidder-score-placeholder">
        Analyzing<br>Match...
      </div>
    </div>
  </div>
`;

    const applicationDraft = await postJson(
      `${AUTOBIDDER_API_BASE_URL}/applications`,
      applicationPayload,
    );

    addPanelLog("Application draft created", "success");

    setPanelStep("Preparing screening answers...");

    let screeningAnswerResult = { answers: [] };

    if (screeningFields.length > 0) {
      screeningAnswerResult = await postJson(
        `${AUTOBIDDER_API_BASE_URL}/screening/autofill-answers`,
        {
          candidate_id: Number(active.candidateId),
          fields: screeningFields,
        },
      );

      addPanelLog(
        `Generated ${screeningAnswerResult.answers.length} screening answers`,
        "success",
      );
    } else {
      addPanelLog("No screening questions found", "warning");
    }

    chrome.storage.local.set({
      latestOnPageApplicationDraft: applicationDraft,
      latestOnPageScreeningAnswers: screeningAnswerResult.answers,
      latestOnPageScreeningFields: screeningFields,
    });

    setPanelStep("Rendering results...");

    let matchAnalysis = null;

    try {
      matchAnalysis = applicationDraft.match_analysis_json
        ? JSON.parse(applicationDraft.match_analysis_json)
        : null;
    } catch (error) {
      matchAnalysis = null;
    }

    updateJobInfoWithMatchScore(
      detection,
      atsType,
      applicationDraft,
      matchAnalysis,
    );

    const screeningPreview = screeningAnswerResult.answers.length
      ? screeningAnswerResult.answers
          .map((item, index) => {
            return `${index + 1}. ${item.question}
Answer: ${item.answer}
Confidence: ${item.confidence}
Manual Review: ${item.manual_review_required ? "Yes" : "No"}`;
          })
          .join("\n\n")
      : "No screening questions detected.";

    const matchClass =
      Number(applicationDraft.match_score) >= 85
        ? "autobidder-good"
        : Number(applicationDraft.match_score) >= 70
          ? "autobidder-warning"
          : "autobidder-danger";

    const requiredSkills = matchAnalysis?.required_skills?.join(", ") || "-";
    const matchedSkills = matchAnalysis?.matched_skills?.join(", ") || "-";
    const missingRequired =
      matchAnalysis?.missing_required_skills?.join(", ") || "-";
    const riskFlags = matchAnalysis?.risk_flags?.join(", ") || "-";
    const strengths = matchAnalysis?.strengths?.join(", ") || "-";

    resultBox.innerHTML = `
      <div>
        <strong>Application Draft Created</strong><br><br>

        <strong>ATS:</strong> ${atsType}<br>
        <strong>Company:</strong> ${applicationDraft.company_name}<br>
        <strong>Job Title:</strong> ${applicationDraft.job_title}<br>
        <strong>Overall Match:</strong> <span class="${matchClass}">${applicationDraft.match_score}%</span><br>
        <strong>Recommendation:</strong> ${matchAnalysis?.recommendation || "Needs Review"}<br>
        <strong>Duplicate:</strong> ${applicationDraft.duplicate_status}<br>
        <strong>Status:</strong> ${applicationDraft.status}<br><br>

        <strong>Match Breakdown</strong><br>
        Required Skills Score: ${matchAnalysis?.required_skills_score ?? "-"}<br>
        Preferred Skills Score: ${matchAnalysis?.preferred_skills_score ?? "-"}<br>
        Industry Score: ${matchAnalysis?.industry_score ?? "-"}<br>
        Seniority Score: ${matchAnalysis?.seniority_score ?? "-"}<br>
        Location Score: ${matchAnalysis?.location_score ?? "-"}<br><br>

        <strong>Required Skills:</strong> ${requiredSkills}<br>
        <strong>Matched Skills:</strong> ${matchedSkills}<br>
        <strong>Missing Required:</strong> ${missingRequired}<br>
        <strong>Strengths:</strong> ${strengths}<br>
        <strong>Risk Flags:</strong> ${riskFlags}<br><br>

        <strong>Summary</strong><br>
        <pre style="white-space: pre-wrap; font-family: Arial, sans-serif;">${matchAnalysis?.summary || "No summary available."}</pre>

        <strong>Screening Questions:</strong> ${screeningFields.length}<br><br>

        <strong>Screening Answers</strong><br>
        <pre style="white-space: pre-wrap; font-family: Arial, sans-serif;">${screeningPreview}</pre>

        <strong>Cover Letter</strong><br>
        <pre style="white-space: pre-wrap; font-family: Arial, sans-serif;">${applicationDraft.cover_letter || "No cover letter generated."}</pre>
      </div>
    `;

    finishPanelProgress("Analysis complete.");
  } catch (error) {
    console.error(error);
    failPanelProgress("Analysis failed.");
    resultBox.innerText = "Autobidder analysis error: " + error.message;
  }
}

function getResumeStorageKey(candidateId) {
  return `resume_file_candidate_${candidateId}`;
}

async function getSavedResumeFileForCandidateFromStorage(candidateId) {
  const key = getResumeStorageKey(candidateId);

  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => {
      resolve(result[key] || null);
    });
  });
}

function dedupeScreeningFields(fields) {
  const seen = new Set();
  const result = [];

  fields.forEach((field) => {
    const key = `${field.fieldType}-${field.label}`.toLowerCase();

    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    result.push(field);
  });

  return result;
}

function detectAllScreeningFieldsForAts(atsType) {
  let fields = [];

  if (
    atsType === "greenhouse" &&
    typeof detectGreenhouseScreeningFields === "function"
  ) {
    fields = detectGreenhouseScreeningFields();
  } else if (
    atsType === "lever" &&
    typeof detectLeverScreeningFields === "function"
  ) {
    fields = detectLeverScreeningFields();
  } else if (
    atsType === "ashby" &&
    typeof detectAshbyScreeningFields === "function"
  ) {
    fields = detectAshbyScreeningFields();
  } else {
    fields = detectScreeningFields();
  }

  const choiceFields = detectChoiceFields();

  return dedupeScreeningFields([...fields, ...choiceFields]);
}

function detectLeverScreeningFields() {
  const fields = [];

  const containers = Array.from(
    document.querySelectorAll(
      ".application-question, .posting-form-question, li, div",
    ),
  );

  containers.forEach((container, index) => {
    const input = container.querySelector(
      "textarea, input[type='text'], input[type='number'], select",
    );

    if (!input) return;

    const labelText = container.innerText.replace(/\s+/g, " ").trim();

    if (!labelText || labelText.length < 5 || labelText.length > 800) return;

    const lower = labelText.toLowerCase();

    const looksLikeQuestion =
      lower.includes("?") ||
      lower.includes("authorized") ||
      lower.includes("sponsor") ||
      lower.includes("experience") ||
      lower.includes("years") ||
      lower.includes("salary") ||
      lower.includes("relocate") ||
      lower.includes("remote") ||
      lower.includes("why") ||
      lower.includes("describe") ||
      lower.includes("gender") ||
      lower.includes("veteran") ||
      lower.includes("disability");

    if (!looksLikeQuestion) return;

    const fieldId = `lever-field-${index}`;
    input.setAttribute("data-autobidder-field-id", fieldId);

    let options = [];

    if (input.tagName.toLowerCase() === "select") {
      options = Array.from(el.options)
        .map((option, optionIndex) =>
          makeOptionObject(
            option.textContent.trim(),
            option.value,
            optionIndex,
          ),
        )
        .filter((option) => option.label);
    }

    fields.push({
      fieldId,
      fieldType: input.tagName.toLowerCase(),
      inputType: input.getAttribute("type") || "",
      label: labelText,
      options,
    });
  });

  return fields;
}
function detectAshbyScreeningFields() {
  const fields = [];

  const containers = Array.from(
    document.querySelectorAll("div, section, fieldset"),
  );

  containers.forEach((container, index) => {
    const input = container.querySelector(
      "textarea, input[type='text'], input[type='number'], select",
    );

    if (!input) return;

    const labelText = container.innerText.replace(/\s+/g, " ").trim();

    if (!labelText || labelText.length < 5 || labelText.length > 800) return;

    const lower = labelText.toLowerCase();

    const looksLikeQuestion =
      lower.includes("?") ||
      lower.includes("authorized") ||
      lower.includes("sponsor") ||
      lower.includes("experience") ||
      lower.includes("years") ||
      lower.includes("salary") ||
      lower.includes("relocate") ||
      lower.includes("remote") ||
      lower.includes("why") ||
      lower.includes("describe") ||
      lower.includes("gender") ||
      lower.includes("veteran") ||
      lower.includes("disability");

    if (!looksLikeQuestion) return;

    const fieldId = `ashby-field-${index}`;
    input.setAttribute("data-autobidder-field-id", fieldId);

    let options = [];

    if (input.tagName.toLowerCase() === "select") {
      options = Array.from(el.options)
        .map((option, optionIndex) =>
          makeOptionObject(
            option.textContent.trim(),
            option.value,
            optionIndex,
          ),
        )
        .filter((option) => option.label);
    }

    fields.push({
      fieldId,
      fieldType: input.tagName.toLowerCase(),
      inputType: input.getAttribute("type") || "",
      label: labelText,
      options,
    });
  });

  return fields;
}

function detectChoiceFields() {
  const fields = [];

  // Radio groups
  const radioGroups = {};
  const radioInputs = Array.from(
    document.querySelectorAll('input[type="radio"]'),
  );

  radioInputs.forEach((input, index) => {
    const name =
      input.name ||
      input.getAttribute("aria-labelledby") ||
      `radio-group-${index}`;

    if (!radioGroups[name]) {
      radioGroups[name] = [];
    }

    radioGroups[name].push(input);
  });

  Object.entries(radioGroups).forEach(([groupName, inputs], index) => {
    const firstInput = inputs[0];
    const container =
      firstInput.closest("fieldset, div, section, li, form") ||
      firstInput.parentElement;

    const labelText = container
      ? container.innerText.replace(/\s+/g, " ").trim()
      : findLabelText(firstInput);

    if (!labelText || labelText.length < 5) return;

    const fieldId = `radio-field-${index}`;

    inputs.forEach((input) => {
      input.setAttribute("data-autobidder-field-id", fieldId);
    });

    const options = inputs.map((input, optionIndex) => {
      const optionLabel =
        findLabelText(input) || input.value || `Option ${optionIndex + 1}`;

      return makeOptionObject(
        optionLabel,
        input.value || optionLabel,
        optionIndex,
      );
    });

    fields.push({
      fieldId,
      fieldType: "radio",
      inputType: "radio",
      label: labelText,
      options,
    });
  });

  // Checkboxes
  const checkboxes = Array.from(
    document.querySelectorAll('input[type="checkbox"]'),
  );

  checkboxes.forEach((input, index) => {
    const labelText =
      findLabelText(input) ||
      input.closest("label, div, section, li")?.innerText ||
      "";

    if (!labelText || labelText.length < 5) return;

    const fieldId = `checkbox-field-${index}`;
    input.setAttribute("data-autobidder-field-id", fieldId);

    fields.push({
      fieldId,
      fieldType: "checkbox",
      inputType: "checkbox",
      label: labelText.replace(/\s+/g, " ").trim(),
      options: [
        makeOptionObject("Checked", "checked", 0),
        makeOptionObject("Unchecked", "unchecked", 1),
      ],
    });
  });

  return fields;
}

function detectGreenhouseScreeningFields() {
  const fields = [];

  const containers = Array.from(
    document.querySelectorAll(
      ".field, .custom-question, .application-question, div",
    ),
  );

  containers.forEach((container, index) => {
    const input = container.querySelector(
      "textarea, input[type='text'], input[type='number'], select",
    );

    if (!input) return;

    const labelText = container.innerText.replace(/\s+/g, " ").trim();

    if (!labelText || labelText.length < 5 || labelText.length > 800) return;

    const lower = labelText.toLowerCase();

    const looksLikeQuestion =
      lower.includes("?") ||
      lower.includes("authorized") ||
      lower.includes("sponsor") ||
      lower.includes("experience") ||
      lower.includes("years") ||
      lower.includes("salary") ||
      lower.includes("relocate") ||
      lower.includes("why") ||
      lower.includes("describe") ||
      lower.includes("gender") ||
      lower.includes("veteran") ||
      lower.includes("disability");

    if (!looksLikeQuestion) return;

    const fieldId = `greenhouse-field-${index}`;
    input.setAttribute("data-autobidder-field-id", fieldId);

    let options = [];

    if (input.tagName.toLowerCase() === "select") {
      options = Array.from(el.options)
        .map((option, optionIndex) =>
          makeOptionObject(
            option.textContent.trim(),
            option.value,
            optionIndex,
          ),
        )
        .filter((option) => option.label);
    }

    fields.push({
      fieldId,
      fieldType: input.tagName.toLowerCase(),
      inputType: input.getAttribute("type") || "",
      label: labelText,
      options,
    });
  });

  return fields;
}

async function runAutobidderAutofillFromPanel() {
  const resultBox = document.getElementById("autobidder-result-box");

  try {
    clearPanelProgress();
    setPanelLoading(true, "Starting autofill...");
    addPanelLog("Loading active candidate", "loading");

    resultBox.innerText = "Running autofill...";

    const active = await getActiveCandidateFromStorage();

    if (!active.candidateId) {
      failPanelProgress("No active candidate selected.");
      resultBox.innerText =
        "Please select an active candidate in the extension popup first.";
      return;
    }

    addPanelLog(`Active candidate found: #${active.candidateId}`, "success");

    setPanelStep("Loading candidate profile...");
    const candidate = await getJson(
      `${AUTOBIDDER_API_BASE_URL}/candidates/${active.candidateId}`,
    );

    addPanelLog("Candidate profile loaded", "success");

    setPanelStep("Filling profile fields...");

    const atsType = getAtsType();

    let basicFillMessage = "Generic profile fields filled.";

    if (
      atsType === "greenhouse" &&
      typeof fillGreenhouseBasicFields === "function"
    ) {
      const greenhouseResult = fillGreenhouseBasicFields(candidate);
      basicFillMessage = `Greenhouse fields filled: ${greenhouseResult.filledCount}`;
    } else if (
      atsType === "lever" &&
      typeof fillLeverBasicFields === "function"
    ) {
      const leverResult = fillLeverBasicFields(candidate);
      basicFillMessage = `Lever fields filled: ${leverResult.filledCount}`;
    } else if (
      atsType === "ashby" &&
      typeof fillAshbyBasicFields === "function"
    ) {
      const ashbyResult = fillAshbyBasicFields(candidate);
      basicFillMessage = `Ashby fields filled: ${ashbyResult.filledCount}`;
    } else {
      autofillBasicFields(candidate);
    }

    addPanelLog(basicFillMessage, "success");

    setPanelStep("Uploading resume...");

    let resumeMessage = "No saved resume found for this candidate.";

    const resumeData = await getSavedResumeFileForCandidateFromStorage(
      active.candidateId,
    );

    if (resumeData) {
      const resumeResult = uploadResumeFileToPage(resumeData);

      if (resumeResult.success) {
        addPanelLog(resumeResult.message, "success");
      } else {
        addPanelLog(resumeResult.message, "warning");
      }

      resumeMessage = resumeResult.message;
    } else {
      addPanelLog(resumeMessage, "warning");
    }

    setPanelStep("Filling screening answers...");

    const storageData = await new Promise((resolve) => {
      chrome.storage.local.get(["latestOnPageScreeningAnswers"], resolve);
    });

    const answers = storageData.latestOnPageScreeningAnswers || [];

    let screeningMessage =
      "No screening answers found. Click Analyze Job first.";

    if (answers.length > 0) {
      const fillResult = fillScreeningAnswers(answers);

      screeningMessage = `Screening answers filled: ${fillResult.filled.length}, skipped: ${fillResult.skipped.length}`;

      fillResult.filled.forEach((item) => {
        addPanelLog(
          `Selected/Filled: ${item.question} → ${item.value}`,
          "success",
        );
      });

      fillResult.skipped.forEach((item) => {
        addPanelLog(
          `Needs review: ${item.question} - ${item.reason}`,
          "warning",
        );
      });

      addPanelLog(
        screeningMessage,
        fillResult.skipped.length > 0 ? "warning" : "success",
      );

      if (fillResult.skipped.length > 0) {
        addPanelLog(
          `${fillResult.skipped.length} screening answers need manual review`,
          "warning",
        );
      }
    } else {
      addPanelLog(screeningMessage, "warning");
    }

    resultBox.innerText = `
Autofill completed.

Filled:
- ${basicFillMessage}
- ${resumeMessage}
- ${screeningMessage}

Please review every field before submitting.
`.trim();

    finishPanelProgress("Autofill complete. Please review before submitting.");
  } catch (error) {
    console.error(error);
    failPanelProgress("Autofill failed.");
    resultBox.innerText = "Autofill error: " + error.message;
  }
}

function getVisiblePageText() {
  const bodyText = document.body ? document.body.innerText : "";
  return bodyText.replace(/\s+/g, " ").trim().slice(0, 12000);
}

function getMetaContent(selector) {
  const el = document.querySelector(selector);
  return el ? el.getAttribute("content") || "" : "";
}

function cleanText(value) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function getHeadings() {
  const headings = Array.from(document.querySelectorAll("h1, h2"))
    .map((el) => cleanText(el.innerText))
    .filter(Boolean)
    .slice(0, 10);

  return headings;
}

function detectJobInfo() {
  const pageTitle = cleanText(document.title);
  const h1 = cleanText(document.querySelector("h1")?.innerText || "");
  const headings = getHeadings();

  const ogTitle = cleanText(getMetaContent('meta[property="og:title"]'));
  const twitterTitle = cleanText(getMetaContent('meta[name="twitter:title"]'));
  const description = cleanText(getMetaContent('meta[name="description"]'));

  const hostname = window.location.hostname.replace(/^www\./, "");

  let jobTitle = "";
  let companyName = "";

  const titleSources = [h1, ogTitle, twitterTitle, pageTitle].filter(Boolean);

  // Job title guess
  jobTitle = titleSources[0] || "";

  // Clean common title separators
  if (jobTitle.includes("|")) {
    jobTitle = jobTitle.split("|")[0].trim();
  }

  if (jobTitle.includes(" - ")) {
    const parts = jobTitle
      .split(" - ")
      .map((p) => p.trim())
      .filter(Boolean);

    if (parts.length >= 2) {
      jobTitle = parts[0];

      // Many ATS pages use "Job Title - Company"
      if (!companyName) {
        companyName = parts[1];
      }
    }
  }

  if (jobTitle.includes(" at ")) {
    const parts = jobTitle
      .split(" at ")
      .map((p) => p.trim())
      .filter(Boolean);

    if (parts.length >= 2) {
      jobTitle = parts[0];

      if (!companyName) {
        companyName = parts[1];
      }
    }
  }

  // Company guess from common ATS/page patterns
  const companySelectors = [
    '[data-testid*="company"]',
    '[class*="company"]',
    '[id*="company"]',
    ".company-name",
    "#company-name",
    '[class*="employer"]',
    '[data-testid*="employer"]',
  ];

  for (const selector of companySelectors) {
    const found = document.querySelector(selector);
    const text = cleanText(found?.innerText || found?.textContent || "");

    if (text && text.length < 80 && !companyName) {
      companyName = text;
      break;
    }
  }

  // Try extracting from page title if company is still empty
  if (!companyName && pageTitle.includes("|")) {
    const parts = pageTitle
      .split("|")
      .map((p) => p.trim())
      .filter(Boolean);

    if (parts.length >= 2) {
      companyName = parts[1];
    }
  }

  if (!companyName && pageTitle.includes(" - ")) {
    const parts = pageTitle
      .split(" - ")
      .map((p) => p.trim())
      .filter(Boolean);

    if (parts.length >= 2) {
      companyName = parts[1];
    }
  }

  // Clean ATS brand names that are not actual companies
  const atsWords = [
    "greenhouse",
    "lever",
    "workday",
    "ashby",
    "jobvite",
    "smartrecruiters",
    "bamboohr",
    "icims",
    "careers",
    "jobs",
    "job application",
  ];

  if (atsWords.some((word) => companyName.toLowerCase().includes(word))) {
    companyName = "";
  }

  // Fallback from hostname
  if (!companyName) {
    const hostParts = hostname.split(".");
    companyName = hostParts.length >= 2 ? hostParts[0] : hostname;
  }

  return {
    jobTitle: cleanText(jobTitle),
    companyName: cleanText(companyName),
    pageTitle,
    h1,
    headings,
    description,
    hostname,
  };
}

function findLabelText(input) {
  let labelText = "";

  if (input.id) {
    const label = document.querySelector(`label[for="${input.id}"]`);
    if (label) {
      labelText += " " + label.innerText;
    }
  }

  const parent = input.closest("label");
  if (parent) {
    labelText += " " + parent.innerText;
  }

  const ariaLabel = input.getAttribute("aria-label");
  if (ariaLabel) {
    labelText += " " + ariaLabel;
  }

  const placeholder = input.getAttribute("placeholder");
  if (placeholder) {
    labelText += " " + placeholder;
  }

  const name = input.getAttribute("name");
  if (name) {
    labelText += " " + name;
  }

  return labelText.toLowerCase();
}

function setInputValue(input, value) {
  if (!value) return;

  input.focus();
  input.value = value;

  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  input.blur();
}

function autofillBasicFields(profile) {
  const inputs = document.querySelectorAll("input, textarea");

  inputs.forEach((input) => {
    const label = findLabelText(input);

    if (label.includes("first name")) {
      setInputValue(input, profile.first_name);
    } else if (label.includes("last name")) {
      setInputValue(input, profile.last_name);
    } else if (label.includes("full name") || label === "name") {
      setInputValue(
        input,
        `${profile.first_name || ""} ${profile.last_name || ""}`.trim(),
      );
    } else if (label.includes("email")) {
      setInputValue(input, profile.email);
    } else if (label.includes("phone") || label.includes("mobile")) {
      setInputValue(input, profile.phone);
    } else if (label.includes("linkedin")) {
      setInputValue(input, profile.linkedin);
    } else if (label.includes("github")) {
      setInputValue(input, profile.github);
    } else if (label.includes("portfolio") || label.includes("website")) {
      setInputValue(input, profile.portfolio);
    } else if (label.includes("location") || label.includes("city")) {
      setInputValue(input, profile.location);
    }
  });
}

function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const length = binaryString.length;
  const bytes = new Uint8Array(length);

  for (let i = 0; i < length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes.buffer;
}

function isLikelyResumeUploadInput(input) {
  if (!input || input.type !== "file") {
    return false;
  }

  const label = findLabelText(input);
  const accept = (input.getAttribute("accept") || "").toLowerCase();
  const name = (input.getAttribute("name") || "").toLowerCase();
  const id = (input.getAttribute("id") || "").toLowerCase();
  const aria = (input.getAttribute("aria-label") || "").toLowerCase();
  const parentText =
    input.closest("div, section, fieldset, li")?.innerText?.toLowerCase() || "";

  const combined =
    `${label} ${accept} ${name} ${id} ${aria} ${parentText}`.toLowerCase();

  return (
    combined.includes("resume") ||
    combined.includes("cv") ||
    combined.includes("curriculum") ||
    combined.includes("attach") ||
    combined.includes("upload") ||
    combined.includes("dropbox") ||
    combined.includes(".pdf") ||
    combined.includes(".doc") ||
    combined.includes(".docx")
  );
}

function findResumeFileInput() {
  const fileInputs = Array.from(
    document.querySelectorAll('input[type="file"]'),
  );

  if (!fileInputs.length) {
    return null;
  }

  const resumeInput = fileInputs.find(isLikelyResumeUploadInput);

  if (resumeInput) {
    return resumeInput;
  }

  // Fallback: if there is only one file input, use it.
  if (fileInputs.length === 1) {
    return fileInputs[0];
  }

  return null;
}

function uploadResumeFileToPage(resumeData) {
  const input = findResumeFileInput();

  if (!input) {
    return {
      success: false,
      message: "Could not find a resume upload field on this page.",
    };
  }

  const arrayBuffer = base64ToArrayBuffer(resumeData.base64Data);

  const file = new File([arrayBuffer], resumeData.fileName, {
    type: resumeData.fileType || "application/octet-stream",
  });

  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);

  input.files = dataTransfer.files;

  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));

  return {
    success: true,
    message: `Resume uploaded: ${resumeData.fileName}`,
  };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    if (request.type === "PING_CONTENT_SCRIPT") {
      sendResponse({
        success: true,
        message: "content.js is active",
      });

      return false;
    }
    if (request.type === "GET_JOB_PAGE_DATA") {
      const detectedJobInfo = detectJobInfo();

      sendResponse({
        success: true,
        url: window.location.href,
        title: document.title,
        pageText: getVisiblePageText(),
        detectedJobInfo,
      });

      return false;
    }

    if (request.type === "AUTOFILL_BASIC_FIELDS") {
      autofillBasicFields(request.profile);

      sendResponse({
        success: true,
        message: "Basic fields autofilled. Please review before submitting.",
      });

      return false;
    }

    if (request.type === "DETECT_SCREENING_FIELDS") {
      const atsType = getAtsType();

      const fields =
        atsType === "greenhouse"
          ? detectGreenhouseScreeningFields()
          : detectScreeningFields();

      sendResponse({
        success: true,
        fields,
      });

      return false;
    }

    if (request.type === "FILL_SCREENING_ANSWERS") {
      const result = fillScreeningAnswers(request.answers || []);

      sendResponse(result);

      return false;
    }

    if (request.type === "UPLOAD_RESUME_FILE") {
      const result = uploadResumeFileToPage(request.resumeData);

      sendResponse(result);

      return false;
    }

    sendResponse({
      success: false,
      message: "Unknown message type.",
    });

    return false;
  } catch (error) {
    console.error("content.js message error:", error);

    sendResponse({
      success: false,
      message: error.message || "Content script error.",
    });

    return false;
  }
});

async function autoDetectAndShowAutobidderPanel() {
  try {
    const pageText = getVisiblePageText();

    if (!pageText || pageText.length < 300) {
      return;
    }

    const quickSignals = [
      "apply",
      "responsibilities",
      "qualifications",
      "requirements",
      "job description",
      "employment",
      "salary",
      "benefits",
    ];

    const lowerText = pageText.toLowerCase();

    const hasQuickSignal = quickSignals.some((signal) =>
      lowerText.includes(signal),
    );

    if (!hasQuickSignal) {
      return;
    }

    const detection = await postJson(
      `${AUTOBIDDER_API_BASE_URL}/detect-job-page`,
      {
        url: window.location.href,
        page_title: document.title,
        page_text: pageText,
      },
    );

    if (detection.is_job_posting && detection.confidence !== "Low") {
      autobidderDetectedJobPage = detection;
      createAutobidderFloatingPanel();

      const atsType = getAtsType();
      const jobInfoBox = document.getElementById("autobidder-job-info");

      jobInfoBox.innerHTML = `
  <div class="autobidder-job-info-layout">
    <div class="autobidder-job-info-left">
      <strong>Job Posting Detected</strong><br>
      Company: ${detection.company_name || "Unknown"}<br>
      Title: ${detection.job_title || "Unknown"}<br>
      ATS: ${atsType}<br>
      Confidence: ${detection.confidence}
    </div>

    <div class="autobidder-score-card">
      <div class="autobidder-score-placeholder">
        Match<br>Pending
      </div>
    </div>
  </div>
`;
      await maybeStartAutoAnalysis();
    }
  } catch (error) {
    console.warn("Autobidder auto-detection skipped:", error);
  }
}

setTimeout(() => {
  autoDetectAndShowAutobidderPanel();
}, 1800);

function getAtsType() {
  const host = window.location.hostname.toLowerCase();
  const url = window.location.href.toLowerCase();

  if (host.includes("greenhouse.io") || url.includes("greenhouse.io")) {
    return "greenhouse";
  }

  if (host.includes("lever.co") || url.includes("lever.co")) {
    return "lever";
  }

  if (host.includes("ashbyhq.com") || url.includes("ashby")) {
    return "ashby";
  }

  if (host.includes("myworkdayjobs.com") || url.includes("workday")) {
    return "workday";
  }

  return "generic";
}

function getInputByPossibleNames(possibleNames) {
  const fields = Array.from(
    document.querySelectorAll("input, textarea, select"),
  );

  return fields.find((field) => {
    const id = (field.id || "").toLowerCase();
    const name = (field.name || "").toLowerCase();
    const aria = (field.getAttribute("aria-label") || "").toLowerCase();
    const placeholder = (field.getAttribute("placeholder") || "").toLowerCase();
    const label = findLabelText(field).toLowerCase();

    const combined = `${id} ${name} ${aria} ${placeholder} ${label}`;

    return possibleNames.some((key) => combined.includes(key));
  });
}

function makeOptionObject(label, value, index) {
  return {
    label: String(label || "")
      .replace(/\s+/g, " ")
      .trim(),
    value: String(value || "").trim(),
    index,
  };
}

function fillLeverBasicFields(profile) {
  const fields = Array.from(
    document.querySelectorAll("input, textarea, select"),
  );

  const mappings = [
    {
      keys: ["name", "full name"],
      value: `${profile.first_name || ""} ${profile.last_name || ""}`.trim(),
    },
    {
      keys: ["first name", "firstname"],
      value: profile.first_name,
    },
    {
      keys: ["last name", "lastname"],
      value: profile.last_name,
    },
    {
      keys: ["email"],
      value: profile.email,
    },
    {
      keys: ["phone", "mobile"],
      value: profile.phone,
    },
    {
      keys: ["linkedin"],
      value: profile.linkedin,
    },
    {
      keys: ["github"],
      value: profile.github,
    },
    {
      keys: ["portfolio", "website", "personal website"],
      value: profile.portfolio,
    },
  ];

  let filledCount = 0;

  mappings.forEach((mapping) => {
    if (!mapping.value) return;

    const field = fields.find((el) => {
      const id = (el.id || "").toLowerCase();
      const name = (el.name || "").toLowerCase();
      const placeholder = (el.getAttribute("placeholder") || "").toLowerCase();
      const aria = (el.getAttribute("aria-label") || "").toLowerCase();
      const label = findLabelText(el).toLowerCase();
      const parentText =
        el.closest("li, div, label")?.innerText?.toLowerCase() || "";

      const combined = `${id} ${name} ${placeholder} ${aria} ${label} ${parentText}`;

      return mapping.keys.some((key) => combined.includes(key));
    });

    if (field) {
      setNativeValue(field, mapping.value);
      filledCount += 1;
    }
  });

  return {
    success: true,
    filledCount,
  };
}

function fillAshbyBasicFields(profile) {
  const fields = Array.from(
    document.querySelectorAll("input, textarea, select"),
  );

  const mappings = [
    {
      keys: ["first name", "firstname", "given name"],
      value: profile.first_name,
    },
    {
      keys: ["last name", "lastname", "family name", "surname"],
      value: profile.last_name,
    },
    {
      keys: ["full name", "name"],
      value: `${profile.first_name || ""} ${profile.last_name || ""}`.trim(),
    },
    {
      keys: ["email", "email address"],
      value: profile.email,
    },
    {
      keys: ["phone", "mobile", "phone number"],
      value: profile.phone,
    },
    {
      keys: ["linkedin", "linkedin profile"],
      value: profile.linkedin,
    },
    {
      keys: ["github", "github profile"],
      value: profile.github,
    },
    {
      keys: ["website", "portfolio", "personal site"],
      value: profile.portfolio,
    },
  ];

  let filledCount = 0;

  mappings.forEach((mapping) => {
    if (!mapping.value) return;

    const field = fields.find((el) => {
      const id = (el.id || "").toLowerCase();
      const name = (el.name || "").toLowerCase();
      const placeholder = (el.getAttribute("placeholder") || "").toLowerCase();
      const aria = (el.getAttribute("aria-label") || "").toLowerCase();
      const label = findLabelText(el).toLowerCase();
      const parentText =
        el.closest("div, label, section")?.innerText?.toLowerCase() || "";

      const combined = `${id} ${name} ${placeholder} ${aria} ${label} ${parentText}`;

      return mapping.keys.some((key) => combined.includes(key));
    });

    if (field) {
      setNativeValue(field, mapping.value);
      filledCount += 1;
    }
  });

  return {
    success: true,
    filledCount,
  };
}

function fillGreenhouseBasicFields(profile) {
  const mappings = [
    {
      keys: ["first_name", "first name", "firstname"],
      value: profile.first_name,
    },
    {
      keys: ["last_name", "last name", "lastname"],
      value: profile.last_name,
    },
    {
      keys: ["email", "email address"],
      value: profile.email,
    },
    {
      keys: ["phone", "phone number", "mobile"],
      value: profile.phone,
    },
    {
      keys: ["linkedin", "linkedin profile"],
      value: profile.linkedin,
    },
    {
      keys: ["github", "github profile"],
      value: profile.github,
    },
    {
      keys: ["website", "portfolio", "personal website"],
      value: profile.portfolio,
    },
  ];

  let filledCount = 0;

  mappings.forEach((mapping) => {
    const field = getInputByPossibleNames(mapping.keys);

    if (field && mapping.value) {
      setNativeValue(field, mapping.value);
      filledCount += 1;
    }
  });

  return {
    success: true,
    filledCount,
  };
}

async function runAutobidderMarkSubmittedAndSync() {
  const resultBox = document.getElementById("autobidder-result-box");

  try {
    clearPanelProgress();
    setPanelLoading(true, "Marking application as submitted...");
    addPanelLog("Loading latest application draft", "loading");

    const storageData = await new Promise((resolve) => {
      chrome.storage.local.get(["latestOnPageApplicationDraft"], resolve);
    });

    const draft = storageData.latestOnPageApplicationDraft;

    if (!draft || !draft.id) {
      failPanelProgress("No application draft found.");
      resultBox.innerText =
        "No application draft found. Click Analyze Job first.";
      return;
    }

    addPanelLog(`Application found: #${draft.id}`, "success");

    setPanelStep("Updating application status...");

    const updatedApplication = await postJson(
      `${AUTOBIDDER_API_BASE_URL}/applications/${draft.id}/status`,
      {
        status: "Submitted",
      },
    );

    addPanelLog("Application marked as submitted", "success");

    setPanelStep("Syncing application history to Google Sheets...");

    await postJson(
      `${AUTOBIDDER_API_BASE_URL}/sync/google-sheets/applications?today_only=true&triggered_by=On-page%20Panel`,
      {},
    );

    addPanelLog("Applications sheet synced", "success");

    setPanelStep("Updating dashboard...");

    const today = new Date().toISOString().slice(0, 10);

    await postJson(
      `${AUTOBIDDER_API_BASE_URL}/sync/google-sheets/dashboard?report_date=${today}`,
      {},
    );

    addPanelLog("Dashboard synced", "success");

    chrome.storage.local.set({
      latestOnPageApplicationDraft: updatedApplication,
    });

    resultBox.innerText = `
Application submitted and synced.

Application ID: ${updatedApplication.id}
Status: ${updatedApplication.status}
Submitted At: ${updatedApplication.submitted_at || "-"}
`.trim();

    finishPanelProgress("Submitted and synced successfully.");
  } catch (error) {
    console.error(error);
    failPanelProgress("Submit/sync failed.");
    resultBox.innerText = "Submit/sync error: " + error.message;
  }
}

async function getJson(pathOrUrl) {
  let path = pathOrUrl;

  if (pathOrUrl.startsWith(AUTOBIDDER_API_BASE_URL)) {
    path = pathOrUrl.replace(AUTOBIDDER_API_BASE_URL, "");
  }

  const response = await chrome.runtime.sendMessage({
    type: "BACKEND_GET_JSON",
    path,
  });

  if (!response || !response.success) {
    throw new Error(response?.message || "Backend GET request failed.");
  }

  return response.data;
}

function normalizeOptionText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function clickMatchingRadioOption(answer) {
  const radios = Array.from(
    document.querySelectorAll(
      `input[type="radio"][data-autobidder-field-id="${answer.fieldId}"]`,
    ),
  );

  if (!radios.length) {
    return false;
  }

  const targetValue = normalizeOptionText(answer.selected_option_value);
  const targetLabel = normalizeOptionText(answer.selected_option_label);
  const targetAnswer = normalizeOptionText(answer.answer);

  for (const radio of radios) {
    const label = normalizeOptionText(findLabelText(radio));
    const value = normalizeOptionText(radio.value);

    const isMatch =
      (targetValue && value === targetValue) ||
      (targetLabel && label === targetLabel) ||
      (targetLabel && label.includes(targetLabel)) ||
      (targetAnswer && label === targetAnswer) ||
      (targetAnswer && value === targetAnswer);

    if (isMatch) {
      radio.click();
      radio.dispatchEvent(new Event("input", { bubbles: true }));
      radio.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
  }

  return false;
}

function setMatchingSelectOption(field, answer) {
  const options = Array.from(field.options);

  const targetValue = normalizeOptionText(answer.selected_option_value);
  const targetLabel = normalizeOptionText(answer.selected_option_label);
  const targetAnswer = normalizeOptionText(answer.answer);

  let matchingOption = null;

  if (targetValue) {
    matchingOption = options.find(
      (option) => normalizeOptionText(option.value) === targetValue,
    );
  }

  if (!matchingOption && targetLabel) {
    matchingOption = options.find(
      (option) => normalizeOptionText(option.textContent) === targetLabel,
    );
  }

  if (!matchingOption && targetAnswer) {
    matchingOption = options.find(
      (option) =>
        normalizeOptionText(option.textContent) === targetAnswer ||
        normalizeOptionText(option.value) === targetAnswer,
    );
  }

  if (!matchingOption && typeof answer.selected_option_index === "number") {
    matchingOption = options[answer.selected_option_index];
  }

  if (!matchingOption) {
    return false;
  }

  field.value = matchingOption.value;
  field.dispatchEvent(new Event("input", { bubbles: true }));
  field.dispatchEvent(new Event("change", { bubbles: true }));

  return true;
}

function setMatchingCheckboxOption(answer) {
  const checkbox = document.querySelector(
    `input[type="checkbox"][data-autobidder-field-id="${answer.fieldId}"]`,
  );

  if (!checkbox) {
    return false;
  }

  const targetValue = normalizeOptionText(answer.selected_option_value);
  const targetLabel = normalizeOptionText(answer.selected_option_label);
  const targetAnswer = normalizeOptionText(answer.answer);

  const shouldCheck =
    targetValue === "checked" ||
    targetValue === "true" ||
    targetLabel === "checked" ||
    targetAnswer.includes("yes") ||
    targetAnswer.includes("agree") ||
    targetAnswer.includes("consent") ||
    targetAnswer.includes("checked") ||
    targetAnswer === "true";

  checkbox.checked = shouldCheck;
  checkbox.dispatchEvent(new Event("input", { bubbles: true }));
  checkbox.dispatchEvent(new Event("change", { bubbles: true }));

  return true;
}

function getScoreColor(score) {
  const value = Number(score || 0);

  if (value >= 85) {
    return "#16a34a"; // green
  }

  if (value >= 70) {
    return "#f59e0b"; // amber
  }

  return "#dc2626"; // red
}

function getScoreLabel(score) {
  const value = Number(score || 0);

  if (value >= 85) {
    return "Apply";
  }

  if (value >= 70) {
    return "Review";
  }

  return "Skip";
}

function renderMatchScoreGauge(score, recommendation) {
  const safeScore = Math.max(0, Math.min(100, Number(score || 0)));
  const color = getScoreColor(safeScore);
  const label = recommendation || getScoreLabel(safeScore);

  // Semicircle progress: 0 to 180 degrees
  const rotation = Math.round((safeScore / 100) * 180);

  return `
    <div class="autobidder-gauge-wrap">
      <div class="autobidder-gauge">
        <div class="autobidder-gauge-bg"></div>
        <div 
          class="autobidder-gauge-fill"
          style="transform: rotate(${rotation}deg); border-color: ${color};"
        ></div>
        <div class="autobidder-gauge-center">
          <div class="autobidder-gauge-check">✓</div>
        </div>
      </div>

      <div class="autobidder-score-number" style="color: ${color};">
        ${safeScore}%
      </div>
      <div class="autobidder-score-label">
        ${label}
      </div>
    </div>
  `;
}

function updateJobInfoWithMatchScore(
  detection,
  atsType,
  applicationDraft,
  matchAnalysis,
) {
  const jobInfoBox = document.getElementById("autobidder-job-info");

  if (!jobInfoBox) return;

  const score = applicationDraft?.match_score ?? 0;
  const recommendation = matchAnalysis?.recommendation || getScoreLabel(score);

  jobInfoBox.innerHTML = `
    <div class="autobidder-job-info-layout">
      <div class="autobidder-job-info-left">
        <strong>Job Posting Detected</strong><br>
        Company: ${detection.company_name || applicationDraft?.company_name || "Unknown"}<br>
        Title: ${detection.job_title || applicationDraft?.job_title || "Unknown"}<br>
        ATS: ${atsType}<br>
        Confidence: ${detection.confidence || "-"}
      </div>

      <div class="autobidder-score-card">
        ${renderMatchScoreGauge(score, recommendation)}
      </div>
    </div>
  `;
}
