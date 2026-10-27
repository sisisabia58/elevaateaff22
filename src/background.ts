import { DEFAULT_SETTINGS } from "./shared/types";

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get("ea-settings", (bag) => {
    if (!bag["ea-settings"]) void chrome.storage.local.set({ "ea-settings": DEFAULT_SETTINGS });
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "EA_OPEN_OPTIONS") {
    void chrome.runtime.openOptionsPage();
    sendResponse({ ok: true });
    return true;
  }
  return false;
});
