document.addEventListener("DOMContentLoaded", function () {
  const blockForm = document.getElementById("block-form");
  const blockedList = document.getElementById("blocked-list");

  blockForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const websiteInput = document.getElementById("website");
    const hoursInput = document.getElementById("hours");
    const minutesInput = document.getElementById("minutes");
    const website = websiteInput.value.trim();
    const hours = parseInt(hoursInput.value.trim() || 0);
    const minutes = parseInt(minutesInput.value.trim() || 0);

    if (hours === 0 && minutes === 0) {
      alert("Please set a valid duration.");
      return;
    }

    const currentTime = new Date();
    const finishTime = new Date(
      currentTime.getTime() + hours * 60 * 60 * 1000 + minutes * 60 * 1000
    );
    const finishHours = finishTime.getHours();
    const finishMinutes = finishTime.getMinutes();
    const finishTimeString = `${finishHours
      .toString()
      .padStart(2, "0")}:${finishMinutes.toString().padStart(2, "0")}`;

    chrome.runtime.sendMessage(
      {
        action: "blockWebsite",
        website,
        duration: hours * 60 + minutes,
        finishTime: finishTimeString,
      },
      function (response) {
        if (response && response.success) {
          websiteInput.value = "";
          hoursInput.value = "";
          minutesInput.value = "";
          appendBlockedWebsite({
            website,
            duration: hours * 60 + minutes,
            finishTime: finishTimeString,
          });
        }
      }
    );
  });

  function updateBlockedList(websites) {
    blockedList.innerHTML = "";

    websites.forEach(function (blockedWebsite) {
      appendBlockedWebsite(blockedWebsite);
    });
  }

  function appendBlockedWebsite(blockedWebsite) {
    const listItem = document.createElement("li");
    listItem.textContent = blockedWebsite.website;

    const finishTimeSpan = document.createElement("span");
    finishTimeSpan.textContent = `until ${blockedWebsite.finishTime}`;
    finishTimeSpan.classList.add("finish-time");
    listItem.appendChild(finishTimeSpan);

    const removeButton = document.createElement("span");
    removeButton.textContent = "delete";
    removeButton.classList.add("material-icons", "remove-button");
    listItem.appendChild(removeButton);

    blockedList.appendChild(listItem);

    removeButton.addEventListener("click", function () {
      removeBlockedWebsite(blockedWebsite.website);
    });
  }

  function removeBlockedWebsite(website) {
    chrome.runtime.sendMessage(
      { action: "removeWebsite", website },
      function (response) {
        if (response && response.success) {
          removeBlockedWebsiteFromList(website);
        }
      }
    );
  }

  function removeBlockedWebsiteFromList(website) {
    const listItems = blockedList.querySelectorAll("li");
    listItems.forEach((listItem) => {
        if (listItem.textContent.includes(website)) {
            listItem.remove();
        }
    });
}

  chrome.runtime.sendMessage({ action: "getBlockedWebsites" }, function (
    response
  ) {
    const websites = response?.websites || [];
    updateBlockedList(websites);
  });

  chrome.runtime.onMessage.addListener(function (
    message,
    sender,
    sendResponse
  ) {
    if (message.action === "updateBlockedList") {
      const websites = message.websites;
      updateBlockedList(websites);
    }
  });
});