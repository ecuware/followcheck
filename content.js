// Instagram profil sayfasında çalışan content script

console.log('Instagram Takip Analizi - Content Script yüklendi');

let isAnalyzing = false;

// Mesaj dinleyicisi
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Mesaj alındı:', message);
  
  if (message.action === 'ping') {
    sendResponse({ success: true, message: 'Content script çalışıyor' });
    return;
  }
  
  if (message.action === 'startAnalysis') {
    if (isAnalyzing) {
      sendResponse({ success: false, error: 'Analiz zaten devam ediyor' });
      return;
    }
    
    console.log('Analiz başlatılıyor...');
    startAnalysis().then(result => {
      console.log('Analiz tamamlandı:', result);
      sendResponse({ success: true, data: result });
    }).catch(error => {
      console.error('Analiz hatası:', error);
      sendResponse({ success: false, error: error.message });
    });
    
    return true; // Async response için
  }
});

async function startAnalysis() {
  isAnalyzing = true;
  
  try {
    // Profil sayfasında olduğumuzu kontrol et
    const currentUrl = window.location.href;
    if (!currentUrl.includes('instagram.com')) {
      throw new Error('Lütfen Instagram profil sayfasında olun');
    }

    // Kullanıcı adını al
    const username = getCurrentUsername();
    if (!username) {
      throw new Error('Kullanıcı adı bulunamadı. Lütfen bir profil sayfasında olduğunuzdan emin olun.');
    }

    console.log('Analiz başlatılıyor için kullanıcı:', username);

    // Takipçiler listesini al
    console.log('Takipçiler listesi alınıyor...');
    const followers = await getFollowersList(username);
    console.log(`${followers.length} takipçi bulundu`);

    if (followers.length === 0) {
      throw new Error('Takipçi listesi alınamadı. Lütfen sayfayı yenileyin ve tekrar deneyin.');
    }

    // Takip edilenler listesini al
    console.log('Takip edilenler listesi alınıyor...');
    const following = await getFollowingList(username);
    console.log(`${following.length} takip edilen bulundu`);

    if (following.length === 0) {
      throw new Error('Takip edilen listesi alınamadı. Lütfen sayfayı yenileyin ve tekrar deneyin.');
    }

    // Kullanıcı adlarını normalize et (lowercase, trim)
    const normalizedFollowers = followers.map(u => u.toLowerCase().trim()).filter(u => u);
    const normalizedFollowing = following.map(u => u.toLowerCase().trim()).filter(u => u);
    
    console.log('Normalize edilmiş takipçiler:', normalizedFollowers.length);
    console.log('Normalize edilmiş takip edilenler:', normalizedFollowing.length);
    console.log('İlk 5 takipçi:', normalizedFollowers.slice(0, 5));
    console.log('İlk 5 takip edilen:', normalizedFollowing.slice(0, 5));
    
    // Karşılaştırma yap (case-insensitive)
    // NOT: "notFollowingBack" = SİZİN takip ettiğiniz ama SİZİ takip etmeyenler
    // Yani: following listesinde var ama followers listesinde yok
    const notFollowingBack = normalizedFollowing.filter(user => {
      return !normalizedFollowers.includes(user);
    });
    
    // Ters karşılaştırma: Sizi takip eden ama sizin takip etmediğiniz (bu normal, sorun değil)
    const youNotFollowing = normalizedFollowers.filter(user => {
      return !normalizedFollowing.includes(user);
    });
    
    console.log('Takip etmeyenler (sizin takip ettiğiniz ama sizi takip etmeyenler):', notFollowingBack.length);
    console.log('Takip etmeyenler listesi:', notFollowingBack.slice(0, 10));
    console.log('Sizin takip etmediğiniz ama sizi takip edenler:', youNotFollowing.length);
    
    // Sonuçları hazırla
    const result = {
      username: username,
      followersCount: normalizedFollowers.length,
      followingCount: normalizedFollowing.length,
      notFollowingBack: notFollowingBack,
      notFollowingBackCount: notFollowingBack.length,
      followers: normalizedFollowers,
      following: normalizedFollowing
    };

    // Sonuçları background'a gönder
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
  // URL'den kullanıcı adını al
  const urlParts = window.location.pathname.split('/').filter(p => p);
  if (urlParts.length > 0) {
    const username = urlParts[0];
    // Geçerli kullanıcı adı kontrolü
    if (username && /^[a-zA-Z0-9._]+$/.test(username) && username.length > 0 && username.length < 31) {
      return username;
    }
  }
  return null;
}

async function getFollowersList(username) {
  return new Promise(async (resolve, reject) => {
    try {
      // Takipçiler linkini bul ve tıkla
      const followersLink = await findAndClickFollowersLink();
      
      if (!followersLink) {
        reject(new Error('Takipçiler linki bulunamadı'));
        return;
      }
      
      // Modal açılmasını bekle
      await waitForModal();
      
      // Biraz daha bekle (modal tam yüklensin)
      await sleep(6000);
      
      // Listeyi scroll ederek topla
      const followers = await scrollAndCollectUsers('followers');
      
      // Modal'ı kapat
      await closeModal();
      
      resolve(followers);
    } catch (error) {
      console.error('getFollowersList hatası:', error);
      reject(error);
    }
  });
}

async function getFollowingList(username) {
  return new Promise(async (resolve, reject) => {
    try {
      // Takip edilenler linkini bul ve tıkla
      const followingLink = await findAndClickFollowingLink();
      
      if (!followingLink) {
        reject(new Error('Takip edilenler linki bulunamadı'));
        return;
      }
      
      // Modal açılmasını bekle
      await waitForModal();
      
      // Biraz daha bekle (modal tam yüklensin)
      await sleep(6000);
      
      // Listeyi scroll ederek topla
      const following = await scrollAndCollectUsers('following');
      
      // Modal'ı kapat
      await closeModal();
      
      resolve(following);
    } catch (error) {
      console.error('getFollowingList hatası:', error);
      reject(error);
    }
  });
}

// Yardımcı fonksiyon: sleep
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function findAndClickFollowersLink() {
  return new Promise(async (resolve, reject) => {
    console.log('Takipçiler linki aranıyor...');
    
    let followersElement = null;
    let attempts = 0;
    const maxAttempts = 5;
    
    while (attempts < maxAttempts && !followersElement) {
      attempts++;
      console.log(`Deneme ${attempts}/${maxAttempts}`);
      
      // Strateji 1: href'te /followers geçen link (en güvenilir)
      const allLinks = Array.from(document.querySelectorAll('a[href]'));
      followersElement = allLinks.find(el => {
        const href = el.getAttribute('href') || el.href;
        return href && href.includes('/followers') && !href.includes('/following');
      });
      
      // Strateji 2: Text içinde "follower" geçen ve tıklanabilir element
      if (!followersElement) {
        followersElement = allLinks.find(el => {
          const text = el.textContent || '';
          const href = el.getAttribute('href') || el.href || '';
          return (text.toLowerCase().includes('follower') || href.includes('/followers')) &&
                 !text.toLowerCase().includes('following');
        });
      }
      
      // Strateji 3: Profil header'ındaki istatistikleri kontrol et
      if (!followersElement) {
        const headerSection = document.querySelector('header') || document.querySelector('section');
        if (headerSection) {
          const headerLinks = headerSection.querySelectorAll('a[href]');
          for (const link of headerLinks) {
            const href = link.getAttribute('href') || link.href;
            if (href.includes('/followers') && !href.includes('/following')) {
              followersElement = link;
              break;
            }
          }
        }
      }
      
      if (followersElement) {
        break;
      }
      
      // Kısa bir bekleme ve tekrar dene
      if (attempts < maxAttempts) {
        await sleep(1000);
      }
    }
    
    if (followersElement) {
      console.log('Takipçiler linki bulundu:', followersElement);
      followersElement.click();
      console.log('Takipçiler linkine tıklandı');
      await sleep(5000);
      resolve(followersElement);
    } else {
      console.error('Takipçiler linki bulunamadı');
      reject(new Error('Takipçiler linki bulunamadı. Lütfen profil sayfasında olduğunuzdan emin olun.'));
    }
  });
}

async function findAndClickFollowingLink() {
  return new Promise(async (resolve, reject) => {
    console.log('Takip edilenler linki aranıyor...');
    
    let followingElement = null;
    let attempts = 0;
    const maxAttempts = 5;
    
    while (attempts < maxAttempts && !followingElement) {
      attempts++;
      console.log(`Deneme ${attempts}/${maxAttempts}`);
      
      // Strateji 1: href'te /following geçen link (en güvenilir)
      const allLinks = Array.from(document.querySelectorAll('a[href]'));
      followingElement = allLinks.find(el => {
        const href = el.getAttribute('href') || el.href;
        return href && href.includes('/following') && !href.includes('/followers');
      });
      
      // Strateji 2: Text içinde "following" geçen ve tıklanabilir element
      if (!followingElement) {
        followingElement = allLinks.find(el => {
          const text = el.textContent || '';
          const href = el.getAttribute('href') || el.href || '';
          return (text.toLowerCase().includes('following') || href.includes('/following')) &&
                 !text.toLowerCase().includes('follower');
        });
      }
      
      // Strateji 3: Profil header'ındaki istatistikleri kontrol et
      if (!followingElement) {
        const headerSection = document.querySelector('header') || document.querySelector('section');
        if (headerSection) {
          const headerLinks = headerSection.querySelectorAll('a[href]');
          for (const link of headerLinks) {
            const href = link.getAttribute('href') || link.href;
            if (href.includes('/following') && !href.includes('/followers')) {
              followingElement = link;
              break;
            }
          }
        }
      }
      
      if (followingElement) {
        break;
      }
      
      // Kısa bir bekleme ve tekrar dene
      if (attempts < maxAttempts) {
        await sleep(1000);
      }
    }
    
    if (followingElement) {
      console.log('Takip edilenler linki bulundu:', followingElement);
      followingElement.click();
      console.log('Takip edilenler linkine tıklandı');
      await sleep(5000);
      resolve(followingElement);
    } else {
      console.error('Takip edilenler linki bulunamadı');
      reject(new Error('Takip edilenler linki bulunamadı. Lütfen profil sayfasında olduğunuzdan emin olun.'));
    }
  });
}

async function waitForModal() {
  console.log('Modal açılması bekleniyor...');
  return new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 60; // 60 * 200ms = 12 saniye
    
    const checkModal = setInterval(() => {
      attempts++;
      
      // Çeşitli modal selector'larını dene
      let modal = document.querySelector('[role="dialog"]');
      
      if (!modal) {
        // Instagram'ın yeni yapısında modal farklı olabilir
        const allDivs = Array.from(document.querySelectorAll('div'));
        modal = allDivs.find(div => {
          const style = window.getComputedStyle(div);
          return style.position === 'fixed' && 
                 (style.zIndex === '9999' || parseInt(style.zIndex) > 1000) &&
                 style.display !== 'none';
        });
      }
      
      if (!modal) {
        modal = document.querySelector('div[aria-labelledby]');
      }
      
      if (!modal) {
        // En son çare: body içindeki en büyük fixed div
        const fixedDivs = Array.from(document.querySelectorAll('div')).filter(div => {
          const style = window.getComputedStyle(div);
          return style.position === 'fixed' && parseInt(style.zIndex) > 100;
        });
        if (fixedDivs.length > 0) {
          modal = fixedDivs[fixedDivs.length - 1];
        }
      }
      
      if (modal) {
        console.log('Modal bulundu!');
        clearInterval(checkModal);
        setTimeout(resolve, 4000);
      } else if (attempts >= maxAttempts) {
        console.log('Modal timeout - devam ediliyor');
        clearInterval(checkModal);
        resolve();
      }
    }, 200);
  });
}

