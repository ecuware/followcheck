chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'saveAnalysis') {
    const data = message.data;
    const toStore = {
      username: data.username,
      followersCount: data.followersCount,
      followingCount: data.followingCount,
      notFollowingBack: data.notFollowingBack || [],
      notFollowingBackCount: data.notFollowingBackCount || 0,
      youNotFollowing: data.youNotFollowing || [],
      youNotFollowingCount: data.youNotFollowingCount || 0
    };
    chrome.storage.local.set({
      analysisResults: toStore,
      analysisDate: new Date().toISOString()
    }, () => {
      chrome.storage.local.remove('analysisProgress', () => {
        sendResponse({ success: true });
      });
    });
    return true;
  }

  if (message.action === 'analysisProgress') {
    chrome.storage.local.set({ analysisProgress: message.data }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (message.action === 'getAnalysis') {
    chrome.storage.local.get(['analysisResults', 'analysisDate'], (result) => {
      sendResponse({
        results: result.analysisResults,
        date: result.analysisDate
      });
    });
    return true;
  }
});

