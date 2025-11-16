# ATLAS İnteraktif - Mimari Dokümantasyonu

## 📐 Genel Mimari

ATLAS İnteraktif, modüler ve ölçeklenebilir bir mimari ile tasarlanmıştır. Proje üç ana katmandan oluşur:

1. **Presentation Layer** (Sunum Katmanı): Web UI
2. **Business Logic Layer** (İş Mantığı Katmanı): JavaScript modülleri
3. **Data Layer** (Veri Katmanı): JSON ve CSV dosyaları

## 🗂️ Klasör Yapısı

### `/src/web/` - Web Uygulaması

#### `styles/` - CSS Modülleri
```
styles/
├── main.css                 # Ana CSS (tüm modülleri import eder)
├── base/                    # Temel stiller
│   ├── variables.css       # CSS değişkenleri
│   ├── reset.css           # CSS reset
│   └── typography.css      # Tipografi
├── layout/                  # Sayfa layout'ları
│   ├── page-navigation.css
│   ├── header.css
│   └── responsive.css
├── components/              # Tekrar kullanılabilir bileşenler
│   ├── globe.css
│   ├── flatmap.css
│   ├── legend.css
│   └── ...
├── pages/                   # Sayfa-özel stiller
│   └── theory-page.css
├── modules/                 # Büyük modüller
│   ├── panel.css
│   ├── corridor-graphic.css
│   └── chat.css
└── animations/              # Animasyonlar
    └── keyframes.css
```

#### `scripts/` - JavaScript Modülleri
```
scripts/
├── main.js                  # Ana entry point
├── config/                  # Yapılandırma
│   ├── constants.js        # Sabitler
│   └── api-config.js       # API yapılandırması
├── core/                    # Temel fonksiyonlar
│   ├── state.js            # Global state yönetimi
│   ├── globe.js            # Globe yönetimi
│   ├── navigation.js       # Sayfa navigasyonu
│   ├── interaction.js      # Kullanıcı etkileşimleri
│   ├── globe-handlers.js   # Globe event handlers
│   └── polygon-labels.js   # Tooltip'ler
├── modules/                 # Özellik modülleri
│   ├── wgi/                # WGI göstergeleri
│   ├── corridor/           # Dar Koridor analizi
│   ├── panel/              # Sağ panel
│   └── chat/               # AI Chat
└── utils/                   # Yardımcı fonksiyonlar
    ├── color-utils.js
    ├── data-helpers.js
    └── geometry.js
```

## 🔄 Veri Akışı

### 1. Uygulama Başlatma
```
DOMContentLoaded
    ↓
setupNavigation()
    ↓
loadDarKoridorData()
    ↓
setupPanelAndChat()
    ↓
Globe başlatma (ilk geçişte)
```

### 2. Ülke Seçimi Akışı
```
Kullanıcı ülkeye tıklar
    ↓
handleCountryClick()
    ↓
getPolygonCenter() → Kamera odakla
    ↓
openCountryPanel() → Panel aç
    ↓
getCountryAnalysesText() → Analiz getir
    ↓
getCountryDataForYear() → Dar Koridor verisi getir
    ↓
updateDotPosition() → Grafik güncelle
```

### 3. State Yönetimi
Global state, merkezi bir `state.js` modülünde yönetilir:

```javascript
state = {
    globe,              // Globe instance
    countriesData,      // GeoJSON verileri
    wgiEnabled,         // WGI aktif mi?
    darKoridorData,     // Dar Koridor verileri
    currentCountryName, // Seçili ülke
    // ... diğer state'ler
}
```

## 🎨 CSS Mimarisi

### CSS Değişkenleri Sistemi
Tüm renkler, spacing ve diğer değerler `variables.css`'de tanımlı:

```css
:root {
    --primary-blue: #1e3c72;
    --spacing-md: 20px;
    --radius-lg: 20px;
    /* ... */
}
```

### BEM Metodolojisi
CSS sınıf isimlendirmelerinde BEM (Block Element Modifier) benzeri yaklaşım:

```css
.corridor-graphic           /* Block */
.corridor-graphic__dot      /* Element */
.corridor-graphic--active   /* Modifier */
```

### Modüler Import
`main.css` tüm modülleri import eder:

```css
@import './base/variables.css';
@import './components/globe.css';
/* ... */
```

## 🔌 API Entegrasyonları

### 1. External APIs
- **Natural Earth GeoJSON**: Ülke sınırları
- **Flagpedia**: Ülke bayrakları
- **Ollama**: AI Chat (lokal)

### 2. Data Files
- **V-Dem CSV**: `data/raw/V-Dem-CY-Full+Others-v15.csv`
- **WGI Dataset**: `data/raw/wgidataset.csv`
- **Dar Koridor JSON**: `data/processed/v2_1/*.json`

## 🧩 Modül Bağımlılıkları

### Core Bağımlılıklar
```
main.js
  ├── navigation.js
  │     └── globe.js
  │           ├── state.js
  │           ├── interaction.js
  │           └── globe-handlers.js
  ├── panel-manager.js
  │     ├── state.js
  │     ├── country-analyses.js
  │     └── data-helpers.js
  └── corridor-data.js
        └── state.js
```

### External Libraries
- **Globe.gl**: 3D globe rendering
- **D3.js**: Data visualization
- **PapaParse**: CSV parsing

## 🔐 Güvenlik

- **XSS Protection**: User input sanitization
- **CORS**: Appropriate CORS headers
- **CSP**: Content Security Policy (önerilir)

## 📊 Performans Optimizasyonu

### 1. Code Splitting
Modüler yapı sayesinde kod parçalama:
- Core modüller her zaman yüklenir
- Feature modüller lazy load edilebilir

### 2. Asset Optimization
- CSS: Modüler import sistemi
- JS: ES6 modules
- Images: Optimize edilmiş görseller

### 3. Caching Strategy
- Static assets: Long-term caching
- API responses: Short-term caching

## 🧪 Test Stratejisi

### Unit Tests
```javascript
// utils/data-helpers.test.js
test('getCountryDataForYear returns correct data', () => {
    // ...
});
```

### Integration Tests
```javascript
// core/globe.test.js
test('globe initializes correctly', () => {
    // ...
});
```

## 🔮 Gelecek Geliştirmeler

1. **TypeScript Migration**: Tip güvenliği için
2. **Build System**: Vite veya Webpack ile
3. **State Management**: Redux veya Zustand
4. **Testing**: Jest + Testing Library
5. **CI/CD**: GitHub Actions
6. **PWA**: Progressive Web App özellikleri

## 📚 Kaynaklar

- [Globe.gl Documentation](https://github.com/vasturiano/globe.gl)
- [D3.js Documentation](https://d3js.org/)
- [ES6 Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- [CSS Architecture](https://www.smashingmagazine.com/2018/05/guide-css-layout/)

---

**Son Güncelleme**: 2025-11-15  
**Versiyon**: 2.0.0 (Modüler Refactor)