async function scrollAndCollectUsers(type) {
  console.log(`${type} listesi toplanıyor...`);
  const users = new Set();
  let previousCount = 0;
  let noChangeCount = 0;
  const maxNoChange = 40; // 40 iterasyon boyunca değişiklik yoksa dur
  let lastScrollHeight = 0;
  let scrollNoChangeCount = 0;
  
  // Geçersiz kullanıcı adları listesi
  const excludedUsernames = new Set([
    'explore', 'reels', 'stories', 'accounts', 'direct', 'static', 'www',
    'p', 'tv', 'tagged', 'saved', 'settings', 'help', 'about', 'blog',
    'jobs', 'api', 'developers', 'privacy', 'terms', 'locations', 'language',
    'accounts', 'login', 'signup', 'challenge', 'emailsignup'
  ]);
  
  return new Promise((resolve) => {
    let iteration = 0;
    const scrollInterval = setInterval(() => {
      iteration++;
      console.log(`${type} toplama - iterasyon ${iteration}, mevcut kullanıcı sayısı: ${users.size}`);
      
      // Modal'ı bul
      let modal = findModal();
      
      if (!modal) {
        console.warn('Modal bulunamadı');
        return;
      }
      
      // Instagram'ın güncel DOM yapısından kullanıcı adlarını çıkar
      const extractedUsers = extractUsernamesFromModal(modal, excludedUsernames);
      
      // Yeni kullanıcıları ekle
      extractedUsers.forEach(user => users.add(user));
      
      const currentCount = users.size;
      
      if (currentCount === previousCount) {
        noChangeCount++;
      } else {
        noChangeCount = 0;
        console.log(`${type} - Yeni kullanıcılar eklendi! Toplam: ${currentCount}`);
      }
      
      previousCount = currentCount;
      
      // Scroll yap - YENİ VE DAHA GÜVENİLİR SCROLL SİSTEMİ
      const scrollResult = performScroll(modal);
      
      if (scrollResult.scrolled) {
        const scrollHeight = scrollResult.scrollHeight;
        const scrollTop = scrollResult.scrollTop;
        const clientHeight = scrollResult.clientHeight;
        const maxScroll = scrollHeight - clientHeight;
        
        console.log(`${type} scroll - Top: ${scrollTop}, Height: ${scrollHeight}, Client: ${clientHeight}, Max: ${maxScroll}`);
        
        // Scroll height değişimini kontrol et
        if (Math.abs(scrollHeight - lastScrollHeight) < 10) {
          scrollNoChangeCount++;
        } else {
          scrollNoChangeCount = 0;
        }
        lastScrollHeight = scrollHeight;
        
        // Sona ulaşıldı mı kontrol et
        if (scrollTop >= maxScroll - 10) {
          console.log(`${type} - Scroll sonuna ulaşıldı`);
          noChangeCount++;
        }
      } else {
        console.warn(`${type} - Scroll yapılamadı`);
        noChangeCount++;
      }
      
      // Eğer değişiklik yoksa ve yeterince kullanıcı toplandıysa dur
      if (noChangeCount >= maxNoChange && users.size > 0) {
        clearInterval(scrollInterval);
        console.log(`${type} için toplam ${users.size} kullanıcı bulundu`);
        resolve(Array.from(users));
      }
      
    }, 1500); // Her 1500ms'de bir kontrol et
    
    // Maksimum 360 saniye bekle
    setTimeout(() => {
      clearInterval(scrollInterval);
      console.log(`${type} için timeout - toplam ${users.size} kullanıcı bulundu`);
      resolve(Array.from(users));
    }, 360000);
  });
}

