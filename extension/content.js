const AUTOBIDDER_API_BASE_URL = "http://127.0.0.1:8000";

let autobidderDetectedJobPage = null;
let autobidderFloatingPanel = null;

function createAutobidderFloatingPanel() {
  if (document.getElementById("autobidder-floating-panel")) {
    return;
  }

  const panel = document.createElement("div");
  panel.id = "autobidder-floating-panel";

  panel.innerHTML = `
    <div id="autobidder-panel-header">
      <strong>Autobidder</strong>
      <button id="autobidder-close-btn">×</button>
    </div>

    <div id="autobidder-panel-body">
      <div id="autobidder-job-info">Detecting job page...</div>

      <button id="autobidder-run-analysis-btn">Analyze Job</button>
      <button id="autobidder-autofill-btn">Autofill</button>
      <button id="autobidder-copy-cover-letter-btn">Copy Cover Letter</button>

      <div id="autobidder-result-box"></div>
    </div>
  `;

  const style = document.createElement("style");
  style.innerHTML = `
    #autobidder-floating-panel {
      position: fixed;
      right: 20px;
      bottom: 20px;
      width: 360px;
      max-height: 620px;
      overflow-y: auto;
      background: #ffffff;
      color: #111827;
      border: 1px solid #d1d5db;
      border-radius: 14px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      z-index: 2147483647;
      font-family: Arial, sans-serif;
      font-size: 13px;
    }

    #autobidder-panel-header {
      background: #111827;
      color: white;
      padding: 10px 12px;
      border-radius: 14px 14px 0 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    #autobidder-close-btn {
      background: transparent;
      color: white;
      border: none;
      font-size: 20px;
      cursor: pointer;
    }

    #autobidder-panel-body {
      padding: 12px;
    }

    #autobidder-panel-body button {
      width: 100%;
      margin-top: 8px;
      padding: 9px;
      border: none;
      border-radius: 8px;
      background: #2563eb;
      color: white;
      cursor: pointer;
      font-size: 13px;
    }

    #autobidder-panel-body button:hover {
      background: #1d4ed8;
    }

    #autobidder-job-info {
      background: #f3f4f6;
      border: 1px solid #e5e7eb;
      padding: 8px;
      border-radius: 8px;
      margin-bottom: 8px;
      line-height: 1.4;
    }

    #autobidder-result-box {
      margin-top: 10px;
      white-space: pre-wrap;
      font-size: 12px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      padding: 8px;
      border-radius: 8px;
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

function fillScreeningAnswers(answers) {
  const filled = [];
  const skipped = [];

  answers.forEach((answer) => {
    if (answer.manual_review_required) {
      skipped.push({
        fieldId: answer.fieldId,
        reason: "Manual review required",
      });
      return;
    }

    const field = document.querySelector(
      `[data-autobidder-field-id="${answer.fieldId}"]`,
    );

    if (!field) {
      skipped.push({
        fieldId: answer.fieldId,
        reason: "Field not found",
      });
      return;
    }

    const tag = field.tagName.toLowerCase();

    if (tag === "textarea" || tag === "input") {
      setNativeValue(field, answer.answer);
      filled.push(answer.fieldId);
      return;
    }

    if (tag === "select") {
      const options = Array.from(field.options);
      const target = answer.answer.toLowerCase();

      const matchingOption = options.find(
        (option) =>
          option.textContent.trim().toLowerCase() === target ||
          option.value.trim().toLowerCase() === target ||
          target.includes(option.textContent.trim().toLowerCase()),
      );

      if (matchingOption) {
        field.value = matchingOption.value;
        field.dispatchEvent(new Event("change", { bubbles: true }));
        filled.push(answer.fieldId);
      } else {
        skipped.push({
          fieldId: answer.fieldId,
          reason: "No matching select option",
        });
      }
    }
  });

  return {
    success: true,
    filled,
    skipped,
  };
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

async function postJson(url, payload) {
  const response = await fetch(url, {
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

async function runAutobidderPageAnalysis() {
  const resultBox = document.getElementById("autobidder-result-box");
  const jobInfoBox = document.getElementById("autobidder-job-info");

  try {
    resultBox.innerText = "Analyzing job page...";

    const pageData = {
      url: window.location.href,
      page_title: document.title,
      page_text: getVisiblePageText(),
    };

    const active = await getActiveCandidateFromStorage();

    if (!active.candidateId) {
      resultBox.innerText =
        "Please open the extension popup and select an active candidate first.";
      return;
    }

    const detection = await postJson(
      `${AUTOBIDDER_API_BASE_URL}/detect-job-page`,
      pageData,
    );

    if (!detection.is_job_posting) {
      resultBox.innerText = `This page does not look like a job posting.\nReason: ${detection.reason}`;
      return;
    }

    jobInfoBox.innerHTML = `
      <strong>Job Detected</strong><br>
      Company: ${detection.company_name || "Unknown"}<br>
      Title: ${detection.job_title || "Unknown"}<br>
      Confidence: ${detection.confidence}
    `;

    const screeningFields = detectScreeningFields();

    const applicationPayload = {
      candidate_id: Number(active.candidateId),
      company_name: detection.company_name || "Unknown Company",
      job_title: detection.job_title || "Unknown Job",
      original_job_url: window.location.href,
      job_description: getVisiblePageText(),
      screening_questions: screeningFields.map((field) => field.label),
      created_by: active.bidderName || "On-page Assistant",
    };

    const applicationDraft = await postJson(
      `${AUTOBIDDER_API_BASE_URL}/applications`,
      applicationPayload,
    );

    let screeningAnswerResult = { answers: [] };

    if (screeningFields.length > 0) {
      screeningAnswerResult = await postJson(
        `${AUTOBIDDER_API_BASE_URL}/screening/autofill-answers`,
        {
          candidate_id: Number(active.candidateId),
          fields: screeningFields,
        },
      );
    }

    const atsType = getAtsType();

    chrome.storage.local.set({
      latestOnPageApplicationDraft: applicationDraft,
      latestOnPageScreeningAnswers: screeningAnswerResult.answers,
    });

    const screeningPreview = screeningAnswerResult.answers.length
      ? screeningAnswerResult.answers
          .map((item, index) => {
            return `${index + 1}. ${item.question}\nAnswer: ${item.answer}\nConfidence: ${item.confidence}\nManual Review: ${item.manual_review_required ? "Yes" : "No"}`;
          })
          .join("\n\n")
      : "No screening questions detected.";

    const matchClass =
      Number(applicationDraft.match_score) >= 75
        ? "autobidder-good"
        : Number(applicationDraft.match_score) >= 60
          ? "autobidder-warning"
          : "autobidder-danger";

    resultBox.innerHTML = `
  <div>
    <strong>Application Draft Created</strong><br><br>

    <strong>ATS:</strong> ${atsType}<br>
    <strong>Company:</strong> ${applicationDraft.company_name}<br>
    <strong>Job Title:</strong> ${applicationDraft.job_title}<br>
    <strong>Match Score:</strong> <span class="${matchClass}">${applicationDraft.match_score}%</span><br>
    <strong>Duplicate:</strong> ${applicationDraft.duplicate_status}<br>
    <strong>Status:</strong> ${applicationDraft.status}<br>
    <strong>Screening Questions:</strong> ${screeningFields.length}<br><br>

    <strong>Screening Answers</strong><br>
    <pre style="white-space: pre-wrap; font-family: Arial, sans-serif;">${screeningPreview}</pre>

    <strong>Cover Letter</strong><br>
    <pre style="white-space: pre-wrap; font-family: Arial, sans-serif;">${applicationDraft.cover_letter || "No cover letter generated."}</pre>
  </div>
`;
  } catch (error) {
    console.error(error);
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
      options = Array.from(input.options)
        .map((option) => option.textContent.trim())
        .filter(Boolean);
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
    resultBox.innerText = "Running autofill...";

    const active = await getActiveCandidateFromStorage();

    if (!active.candidateId) {
      resultBox.innerText =
        "Please select an active candidate in the extension popup first.";
      return;
    }

    const candidate = await fetch(
      `${AUTOBIDDER_API_BASE_URL}/candidates/${active.candidateId}`,
    ).then((r) => r.json());

    // 1. Basic profile autofill
    const atsType = getAtsType();

    let basicFillMessage = "Basic profile fields filled.";

    if (atsType === "greenhouse") {
      const greenhouseResult = fillGreenhouseBasicFields(candidate);
      basicFillMessage = `Greenhouse fields filled: ${greenhouseResult.filledCount}`;
    } else {
      autofillBasicFields(candidate);
    }
    // 2. Resume upload
    let resumeMessage = "No saved resume found for this candidate.";

    const resumeData = await getSavedResumeFileForCandidateFromStorage(
      active.candidateId,
    );

    if (resumeData) {
      const resumeResult = uploadResumeFileToPage(resumeData);
      resumeMessage = resumeResult.message;
    }

    // 3. Screening answers
    const storageData = await new Promise((resolve) => {
      chrome.storage.local.get(["latestOnPageScreeningAnswers"], resolve);
    });

    const answers = storageData.latestOnPageScreeningAnswers || [];

    let screeningMessage =
      "No screening answers found. Click Analyze Job first.";

    if (answers.length > 0) {
      const fillResult = fillScreeningAnswers(answers);

      screeningMessage = `Screening answers filled: ${fillResult.filled.length}, skipped: ${fillResult.skipped.length}`;
    }

    resultBox.innerText = `
Autofill completed.

Filled:
- Basic profile fields
- ${resumeMessage}
- ${screeningMessage}

Please review every field before submitting.
`.trim();
  } catch (error) {
    console.error(error);
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
    input.closest("div, section, fieldset")?.innerText?.toLowerCase() || "";

  const combined =
    `${label} ${accept} ${name} ${id} ${aria} ${parentText}`.toLowerCase();

  return (
    combined.includes("resume") ||
    combined.includes("cv") ||
    combined.includes("curriculum") ||
    combined.includes("attach") ||
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

      const jobInfoBox = document.getElementById("autobidder-job-info");

      jobInfoBox.innerHTML = `
        <strong>Job Posting Detected</strong><br>
        Company: ${detection.company_name || "Unknown"}<br>
        Title: ${detection.job_title || "Unknown"}<br>
        Confidence: ${detection.confidence}
      `;
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
