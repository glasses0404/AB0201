const API_BASE_URL = "http://127.0.0.1:8000";

async function postJsonToBackend(path, payload) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
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

async function getJsonFromBackend(path) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText);
  }

  return await response.json();
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "BACKEND_POST_JSON") {
    postJsonToBackend(request.path, request.payload)
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
    getJsonFromBackend(request.path)
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