// Modal bulma fonksiyonu
function findModal() {
  let modal = document.querySelector('[role="dialog"]');
  
  if (!modal) {
    const allDivs = Array.from(document.querySelectorAll('div'));
    modal = allDivs.find(div => {
      const style = window.getComputedStyle(div);
      return style.position === 'fixed' && 
             (style.zIndex === '9999' || parseInt(style.zIndex) > 1000) &&
             style.display !== 'none';
    });
  }
  
  if (!modal) {
    modal = document.querySelector('div[aria-labelledby]');
  }
  
  if (!modal) {
    const fixedDivs = Array.from(document.querySelectorAll('div')).filter(div => {
      const style = window.getComputedStyle(div);
      return style.position === 'fixed' && parseInt(style.zIndex) > 100;
    });
    if (fixedDivs.length > 0) {
      modal = fixedDivs[fixedDivs.length - 1];
    }
  }
  
  return modal;
}

// Scroll yapma fonksiyonu - YENİ VE DAHA GÜVENİLİR
function performScroll(modal) {
  try {
    // Modal içindeki tüm div'leri bul
    const allDivs = modal.querySelectorAll('div');
    let scrollableDiv = null;
    let maxScrollHeight = 0;
    
    // En yüksek scrollHeight'a sahip div'i bul
    for (const div of allDivs) {
      const style = window.getComputedStyle(div);
      const scrollHeight = div.scrollHeight;
      const clientHeight = div.clientHeight;
      const hasOverflow = style.overflowY === 'auto' || style.overflowY === 'scroll' || 
                         style.overflow === 'auto' || style.overflow === 'scroll';
      
      // Scroll edilebilir ve yüksek scrollHeight'a sahip div'i bul
      if (scrollHeight > clientHeight && scrollHeight > maxScrollHeight) {
        maxScrollHeight = scrollHeight;
        scrollableDiv = div;
      }
      
      // Ayrıca overflow olan div'leri de kontrol et
      if (hasOverflow && scrollHeight > clientHeight) {
        scrollableDiv = div;
        break;
      }
    }
    
    if (!scrollableDiv) {
      console.warn('Scrollable div bulunamadı');
      return { scrolled: false };
    }
    
    const scrollHeight = scrollableDiv.scrollHeight;
    const scrollTop = scrollableDiv.scrollTop;
    const clientHeight = scrollableDiv.clientHeight;
    const maxScroll = scrollHeight - clientHeight;
    
    // Scroll yap
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
      console.log('Scroll sonuna ulaşıldı');
      return {
        scrolled: false,
        scrollHeight: scrollHeight,
        scrollTop: scrollTop,
        clientHeight: clientHeight
      };
    }
  } catch (error) {
    console.error('Scroll hatası:', error);
    return { scrolled: false };
  }
}

