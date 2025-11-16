# 🧪 Test ve Hata Ayıklama Kılavuzu

## Sorun: "Ana Sayfaya Dön" Butonu Çalışmıyor

### ✅ Yapılan Düzeltmeler

1. **navigation.js'e kontroller eklendi**: Elementlerin varlığı kontrol ediliyor
2. **main.js'e detaylı log'lar eklendi**: Hata takibi için
3. **Test sayfası oluşturuldu**: `src/web/test-navigation.html`

### 🔍 Test Adımları

#### 1. Basit Test (test-navigation.html)

```bash
# Lokal sunucu çalışıyorsa:
http://localhost:8000/src/web/test-navigation.html
```

Bu basit test sayfası sadece navigasyon fonksiyonunu test eder.

#### 2. Ana Uygulama Testi

```bash
# Lokal sunucu başlatın (eğer çalışmıyorsa)
cd /Users/metincatal/Desktop/ATLAS-Interaktif
python3 -m http.server 8000

# Tarayıcıda açın:
http://localhost:8000/src/web/index.html
```

#### 3. Console'da Kontrol

1. **Tarayıcıyı açın** (Chrome, Firefox, Safari)
2. **F12** veya **Cmd+Option+I** (Mac) / **Ctrl+Shift+I** (Windows/Linux)
3. **Console** sekmesine gidin
4. Şu mesajları görmelisiniz:

```
ATLAS İnteraktif - Daron Acemoğlu
1️⃣ Sayfa navigasyonu kuruluyor...
✓ Sayfa navigasyonu hazır
2️⃣ Dar Koridor verileri yükleniyor...
...
```

### 🐛 Yaygın Hatalar ve Çözümler

#### Hata 1: "Failed to load module script"
```
Access to script at ... has been blocked by CORS policy
```

**Çözüm**:
- `file://` protokolü yerine HTTP sunucusu kullanın
- Doğru: `http://localhost:8000`
- Yanlış: Dosyayı direkt tarayıcıya sürükleyip açmak

#### Hata 2: "Cannot find module './core/navigation.js'"
```
Failed to load module script: Expected a JavaScript module script
```

**Çözüm**:
- Script tag'inde `type="module"` olmalı ✅
- Dosya yolu doğru olmalı: `scripts/main.js`

#### Hata 3: "setupNavigation is not a function"
```
Uncaught TypeError: setupNavigation is not a function
```

**Çözüm**:
- `export function setupNavigation()` şeklinde export edilmiş olmalı ✅
- Import yolu doğru olmalı ✅

#### Hata 4: "Cannot read property 'addEventListener' of null"
```
Uncaught TypeError: Cannot read properties of null (reading 'addEventListener')
```

**Çözüm**:
- Buton HTML'de var mı kontrol edin: `id="go-to-main"`
- DOM yüklendikten sonra çalıştırılıyor mu: `DOMContentLoaded` ✅

### 📋 Kontrol Listesi

Sayfayı açtığınızda şunları kontrol edin:

- [ ] Console'da hata yok
- [ ] "✓ Sayfa navigasyonu hazır" mesajı var
- [ ] Teori sayfası görünüyor (varsayılan)
- [ ] "Ana Sayfaya Dön" butonu var
- [ ] Butona tıklayınca console'da "Ana sayfaya geçildi" yazıyor
- [ ] Ana sayfa görünüyor
- [ ] "Teoriler" butonu çalışıyor

### 🔧 Manuel Test

Console'da manuel olarak test edin:

```javascript
// 1. Elementlerin varlığını kontrol et
console.log('Theory Page:', document.getElementById('theory-page'));
console.log('Main Page:', document.getElementById('main-page'));
console.log('Go to Main Button:', document.getElementById('go-to-main'));
console.log('Theory Button:', document.getElementById('theory-button'));

// 2. Event listener'ı manuel olarak test et
const btn = document.getElementById('go-to-main');
if (btn) {
    console.log('✅ Buton bulundu');
    console.log('Event listeners:', getEventListeners(btn)); // Chrome DevTools
} else {
    console.log('❌ Buton bulunamadı!');
}

// 3. Sayfa değiştirmeyi manuel test et
document.getElementById('theory-page').classList.remove('active');
document.getElementById('main-page').classList.add('active');
```

### 📸 Ekran Görüntüsü İle Paylaş

Eğer sorun devam ediyorsa, console screenshot'ı paylaşın:

1. Console'u açın (F12)
2. Tüm log'ları görecek şekilde scroll edin
3. Screenshot alın
4. Kırmızı hataları not edin

### 🆘 Acil Çözüm (Fallback)

Eğer modüler yapı hiç çalışmıyorsa, geçici olarak eski dosyaya dönün:

```bash
cd /Users/metincatal/Desktop/ATLAS-Interaktif
cp script.js.backup script.js
cp style.css.backup style.css
cp index.html.backup index.html

# Eski yapıyla test edin
python3 -m http.server 8000
# http://localhost:8000
```

## 📞 Destek

Sorun devam ediyorsa:
1. Console'daki **tam hata mesajını** paylaşın
2. Hangi tarayıcı kullandığınızı belirtin
3. Test sayfası (test-navigation.html) çalışıyor mu?

---

**Güncelleme**: 2025-11-15  
**Durum**: Navigasyon kontrolle ri eklendi, test sayfası hazır

