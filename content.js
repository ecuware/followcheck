console.log('Extension content script loaded');

let isAnalyzing = false;

const DOM_CONFIG = {
  modalFinders: [
    () => document.querySelector('[role="dialog"]'),
    () => {
      const divs = Array.from(document.querySelectorAll('div'));
      return divs.find(div => {
        const s = window.getComputedStyle(div);
        return s.position === 'fixed' && (s.zIndex === '9999' || parseInt(s.zIndex, 10) > 1000) && s.display !== 'none';
      }) || null;
    },
    () => document.querySelector('div[aria-labelledby]'),
    () => {
      const fixed = Array.from(document.querySelectorAll('div')).filter(div => {
        const s = window.getComputedStyle(div);
        return s.position === 'fixed' && parseInt(s.zIndex, 10) > 100;
      });
      return fixed.length ? fixed[fixed.length - 1] : null;
    }
  ],
  profileListLink: {
    followers: { hrefContains: '/followers', exclude: '/following' },
    following: { hrefContains: '/following', exclude: '/followers' }
  }
};

function throwError(code, message) {
  const e = new Error(message);
  e.code = code;
  throw e;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received:', message);

  if (message.action === 'ping') {
    sendResponse({ success: true, message: 'Content script running' });
    return;
  }

  if (message.action === 'startAnalysis') {
    if (isAnalyzing) {
      sendResponse({ success: false, error: 'Analysis already in progress' });
      return;
    }

    console.log('Starting analysis...');
    startAnalysis().then(result => {
      console.log('Analysis complete:', result);
      sendResponse({ success: true, data: result });
    }).catch(error => {
      console.error('Analysis error:', error);
      sendResponse({ success: false, error: error.message, errorCode: error.code || 'UNKNOWN' });
    });
    
    return true;
  }
});

async function startAnalysis() {
  isAnalyzing = true;
  
  try {
    const currentUrl = window.location.href;
    if (!currentUrl.includes('instagram.com')) {
      throwError('PROFILE_PAGE_REQUIRED', 'Please be on Instagram profile page');
    }
    const username = getCurrentUsername();
    if (!username) {
      throwError('PROFILE_PAGE_REQUIRED', 'Username not found. Please ensure you are on a profile page.');
    }

    console.log('Starting analysis for user:', username);

    console.log('Fetching followers list...');
    const followers = await getFollowersList(username);
    console.log('Followers count:', followers.length);

    if (followers.length === 0) {
      throwError('EMPTY_FOLLOWERS', 'Could not load followers list. Please refresh the page and try again.');
    }

    await sleep(2500 + Math.floor(Math.random() * 1000));
    console.log('Fetching following list...');
    const following = await getFollowingList(username);
    console.log('Following count:', following.length);

    if (following.length === 0) {
      throwError('EMPTY_FOLLOWING', 'Could not load following list. Please refresh the page and try again.');
    }

    const normalizedFollowers = followers.map(u => u.toLowerCase().trim()).filter(u => u);
    const normalizedFollowing = following.map(u => u.toLowerCase().trim()).filter(u => u);
    
    console.log('Normalized followers:', normalizedFollowers.length);
    console.log('Normalized following:', normalizedFollowing.length);
    console.log('First 5 followers:', normalizedFollowers.slice(0, 5));
    console.log('First 5 following:', normalizedFollowing.slice(0, 5));
    
    const notFollowingBack = normalizedFollowing.filter(user => {
      return !normalizedFollowers.includes(user);
    });

    const youNotFollowing = normalizedFollowers.filter(user => {
      return !normalizedFollowing.includes(user);
    });
    
    console.log('Not following back count:', notFollowingBack.length);
    console.log('Not following back (first 10):', notFollowingBack.slice(0, 10));
    console.log('You not following count:', youNotFollowing.length);

    const result = {
      username: username,
      followersCount: normalizedFollowers.length,
      followingCount: normalizedFollowing.length,
      notFollowingBack: notFollowingBack,
      notFollowingBackCount: notFollowingBack.length,
      youNotFollowing: youNotFollowing,
      youNotFollowingCount: youNotFollowing.length,
      followers: normalizedFollowers,
      following: normalizedFollowing
    };

    chrome.runtime.sendMessage({
      action: 'saveAnalysis',
      data: result
    });

    isAnalyzing = false;
    return result;

  } catch (error) {
    isAnalyzing = false;
    throw error;
  }
}

