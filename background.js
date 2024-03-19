let blockedWebsites = [];

function updateBlockedListInContentScripts() {
  chrome.tabs.query({ currentWindow: true }, (tabs) => {
    tabs.forEach((tab) => {
      chrome.tabs.sendMessage(tab.id, {
        action: "updateBlockedList",
        websites: blockedWebsites,
      });
    });
  });
}

function updateBlockedWebsitesStorage() {
  chrome.storage.sync.set({ blockedWebsites }, () => {
    updateBlockedListInContentScripts();
  });
}

function blockWebsite(website, duration, finishTime) {
  const blockedWebsite = { website, duration, finishTime };
  blockedWebsites.push(blockedWebsite);

  updateBlockedWebsitesStorage();

  setTimeout(() => {
    unblockWebsite(website);
    chrome.runtime.sendMessage({ action: "removeBlockedWebsite", website });
  }, duration * 60 * 1000);
}

function unblockWebsite(website) {
  blockedWebsites = blockedWebsites.filter(
    (blockedWebsite) => blockedWebsite.website !== website
  );

  updateBlockedWebsitesStorage();
  updateBlockedListInContentScripts();
}

function retrieveBlockedWebsitesFromStorage() {
  chrome.storage.sync.get("blockedWebsites", (result) => {
    const storedBlockedWebsites = result.blockedWebsites;
    blockedWebsites =
      storedBlockedWebsites !== undefined ? storedBlockedWebsites : [];

    updateBlockedListInContentScripts();
  });
}

function removeBlockedWebsite(website) {
  blockedWebsites = blockedWebsites.filter(
    (blockedWebsite) => blockedWebsite.website !== website
  );

  updateBlockedWebsitesStorage();
  updateBlockedListInContentScripts();
}

retrieveBlockedWebsitesFromStorage();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "blockWebsite") {
    const { website, duration, finishTime } = message;
    blockWebsite(website, duration, finishTime);
    sendResponse({ success: true });
  } else if (message.action === "getBlockedWebsites") {
    sendResponse({ websites: blockedWebsites });
  } else if (message.action === "removeWebsite") {
    const { website } = message;
    removeBlockedWebsite(website);
    sendResponse({ success: true });
  }
});