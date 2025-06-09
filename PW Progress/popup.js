// popup.js
document.addEventListener('DOMContentLoaded', function() {
  const minutesInput = document.getElementById('minutes');
  const secondsInput = document.getElementById('seconds');
  const goToTimeButton = document.getElementById('goToTime');
  const progressBarToggle = document.getElementById('progressBarToggle');
  const statusElement = document.getElementById('status');
  
  chrome.storage.local.get(['hideProgressBar'], function(result) {
    // Default to true (hiding progress bar) if not set
    const hideProgressBar = result.hideProgressBar !== undefined ? result.hideProgressBar : true;
    progressBarToggle.checked = hideProgressBar;
    
    updateStatusText(hideProgressBar);
    
    // Send initial state to content script on popup open
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0] && tabs[0].url && tabs[0].url.includes('pw.live/watch')) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "setProgressBarVisibility",
          hide: hideProgressBar
        }, function(response) {
          console.log('Initial visibility setting response:', response);
        });
      }
    });
  });
  
  function updateStatusText(hideProgressBar) {
    if (hideProgressBar) {
      statusElement.textContent = 'Progress bar is hidden';
      statusElement.className = 'status hidden';
    } else {
      statusElement.textContent = 'Progress bar is visible';
      statusElement.className = 'status visible';
    }
  }
  
  // Validate seconds to be between 0-59
  secondsInput.addEventListener('change', function() {
    if (this.value > 59) this.value = 59;
    if (this.value < 0) this.value = 0;
  });
  
  // Validate minutes to be non-negative
  minutesInput.addEventListener('change', function() {
    if (this.value < 0) this.value = 0;
  });
  
  // Toggle progress bar visibility
  progressBarToggle.addEventListener('change', function() {
    const hideProgressBar = this.checked;
    
    // Update UI first
    updateStatusText(hideProgressBar);
    
    // Save the setting
    chrome.storage.local.set({hideProgressBar: hideProgressBar});
    
    // Send message to content script
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0] && tabs[0].url && tabs[0].url.includes('pw.live/watch')) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "setProgressBarVisibility",
          hide: hideProgressBar
        }, function(response) {
          console.log('Visibility toggle response:', response);
        });
      }
    });
  });
  
  goToTimeButton.addEventListener('click', function() {
    const minutes = parseInt(minutesInput.value) || 0;
    const seconds = parseInt(secondsInput.value) || 0;
    
    const totalSeconds = (minutes * 60) + seconds;
    
    // Provide visual feedback
    goToTimeButton.textContent = 'Jumping...';
    goToTimeButton.disabled = true;
    
    // Send message to content script
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0] && tabs[0].url && tabs[0].url.includes('pw.live/watch')) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "jumpToTime",
          time: totalSeconds
        }, function(response) {
          // Reset button text after a short delay
          setTimeout(() => {
            goToTimeButton.textContent = 'Go to Timestamp';
            goToTimeButton.disabled = false;
          }, 500);
        });
      } else {
        // Reset button if not on a lecture page
        setTimeout(() => {
          goToTimeButton.textContent = 'Go to Timestamp';
          goToTimeButton.disabled = false;
        }, 500);
      }
    });
  });
});