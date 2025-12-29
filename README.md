# Instagram Follower Analysis / Instagram Takip Analizi

[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

A Chrome extension that helps you find users who don't follow you back on Instagram.  
Instagram'da sizi takip etmeyen kullanıcıları bulmanıza yardımcı olan bir Chrome eklentisi.

---

## 🌍 Languages / Diller

- 🇹🇷 **Türkçe** (Turkish)
- 🇬🇧 **English**

The extension supports both Turkish and English. You can switch languages from the popup menu.  
Eklenti hem Türkçe hem İngilizce destekler. Popup menüden dil değiştirebilirsiniz.

---

## ✨ Features / Özellikler

### 🔍 Analysis Features / Analiz Özellikleri

- **Follower Analysis** / **Takipçi Analizi**: Analyzes your followers and following lists  
  Takipçiler ve takip edilenler listenizi analiz eder
- **Find Non-Followers** / **Takip Etmeyenleri Bul**: Identifies users you follow who don't follow you back  
  Sizi takip etmeyen kullanıcıları tespit eder
- **Detailed Statistics** / **Detaylı İstatistikler**: Shows follower count, following count, and non-followers count  
  Takipçi sayısı, takip edilen sayısı ve takip etmeyenler sayısını gösterir

### 📊 User Interface / Kullanıcı Arayüzü

- **Clean Design** / **Temiz Tasarım**: Modern and user-friendly interface  
  Modern ve kullanıcı dostu arayüz
- **Bilingual Support** / **Çift Dil Desteği**: Turkish and English language support  
  Türkçe ve İngilizce dil desteği
- **Real-time Updates** / **Anlık Güncellemeler**: Live progress during analysis  
  Analiz sırasında canlı ilerleme

### 💾 Export Features / Dışa Aktarma Özellikleri

- **TXT Export** / **TXT Dışa Aktarma**: Download analysis results as a text file  
  Analiz sonuçlarını metin dosyası olarak indirin
- **Detailed Report** / **Detaylı Rapor**: Includes statistics and full list of non-followers  
  İstatistikler ve tam takip etmeyenler listesini içerir

---

## 📦 Installation / Kurulum

### Method 1: Chrome Web Store (Coming Soon)
**Method 1: Chrome Web Store (Yakında)**

### Method 2: Manual Installation / Manuel Kurulum

1. **Download / İndir**: Clone or download this repository  
   Bu repository'yi klonlayın veya indirin

   ```bash
   git clone https://github.com/ecuware/followcheck.git
   cd instagram-follower-analysis
   ```

2. **Open Chrome Extensions** / **Chrome Uzantıları Açın**:
   - Navigate to `chrome://extensions/`  
     `chrome://extensions/` adresine gidin
   - Or go to: Menu → More Tools → Extensions  
     Veya: Menü → Diğer Araçlar → Uzantılar

3. **Enable Developer Mode** / **Geliştirici Modunu Açın**:
   - Toggle "Developer mode" in the top right corner  
     Sağ üst köşedeki "Geliştirici modu"nu açın

4. **Load Extension** / **Uzantıyı Yükleyin**:
   - Click "Load unpacked" / "Paketlenmemiş uzantı yükle" butonuna tıklayın
   - Select the extension folder / Uzantı klasörünü seçin

5. **Done!** / **Tamamlandı!**
   - The extension icon should appear in your Chrome toolbar  
     Uzantı simgesi Chrome araç çubuğunuzda görünmelidir

---

## 🚀 Usage / Kullanım

### Step 1: Open Instagram / Adım 1: Instagram'ı Açın

1. Go to [Instagram](https://www.instagram.com) and log in  
   [Instagram](https://www.instagram.com)'a gidin ve giriş yapın
2. Navigate to your profile page  
   Profil sayfanıza gidin

### Step 2: Start Analysis / Adım 2: Analizi Başlatın

1. Click the extension icon in your Chrome toolbar  
   Chrome araç çubuğundaki uzantı simgesine tıklayın
2. Click "Start Analysis" / "Analiz Başlat" button  
   "Analiz Başlat" butonuna tıklayın
3. Wait for the analysis to complete (may take a few minutes)  
   Analizin tamamlanmasını bekleyin (birkaç dakika sürebilir)

### Step 3: View Results / Adım 3: Sonuçları Görüntüleyin

- **Statistics** / **İstatistikler**: View follower count, following count, and non-followers count  
  Takipçi sayısı, takip edilen sayısı ve takip etmeyenler sayısını görüntüleyin
- **User List** / **Kullanıcı Listesi**: See the complete list of users who don't follow you back  
  Sizi takip etmeyen kullanıcıların tam listesini görün
- **Export** / **Dışa Aktar**: Download results as a TXT file  
  Sonuçları TXT dosyası olarak indirin

### Step 4: Change Language / Adım 4: Dili Değiştirin

- Click the **TR** or **EN** button in the top right corner of the popup  
  Popup'ın sağ üst köşesindeki **TR** veya **EN** butonuna tıklayın
- The interface will update immediately  
  Arayüz anında güncellenecektir

---

## ⚙️ Technical Details / Teknik Detaylar

### Technologies / Teknolojiler

- **Manifest V3**: Latest Chrome extension standard  
  En son Chrome uzantı standardı
- **Content Scripts**: Analyzes Instagram pages  
  Instagram sayfalarını analiz eder
- **Service Workers**: Background processing  
  Arka plan işleme
- **Chrome Storage API**: Data persistence  
  Veri kalıcılığı
- **i18n API**: Internationalization support  
  Uluslararasılaştırma desteği

### How It Works / Nasıl Çalışır

1. **Content Script Injection** / **Content Script Enjeksiyonu**:  
   The extension injects a content script into Instagram pages  
   Uzantı Instagram sayfalarına bir content script enjekte eder

2. **Modal Interaction** / **Modal Etkileşimi**:  
   Automatically opens followers and following modals  
   Takipçiler ve takip edilenler modallarını otomatik olarak açar

3. **Data Collection** / **Veri Toplama**:  
   Scrolls through lists and collects usernames  
   Listeleri kaydırır ve kullanıcı adlarını toplar

4. **Analysis** / **Analiz**:  
   Compares followers and following lists to find non-followers  
   Takipçiler ve takip edilenler listelerini karşılaştırarak takip etmeyenleri bulur

5. **Results Display** / **Sonuç Gösterimi**:  
   Displays results in the popup interface  
   Sonuçları popup arayüzünde gösterir

---

## 📋 Requirements / Gereksinimler

- **Chrome Browser** version 88 or higher  
  Chrome tarayıcı sürüm 88 veya üzeri
- **Instagram Account** / **Instagram Hesabı**: Active Instagram account  
  Aktif Instagram hesabı
- **Internet Connection** / **İnternet Bağlantısı**: Stable internet connection for analysis  
  Analiz için stabil internet bağlantısı

---

## ⚠️ Important Notes / Önemli Notlar

### ⏱️ Analysis Time / Analiz Süresi

- The analysis process may take **several minutes** depending on the number of followers/following  
  Analiz işlemi takipçi/takip edilen sayısına bağlı olarak **birkaç dakika** sürebilir
- **Do not close** the Instagram page during analysis  
  Analiz sırasında Instagram sayfasını **kapatmayın**
- **Do not navigate away** from the profile page  
  Profil sayfasından **uzaklaşmayın**

### 🔒 Privacy & Security / Gizlilik ve Güvenlik

- **No Data Collection** / **Veri Toplama Yok**: The extension does not collect or store your personal data  
  Uzantı kişisel verilerinizi toplamaz veya saklamaz
- **Local Processing** / **Yerel İşleme**: All analysis is done locally in your browser  
  Tüm analiz tarayıcınızda yerel olarak yapılır
- **No External Servers** / **Harici Sunucu Yok**: No data is sent to external servers  
  Hiçbir veri harici sunuculara gönderilmez

### 🐛 Known Limitations / Bilinen Sınırlamalar

- Instagram's interface changes may require extension updates  
  Instagram'ın arayüz değişiklikleri uzantı güncellemeleri gerektirebilir
- Very large follower/following lists (>10,000) may take longer to process  
  Çok büyük takipçi/takip edilen listeleri (>10,000) işlenmesi daha uzun sürebilir
- Rate limiting by Instagram may affect analysis speed  
  Instagram'ın hız sınırlaması analiz hızını etkileyebilir

---

## 🛠️ Development / Geliştirme

### Project Structure / Proje Yapısı

```
instagram-follower-analysis/
├── manifest.json          # Extension manifest
├── background.js          # Service worker
├── content.js            # Content script
├── popup.html            # Popup interface
├── popup.js              # Popup logic
├── i18n.js               # Internationalization
├── _locales/
│   ├── tr/
│   │   └── messages.json # Turkish translations
│   └── en/
│       └── messages.json # English translations
└── README.md             # This file
```

### Building / Derleme

No build process required. The extension works directly from source files.  
Derleme gerekmez. Uzantı doğrudan kaynak dosyalardan çalışır.

---

## 🤝 Contributing / Katkıda Bulunma

Contributions are welcome! Please feel free to submit a Pull Request.  
Katkılarınızı bekliyoruz! Lütfen bir Pull Request gönderin.

### How to Contribute / Nasıl Katkıda Bulunulur

1. Fork the repository  
   Repository'yi fork edin
2. Create a feature branch  
   Bir özellik dalı oluşturun
3. Make your changes  
   Değişikliklerinizi yapın
4. Submit a pull request  
   Bir pull request gönderin

---

## 📝 License / Lisans

This project is licensed under the MIT License.  
Bu proje MIT Lisansı altında lisanslanmıştır.

---

## 🙏 Acknowledgments / Teşekkürler

- Thanks to all contributors  
  Tüm katkıda bulunanlara teşekkürler
- Built with ❤️ for the Instagram community  
  Instagram topluluğu için ❤️ ile yapıldı

---

## 📞 Support / Destek

If you encounter any issues or have questions:  
Herhangi bir sorunla karşılaşırsanız veya sorularınız varsa:

- **Open an Issue** / **Bir Sorun Açın**: [GitHub Issues](https://github.com/ecuware/followcheck/issues)  
  [GitHub Issues](https://github.com/ecuware/followcheck/issues)

---

## 🔄 Changelog / Değişiklik Günlüğü

### Version 1.0.0

- ✅ Initial release / İlk sürüm
- ✅ Bilingual support (Turkish & English) / Çift dil desteği (Türkçe & İngilizce)
- ✅ Follower analysis / Takipçi analizi
- ✅ TXT export / TXT dışa aktarma
- ✅ Modern UI / Modern arayüz

---

**Made with ❤️ for Instagram users**  
**Instagram kullanıcıları için ❤️ ile yapıldı**