function getCurrentUsername() {
  const urlParts = window.location.pathname.split('/').filter(p => p);
  if (urlParts.length > 0) {
    const username = urlParts[0];
    if (username && /^[a-zA-Z0-9._]+$/.test(username) && username.length > 0 && username.length < 31) {
      return username;
    }
  }
  return null;
}

async function getFollowersList(username) {
  return new Promise(async (resolve, reject) => {
    try {
      const followersLink = await findAndClickFollowersLink();
      
      if (!followersLink) {
        const e = new Error('Followers link not found');
        e.code = 'LINK_NOT_FOUND';
        reject(e);
        return;
      }
      
      await waitForModal();
      await waitForModalContent(15000);
      const followers = await scrollAndCollectUsers('followers');
      
      await closeModal();
      resolve(followers);
    } catch (error) {
      console.error('getFollowersList error:', error);
      reject(error);
    }
  });
}

async function getFollowingList(username) {
  return new Promise(async (resolve, reject) => {
    try {
      const followingLink = await findAndClickFollowingLink();

      if (!followingLink) {
        const e = new Error('Following link not found');
        e.code = 'LINK_NOT_FOUND';
        reject(e);
        return;
      }
      
      await waitForModal();
      await waitForModalContent(15000);
      const following = await scrollAndCollectUsers('following');
      
      await closeModal();
      resolve(following);
    } catch (error) {
      console.error('getFollowingList error:', error);
      reject(error);
    }
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function findAndClickProfileList(type) {
  const config = DOM_CONFIG.profileListLink[type];
  if (!config) throwError('UNKNOWN', 'Invalid list type: ' + type);
  const label = type === 'followers' ? 'Followers' : 'Following';
  const { hrefContains, exclude } = config;

  return new Promise(async (resolve, reject) => {
    let element = null;
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts && !element) {
      attempts++;
      const allLinks = Array.from(document.querySelectorAll('a[href]'));
      element = allLinks.find(el => {
        const href = (el.getAttribute('href') || el.href || '').toLowerCase();
        return href.includes(hrefContains.toLowerCase()) && !href.includes(exclude.toLowerCase());
      });
      if (!element) {
        const key = hrefContains.slice(1);
        const other = exclude.slice(1);
        element = allLinks.find(el => {
          const text = (el.textContent || '').toLowerCase();
          const href = (el.getAttribute('href') || el.href || '').toLowerCase();
          return (text.includes(key) || href.includes(hrefContains)) && !href.includes(exclude) && !text.includes(other);
        });
      }
      if (!element) {
        const headerSection = document.querySelector('header') || document.querySelector('section');
        if (headerSection) {
          for (const link of headerSection.querySelectorAll('a[href]')) {
            const href = (link.getAttribute('href') || link.href || '').toLowerCase();
            if (href.includes(hrefContains.toLowerCase()) && !href.includes(exclude.toLowerCase())) {
              element = link;
              break;
            }
          }
        }
      }
      if (!element && attempts < maxAttempts) await sleep(1000);
    }

    if (element) {
      console.log(label + ' link found, clicking...');
      element.click();
      await sleep(2000);
      resolve(element);
    } else {
      const err = new Error(label + ' link not found. Please ensure you are on a profile page.');
      err.code = 'LINK_NOT_FOUND';
      reject(err);
    }
  });
}

async function findAndClickFollowersLink() {
  return findAndClickProfileList('followers');
}

async function findAndClickFollowingLink() {
  return findAndClickProfileList('following');
}

async function waitForModal() {
  console.log('Waiting for modal...');
  return new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 60;

    const checkModal = setInterval(() => {
      attempts++;
      const modal = findModal();
      if (modal) {
        console.log('Modal found');
        clearInterval(checkModal);
        setTimeout(resolve, 800);
      } else if (attempts >= maxAttempts) {
        console.log('Modal timeout, continuing');
        clearInterval(checkModal);
        resolve();
      }
    }, 200);
  });
}