// Modal'dan kullanıcı adlarını çıkarma fonksiyonu - SADECE LİNKLERDEN
function extractUsernamesFromModal(modal, excludedUsernames) {
  const users = new Set();
  
  // SADECE Linklerden kullanıcı adlarını çıkar (EN GÜVENİLİR)
  const allLinks = modal.querySelectorAll('a[href]');
  console.log(`Modal içinde ${allLinks.length} link bulundu`);
  
  allLinks.forEach(link => {
    const href = link.getAttribute('href') || link.href;
    if (href && typeof href === 'string' && href.startsWith('/')) {
      // URL'den kullanıcı adını çıkar
      const parts = href.split('/').filter(p => p && p.trim());
      if (parts.length > 0) {
        let username = parts[0].trim();
        
        // @ işaretini ve özel karakterleri kaldır
        username = username.replace(/^@/, '').replace(/[#?].*$/, '');
        
        // Geçerli kullanıcı adı kontrolü - ÇOK SIKI
        if (isValidUsernameVeryStrict(username, excludedUsernames)) {
          users.add(username);
        }
      }
    }
  });
  
  console.log(`Bu iterasyonda ${users.size} benzersiz kullanıcı bulundu`);
  console.log('Bulunan kullanıcılar:', Array.from(users).slice(0, 10));
  
  return Array.from(users);
}

// Geçerli kullanıcı adı kontrolü - ÇOK SIKI
function isValidUsernameVeryStrict(username, excludedUsernames) {
  // Boş veya çok kısa olmamalı
  if (!username || username.length < 3 || username.length > 30) {
    return false;
  }
  
  // Sadece harf, rakam, nokta ve alt çizgi içermeli
  if (!/^[a-zA-Z0-9._]+$/.test(username)) {
    return false;
  }
  
  // Başında veya sonunda nokta olmamalı
  if (username.startsWith('.') || username.endsWith('.')) {
    return false;
  }
  
  // Ardışık nokta olmamalı
  if (username.includes('..')) {
    return false;
  }
  
  // Alt çizgi ile başlamamalı
  if (username.startsWith('_')) {
    return false;
  }
  
  // Hariç tutulan kullanıcı adları
  if (excludedUsernames.has(username.toLowerCase())) {
    return false;
  }
  
  // Instagram'ın özel sayfaları
  const specialPages = ['explore', 'reels', 'stories', 'accounts', 'direct', 'static', 'www',
                       'p', 'tv', 'tagged', 'saved', 'settings', 'help', 'about', 'blog',
                       'jobs', 'api', 'developers', 'privacy', 'terms', 'locations', 'language',
                       'login', 'signup', 'challenge', 'emailsignup'];
  
  if (specialPages.includes(username.toLowerCase())) {
    return false;
  }
  
  // Sayı ile başlamamalı (Instagram kullanıcı adları sayı ile başlamaz)
  if (/^\d/.test(username)) {
    return false;
  }
  
  // Sadece sayı olmamalı
  if (/^\d+$/.test(username)) {
    return false;
  }
  
  return true;
}

function closeModal() {
  console.log('Modal kapatılıyor...');
  
  // Modal'ı kapat - önce X butonunu bul
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
    // ESC tuşu gönder
    const escEvent = new KeyboardEvent('keydown', { 
      key: 'Escape', 
      keyCode: 27,
      bubbles: true,
      cancelable: true
    });
    document.dispatchEvent(escEvent);
  }
  
  // Modal kapandığını kontrol et
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
