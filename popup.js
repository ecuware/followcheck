const analyzeBtn = document.getElementById('analyzeBtn');
const downloadBtn = document.getElementById('downloadBtn');
const downloadCsvBtn = document.getElementById('downloadCsvBtn');
const downloadJsonBtn = document.getElementById('downloadJsonBtn');
const statusDiv = document.getElementById('status');
const resultsDiv = document.getElementById('results');
const emptyState = document.getElementById('emptyState');
const usersList = document.getElementById('usersList');
const youNotFollowingList = document.getElementById('youNotFollowingList');
const searchInput = document.getElementById('searchInput');
const followersCount = document.getElementById('followersCount');
const followingCount = document.getElementById('followingCount');
const notFollowingCount = document.getElementById('notFollowingCount');
const youNotFollowingCount = document.getElementById('youNotFollowingCount');
const langTrBtn = document.getElementById('langTr');
const langEnBtn = document.getElementById('langEn');

let currentResults = null;
let currentLang = 'tr';

(async () => {
  await initLanguage();
  currentLang = getCurrentLanguage();
  updateLanguageUI();
  updateUI();
  loadPreviousAnalysis();
})();

if (langTrBtn) {
  langTrBtn.addEventListener('click', async () => {
    await setLanguage('tr');
    currentLang = 'tr';
    updateLanguageUI();
    updateUI();
  });
}
if (langEnBtn) {
  langEnBtn.addEventListener('click', async () => {
    await setLanguage('en');
    currentLang = 'en';
    updateLanguageUI();
    updateUI();
  });
}

const ERROR_KEYS = {
  PROFILE_PAGE_REQUIRED: 'errorProfilePageRequired',
  LINK_NOT_FOUND: 'errorLinkNotFound',
  EMPTY_FOLLOWERS: 'errorEmptyFollowers',
  EMPTY_FOLLOWING: 'errorEmptyFollowing'
};
const RETRYABLE_ERRORS = ['LINK_NOT_FOUND', 'EMPTY_FOLLOWERS', 'EMPTY_FOLLOWING'];

function getErrorMessage(response) {
  if (!response) return getMessage('unknownError');
  const key = response.errorCode && ERROR_KEYS[response.errorCode];
  return key ? getMessage(key) : (response.error || getMessage('unknownError'));
}

function updateLanguageUI() {
  if (langTrBtn) langTrBtn.classList.toggle('active', currentLang === 'tr');
  if (langEnBtn) langEnBtn.classList.toggle('active', currentLang === 'en');
}

function updateUI() {
  const titleEl = document.getElementById('title');
  if (titleEl) titleEl.textContent = getMessage('title');
  if (analyzeBtn) analyzeBtn.textContent = getMessage('startAnalysis');
  const fl = document.getElementById('followersLabel');
  const fol = document.getElementById('followingLabel');
  if (fl) fl.textContent = getMessage('followersCount');
  if (fol) fol.textContent = getMessage('followingCount');
  const nfl = document.getElementById('notFollowingLabel');
  const nft = document.getElementById('notFollowingBackTitle');
  if (nfl) nfl.textContent = getMessage('notFollowingBackShort');
  if (nft) nft.textContent = getMessage('notFollowingBackList');
  const ynt = document.getElementById('youNotFollowingTitle');
  const ynl = document.getElementById('youNotFollowingLabel');
  if (ynt) ynt.textContent = getMessage('youNotFollowingList');
  if (ynl) ynl.textContent = getMessage('youNotFollowingShort');
  const emptyText = document.getElementById('emptyStateText');
  const emptyNote = document.getElementById('emptyStateNote');
  if (emptyText) emptyText.textContent = getMessage('emptyState');
  if (emptyNote) emptyNote.textContent = getMessage('emptyStateNote');
  if (downloadBtn) downloadBtn.textContent = getMessage('downloadTxt');
  if (downloadCsvBtn) downloadCsvBtn.textContent = getMessage('downloadCsv');
  if (downloadJsonBtn) downloadJsonBtn.textContent = getMessage('downloadJson');
  if (searchInput) searchInput.placeholder = getMessage('searchPlaceholder');
  if (currentResults) displayResults(currentResults);
}

analyzeBtn.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab.url.includes('instagram.com')) {
    showStatus(getMessage('pleaseInstagramPage'), 'error');
    return;
  }
  
  analyzeBtn.disabled = true;
  showStatus(getMessage('analysisStarting'), 'loading');
  resultsDiv.style.display = 'none';
  emptyState.style.display = 'none';
  await chrome.storage.local.remove('analysisProgress');

  function stopProgressPoll() {
    if (progressPollInterval) {
      clearInterval(progressPollInterval);
      progressPollInterval = null;
    }
    chrome.storage.local.remove('analysisProgress');
  }

  let progressPollInterval = null;

  try {
    chrome.tabs.sendMessage(tab.id, { action: 'ping' }, (pingResponse) => {
      if (chrome.runtime.lastError) {
        showStatus(getMessage('contentScriptLoading'), 'error');
        analyzeBtn.disabled = false;
        return;
      }

      progressPollInterval = setInterval(async () => {
        const r = await chrome.storage.local.get(['analysisProgress']);
        if (r.analysisProgress) {
          const { phase, current } = r.analysisProgress;
          const label = phase === 'followers' ? getMessage('progressFollowers') : getMessage('progressFollowing');
          showStatus(`${label} ${current}`, 'loading');
        }
      }, 500);

      function runAnalysis(attempt) {
        chrome.tabs.sendMessage(tab.id, { action: 'startAnalysis' }, (response) => {
          stopProgressPoll();
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
          } else if (attempt === 0 && response && RETRYABLE_ERRORS.includes(response.errorCode)) {
            showStatus(getMessage('retrying'), 'loading');
            progressPollInterval = setInterval(async () => {
              const r = await chrome.storage.local.get(['analysisProgress']);
              if (r.analysisProgress) {
                const { phase, current } = r.analysisProgress;
                const label = phase === 'followers' ? getMessage('progressFollowers') : getMessage('progressFollowing');
                showStatus(`${label} ${current}`, 'loading');
              }
            }, 500);
            setTimeout(() => runAnalysis(1), 2000);
          } else {
            showStatus(getMessage('error') + ': ' + getErrorMessage(response), 'error');
            analyzeBtn.disabled = false;
          }
        });
      }
      runAnalysis(0);
    });
  } catch (error) {
    stopProgressPoll();
    showStatus(getMessage('error') + ': ' + error.message, 'error');
    analyzeBtn.disabled = false;
  }
});