function waitForModalContent(maxWaitMs) {
  return new Promise((resolve) => {
    const start = Date.now();
    const poll = () => {
      const modal = findModal();
      if (modal) {
        const links = modal.querySelectorAll('a[href^="/"]');
        const scrollable = Array.from(modal.querySelectorAll('div')).find(div => {
          const sh = div.scrollHeight;
          const ch = div.clientHeight;
          return sh > ch && sh > 100;
        });
        if (links.length >= 2 || scrollable) {
          console.log('Modal content ready, link count:', links.length);
          resolve();
          return;
        }
      }
      if (Date.now() - start >= maxWaitMs) {
        console.log('Modal content wait timeout, continuing');
        resolve();
        return;
      }
      setTimeout(poll, 300);
    };
    poll();
  });
}

async function scrollAndCollectUsers(type) {
  console.log(`Collecting ${type} list...`);
  const users = new Set();
  let previousCount = 0;
  let noChangeCount = 0;
  const maxNoChange = 40;
  let lastScrollHeight = 0;
  let scrollNoChangeCount = 0;

  const excludedUsernames = new Set([
    'explore', 'reels', 'stories', 'accounts', 'direct', 'static', 'www',
    'p', 'tv', 'tagged', 'saved', 'settings', 'help', 'about', 'blog',
    'jobs', 'api', 'developers', 'privacy', 'terms', 'locations', 'language',
    'accounts', 'login', 'signup', 'challenge', 'emailsignup'
  ]);
  
  return new Promise((resolve) => {
    let timeoutId = null;
    let maxTimeoutId = null;
    let iteration = 0;

    function runIteration() {
      iteration++;
      console.log(`${type} collection - iteration ${iteration}, current count: ${users.size}`);

      let modal = findModal();
      if (!modal) {
        console.warn('Modal not found');
        scheduleNext();
        return;
      }

      const extractedUsers = extractUsernamesFromModal(modal, excludedUsernames);
      extractedUsers.forEach(user => users.add(user));
      const currentCount = users.size;
      chrome.runtime.sendMessage({
        action: 'analysisProgress',
        data: { phase: type, current: currentCount }
      }).catch(() => {});

      if (currentCount === previousCount) {
        noChangeCount++;
      } else {
        noChangeCount = 0;
        console.log(`${type} - New users added, total: ${currentCount}`);
      }
      previousCount = currentCount;

      const scrollResult = performScroll(modal);
      if (scrollResult.scrolled) {
        const scrollHeight = scrollResult.scrollHeight;
        const scrollTop = scrollResult.scrollTop;
        const clientHeight = scrollResult.clientHeight;
        const maxScroll = scrollHeight - clientHeight;
        if (Math.abs(scrollHeight - lastScrollHeight) < 10) scrollNoChangeCount++;
        else scrollNoChangeCount = 0;
        lastScrollHeight = scrollHeight;
        if (scrollTop >= maxScroll - 10) noChangeCount++;
      } else {
        noChangeCount++;
      }

      if (noChangeCount >= maxNoChange && users.size > 0) {
        clearTimeout(timeoutId);
        clearTimeout(maxTimeoutId);
        console.log(`${type} total users collected: ${users.size}`);
        resolve(Array.from(users));
        return;
      }
      scheduleNext();
    }

    function scheduleNext() {
      const jitter = 1200 + Math.floor(Math.random() * 400);
      timeoutId = setTimeout(runIteration, jitter);
    }

    maxTimeoutId = setTimeout(() => {
      clearTimeout(timeoutId);
      console.log(`${type} timeout - total users: ${users.size}`);
      resolve(Array.from(users));
    }, 360000);
    runIteration();
  });
}

function findModal() {
  for (const finder of DOM_CONFIG.modalFinders) {
    try {
      const modal = finder();
      if (modal) return modal;
    } catch (e) {}
  }
  return null;
}

