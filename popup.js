document.addEventListener("DOMContentLoaded", function () {
  const blockForm = document.getElementById("block-form");
  const blockedList = document.getElementById("blocked-list");

  blockForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const websiteInput = document.getElementById("website");
    const hoursInput = document.getElementById("hours");
    const minutesInput = document.getElementById("minutes");
    const website = websiteInput.value.trim();
    const hours = parseInt(hoursInput.value.trim() || "0", 10);
    const minutes = parseInt(minutesInput.value.trim() || "0", 10);

    if (website === "" || (hours === 0 && minutes === 0)) {
      alert("Please set a valid website and duration.");
      return;
    }

    chrome.runtime.sendMessage(
      {
        action: "blockWebsite",
        website,
        duration: hours * 60 + minutes,
      },
      function (response) {
        if (response && response.success) {
          websiteInput.value = "";
          hoursInput.value = "";
          minutesInput.value = "";
          updateBlockedList(); // Call this to refresh the list
        }
      }
    );
  });

  function updateBlockedList() {
    chrome.runtime.sendMessage(
      { action: "getBlockedWebsites" },
      function (response) {
        if (response && response.websites && response.websites.length > 0) {
          blockedList.innerHTML = '';
          response.websites.forEach(appendBlockedWebsite);
        } else {
          // Display a message when the list is empty
          blockedList.innerHTML = '<p>No websites are currently blocked.</p>';
        }
      }
    );
  }

  function appendBlockedWebsite(blockedWebsite) {
    const listItem = document.createElement("li");
    listItem.textContent = blockedWebsite.website;

    // Calculate the remaining time until unblock
    const remainingTime = blockedWebsite.finishTime - Date.now();
    const finishTime = new Date(blockedWebsite.finishTime);
    const formattedFinishTime = finishTime.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    // Only display the remaining time if it's greater than 0
    const finishTimeSpan = document.createElement("span");
    if (remainingTime > 0) {
      finishTimeSpan.textContent = ` until ${formattedFinishTime}`;
    } else {
      finishTimeSpan.textContent = ` - Time expired`;
    }
    finishTimeSpan.classList.add("finish-time");
    listItem.appendChild(finishTimeSpan);

    const removeButton = document.createElement("button");
    removeButton.textContent = "Unblock";
    listItem.appendChild(removeButton);

    blockedList.appendChild(listItem);

    removeButton.addEventListener("click", function () {
      unblockWebsite(blockedWebsite.website);
    });
  }

  function unblockWebsite(website) {
    chrome.runtime.sendMessage(
      { action: "unblockWebsite", website },
      function (response) {
        if (response && response.success) {
          updateBlockedList(); // Refresh the list to reflect unblocked website
        }
      }
    );
  }

  // Listen for updates from the background script
  chrome.runtime.onMessage.addListener(function (message) {
    if (message.action === "updateBlockedList") {
      updateBlockedList();
    }
  });

  // Initially populate the blocked list
  updateBlockedList();
});
