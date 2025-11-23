# ATLAS İnteraktif - Tarihi Haritalar Sistemi

## 📋 Genel Bakış

Bu sistem, 1789-2024 yılları arası tarihi sınır haritalarını üç farklı açık kaynak veri setini birleştirerek sağlar:

- **Historical Basemaps** (1789-1886): 4 milestone yılı
- **CShapes 2.0** (1886-2019): Günlük hassasiyetli 134 yıl
- **Natural Earth** (2020-2024): Güncel sınırlar

## 🗂️ Klasör Yapısı

```
data/historical_maps/
├── README.md                           # Bu dosya
├── index.json                          # Master index - yıl → harita eşleştirmesi
├── historical_names.json               # V-Dem → tarihi ad eşleştirmesi
├── test_map_loading.py                 # Test script'i
│
├── basemaps/                           # Historical Basemaps GitHub repo (klonlanmış)
│   └── geojson/
│       ├── world_1783.geojson
│       ├── world_1800.geojson
│       ├── world_1815.geojson
│       └── world_1880.geojson
│
├── cshapes/                            # CShapes 2.0 verisi
│   ├── CShapes-2.0.geojson            # Ana veri seti (25MB, 710 feature)
│   ├── extract_year.py                 # Yıl bazlı harita çıkartma script'i
│   └── extracted/                      # Çıkartılmış haritalar (geçici)
│
└── processed/                          # İşlenmiş, kullanıma hazır haritalar
    ├── 1789-1886/                      # Historical Basemaps dönemi
    │   ├── world_1783.geojson         # 236 feature
    │   ├── world_1800.geojson
    │   ├── world_1815.geojson
    │   └── world_1880.geojson
    │
    ├── 1886-2019/                      # CShapes dönemi
    │   ├── world_1886.geojson         # 128 feature
    │   ├── world_1900.geojson         # 151 feature
    │   ├── world_1914.geojson         # 150 feature (WWI)
    │   ├── world_1920.geojson         # 167 feature (Osmanlı sonu)
    │   ├── world_1923.geojson         # 169 feature (TC kuruluşu)
    │   ├── world_1938.geojson         # 173 feature (WWII öncesi)
    │   ├── world_1945.geojson         # 170 feature (WWII sonu)
    │   ├── world_1960.geojson         # 164 feature (Dekolonizasyon)
    │   ├── world_1989.geojson         # 159 feature (Soğuk Savaş sonu)
    │   ├── world_2000.geojson         # 177 feature
    │   └── world_2019.geojson         # 181 feature
    │
    └── 2020-2024/                      # Modern dönem (şimdilik boş)
        └── (Natural Earth verisi kullanılacak)
```

## 📊 Veri Kaynakları

### 1. Historical Basemaps (1789-1886)

- **Kaynak**: https://github.com/aourednik/historical-basemaps
- **Lisans**: CC BY-SA 4.0
- **Kapsam**: 1783, 1800, 1815, 1880 yılları
- **Özellikler**:
  - Manuel olarak hazırlanmış tarihi haritalar
  - Büyük tarihi dönemleri kapsar (Napolyon, Viyana Kongresi, vb.)
  - GeoJSON formatında
  - Property'ler: `NAME`, `ABBREVN`, `SUBJECTO`, `BORDERPRECISION`, `PARTOF`

### 2. CShapes 2.0 (1886-2019)

- **Kaynak**: https://icr.ethz.ch/data/cshapes/
- **Geliştirici**: ETH Zürich
- **Lisans**: Academic Use
- **Kapsam**: 1886-01-01 - 2019-12-31 (günlük hassasiyet)
- **Özellikler**:
  - Her feature bir ülkenin belirli tarih aralığındaki sınırlarını temsil eder
  - Tarih formatı: `gwsdate` (başlangıç), `gwedate` (bitiş)
  - Örnek: "31.12.1885 23:00:00" - "13.10.1923 22:00:00"
  - 710 toplam feature (tüm ülkelerin tüm dönemleri)
  - Property'ler: `cntry_name`, `capname`, `area`, `gwsdate`, `gwedate`, `gwcode`
  - **ÖNEMLİ**: Ülke adları sabit kalır (örn: "Turkey (Ottoman Empire)" 1886'dan 2019'a kadar)

### 3. Natural Earth (2020-2024)

- **Kaynak**: https://www.naturalearthdata.com/
- **Lisans**: Public Domain
- **Kapsam**: Güncel sınırlar
- **Entegrasyon**: Mevcut uygulamada zaten kullanılıyor
- **URL**: `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson`

