document.addEventListener("DOMContentLoaded", function () {
  // Retrieve elements from the DOM
  const blockForm = document.getElementById("block-form"); // Form for blocking a website
  const blockedList = document.getElementById("blocked-list"); // List to display blocked websites

  // Event listener for the form submission
  blockForm.addEventListener("submit", function (event) {
    event.preventDefault(); // Prevent default form submission behavior

    // Retrieve input values from the form
    const websiteInput = document.getElementById("website");
    const hoursInput = document.getElementById("hours");
    const minutesInput = document.getElementById("minutes");
    const website = websiteInput.value.trim();
    const hours = parseInt(hoursInput.value.trim() || "0", 10);
    const minutes = parseInt(minutesInput.value.trim() || "0", 10);

    // Validate input values
    if (website === "" || (hours === 0 && minutes === 0)) {
      alert("Please set a valid website and duration.");
      return;
    }

    // Send message to background script to block the website
    chrome.runtime.sendMessage(
      {
        action: "blockWebsite",
        website,
        duration: hours * 60 + minutes,
      },
      function (response) {
        // Clear input fields and update blocked list upon successful blocking
        if (response && response.success) {
          websiteInput.value = "";
          hoursInput.value = "";
          minutesInput.value = "";
          updateBlockedList(); // Refresh the list
        }
      }
    );
  });

  // Function to update the blocked websites list
  function updateBlockedList() {
    // Send message to background script to retrieve the list of blocked websites
    chrome.runtime.sendMessage(
      { action: "getBlockedWebsites" },
      function (response) {
        // Update the displayed list with the retrieved data
        if (response && response.websites && response.websites.length > 0) {
          blockedList.innerHTML = "";
          response.websites.forEach(appendBlockedWebsite);
        } else {
          // Display a message when the list is empty
          blockedList.innerHTML = "<p>No websites are currently blocked.</p>";
        }
      }
    );
  }

  // Function to append a blocked website to the list
  function appendBlockedWebsite(blockedWebsite) {
    // Create list item element
    const listItem = document.createElement("li");
    listItem.textContent = blockedWebsite.website;

    // Calculate and display remaining time until unblock
    const remainingTime = blockedWebsite.finishTime - Date.now();
    const finishTime = new Date(blockedWebsite.finishTime);
    const formattedFinishTime = finishTime.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    const finishTimeSpan = document.createElement("span");
    if (remainingTime > 0) {
      finishTimeSpan.textContent = ` until ${formattedFinishTime}`;
    } else {
      finishTimeSpan.textContent = ` - Time expired`;
    }
    finishTimeSpan.classList.add("finish-time");
    listItem.appendChild(finishTimeSpan);

    // Create button to unblock the website
    const removeButton = document.createElement("button");
    removeButton.textContent = "Unblock";
    listItem.appendChild(removeButton);

    // Append list item to the blocked list
    blockedList.appendChild(listItem);

    // Event listener to handle unblocking when the button is clicked
    removeButton.addEventListener("click", function () {
      unblockWebsite(blockedWebsite.website);
    });
  }

  // Function to unblock a website
  function unblockWebsite(website) {
    // Send message to background script to unblock the website
    chrome.runtime.sendMessage(
      { action: "unblockWebsite", website },
      function (response) {
        // Refresh the list upon successful unblocking
        if (response && response.success) {
          updateBlockedList();
        }
      }
    );
  }

  // Listen for updates from the background script
  chrome.runtime.onMessage.addListener(function (message) {
    // Update the blocked list when requested by the background script
    if (message.action === "updateBlockedList") {
      updateBlockedList();
    }
  });

  // Initially populate the blocked list
  updateBlockedList();
});
