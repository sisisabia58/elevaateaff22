import { refreshSession } from "./shared/auth";
import { DEFAULT_SETTINGS } from "./shared/types";

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get("ea-settings", (bag) => {
    if (!bag["ea-settings"]) void chrome.storage.local.set({ "ea-settings": DEFAULT_SETTINGS });
  });
  void chrome.alarms.create("ea-auth-refresh", { periodInMinutes: 15 });
});

chrome.runtime.onStartup.addListener(() => {
  void refreshSession();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "ea-auth-refresh") void refreshSession();
});

void refreshSession();

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "EA_OPEN_OPTIONS") {
    void chrome.runtime.openOptionsPage();
    sendResponse({ ok: true });
    return true;
  }
  if (message?.type === "EA_OPEN_DASHBOARD") {
    void chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
    sendResponse({ ok: true });
    return true;
  }
  return false;
});
