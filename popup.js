const analyzeBtn = document.getElementById('analyzeBtn');
const downloadBtn = document.getElementById('downloadBtn');
const statusDiv = document.getElementById('status');
const resultsDiv = document.getElementById('results');
const emptyState = document.getElementById('emptyState');
const usersList = document.getElementById('usersList');
const followersCount = document.getElementById('followersCount');
const followingCount = document.getElementById('followingCount');
const notFollowingCount = document.getElementById('notFollowingCount');
const langTrBtn = document.getElementById('langTr');
const langEnBtn = document.getElementById('langEn');

// Global değişken - sonuçları saklamak için
let currentResults = null;
let currentLang = 'tr';

// Initialize language and UI
(async () => {
  await initLanguage();
  currentLang = getCurrentLanguage();
  updateLanguageUI();
  updateUI();
  loadPreviousAnalysis();
})();

// Language selector
langTrBtn.addEventListener('click', async () => {
  await setLanguage('tr');
  currentLang = 'tr';
  updateLanguageUI();
  updateUI();
});

langEnBtn.addEventListener('click', async () => {
  await setLanguage('en');
  currentLang = 'en';
  updateLanguageUI();
  updateUI();
});

function updateLanguageUI() {
  langTrBtn.classList.toggle('active', currentLang === 'tr');
  langEnBtn.classList.toggle('active', currentLang === 'en');
}

function updateUI() {
  document.getElementById('title').textContent = getMessage('title');
  analyzeBtn.textContent = getMessage('startAnalysis');
  document.getElementById('followersLabel').textContent = getMessage('followersCount');
  document.getElementById('followingLabel').textContent = getMessage('followingCount');
  document.getElementById('notFollowingLabel').textContent = getMessage('notFollowingBack');
  document.getElementById('notFollowingListTitle').textContent = getMessage('notFollowingBackList');
  document.getElementById('emptyStateText').textContent = getMessage('emptyState');
  document.getElementById('emptyStateNote').textContent = getMessage('emptyStateNote');
  downloadBtn.textContent = getMessage('downloadTxt');
  
  // Update results if they exist
  if (currentResults) {
    displayResults(currentResults);
  }
}

analyzeBtn.addEventListener('click', async () => {
  // Aktif tab'ı al
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab.url.includes('instagram.com')) {
    showStatus(getMessage('pleaseInstagramPage'), 'error');
    return;
  }
  
  // Analiz başlat
  analyzeBtn.disabled = true;
  showStatus(getMessage('analysisStarting'), 'loading');
  resultsDiv.style.display = 'none';
  emptyState.style.display = 'none';
  
  try {
    // Önce content script'in yüklü olduğundan emin ol
    chrome.tabs.sendMessage(tab.id, { action: 'ping' }, (pingResponse) => {
      if (chrome.runtime.lastError) {
        // Content script yüklü değil, sayfayı yenile ve tekrar dene
        showStatus(getMessage('contentScriptLoading'), 'error');
        analyzeBtn.disabled = false;
        return;
      }
      
      // Content script'e analiz mesajı gönder
      chrome.tabs.sendMessage(tab.id, { action: 'startAnalysis' }, (response) => {
        if (chrome.runtime.lastError) {
          showStatus(getMessage('error') + ': ' + chrome.runtime.lastError.message + ' - ' + getMessage('pleaseRefresh'), 'error');
          analyzeBtn.disabled = false;
          return;
        }
        
        if (response && response.success) {
          showStatus(getMessage('analysisComplete'), 'success');
          currentResults = response.data;
          displayResults(response.data);
          analyzeBtn.disabled = false;
        } else {
          showStatus(getMessage('error') + ': ' + (response?.error || getMessage('unknownError')), 'error');
          analyzeBtn.disabled = false;
        }
      });
    });
  } catch (error) {
    showStatus(getMessage('error') + ': ' + error.message, 'error');
    analyzeBtn.disabled = false;
  }
});

// TXT indirme butonu
downloadBtn.addEventListener('click', () => {
  if (!currentResults) {
    showStatus(getMessage('noResultsToDownload'), 'error');
    return;
  }
  
  downloadAsTxt(currentResults);
});

function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = 'status ' + type;
  statusDiv.style.display = 'block';
  
  if (type === 'success' || type === 'error') {
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 5000);
  }
}

function displayResults(data) {
  followersCount.textContent = data.followersCount || 0;
  followingCount.textContent = data.followingCount || 0;
  notFollowingCount.textContent = data.notFollowingBackCount || 0;
  
  // Kullanıcı listesini göster
  usersList.innerHTML = '';
  
  if (data.notFollowingBack && data.notFollowingBack.length > 0) {
    data.notFollowingBack.forEach(username => {
      const userItem = document.createElement('div');
      userItem.className = 'user-item';
      const link = document.createElement('a');
      link.href = `https://www.instagram.com/${username}/`;
      link.target = '_blank';
      link.className = 'user-link';
      link.textContent = '@' + username;
      userItem.appendChild(link);
      usersList.appendChild(userItem);
    });
  } else {
    usersList.innerHTML = `<div class="empty-state" style="padding: 20px;">${getMessage('noUsersFound')}</div>`;
  }
  
  resultsDiv.style.display = 'block';
  emptyState.style.display = 'none';
}

function downloadAsTxt(data) {
  const date = formatDate(new Date(), currentLang);
  
  // TXT içeriğini oluştur
  let content = `${getMessage('reportTitle')}\n`;
  content += `==============================\n\n`;
  content += `${getMessage('date')}: ${date}\n`;
  content += `${getMessage('profile')}: @${data.username}\n\n`;
  content += `${getMessage('statistics')}:\n`;
  content += `-----------\n`;
  content += `${getMessage('followersCount')} ${data.followersCount}\n`;
  content += `${getMessage('followingCount')} ${data.followingCount}\n`;
  content += `${getMessage('notFollowingBack')} ${data.notFollowingBackCount}\n\n`;
  
  if (data.notFollowingBack && data.notFollowingBack.length > 0) {
    content += `${getMessage('notFollowingBackUsers')}\n`;
    content += `-------------------------------\n`;
    data.notFollowingBack.forEach((username, index) => {
      content += `${index + 1}. @${username} (https://www.instagram.com/${username}/)\n`;
    });
  } else {
    content += `${getMessage('notFollowingBackUsers')}\n`;
    content += `-------------------------------\n`;
    content += `${getMessage('none')}\n`;
  }
  
  content += `\n==============================\n`;
  content += `${getMessage('reportFooter')}\n`;
  
  // Blob oluştur ve indir
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const filename = currentLang === 'tr' 
    ? `instagram_takip_analizi_${data.username}_${Date.now()}.txt`
    : `instagram_follower_analysis_${data.username}_${Date.now()}.txt`;
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showStatus(getMessage('downloadComplete'), 'success');
}

async function loadPreviousAnalysis() {
  chrome.runtime.sendMessage({ action: 'getAnalysis' }, (response) => {
    if (response && response.results) {
      currentResults = response.results;
      displayResults(response.results);
      const date = new Date(response.date);
      showStatus(`${getMessage('lastAnalysis')} ${formatDate(date, currentLang)}`, 'info');
    }
  });
}