function performScroll(modal) {
  try {
    const allDivs = modal.querySelectorAll('div');
    let scrollableDiv = null;
    let maxScrollHeight = 0;

    for (const div of allDivs) {
      const style = window.getComputedStyle(div);
      const scrollHeight = div.scrollHeight;
      const clientHeight = div.clientHeight;
      const hasOverflow = style.overflowY === 'auto' || style.overflowY === 'scroll' ||
                         style.overflow === 'auto' || style.overflow === 'scroll';

      if (scrollHeight > clientHeight && scrollHeight > maxScrollHeight) {
        maxScrollHeight = scrollHeight;
        scrollableDiv = div;
      }
      if (hasOverflow && scrollHeight > clientHeight) {
        scrollableDiv = div;
        break;
      }
    }
    
    if (!scrollableDiv) {
      console.warn('Scrollable div not found');
      return { scrolled: false };
    }
    
    const scrollHeight = scrollableDiv.scrollHeight;
    const scrollTop = scrollableDiv.scrollTop;
    const clientHeight = scrollableDiv.clientHeight;
    const maxScroll = scrollHeight - clientHeight;

    if (scrollTop < maxScroll - 10) {
      const scrollAmount = Math.min(2000, maxScroll - scrollTop);
      scrollableDiv.scrollTop += scrollAmount;
      
      return {
        scrolled: true,
        scrollHeight: scrollHeight,
        scrollTop: scrollableDiv.scrollTop,
        clientHeight: clientHeight
      };
    } else {
      console.log('Scroll reached end');
      return {
        scrolled: false,
        scrollHeight: scrollHeight,
        scrollTop: scrollTop,
        clientHeight: clientHeight
      };
    }
  } catch (error) {
    console.error('Scroll error:', error);
    return { scrolled: false };
  }
}

function extractUsernamesFromModal(modal, excludedUsernames) {
  const users = new Set();
  const allLinks = modal.querySelectorAll('a[href]');
  console.log(`Links in modal: ${allLinks.length}`);
  
  allLinks.forEach(link => {
    const href = link.getAttribute('href') || link.href;
    if (href && typeof href === 'string' && href.startsWith('/')) {
      const parts = href.split('/').filter(p => p && p.trim());
      if (parts.length > 0) {
        let username = parts[0].trim();
        username = username.replace(/^@/, '').replace(/[#?].*$/, '');
        if (isValidUsernameVeryStrict(username, excludedUsernames)) {
          users.add(username);
        }
      }
    }
  });
  
  console.log(`Unique users this iteration: ${users.size}`);
  console.log('Found users (first 10):', Array.from(users).slice(0, 10));
  
  return Array.from(users);
}

function isValidUsernameVeryStrict(username, excludedUsernames) {
  if (!username || username.length < 3 || username.length > 30) {
    return false;
  }
  if (!/^[a-zA-Z0-9._]+$/.test(username)) {
    return false;
  }
  if (username.startsWith('.') || username.endsWith('.')) {
    return false;
  }
  if (username.includes('..')) {
    return false;
  }
  if (username.startsWith('_')) {
    return false;
  }
  if (excludedUsernames.has(username.toLowerCase())) {
    return false;
  }
  const specialPages = ['explore', 'reels', 'stories', 'accounts', 'direct', 'static', 'www',
                       'p', 'tv', 'tagged', 'saved', 'settings', 'help', 'about', 'blog',
                       'jobs', 'api', 'developers', 'privacy', 'terms', 'locations', 'language',
                       'login', 'signup', 'challenge', 'emailsignup'];
  
  if (specialPages.includes(username.toLowerCase())) {
    return false;
  }
  if (/^\d/.test(username)) {
    return false;
  }
  if (/^\d+$/.test(username)) {
    return false;
  }
  
  return true;
}

function closeModal() {
  console.log('Closing modal...');
  const closeButtons = [
    document.querySelector('button[aria-label*="Close"]'),
    document.querySelector('svg[aria-label="Close"]')?.closest('button'),
    document.querySelector('button[aria-label*="Kapat"]'),
    document.querySelector('svg[aria-label="Kapat"]')?.closest('button'),
    ...Array.from(document.querySelectorAll('button')).filter(btn => {
      const svg = btn.querySelector('svg');
      return svg && (svg.getAttribute('aria-label')?.includes('Close') || 
                     svg.getAttribute('aria-label')?.includes('Kapat'));
    })
  ].filter(Boolean);
  
  if (closeButtons.length > 0) {
    closeButtons[0].click();
  } else {
    const escEvent = new KeyboardEvent('keydown', { 
      key: 'Escape', 
      keyCode: 27,
      bubbles: true,
      cancelable: true
    });
    document.dispatchEvent(escEvent);
  }
  return new Promise((resolve) => {
    const checkClosed = setInterval(() => {
      const modal = document.querySelector('[role="dialog"]');
      if (!modal) {
        clearInterval(checkClosed);
        resolve();
      }
    }, 100);
    
    setTimeout(() => {
      clearInterval(checkClosed);
      resolve();
    }, 3000);
  });
}
