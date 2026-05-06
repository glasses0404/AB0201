const API_BASE_URL = "http://127.0.0.1:8000";

async function postJsonToBackend(path, payload, apiBaseUrl = API_BASE_URL) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload || {}),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText);
  }

  return await response.json();
}

async function getJsonFromBackend(path, apiBaseUrl = API_BASE_URL) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "GET",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText);
  }

  return await response.json();
}

async function deleteJsonFromBackend(path, apiBaseUrl = API_BASE_URL) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText);
  }

  return await response.json();
}

async function patchJsonToBackend(path, payload, apiBaseUrl = API_BASE_URL) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload || {}),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText);
  }

  return await response.json();
}

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab || !tab.id) {
    return;
  }

  try {
    await chrome.tabs.sendMessage(tab.id, {
      type: "APPLYPILOT_TOGGLE_PANEL",
    });
  } catch (error) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"],
      });

      await chrome.tabs.sendMessage(tab.id, {
        type: "APPLYPILOT_TOGGLE_PANEL",
      });
    } catch (innerError) {
      console.error("ApplyPilot panel open error:", innerError);
    }
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "BACKEND_POST_JSON") {
    postJsonToBackend(
      request.path,
      request.payload,
      request.apiBaseUrl || API_BASE_URL,
    )
      .then((data) => {
        sendResponse({
          success: true,
          data,
        });
      })
      .catch((error) => {
        sendResponse({
          success: false,
          message: error.message,
        });
      });

    return true;
  }

  if (request.type === "BACKEND_GET_JSON") {
    getJsonFromBackend(request.path, request.apiBaseUrl || API_BASE_URL)
      .then((data) => {
        sendResponse({
          success: true,
          data,
        });
      })
      .catch((error) => {
        sendResponse({
          success: false,
          message: error.message,
        });
      });

    return true;
  }

  if (request.type === "BACKEND_PATCH_JSON") {
    patchJsonToBackend(
      request.path,
      request.payload,
      request.apiBaseUrl || API_BASE_URL,
    )
      .then((data) => {
        sendResponse({
          success: true,
          data,
        });
      })
      .catch((error) => {
        sendResponse({
          success: false,
          message: error.message,
        });
      });

    return true;
  }

  if (request.type === "BACKEND_DELETE_JSON") {
    deleteJsonFromBackend(request.path, request.apiBaseUrl || API_BASE_URL)
      .then((data) => {
        sendResponse({
          success: true,
          data,
        });
      })
      .catch((error) => {
        sendResponse({
          success: false,
          message: error.message,
        });
      });

    return true;
  }

  return false;
});
