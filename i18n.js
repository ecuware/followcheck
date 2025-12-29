// i18n (Internationalization) helper functions

let currentLanguage = 'tr';
let messages = {};

// Load messages for a specific language
async function loadMessages(lang) {
  try {
    const response = await fetch(chrome.runtime.getURL(`_locales/${lang}/messages.json`));
    messages = await response.json();
    // Convert to flat structure: { key: { message: "value" } } -> { key: "value" }
    const flatMessages = {};
    for (const key in messages) {
      if (messages[key].message) {
        flatMessages[key] = messages[key].message;
      }
    }
    messages = flatMessages;
  } catch (error) {
    console.error('Error loading messages:', error);
    // Fallback to Chrome i18n API
    messages = {};
  }
}

// Initialize language from storage
async function initLanguage() {
  const result = await chrome.storage.local.get(['language']);
  if (result.language) {
    currentLanguage = result.language;
  } else {
    // Detect browser language
    const browserLang = navigator.language || navigator.userLanguage;
    currentLanguage = browserLang.startsWith('tr') ? 'tr' : 'en';
    await chrome.storage.local.set({ language: currentLanguage });
  }
  
  // Load messages for current language
  await loadMessages(currentLanguage);
  
  return currentLanguage;
}

// Get message by key
function getMessage(key) {
  // Try loaded messages first
  if (messages[key]) {
    return messages[key];
  }
  // Fallback to Chrome i18n API
  return chrome.i18n.getMessage(key) || key;
}

// Set language
async function setLanguage(lang) {
  currentLanguage = lang;
  await chrome.storage.local.set({ language: lang });
  // Reload messages for new language
  await loadMessages(lang);
  return lang;
}

// Get current language
function getCurrentLanguage() {
  return currentLanguage;
}

// Format date according to language
function formatDate(date, lang) {
  if (lang === 'tr') {
    return date.toLocaleString('tr-TR');
  } else {
    return date.toLocaleString('en-US');
  }
}

