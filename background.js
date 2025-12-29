// Service worker - mesaj yönlendirme ve veri saklama

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'saveAnalysis') {
    // Analiz sonuçlarını sakla
    chrome.storage.local.set({
      analysisResults: message.data,
      analysisDate: new Date().toISOString()
    }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (message.action === 'getAnalysis') {
    // Analiz sonuçlarını getir
    chrome.storage.local.get(['analysisResults', 'analysisDate'], (result) => {
      sendResponse({
        results: result.analysisResults,
        date: result.analysisDate
      });
    });
    return true;
  }
});