## 🔧 Kullanım

### 1. Belirli Bir Yıl İçin Harita Yükle

```javascript
// index.json'u yükle
const index = await fetch('data/historical_maps/index.json').then(r => r.json());

// 1923 için uygun haritayı bul
function getMapForYear(year, index) {
    // Tam eşleşme ara
    let milestone = index.milestones.find(m => m.year === year);

    // Bulamazsan en yakın önceki milestone'u al
    if (!milestone) {
        const suitableMilestones = index.milestones.filter(m => m.year <= year);
        milestone = suitableMilestones.reduce((prev, curr) =>
            curr.year > prev.year ? curr : prev
        );
    }

    return milestone;
}

const milestone = getMapForYear(1923, index);
console.log(milestone.path); // "processed/1886-2019/world_1923.geojson"

// Haritayı yükle
const mapData = await fetch(`data/historical_maps/${milestone.path}`).then(r => r.json());
```

### 2. Tarihi Ad Eşleştirmesi Yap

```javascript
// historical_names.json'u yükle
const names = await fetch('data/historical_maps/historical_names.json').then(r => r.json());

function getHistoricalName(vdemName, year, namesData) {
    const mapping = namesData.mappings.find(m => m.vdem_name === vdemName);
    if (!mapping) return null;

    const period = mapping.historical_periods.find(p =>
        p.start_year <= year && year <= p.end_year
    );

    return period;
}

// Örnek: 1881'de Türkiye'nin adı
const turkeyHistorical = getHistoricalName('Türkiye', 1881, names);
console.log(turkeyHistorical.display_name); // "Osmanlı İmparatorluğu"

// Örnek: 1923'te Rusya'nın adı
const russiaHistorical = getHistoricalName('Russia', 1923, names);
console.log(russiaHistorical.display_name); // "Sovyetler Birliği"
```

### 3. Yeni Bir Yıl İçin CShapes'ten Harita Çıkart

```bash
cd data/historical_maps/cshapes
python3 extract_year.py 1950

# Çıktı:
# 📅 1950 yılı için harita çıkartılıyor...
# ✓ 165 ülke/bölge bulundu
# 💾 Kaydedildi: extracted/world_1950.geojson

# Processed klasörüne taşı
mv extracted/world_1950.geojson ../processed/1886-2019/
```

## 🧪 Test

```bash
cd data/historical_maps
python3 test_map_loading.py
```

Test script'i üç kritik yılı test eder:
- **1881**: Historical Basemaps (1880 kullanılır) + "Osmanlı İmparatorluğu"
- **1923**: CShapes (tam eşleşme) + "Türkiye" (TC kuruluş yılı)
- **2020**: CShapes 2019 (en yakın) + "Türkiye" (modern)

## 📈 İstatistikler

| Dönem | Kaynak | Milestone Sayısı | Ülke Sayısı (ort.) | Hassasiyet |
|-------|--------|------------------|-------------------|------------|
| 1789-1886 | Historical Basemaps | 4 | ~236 | ~25-65 yıl |
| 1886-2019 | CShapes 2.0 | 10+ (herhangi bir yıl) | 128-181 | Günlük |
| 2020-2024 | Natural Earth | 1 | ~195 | Güncel |

## 🌍 Tarihi Ad Eşleştirmeleri

30+ ülke için tarihi ad eşleştirmeleri mevcut:

### Önemli Örnekler:

| V-Dem Adı | 1800 | 1900 | 1950 | 2000 |
|-----------|------|------|------|------|
| **Türkiye** | Osmanlı İmparatorluğu | Osmanlı İmparatorluğu | Türkiye | Türkiye |
| **Russia** | Rus İmparatorluğu | Rus İmparatorluğu | Sovyetler Birliği | Rusya Federasyonu |
| **Germany** | Prusya | Alman İmparatorluğu | Batı Almanya | Almanya |
| **China** | Qing Hanedanlığı | Qing Hanedanlığı | Çin Halk Cumhuriyeti | Çin Halk Cumhuriyeti |
| **India** | Britanya Doğu Hindistan Şirketi | Britanya Hindistanı | Hindistan | Hindistan |

## 🔄 Web Uygulamasına Entegrasyon

### Önerilen Akış:

1. **Year Slider Ekleme**:
   ```javascript
   // 1789-2024 arası slider
   const yearSlider = createSlider(1789, 2024, currentYear);
   ```

