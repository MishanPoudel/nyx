// Array to store blocked websites
let blockedWebsites = [];

// Map to store timeouts for each blocked website
let timeoutMap = {};

// Helper function to create a new blocking rule for a URL
function createBlockingRule(url, ruleId) {
  return {
    id: ruleId,
    priority: 1,
    action: { type: "block" },
    condition: {
      urlFilter: url,
      resourceTypes: ["main_frame"], // Restrict blocking to main frames
    },
  };
}

// Function to update the rules in the declarative Net Request API
function updateDeclarativeNetRequestRules() {
  // Retrieve existing rules
  chrome.declarativeNetRequest.getDynamicRules((existingRules) => {
    // Extract IDs of existing rules to remove
    const rulesToRemove = existingRules.map((rule) => rule.id);
    
    // Generate new blocking rules for each website
    const rulesToAdd = blockedWebsites.map((website, index) =>
      createBlockingRule(website.website, index + 1)
    );

    // Update rules
    chrome.declarativeNetRequest.updateDynamicRules(
      {
        removeRuleIds: rulesToRemove,
        addRules: rulesToAdd,
      },
      () => {
        if (chrome.runtime.lastError) {
          console.error(
            "Error updating declarativeNetRequest rules:",
            chrome.runtime.lastError
          );
        }
      }
    );
  });
}

// Function to block a website for a specified duration
function blockWebsite(website, duration) {
  // Calculate the finish time
  const finishTime = Date.now() + duration * 60 * 1000;
  
  // Store the blocked website and its finish time
  const blockedWebsite = { website, finishTime };
  blockedWebsites.push(blockedWebsite);

  // Save the updated list to storage and update blocking rules
  chrome.storage.sync.set({ blockedWebsites }, () => {
    updateDeclarativeNetRequestRules();
  });

  // Create an alarm for this website to unblock it later
  chrome.alarms.create(website, { when: finishTime });
}

// Listener for alarm trigger to unblock a website
chrome.alarms.onAlarm.addListener((alarm) => {
  unblockWebsite(alarm.name);
});

// Function to unblock a website
function unblockWebsite(website) {
  // Remove the website from the blocked list
  blockedWebsites = blockedWebsites.filter((item) => item.website !== website);

  // Save the updated list to storage and update blocking rules
  chrome.storage.sync.set({ blockedWebsites }, () => {
    updateDeclarativeNetRequestRules();
  });

  // Clear the timeout for this website
  delete timeoutMap[website];
}

// Initialize the extension by restoring the blocked websites from storage
function initializeExtension() {
  chrome.storage.sync.get(["blockedWebsites"], (result) => {
    if (result.blockedWebsites) {
      blockedWebsites = result.blockedWebsites;

      // Update timeoutMap and set timeouts based on stored values
      blockedWebsites.forEach((blockedWebsite) => {
        const remainingTime = blockedWebsite.finishTime - Date.now();

        // If the finishTime is in the future, set a new timeout to unblock the website
        if (remainingTime > 0) {
          timeoutMap[blockedWebsite.website] = setTimeout(() => {
            unblockWebsite(blockedWebsite.website);
          }, remainingTime);
        } else {
          // If the finishTime has passed, unblock the website immediately
          unblockWebsite(blockedWebsite.website);
        }
      });

      // Update blocking rules
      updateDeclarativeNetRequestRules();
    }
  });
}

// Add listener for the installed event to initialize the extension
chrome.runtime.onInstalled.addListener(initializeExtension);

// Listener for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle different actions from the popup
  if (message.action === "blockWebsite") {
    blockWebsite(message.website, message.duration);
    sendResponse({ success: true });
  } else if (message.action === "unblockWebsite") {
    unblockWebsite(message.website);
    sendResponse({ success: true });
  } else if (message.action === "getBlockedWebsites") {
    sendResponse({ websites: blockedWebsites });
  }
  // Ensure the response is sent asynchronously
  return true;
});
