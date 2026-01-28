let currentLanguage = 'tr';
let messages = {};

async function loadMessages(lang) {
  try {
    const response = await fetch(chrome.runtime.getURL(`_locales/${lang}/messages.json`));
    messages = await response.json();
    const flatMessages = {};
    for (const key in messages) {
      if (messages[key].message) {
        flatMessages[key] = messages[key].message;
      }
    }
    messages = flatMessages;
  } catch (error) {
    console.error('Error loading messages:', error);
    messages = {};
  }
}

async function initLanguage() {
  const result = await chrome.storage.local.get(['language']);
  if (result.language) {
    currentLanguage = result.language;
  } else {
    const browserLang = navigator.language || navigator.userLanguage;
    currentLanguage = browserLang.startsWith('tr') ? 'tr' : 'en';
    await chrome.storage.local.set({ language: currentLanguage });
  }
  await loadMessages(currentLanguage);
  return currentLanguage;
}

function getMessage(key) {
  if (messages[key]) {
    return messages[key];
  }
  return chrome.i18n.getMessage(key) || key;
}

async function setLanguage(lang) {
  currentLanguage = lang;
  await chrome.storage.local.set({ language: lang });
  await loadMessages(lang);
  return lang;
}

function getCurrentLanguage() {
  return currentLanguage;
}

function formatDate(date, lang) {
  if (lang === 'tr') {
    return date.toLocaleString('tr-TR');
  } else {
    return date.toLocaleString('en-US');
  }
}