2. **Harita Güncelleme**:
   ```javascript
   yearSlider.onChange((year) => {
       // Uygun haritayı yükle
       const milestone = getMapForYear(year, index);
       loadHistoricalMap(milestone.path);

       // Dar koridor verisi ile eşleştir
       updateDarKoridorData(year);

       // Ülke adlarını güncelle
       updateCountryNames(year);
   });
   ```

3. **Dar Koridor Verisi ile Eşleştirme**:
   ```javascript
   // GeoJSON'daki ülke adını V-Dem'dekiyle eşleştir
   function matchCountryName(geoJsonName, year) {
       // CShapes: "Turkey (Ottoman Empire)" → "Türkiye"
       // Historical Basemaps: "Ottoman Empire" → "Türkiye"
       // constants.js'deki COUNTRY_NAME_MAP kullan

       const vdemName = COUNTRY_NAME_MAP[geoJsonName] || geoJsonName;
       return vdemName;
   }
   ```

4. **Görsel Gösterim**:
   ```javascript
   // Harita üzerinde ülkeye hover/click:
   onCountryClick((geoJsonName, year) => {
       const vdemName = matchCountryName(geoJsonName, year);
       const historicalName = getHistoricalName(vdemName, year, names);
       const darKoridorData = getDarKoridorData(vdemName, year);

       showTooltip({
           displayName: historicalName?.display_name || vdemName,
           year: year,
           leviathanType: darKoridorData.leviathan_type,
           statePower: darKoridorData.state_power,
           societyPower: darKoridorData.society_power
       });
   });
   ```

## 📝 Notlar

### GeoJSON Property Farkları

**Historical Basemaps**:
```json
{
    "NAME": "Ottoman Empire",
    "ABBREVN": "Ottoman Empi",
    "SUBJECTO": "Ottoman Empire",
    "BORDERPRECISION": 3,
    "PARTOF": "Ottoman Empire"
}
```

**CShapes**:
```json
{
    "cntry_name": "Turkey (Ottoman Empire)",
    "capname": "Istanbul",
    "area": 755688.0,
    "gwsdate": "31.12.1885 23:00:00",
    "gwedate": "13.10.1923 22:00:00",
    "gwcode": 640
}
```

### Önemli Tarihler

- **1783**: ABD bağımsızlığı
- **1815**: Napolyon Savaşları sonu, Viyana Kongresi
- **1886**: CShapes veri setinin başlangıcı
- **1914**: Birinci Dünya Savaşı başlangıcı
- **1920**: Osmanlı İmparatorluğu'nun fiili sonu
- **1923**: Türkiye Cumhuriyeti'nin kuruluşu (29 Ekim)
- **1945**: İkinci Dünya Savaşı sonu, BM kuruluşu
- **1989**: Berlin Duvarı'nın yıkılması
- **2019**: CShapes veri setinin sonu

### Sınırlamalar

1. **1789-1886 arası**: Sadece 4 milestone yılı, aralar interpolasyon gerektirir
2. **CShapes ülke adları**: Sabit kalır (ör: "Turkey (Ottoman Empire)"), tarihi ad mapping'i zorunlu
3. **2020-2024**: CShapes bitmiş, Natural Earth kullanılmalı
4. **Küçük ülkeler**: Bazı küçük ülkeler/bölgeler bazı yıllarda eksik olabilir

### Gelecek Geliştirmeler

- [ ] 2020-2024 için Natural Earth entegrasyonu
- [ ] CShapes'ten daha fazla milestone yılı çıkartma (her 5 yılda bir)
- [ ] Başkent değişimlerini gösterme (Istanbul → Ankara geçişi gibi)
- [ ] Sınır değişimlerinin animasyonu
- [ ] Bölgesel haritalar (sadece Avrupa, Asya, vb.)
- [ ] Daha detaylı historical_names.json (tüm V-Dem ülkeleri)

## 📚 Referanslar

- **Historical Basemaps**: [GitHub](https://github.com/aourednik/historical-basemaps)
- **CShapes 2.0**: [ETH Zürich](https://icr.ethz.ch/data/cshapes/)
- **Natural Earth**: [Website](https://www.naturalearthdata.com/)
- **V-Dem Dataset**: [V-Dem Institute](https://www.v-dem.net/)

## 📄 Lisans

Bu proje açık kaynak veri setlerini kullanmaktadır:
- Historical Basemaps: CC BY-SA 4.0
- CShapes 2.0: Academic Use (ticari kullanım için izin gerekebilir)
- Natural Earth: Public Domain

---

**Son Güncelleme**: 2025-11-21
**Versiyon**: 1.0.0
**Proje**: ATLAS İnteraktif - Dar Koridor Analizi
