// content.js
console.log('PW Live Navigation Helper active on this page');

// Global variables
let hideProgressBar = true; // Default setting
let progressBarObserver = null;
let originalProgressBar = null;
let progressBarContainer = null;

// Initialize by checking stored settings
chrome.storage.local.get(['hideProgressBar'], function(result) {
  hideProgressBar = result.hideProgressBar !== undefined ? result.hideProgressBar : true;
  console.log(`Initial setting: hideProgressBar = ${hideProgressBar}`);
  
  // Start monitoring for progress bar
  startProgressBarMonitoring();
});

// Function to start monitoring for progress bar
function startProgressBarMonitoring() {
  // First try to handle any existing progress bar
  handleExistingProgressBar();
  
  // Then set up an observer to monitor for changes
  if (!progressBarObserver) {
    progressBarObserver = new MutationObserver((mutations) => {
      if (!document.querySelector('[aria-label="Progress Bar"]') && hideProgressBar) {
        // The progress bar might have been added to the page
        handleExistingProgressBar();
      }
    });
    
    // Start observing the entire document
    progressBarObserver.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
    
    console.log('Progress bar observer started');
  }
}

// Function to handle existing progress bar
function handleExistingProgressBar() {
  const progressBar = document.querySelector('[aria-label="Progress Bar"]');
  
  if (progressBar) {
    console.log('Progress bar found');
    
    // Store original for later restoration
    if (!originalProgressBar) {
      originalProgressBar = progressBar.cloneNode(true);
      progressBarContainer = progressBar.parentNode;
    }
    
    // Apply current setting
    if (hideProgressBar) {
      console.log('Hiding progress bar');
      progressBar.style.display = 'none';
    } else {
      console.log('Showing progress bar');
      progressBar.style.display = '';
    }
    
    return true;
  }
  
  return false;
}

// Function to toggle progress bar visibility
function toggleProgressBar(hide) {
  hideProgressBar = hide;
  console.log(`Setting progress bar visibility: hide = ${hide}`);
  
  const progressBar = document.querySelector('[aria-label="Progress Bar"]');
  
  if (progressBar) {
    // If progress bar exists, simply toggle its visibility
    if (hide) {
      progressBar.style.display = 'none';
    } else {
      progressBar.style.display = '';
    }
    return true;
  } else if (!hide && originalProgressBar && progressBarContainer) {
    // If we need to show it but it doesn't exist, try to restore it
    try {
      const newProgressBar = originalProgressBar.cloneNode(true);
      newProgressBar.style.display = '';
      progressBarContainer.appendChild(newProgressBar);
      console.log('Progress bar restored from saved copy');
      return true;
    } catch (e) {
      console.error('Failed to restore progress bar:', e);
    }
  }
  
  return false;
}

// Function to jump to a specific time in the video
function jumpToTime(seconds) {
  // Find all video elements on the page
  const videoElements = document.querySelectorAll('video');
  let videoHandled = false;
  
  // Try each video element found
  videoElements.forEach(video => {
    if (video && typeof video.currentTime !== 'undefined') {
      try {
        console.log(`Setting video time to ${seconds} seconds`);
        // Make sure seconds is within valid range
        if (video.duration && seconds > video.duration) {
          seconds = Math.max(0, video.duration - 1);
        }
        video.currentTime = seconds;
        videoHandled = true;
      } catch (e) {
        console.error('Error setting video time:', e);
      }
    }
  });
  
  if (videoHandled) return true;
  
  // If direct video setting failed, try other methods
  
  // Try iframe videos
  const iframes = document.querySelectorAll('iframe');
  iframes.forEach(iframe => {
    try {
      iframe.contentWindow.postMessage({
        action: 'seekVideo',
        time: seconds
      }, '*');
      console.log('Sent seek command to iframe');
      videoHandled = true;
    } catch (e) {
      console.error('Error sending message to iframe:', e);
    }
  });
  
  if (videoHandled) return true;
  
  // Try JavaScript player APIs
  const playerApis = [
    {name: 'player', methods: ['currentTime', 'seek', 'seekTo']},
    {name: 'videoPlayer', methods: ['currentTime', 'seek', 'seekTo']},
    {name: 'videojs', methods: ['currentTime', 'seek', 'seekTo']},
    {name: 'jwplayer', methods: ['seek']},
    {name: '_player', methods: ['currentTime', 'seek', 'seekTo']},
    {name: '__player', methods: ['currentTime', 'seek', 'seekTo']}
  ];
  
  for (const api of playerApis) {
    if (window[api.name]) {
      for (const method of api.methods) {
        if (typeof window[api.name][method] === 'function') {
          try {
            window[api.name][method](seconds);
            console.log(`Used ${api.name}.${method} to seek to ${seconds}`);
            return true;
          } catch (e) {
            console.error(`Error with ${api.name}.${method}:`, e);
          }
        }
      }
    }
  }
  
  console.log('Could not find a way to control video playback. Click on the video first or reload the page.');
  return false;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('Message received:', request);
  
  if (request.action === "jumpToTime") {
    console.log(`Received request to jump to ${request.time} seconds`);
    const result = jumpToTime(request.time);
    sendResponse({success: result});
  }
  else if (request.action === "setProgressBarVisibility") {
    console.log(`Toggling progress bar visibility: hide = ${request.hide}`);
    const result = toggleProgressBar(request.hide);
    
    // Save the setting regardless of success
    chrome.storage.local.set({hideProgressBar: request.hide});
    
    sendResponse({success: result});
  }
  
  // Return true to indicate we'll send a response asynchronously
  return true;
});

// Handle URL changes (for single-page applications)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    console.log('URL changed, checking for new progress bar');
    
    // Reset our saved references
    originalProgressBar = null;
    progressBarContainer = null;
    
    // Handle progress bar after a short delay
    setTimeout(() => {
      handleExistingProgressBar();
    }, 1000);
  }
}).observe(document, {subtree: true, childList: true});

// Initial page load handling
console.log('Initial page check');
handleExistingProgressBar();