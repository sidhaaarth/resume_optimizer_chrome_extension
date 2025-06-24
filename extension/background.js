// A service worker for the Vox Summarizer Chrome Extension.

// When the user clicks on the extension action
chrome.action.onClicked.addListener(async (tab) => {
  // We can only inject script to existing pages, not internal chrome pages
  if (tab.url?.startsWith("chrome://") || tab.url?.startsWith("chrome-extension://")) {
    return;
  }

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: sendPageContent,
  });
});

// This function will be executed in the active tab.
function sendPageContent() {
  const pageContent = document.body.innerText;

  if (!pageContent || pageContent.trim().length === 0) {
    // This is running in the context of the page, so alert will work.
    alert("Could not find any text on this page to summarize.");
    return;
  }
  
  // IMPORTANT: Replace this with the URL of your deployed Vox Summarizer application.
  // For local development, it's typically 'http://localhost:9002'.
  const appUrl = 'http://localhost:9002';
  
  const destinationUrl = new URL(appUrl);
  destinationUrl.searchParams.set('pageContent', pageContent);

  // URL length limits are generous in modern browsers, but for extremely large pages,
  // this could be an issue. For a prototype, it's the simplest approach.
  window.open(destinationUrl.href, '_blank');
}