downloadBtn.addEventListener('click', () => {
  if (!currentResults) {
    showStatus(getMessage('noResultsToDownload'), 'error');
    return;
  }
  downloadAsTxt(currentResults);
});

if (downloadCsvBtn) {
  downloadCsvBtn.addEventListener('click', () => {
    if (!currentResults) {
      showStatus(getMessage('noResultsToDownload'), 'error');
      return;
    }
    downloadAsCsv(currentResults);
  });
}
if (downloadJsonBtn) {
  downloadJsonBtn.addEventListener('click', () => {
    if (!currentResults) {
      showStatus(getMessage('noResultsToDownload'), 'error');
      return;
    }
    downloadAsJson(currentResults);
  });
}

if (searchInput) {
  searchInput.addEventListener('input', () => {
    if (!currentResults) return;
    try {
      const full = JSON.parse(searchInput.dataset.fullList || '[]');
      const q = (searchInput.value || '').trim().toLowerCase();
      const filtered = q ? full.filter(u => u.toLowerCase().includes(q)) : full;
      renderUserList(usersList, filtered);
    } catch (e) {}
  });
}

function showStatus(message, type) {
  const statusText = document.getElementById('statusText');
  if (statusText) statusText.textContent = message;
  else if (statusDiv) statusDiv.textContent = message;
  if (statusDiv) {
    statusDiv.className = 'status ' + type;
    statusDiv.style.display = 'block';
  }
  if (type === 'success' || type === 'error') {
    setTimeout(() => {
      if (statusDiv) statusDiv.style.display = 'none';
    }, 5000);
  }
}

function renderUserList(container, usernames) {
  container.innerHTML = '';
  if (!usernames || usernames.length === 0) return;
  usernames.forEach(username => {
    const item = document.createElement('div');
    item.className = 'list-item';
    const link = document.createElement('a');
    link.href = `https://www.instagram.com/${username}/`;
    link.target = '_blank';
    link.className = 'list-link';
    link.textContent = '@' + username;
    item.appendChild(link);
    container.appendChild(item);
  });
}

function displayResults(data) {
  followersCount.textContent = data.followersCount || 0;
  followingCount.textContent = data.followingCount || 0;
  notFollowingCount.textContent = data.notFollowingBackCount || 0;
  if (youNotFollowingCount) {
    youNotFollowingCount.textContent = data.youNotFollowingCount ?? 0;
  }
  const notBack = data.notFollowingBack || [];
  const youNot = data.youNotFollowing || [];
  renderUserList(usersList, notBack);
  if (searchInput) {
    searchInput.style.display = notBack.length > 0 ? 'block' : 'none';
    searchInput.value = '';
    searchInput.dataset.fullList = JSON.stringify(notBack);
  }
  const youSection = document.getElementById('youNotFollowingSection');
  if (youNotFollowingList) {
    youNotFollowingList.style.display = youNot.length > 0 ? 'block' : 'none';
    const ynt = document.getElementById('youNotFollowingTitle');
    if (ynt) ynt.style.display = youNot.length > 0 ? 'block' : 'none';
    if (youSection) youSection.style.display = youNot.length > 0 ? 'block' : 'none';
    renderUserList(youNotFollowingList, youNot);
  }
  if (notBack.length === 0) {
    usersList.innerHTML = `<div class="empty-state" style="padding: 12px; font-size: 12px; color: var(--text-muted);">${getMessage('noUsersFound')}</div>`;
  }
  resultsDiv.style.display = 'block';
  resultsDiv.classList.add('visible');
  emptyState.style.display = 'none';
  const downloads = document.getElementById('downloads');
  if (downloads) downloads.classList.add('visible');
}

function downloadAsTxt(data) {
  const date = formatDate(new Date(), currentLang);
  
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

function downloadAsCsv(data) {
  const date = formatDate(new Date(), currentLang);
  const headers = ['username', 'profile_url'];
  const rows = (data.notFollowingBack || []).map(u => [u, `https://www.instagram.com/${u}/`]);
  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `instagram_not_following_${data.username}_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showStatus(getMessage('downloadComplete'), 'success');
}

function downloadAsJson(data) {
  const exportData = {
    username: data.username,
    exportedAt: new Date().toISOString(),
    followersCount: data.followersCount,
    followingCount: data.followingCount,
    notFollowingBackCount: data.notFollowingBackCount,
    notFollowingBack: data.notFollowingBack || [],
    youNotFollowingCount: data.youNotFollowingCount ?? 0,
    youNotFollowing: data.youNotFollowing || []
  };
  const jsonContent = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `instagram_analysis_${data.username}_${Date.now()}.json`;
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
