function getVisiblePageText() {
  const bodyText = document.body ? document.body.innerText : "";
  return bodyText.replace(/\s+/g, " ").trim().slice(0, 12000);
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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GET_JOB_PAGE_DATA") {
    sendResponse({
      url: window.location.href,
      title: document.title,
      pageText: getVisiblePageText(),
    });
  }

  if (request.type === "AUTOFILL_BASIC_FIELDS") {
    autofillBasicFields(request.profile);
    sendResponse({
      success: true,
      message: "Basic fields autofilled. Please review before submitting.",
    });
  }

  return true;
});
