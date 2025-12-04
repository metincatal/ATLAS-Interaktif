# Özgürlük Dengesi Oyunu - Product Requirements Document (PRD)

**Proje:** ATLAS-Interaktif - Özgürlük Dengesi İnteraktif Oyun Modülü
**Versiyon:** 1.0
**Tarih:** 2 Aralık 2025
**Yazar:** Claude AI + Metin Çatal

---

## 📋 İçindekiler

1. [Genel Bakış](#genel-bakış)
2. [Oyun Mekaniği](#oyun-mekaniği)
3. [Bilimsel Temeller](#bilimsel-temeller)
4. [Baskı Grupları ve Politik Sermaye Sistemi](#baskı-grupları-ve-politik-sermaye-sistemi)
5. [Kullanıcı Arayüzü](#kullanıcı-arayüzü)
6. [Teknik Mimari](#teknik-mimari)
7. [Veri Yapıları](#veri-yapıları)
8. [AI Entegrasyonu](#ai-entegrasyonu)
9. [Oyun Akışı](#oyun-akışı)
10. [Uygulama Planı](#uygulama-planı)
11. [Başarı Kriterleri](#başarı-kriterleri)
12. [Risk Yönetimi](#risk-yönetimi)

---

## 1. Genel Bakış

### 1.1. Vizyon
Kullanıcıların tarihsel bir ülkede politik kararlar alarak demokrasi-otorite dengesini yönettiği, gerçekçi politik baskılar ve kısıtlarla karşılaştığı, eğitici ve eğlenceli bir simülasyon oyunu.

### 1.2. Ana Hedefler
- **Eğitici:** Daron Acemoğlu'nun Dar Koridor teorisini interaktif öğretme
- **Gerçekçi:** V-Dem verilerine dayalı bilimsel model
- **Stratejik:** Kullanıcı çıkar grupları arasında denge kurmalı
- **Dinamik:** AI ile üretilen politikalar ve olaylar
- **Görsel:** Grafik üzerinde iz bırakan animasyonlu deneyim

### 1.3. Hedef Kitle
- Siyaset bilimi öğrencileri
- Tarih meraklıları
- Strateji oyunu severler
- Demokrasi ve kurumlar konusunda öğrenmek isteyenler

### 1.4. Temel Özellikler
✅ 180+ ülke, 1789-2023 yıl aralığı
✅ AI tabanlı politika üretimi (Ollama + DeepSeek)
✅ 17 V-Dem değişkeni ile gerçekçi simülasyon
✅ 5 baskı grubu (Ordu, Elitler, Sivil Toplum, Dini Kurumlar, Uluslararası)
✅ Politik sermaye sistemi (kaynak yönetimi)
✅ Dinamik olay/haber üretimi
✅ İz bırakma sistemi (tarihsel yol)
✅ Kriz mekanikleri (darbe, ayaklanma, yaptırım)

---

## 2. Oyun Mekaniği

### 2.1. Oyun Başlangıcı

**Kullanıcı Akışı:**
1. **Ana Sayfa (index.html):** Kullanıcı ülke ve yıl seçer
2. **"Özgürlük Dengesi" Butonu:** Oyun sayfasına yönlendirir
3. **game.html?country=Brazil&year=1985:** URL parametreleri ile açılır
4. **Başlangıç Verisi Yükleme:** Ana sayfadaki aynı veri kaynağından çekilir

**Veri Kaynağı (Ana Sayfa ile Aynı):**
- **1789-1995:** `/data/processed/vdem_historical/dar_koridor_combined_all_years.json`
- **1996-2023:** `/data/processed/wgi_vdem_modern/dar_koridor_all_years.json`

**Başlangıç Durumu:**
- Seçilen ülke ve yılın **faktör skorları** (ana sayfadaki JSON'dan):
  - `statePower`: Devlet gücü (örn: 0.12)
  - `societyPower`: Toplum gücü (örn: -0.45)
  - `leviathanType`: Rejim tipi (örn: "Paper")
- **17 değişken değerleri:** V-Dem ham verisinden çekilir (opsiyonel - faktör skorlarından ters hesaplanabilir)
- Baskı grupları başlangıç değerleri:
  - Ülkeye göre özelleştirilmiş etki seviyeleri (stakeholder_profiles.json)
  - Başlangıç memnuniyeti: 0.5 (nötr)
- Politik sermaye: 100 / 100

**Kritik:** Oyun başlangıcındaki grafik pozisyonu **ana sayfadaki nokta ile birebir aynı olmalıdır**.

### 2.2. Tur Sistemi

**Tur Süresi:** Her tur = 1 yıl
**Maksimum Tur:** 20 tur (20 yıllık simülasyon)

**Her Turda:**
1. Politik sermaye yenilenir (+20 puan)
2. Kullanıcı politika seçer/yazar
3. AI politikayı analiz eder
4. Değişkenler güncellenir
5. Baskı grupları tepki verir
6. Kriz kontrolü yapılır
7. Grafik pozisyonu güncellenir (animasyonlu)
8. Olaylar/haberler üretilir
9. Yeni politikalar üretilir

### 2.3. Kazanma/Kaybetme Koşulları

**Oyun Kazanma (Opsiyonel Hedefler):**
- 20 turu tamamlama
- Dar koridorda kalma (Shackled bölgesinde)
- Tüm baskı gruplarını dengede tutma

**Oyun Kaybetme (Erken Bitiş):**
- Büyük kriz (darbe, iç savaş) → %30 şansla oyun biter
- Tüm baskı grupları çok memnuniyetsiz → Kaos
- (Opsiyonel) Belirli bir Leviathan tipine düşme (örn: Despotic)

### 2.4. Skor Sistemi (V2 İçin)

```javascript
finalScore = {
  stabilityScore: 0-100,        // Krizden kaçınma
  democracyScore: 0-100,         // Dar koridorda kalma
  balanceScore: 0-100,           // Baskı grupları dengesi
  totalScore: (stability + democracy + balance) / 3
};
```

---

## 3. Bilimsel Temeller

### 3.1. Dar Koridor Teorisi

**Kaynak:** Daron Acemoğlu & James A. Robinson - "The Narrow Corridor" (2019)

**Temel Kavram:**
- **X Ekseni:** Society Power (Toplum Gücü)
- **Y Ekseni:** State Power (Devlet Gücü)
- **Dar Koridor:** İdeal bölge (yüksek devlet + yüksek toplum gücü)

**4 Leviathan Tipi:**
1. **Shackled (Prangalanmış):** Güçlü devlet + Güçlü toplum = Dengeli demokrasi
2. **Despotic (Despotik):** Güçlü devlet + Zayıf toplum = Otoriterlik
3. **Paper (Kağıttan):** Zayıf devlet + Zayıf toplum = Anarşi/Kaos
4. **Absent (Olmayan):** Çok zayıf devlet = Devlet yokluğu

### 3.2. Bilimsel Model: Tarihsel Oynaklık ve Şiddet Çarpanı

**Formül:**
```
Δ (Değişim) = σ (Tarihsel Sigma) × I (Intensity Multiplier) × D (Direction)
```

**Bileşenler:**

#### 3.2.1. Tarihsel Sigma (σ)
- **Kaynak:** V-Dem veri seti (1789-2023)
- **Hesaplama:** Her değişkenin yıllık standart sapması
- **Amaç:** "Bir değişken tarihte en fazla ne kadar değişebilir?" sorusuna cevap
- **Örnek:**
  - `v2mecenefm` (Medya Sansürü): σ = 0.05 (yılda %5 değişebilir)
  - `v2x_rule` (Hukuk): σ = 0.01 (yılda %1 değişebilir - daha katı)

**Gerçekçilik:** Kullanıcı bir tuşla hukuk sistemini %50 değiştiremez.

#### 3.2.2. Şiddet Çarpanı (Intensity Multiplier)
AI tarafından belirlenen politika şiddeti:

| Şiddet | Çarpan | Örnek |
|--------|--------|-------|
| **Soft** | 0.5x | Eğitim programı, teşvik |
| **Moderate** | 1.0x | Yeni yasa, kurumsal değişiklik |
| **Radical** | 2.5x | Anayasa değişikliği, kapatma |
| **Extreme** | 4.0x | Darbe, sıkıyönetim, tam devletleştirme |

#### 3.2.3. Yön (Direction)
- **+1:** Değişken artıyor (özgürlük artışı)
- **-1:** Değişken azalıyor (özgürlük kısıtlaması)

**Örnek Hesaplama:**
```
Politika: "Tüm muhalif gazeteleri kapat!"

AI Analizi:
- Değişken: v2mecenefm (Medya Sansürü)
- Yön: -1 (özgürlük azalıyor)
- Şiddet: Radical (2.5x)

Hesaplama:
σ = 0.05 (tarihsel sigma)
Δ = 0.05 × 2.5 × (-1) = -0.125

Sonuç: Medya özgürlüğü 0.125 puan düşer.
```

### 3.2.4. Gelişmiş Sistem: 500+ V-Dem Değişkeni ile Korelasyon Yayılımı

**Konsept:** AI sadece **hangilerini** ve **ne yönde** etkilediğini söyler, **ne kadar** etkilediğini matematiksel formül hesaplar.

**Tam Akış:**
```
Politika → AI (500+ değişken seçimi + Yön + Şiddet)
   ↓
500+ değişken için: Δ = Yön × σ × Şiddet_Çarpanı
   ↓
Korelasyon matrisi ile 17 ana değişkene yayılım
   ↓
Faktör analizi (17 → 2)
   ↓
Grafik
```

**AI'nın Rolü (Sadece Sınıflandırma):**
- **Girdi:** Politika metni
- **Çıktı:** Max 15 değişken + Yön (positive/negative) + Şiddet (soft/moderate/radical)
- **Önemli:** AI SAYISAL DEĞER VERMİYOR, sadece kategori belirliyor

**Matematiksel Hesaplama:**
```javascript
// Her etkilenen değişken için
for (const [variable, effect] of aiAnalysis) {
  const sigma = volatilityData[variable].sigma;
  const multiplier = { soft: 0.5, moderate: 1.0, radical: 2.5 }[effect.intensity];
  const direction = effect.direction === "positive" ? 1 : -1;

  // FORMÜL
  const change = direction * sigma * multiplier;

  changes500[variable] = change;
}
```

**Korelasyon Yayılımı:**
```javascript
// Her 500+ değişkenin 17 ana değişkenle korelasyonunu kullan
for (const [var500, change] of changes500) {
  const correlations = correlationMatrix[var500];  // Önceden hesaplanmış

  for (const [var17, corr] of correlations) {
    if (Math.abs(corr) > 0.3) {  // Sadece güçlü korelasyonlar
      changes17[var17] += change * corr;
    }
  }
}
```

**Örnek:**
```
Politika: "Tüm muhalif gazeteleri kapat!"

AI Çıktısı:
{
  "v2mecenefm": { direction: "negative", intensity: "radical" },
  "v2meharjrn": { direction: "negative", intensity: "radical" },
  "v2smgovdom": { direction: "negative", intensity: "moderate" }
}

500+ Değişken Hesaplama:
v2mecenefm: Δ = (-1) × 0.0523 × 2.5 = -0.1308
v2meharjrn: Δ = (-1) × 0.0618 × 2.5 = -0.1545
v2smgovdom: Δ = (-1) × 0.0421 × 1.0 = -0.0421

Korelasyon Yayılımı (17 değişkene):
v2x_freexp:
  = (-0.1308 × -0.852)  // v2mecenefm korelasyonu
  + (-0.1545 × -0.789)  // v2meharjrn korelasyonu
  + (-0.0421 × -0.623)  // v2smgovdom korelasyonu
  = -0.28

v2x_libdem = -0.21
v2x_partipdem = -0.15
...
```

**Avantajlar:**
- ✅ 500+ değişken detayı (çok gerçekçi)
- ✅ AI sadece sınıflandırma yapıyor (tutarlı)
- ✅ Matematiksel formül (tarihsel sınırlar)
- ✅ İkincil/dolaylı etkiler (korelasyon matrisi)
- ✅ Performanslı (korelasyon önceden hesaplanmış)

---

### 3.3. V-Dem Veri Seti

**Kaynak:** Varieties of Democracy (V-Dem) v15
**Kapsam:** 1789-2023, 180+ ülke, **531 gösterge**

**Sistemdeki Kullanım:**
- **500+ Değişken:** AI analizi ve sigma hesaplamaları için
- **17 Ana Değişken:** Faktör analizi ve oyun state için

**Oyunda Kullanılan 17 Temel Değişken:**

| Değişken | Açıklama | Aralık |
|----------|----------|--------|
| v2x_libdem | Liberal Demokrasi İndeksi | 0-1 |
| v2x_partipdem | Katılımcı Demokrasi İndeksi | 0-1 |
| v2x_delibdem | Müzakereci Demokrasi İndeksi | 0-1 |
| v2x_egaldem | Eşitlikçi Demokrasi İndeksi | 0-1 |
| v2x_freexp | İfade ve İnanç Özgürlüğü | 0-1 |
| v2mecenefm | Medya Sansürü Çabaları | 0-4 |
| v2x_cspart | Sivil Toplum Katılımı | 0-1 |
| v2cseeorgs | Örgütlenme Özgürlüğü | 0-4 |
| v2cscnsult | Sivil Toplum Danışması | 0-4 |
| v2x_elecreg | Seçim Rejimi | 0-1 |
| v2x_elecoff | Seçimle İşbaşına Gelme | 0-1 |
| v2juhcind | Yargı Bağımsızlığı | 0-4 |
| v2juaccnt | Hesap Verilebilirlik | 0-4 |
| v2x_corr | Politik Yolsuzluk | 0-1 |
| v2x_rule | Hukuk Üstünlüğü | 0-1 |
| v2xcs_ccsi | Core Civil Society Index | 0-1 |
| v2x_frassoc_thick | Association Freedom | 0-1 |

### 3.4. Faktör Analizi (17 → 2 Dönüşümü)

**Yöntem:** Principal Component Analysis (PCA) veya Factor Analysis

**Süreç:**
1. 17 değişkenin güncel değerleri alınır
2. Faktör yükleme matrisi ile çarpılır
3. 2 faktör skoru elde edilir:
   - **Faktör 1:** State Power (Devlet Gücü)
   - **Faktör 2:** Society Power (Toplum Gücü)

**Matris Yapısı:**
```json
{
  "loadings": {
    "factor1_state": [0.82, 0.76, 0.65, ...],  // 17 katsayı
    "factor2_society": [0.15, 0.43, 0.88, ...]
  },
  "variables": ["v2x_libdem", "v2x_partipdem", ...]
}
```

**Formül:**
```
StatePower = Σ(loadings_state[i] × variables[i])
SocietyPower = Σ(loadings_society[i] × variables[i])
```

**Grafik Pozisyonu:**
```javascript
x = ((societyPower + 3) / 6) * 100;  // 0-100%
y = 100 - ((statePower + 3) / 6) * 100; // Ters (SVG koordinat)
```

---

## 4. Baskı Grupları ve Politik Sermaye Sistemi

### 4.1. Baskı Grupları (Stakeholder Groups)

Gerçek siyasette her politika çıkar gruplarını etkiler. Oyunda **5 ana baskı grubu** var:

#### 4.1.1. Grup Tanımları

```javascript
const STAKEHOLDER_GROUPS = {
  military: {
    id: "military",
    name: "Ordu",
    nameTurkish: "Ordu",
    icon: "🎖️",
    description: "Askeri güçler ve güvenlik bürokrasisi",
    influence: 0.0-1.0,      // Ülkeye göre
    satisfaction: 0.0-1.0,   // Dinamik
    color: "#8B4513"
  },

  elite: {
    id: "elite",
    name: "Ekonomik Seçkinler",
    nameTurkish: "Ekonomik Seçkinler",
    icon: "💼",
    description: "İş dünyası, büyük sermaye sahipleri",
    influence: 0.0-1.0,
    satisfaction: 0.0-1.0,
    color: "#FFD700"
  },

  civil_society: {
    id: "civil_society",
    name: "Sivil Toplum",
    nameTurkish: "Sivil Toplum",
    icon: "👥",
    description: "STK'lar, sendikalar, aktivistler",
    influence: 0.0-1.0,
    satisfaction: 0.0-1.0,
    color: "#4169E1"
  },

  religious: {
    id: "religious",
    name: "Dini Kurumlar",
    nameTurkish: "Dini Kurumlar",
    icon: "🕌",
    description: "Dini liderler ve kurumlar",
    influence: 0.0-1.0,
    satisfaction: 0.0-1.0,
    color: "#9370DB"
  },

  international: {
    id: "international",
    name: "Uluslararası Toplum",
    nameTurkish: "Uluslararası Toplum",
    icon: "🌍",
    description: "AB, BM, IMF, yabancı hükümetler",
    influence: 0.0-1.0,
    satisfaction: 0.0-1.0,
    color: "#228B22"
  }
};
```

#### 4.1.2. Etki (Influence) Seviyeleri

**Ülkeye Özgü Başlangıç Değerleri:**

Örnek: **Türkiye 1985**
```javascript
{
  military: { influence: 0.85 },      // Çok güçlü
  elite: { influence: 0.70 },
  civil_society: { influence: 0.40 }, // Zayıf
  religious: { influence: 0.50 },
  international: { influence: 0.60 }
}
```

Örnek: **Norveç 2020**
```javascript
{
  military: { influence: 0.20 },      // Zayıf
  elite: { influence: 0.60 },
  civil_society: { influence: 0.85 }, // Çok güçlü
  religious: { influence: 0.15 },
  international: { influence: 0.75 }
}
```

**Etki Seviyeleri:**
- **0.0-0.2:** Marjinal (göz ardı edilebilir)
- **0.2-0.4:** Zayıf
- **0.4-0.6:** Orta
- **0.6-0.8:** Güçlü
- **0.8-1.0:** Çok Güçlü (veto gücü)

#### 4.1.3. Memnuniyet (Satisfaction) Sistemi

**Başlangıç:** 0.5 (nötr)
**Aralık:** 0.0 (çok memnuniyetsiz) - 1.0 (çok memnun)

**Memnuniyet Seviyeleri:**
- **0.0-0.2:** 😡 Çok Memnuniyetsiz (Kriz Riski!)
- **0.2-0.4:** 😠 Memnuniyetsiz
- **0.4-0.6:** 😐 Nötr
- **0.6-0.8:** 😊 Memnun
- **0.8-1.0:** 😍 Çok Memnun

**Politika Etkisi:**
Her politika her grubu farklı etkiler:

```javascript
// Örnek: "Basın özgürlüğü yasası çıkar"
policyEffects = {
  stakeholders: {
    civil_society: +0.15,    // Çok sevinir
    military: -0.10,         // Rahatsız olur
    elite: -0.05,            // Hafif rahatsız
    international: +0.20,    // Çok sevinir
    religious: 0.0           // Etkilemez
  }
};
```

**Memnuniyet Güncellemesi:**
```javascript
newSatisfaction = currentSatisfaction + policyEffect;
// Clamp: 0.0 - 1.0 arası
```

### 4.2. Politik Sermaye Sistemi

**Kavram:** Her politikanın bir "maliyeti" var. Kullanıcı sınırsız politika uygulayamaz.

```javascript
politicalCapital = {
  current: 100,         // Mevcut sermaye
  max: 100,             // Maksimum kapasite
  regeneration: 20      // Tur başına yenilenme
};
```

**Politika Maliyetleri:**

| Şiddet | Maliyet |
|--------|---------|
| Soft | 10 puan |
| Moderate | 25 puan |
| Radical | 50 puan |
| Extreme | 80 puan |

**Örnek Senaryolar:**

**Tur 1:** Kullanıcı 100 puan ile başlar
- Moderate politika uygular (-25) → Kalan: 75
- Soft politika uygular (-10) → Kalan: 65
- Radical politika uygular (-50) → Kalan: 15
- Artık Moderate politika uygulayamaz (yetersiz sermaye)

**Tur 2:** +20 yenileme → 35 puan
- Moderate politika (-25) → Kalan: 10
- ...

**Strateji:** Kullanıcı dikkatli seçim yapmalı. Tüm sermayeyi bir radikal politikaya mı harcasın, yoksa birkaç küçük adım mı atsın?

### 4.3. Kriz Mekanikleri

**Kriz Tetikleyicileri:**

Eğer bir grubun:
- **Memnuniyeti < 0.2** (çok memnuniyetsiz)
- **VE Etkisi > 0.6** (güçlü)

→ **%KRİZ ŞANSI ARTAR**

**Kriz Türleri:**

#### A) Askeri Darbe
**Tetikleyici:** Ordu memnuniyetsiz + güçlü

**Sonuçlar:**
```javascript
{
  type: "military_coup",
  probability: 0.40,  // %40 şans
  effects: {
    variables: {
      v2x_libdem: -0.30,
      v2x_partipdem: -0.25,
      v2x_freexp: -0.35,
      v2juhcind: -0.20
    },
    forced_policies: [
      "Sıkıyönetim ilan edildi",
      "Anayasa askıya alındı",
      "Seçimler ertelendi"
    ],
    stakeholder_reset: {
      military: 0.9,  // Ordu çok memnun
      civil_society: 0.1,  // Sivil toplum çok memnuniyetsiz
      international: 0.2
    },
    game_over_risk: 0.30  // %30 şans oyun bitsin
  },
  news: "🚨 DARBE! Ordu yönetime el koydu. Sokağa çıkma yasağı ilan edildi."
}
```

#### B) Sermaye Kaçışı / Ekonomik Kriz
**Tetikleyici:** Ekonomik elitler memnuniyetsiz + güçlü

**Sonuçlar:**
```javascript
{
  type: "capital_flight",
  probability: 0.30,
  effects: {
    variables: {
      v2x_egaldem: +0.15,  // Eşitsizlik azalabilir (paradoks)
      v2x_corr: +0.10      // Ama yolsuzluk artabilir
    },
    economic_penalty: {
      political_capital_regen: -10  // Tur başına regen düşer
    },
    stakeholder_reset: {
      elite: 0.2,
      civil_society: 0.3,  // İşsizlik artar
      international: 0.4
    },
    game_over_risk: 0.15
  },
  news: "💸 EKONOMİK KRİZ! Yabancı yatırımcılar ülkeden çekiliyor. Döviz kuru fırladı."
}
```

#### C) Kitle Ayaklanmaları
**Tetikleyici:** Sivil toplum memnuniyetsiz + güçlü

**Sonuçlar:**
```javascript
{
  type: "mass_protests",
  probability: 0.35,
  effects: {
    variables: {
      v2x_partipdem: +0.20,  // Katılım artar
      v2x_cspart: +0.15
    },
    forced_policies: [
      "Protestolar şiddete dönüştü",
      "Hükümet taviz vermek zorunda kaldı"
    ],
    stakeholder_reset: {
      civil_society: 0.7,
      military: 0.4,
      elite: 0.3
    },
    game_over_risk: 0.10
  },
  news: "✊ KITLE GÖSTERİLERİ! Yüzbinlerce kişi sokaklarda. Hükümet baskı altında."
}
```

#### D) Uluslararası Yaptırımlar
**Tetikleyici:** Uluslararası toplum memnuniyetsiz + güçlü

**Sonuçlar:**
```javascript
{
  type: "international_sanctions",
  probability: 0.25,
  effects: {
    variables: {
      v2x_libdem: -0.10,  // İzolasyon
      v2x_rule: -0.08
    },
    economic_penalty: {
      political_capital_max: -20  // Kapasite düşer
    },
    stakeholder_reset: {
      international: 0.1,
      elite: 0.3,  // Ticaret etkilenir
      civil_society: 0.4
    },
    game_over_risk: 0.05
  },
  news: "🌍 ULUSLARARASI YAPTIRIM! AB ve ABD ambargo uygulamaya başladı."
}
```

#### E) Dini İsyanlar
**Tetikleyici:** Dini kurumlar memnuniyetsiz + güçlü

**Sonuçlar:**
```javascript
{
  type: "religious_uprising",
  probability: 0.20,
  effects: {
    variables: {
      v2x_liberal: -0.15,
      v2cseeorgs: -0.10
    },
    forced_policies: [
      "Dini liderler sokak eylemlerine çağrı yaptı",
      "Radikal gruplar güçleniyor"
    ],
    stakeholder_reset: {
      religious: 0.8,
      civil_society: 0.3,
      military: 0.5
    },
    game_over_risk: 0.20
  },
  news: "🕌 DİNİ GERİLİM! Dini liderler hükümete isyan ediyor. Şeriat talebi."
}
```

### 4.4. Kriz Yönetimi

**Kullanıcı Seçenekleri:**

1. **Kriz Geldiğinde:**
   - Popup açılır: "KRİZ: Askeri Darbe Riski!"
   - Kullanıcı seçim yapar:
     - ✅ **Taviz Ver:** Ordunun istediği politikayı uygula (memnuniyet +0.3)
     - ❌ **Direniş:** Riski göze al (%40 şansla darbe gerçekleşir)

2. **Darbe Gerçekleşirse:**
   - Oyun zorlaşır (politik sermaye düşer)
   - Bazı gruplar resetlenir
   - %30 şansla oyun biter (Game Over)

**Strateji:** Krizleri önceden önlemek her zaman daha iyidir!

### 4.5. Denge Mekaniği: Koalisyon Kurma

**Konsept:** Kullanıcı dengeli politikalar uygulayarak grupları tatmin edebilir.

**Örnek:**
```
Amaç: Basın özgürlüğü reformu yapmak
Problem: Ordu muhalif olacak (-0.15)

Çözüm: Aynı turda "Askeri bütçe artışı" politikası ekle
- Basın reformu: Sivil +0.15, Ordu -0.15
- Bütçe artışı: Ordu +0.20, Sivil -0.05

Net Sonuç:
- Ordu: +0.05 (tatmin!)
- Sivil: +0.10 (tatmin!)
```

**Strateji Derinliği:** Oyuncu hangi grupları birlikte tutabileceğini öğrenmeli.

---

## 5. Kullanıcı Arayüzü

### 5.1. Genel Layout

**Ekran Bölünmesi:**
- **Sol Panel (65%):** Oyun Alanı
- **Sağ Panel (35%):** Aksiyon Masası

### 5.2. Sol Panel - Oyun Alanı

#### 5.2.1. Dar Koridor Grafiği

**Bileşenler:**
- Arka plan resmi: Dar koridor şeması
- SVG overlay: İz bırakma (trail) sistemi
- Ülke noktası: Animasyonlu dot
- Tooltip: Hover'da bilgi gösterimi

**Özellikler:**
- Smooth animasyon (800ms geçiş)
- Trail opacity gradient (eski noktalara doğru soluklaşır)
- Renk kodlaması: Leviathan tipine göre

#### 5.2.2. Dashboard Göstergeleri

**Layout:** 2x2 Grid

```
┌─────────────────────────────────┐
│  YIL         TUR                │
│  1985        5/20                │
│                                  │
│  ÖZGÜRLÜK    LEVİATHAN TİPİ     │
│  67/100      Shackled 🟢        │
└─────────────────────────────────┘
```

**Metrikler:**
1. **Yıl:** Mevcut simülasyon yılı
2. **Tur:** Kaçıncı turda / Toplam
3. **Özgürlük Skoru:** 0-100 arası basitleştirilmiş skor
   - Hesaplama: `(v2x_libdem + v2x_partipdem) / 2 * 100`
4. **Leviathan Tipi:** Mevcut rejim tipi (emoji ile)

**Stil:**
- Gradient kartlar
- Değişimlerde sayı animasyonu (CountUp.js tarzı)
- Renk kodları:
  - Shackled: Yeşil
  - Despotic: Kırmızı
  - Paper: Turuncu
  - Absent: Mor

#### 5.2.3. Baskı Grupları Paneli

**Layout:** Liste formatı

```
┌─────────────────────────────────────┐
│         BASKI GRUPLARI              │
├─────────────────────────────────────┤
│ 🎖️ Ordu                            │
│ Etki:        ████████░░ 80%        │
│ Memnuniyet:  ████░░░░░░ 40% 😠     │
│ ⚠️ UYARI: Darbe riski!              │
├─────────────────────────────────────┤
│ 💼 Ekonomik Seçkinler               │
│ Etki:        ███████░░░ 70%        │
│ Memnuniyet:  ████████░░ 80% 😊     │
├─────────────────────────────────────┤
│ 👥 Sivil Toplum                     │
│ Etki:        ████░░░░░░ 40%        │
│ Memnuniyet:  ██████░░░░ 60% 😐     │
├─────────────────────────────────────┤
│ 🕌 Dini Kurumlar                    │
│ Etki:        █████░░░░░ 50%        │
│ Memnuniyet:  ███████░░░ 70% 😊     │
├─────────────────────────────────────┤
│ 🌍 Uluslararası Toplum              │
│ Etki:        ██████░░░░ 60%        │
│ Memnuniyet:  █████████░ 90% 😍     │
└─────────────────────────────────────┘
```

**Özellikler:**
- Progress bar (etki ve memnuniyet)
- Emoji göstergeleri (😡😠😐😊😍)
- Kriz uyarısı (memnuniyet < 0.2)
- Hover: Detaylı açıklama tooltip

#### 5.2.4. Politik Sermaye Göstergesi

**Konum:** Dashboard'un yanında veya üstünde

```
┌─────────────────────────────────┐
│  💎 POLİTİK SERMAYE              │
│  ████████░░░░░░ 65/100           │
│  +20 puan/tur                    │
└─────────────────────────────────┘
```

**Özellikler:**
- Dinamik renk (yeşil→sarı→kırmızı)
- Harcama animasyonu
- Yetersiz sermayede uyarı

#### 5.2.5. Olaylar Akışı (Events Feed)

**Layout:** Scroll container (son 5 olay)

```
┌─────────────────────────────────┐
│        SON OLAYLAR              │
├─────────────────────────────────┤
│ 📰 Basın özgürlüğü yasası       │
│    mecliste kabul edildi.       │
│    Muhalefet kutluyor.          │
│    (Tur 5)                      │
├─────────────────────────────────┤
│ 🚨 Askeri darbe girişimi!       │
│    Ordu sokağa indi.            │
│    (Tur 4)                      │
├─────────────────────────────────┤
│ 💸 Ekonomik kriz sinyalleri...  │
│    (Tur 3)                      │
└─────────────────────────────────┘
```

**Özellikler:**
- Fade-in animasyonu (yeni olay geldiğinde)
- Renk kodları (normal/kriz/pozitif)
- Tur numarası gösterimi

### 5.3. Sağ Panel - Aksiyon Masası

#### 5.3.1. Başlık

```
┌─────────────────────────────────┐
│      AKSİYON MASASI             │
└─────────────────────────────────┘
```

#### 5.3.2. Politika Kartları Grid

**Layout:** 2x2 Grid (4 kart)

**Kart Yapısı:**
```
┌─────────────────────────────────┐
│ 📰 Basın Özgürlüğü Reformu     │  ← Başlık
├─────────────────────────────────┤
│ Medya kuruluşlarının           │  ← Kısa açıklama
│ bağımsızlığını artıran          │   (2-3 cümle)
│ yeni yasalar...                 │
├─────────────────────────────────┤
│ 💎 25 Politik Sermaye          │  ← Maliyet
│                                  │
│ Baskı Tepkileri:                │  ← Grup etkileri
│ 👥 Sivil: 😊 +15%               │
│ 🎖️ Ordu: 😠 -10%               │
│ 🌍 Uluslararası: 😊 +20%        │
│                                  │
│ [Medya] [Orta Risk]             │  ← Etiketler
└─────────────────────────────────┘
```

**Kart Durumları:**
- **Normal:** Açık mavi arka plan
- **Hover:** Highlight + gölge artışı
- **Seçili:** Koyu mavi border + glow efekti
- **Yetersiz Sermaye:** Gri + disabled

**Etiketler (Badges):**
- **Kategori:** Medya, Yargı, Seçim, Sivil Toplum, Ekonomi
- **Risk:** Düşük/Orta/Yüksek (yeşil/sarı/kırmızı)

#### 5.3.3. Daha Fazla Üret Butonu

**Görünüm:** Yuvarlak buton (+)

```
      ╔═══╗
      ║ + ║  ← Hover: "Daha fazla üret!"
      ╚═══╝
```

**İşlev:**
- Tıklandığında 2 yeni politika üretilir
- AI'dan bağlama uygun politikalar ister
- Grid'e eklenir (scroll edilebilir)

#### 5.3.4. Önizleme Metin Kutusu

```
┌─────────────────────────────────┐
│  📰 Basın Özgürlüğü Reformu    │  ← Başlık
├─────────────────────────────────┤
│  Medya kuruluşlarının           │  ← Tam metin
│  bağımsızlığını artıran yeni    │   (politika detayı)
│  yasalar çıkartılacak. Bu       │
│  reform, basın özgürlüğü        │
│  endeksimizi iyileştirecek ve   │
│  uluslararası itibarımızı       │
│  güçlendirecektir.              │
│                                  │
│  Ancak, askeri kesim bu         │
│  gelişmeden rahatsız olabilir.  │
└─────────────────────────────────┘
```

**Özellikler:**
- Seçili kartın tam açıklaması
- Scroll edilebilir (uzun metinler için)
- Başlangıçta: "Bir politika seçin..."

#### 5.3.5. Manuel Politika Yazma Butonu

```
┌─────────────────────────────────┐
│    📝 Politika Yaz...           │
└─────────────────────────────────┘
```

**İşlev:**
- Tıklandığında textarea açılır
- Önizleme kutusu input moduna geçer

#### 5.3.6. Manuel Yazım Modu

**Görünüm:**
```
┌─────────────────────────────────┐
│ ┌─────────────────────────────┐ │
│ │ Politikanızı buraya yazın... │ │  ← Textarea
│ │                              │ │
│ │                              │ │
│ └─────────────────────────────┘ │
│                                  │
│ [🤖 Geliştir] [✓ Gönder] [× İptal] │  ← Butonlar
└─────────────────────────────────┘
```

**Butonlar:**
1. **🤖 Geliştir:** AI politikayı genişletir (şablon formatına uyarlar)
2. **✓ Gönder:** Politika onaylanır, uygulanır
3. **× İptal:** Kart seçim moduna dön

### 5.4. Popup ve Modal'lar

#### 5.4.1. Kriz Uyarısı Popup

```
┌─────────────────────────────────┐
│  ⚠️ KRİZ UYARISI!                │
├─────────────────────────────────┤
│  🎖️ ORDU                        │
│  Memnuniyet: %15 😡             │
│  Etki: %85                       │
│                                  │
│  ASKERİ DARBE RİSKİ!            │
│                                  │
│  Ne yapmak istersiniz?          │
│                                  │
│  [Taviz Ver]  [Riski Göze Al]  │
└─────────────────────────────────┘
```

**Seçenekler:**
- **Taviz Ver:** Ordunun istediği politika otomatik uygulanır (+0.3 memnuniyet)
- **Riski Göze Al:** %40 şansla darbe gerçekleşir

#### 5.4.2. Darbe/Kriz Sonuç Popup

```
┌─────────────────────────────────┐
│  🚨 ASKERİ DARBE!                │
├─────────────────────────────────┤
│  Ordu yönetime el koydu.        │
│  Anayasa askıya alındı.         │
│  Seçimler ertelendi.            │
│                                  │
│  Sonuçlar:                       │
│  - Liberal Demokrasi: -30%      │
│  - İfade Özgürlüğü: -35%        │
│  - Yargı Bağımsızlığı: -20%     │
│                                  │
│  [Devam Et]  [Oyunu Bitir]      │
└─────────────────────────────────┘
```

#### 5.4.3. Oyun Sonu Ekranı

```
┌─────────────────────────────────┐
│  🎮 OYUN BİTTİ!                 │
├─────────────────────────────────┤
│  20 Tur Tamamlandı              │
│                                  │
│  Başlangıç:                      │
│  - Leviathan: Despotic          │
│  - Özgürlük: 45/100             │
│                                  │
│  Bitiş:                          │
│  - Leviathan: Shackled 🎉      │
│  - Özgürlük: 78/100             │
│                                  │
│  Skorlar:                        │
│  - Denge: 85/100                │
│  - Demokrasi: 78/100            │
│  - Stabilite: 70/100            │
│                                  │
│  TOPLAM: 77/100                 │
│                                  │
│  [Grafiği Gör] [Yeni Oyun]      │
└─────────────────────────────────┘
```

---

## 6. Teknik Mimari

### 6.1. Dosya Yapısı

```
ATLAS-Interaktif/
│
├── data/
│   ├── raw/
│   │   └── V-Dem-CY-Full+Others-v15.csv
│   │
│   └── processed/
│       ├── game/                              (YENİ)
│       │   ├── variable_volatility.json       (Sigma değerleri)
│       │   ├── factor_loadings.json           (Faktör matrisi)
│       │   ├── policy_templates.json          (Politika şablonları)
│       │   ├── stakeholder_profiles.json      (Baskı grupları profilleri)
│       │   └── correlation_matrix.json        (Opsiyonel V2)
│       │
│       └── wgi_vdem_modern/
│           ├── dar_koridor_all_years.json
│           └── factor_scores_1996_2022.csv
│
├── scripts/                                    (Python veri hazırlık)
│   ├── calculate_variable_volatility.py       (YENİ)
│   ├── generate_stakeholder_profiles.py       (YENİ)
│   └── ...
│
├── src/web/
│   ├── pages/
│   │   └── game.html                          (DÜZENLE)
│   │
│   ├── scripts/
│   │   ├── modules/
│   │   │   └── game/                          (YENİ klasör)
│   │   │       ├── game-controller.js         (Ana orchestrator)
│   │   │       ├── game-state.js              (State yönetimi)
│   │   │       ├── policy-manager.js          (Politika kartları)
│   │   │       ├── policy-effects.js          (AI + hesaplama)
│   │   │       ├── factor-calculator.js       (Faktör analizi)
│   │   │       ├── stakeholder-manager.js     (Baskı grupları)
│   │   │       ├── crisis-manager.js          (Kriz sistemi)
│   │   │       ├── trail-renderer.js          (SVG iz)
│   │   │       ├── dashboard.js               (Göstergeler)
│   │   │       └── events-feed.js             (Olaylar)
│   │   │
│   │   └── pages/
│   │       └── freedom-game.js                (Entry point)
│   │
│   └── styles/
│       └── modules/
│           └── freedom-game.css               (Tüm oyun stilleri)
│
└── docs/
    └── FREEDOM_GAME_PRD.md                    (Bu dosya)
```

### 6.2. Teknoloji Stack

**Frontend:**
- Vanilla JavaScript (ES6+ modules)
- HTML5
- CSS3 (Flexbox, Grid, Custom Properties)
- SVG (Trail çizimi)

**AI/Backend:**
- Ollama (Local AI server)
- DeepSeek-v3.1:671b-cloud model
- HTTP/JSON API

**Veri İşleme:**
- Python 3.8+
- pandas, numpy
- scikit-learn (factor-analyzer)

**Veri Kaynakları:**
- V-Dem v15 (CSV)
- Factor scores (CSV/JSON)

### 6.3. Modül Bağımlılıkları

```
GameController (Ana orchestrator)
  ├── GameState (State yönetimi)
  ├── PolicyManager (Politika kartları)
  │   └── API: Ollama
  ├── PolicyEffectsCalculator (AI analizi)
  │   ├── volatilityData (JSON)
  │   └── API: Ollama
  ├── StakeholderManager (Baskı grupları)
  │   └── stakeholderProfiles (JSON)
  ├── CrisisManager (Kriz sistemi)
  ├── FactorCalculator (17→2 dönüşüm)
  │   └── loadingsData (JSON)
  ├── TrailRenderer (SVG)
  ├── Dashboard (UI)
  └── EventsFeed (UI)
```

---

## 7. Veri Yapıları

### 7.1. variable_volatility.json

```json
{
  "v2x_libdem": {
    "sigma": 0.042,
    "description": "Liberal Demokrasi İndeksi",
    "typical_range": [0, 1],
    "mean": 0.45,
    "std_dev": 0.042
  },
  "v2x_partipdem": {
    "sigma": 0.038,
    "description": "Katılımcı Demokrasi İndeksi",
    "typical_range": [0, 1],
    "mean": 0.42,
    "std_dev": 0.038
  },
  // ... 17 değişken
}
```

### 7.2. factor_loadings.json

```json
{
  "loadings": {
    "factor1_state": [
      0.82,  // v2x_libdem
      0.76,  // v2x_partipdem
      0.65,  // v2x_delibdem
      // ... 17 katsayı
    ],
    "factor2_society": [
      0.15,
      0.43,
      0.88,
      // ... 17 katsayı
    ]
  },
  "variables": [
    "v2x_libdem",
    "v2x_partipdem",
    "v2x_delibdem",
    // ... 17 değişken adı
  ],
  "explained_variance": {
    "factor1": 0.68,
    "factor2": 0.24,
    "total": 0.92
  }
}
```

### 7.3. policy_templates.json

```json
{
  "categories": {
    "medya": {
      "name": "Medya ve İfade Özgürlüğü",
      "icon": "📰",
      "templates": [
        {
          "id": "media_reform_1",
          "title": "Basın Özgürlüğü Reformu",
          "description": "Medya üzerindeki devlet kontrolünü azaltma",
          "typical_intensity": "moderate",
          "typical_cost": 25,
          "primary_variables": ["v2mecenefm", "v2x_freexp"],
          "stakeholder_reactions": {
            "civil_society": 0.15,
            "military": -0.10,
            "elite": -0.05,
            "international": 0.20,
            "religious": 0.0
          },
          "example_text": "Medya kuruluşlarının bağımsızlığını artıran yeni yasalar çıkartın. Sansür mekanizmaları kaldırılacak."
        },
        {
          "id": "media_censorship_1",
          "title": "Sansür Mekanizması",
          "description": "Muhalif medyayı susturma",
          "typical_intensity": "radical",
          "typical_cost": 50,
          "primary_variables": ["v2mecenefm", "v2cseeorgs"],
          "stakeholder_reactions": {
            "civil_society": -0.20,
            "military": 0.15,
            "elite": 0.05,
            "international": -0.25,
            "religious": 0.0
          },
          "example_text": "Muhalif medya kuruluşlarını kapatın. Devlet kontrolündeki medya güçlendirilecek."
        }
      ]
    },
    "yargı": {
      "name": "Yargı ve Hukuk",
      "icon": "⚖️",
      "templates": [
        {
          "id": "judiciary_independence_1",
          "title": "Yargı Bağımsızlığı Reformu",
          "description": "Yargının siyasi etkilerden arındırılması",
          "typical_intensity": "moderate",
          "typical_cost": 25,
          "primary_variables": ["v2juhcind", "v2juaccnt", "v2x_rule"],
          "stakeholder_reactions": {
            "civil_society": 0.18,
            "military": -0.12,
            "elite": -0.08,
            "international": 0.22,
            "religious": 0.0
          },
          "example_text": "Yargı atamalarında siyasi müdahaleyi engelleyen yasalar çıkartın."
        }
      ]
    },
    "seçim": {
      "name": "Seçim ve Katılım",
      "icon": "🗳️",
      "templates": [
        {
          "id": "electoral_reform_1",
          "title": "Seçim Reformu",
          "description": "Adil ve şeffaf seçim sistemi",
          "typical_intensity": "moderate",
          "typical_cost": 30,
          "primary_variables": ["v2x_elecreg", "v2x_elecoff", "v2x_partipdem"],
          "stakeholder_reactions": {
            "civil_society": 0.20,
            "military": -0.05,
            "elite": -0.10,
            "international": 0.18,
            "religious": 0.05
          },
          "example_text": "Bağımsız seçim kurulu oluşturun. Muhalefete eşit şartlar sağlayın."
        }
      ]
    },
    "sivil_toplum": {
      "name": "Sivil Toplum",
      "icon": "👥",
      "templates": [
        {
          "id": "civil_society_expansion_1",
          "title": "STK Özgürlüklerini Genişletme",
          "description": "Sivil toplum kuruluşlarına alan açma",
          "typical_intensity": "soft",
          "typical_cost": 15,
          "primary_variables": ["v2cseeorgs", "v2x_cspart", "v2cscnsult"],
          "stakeholder_reactions": {
            "civil_society": 0.25,
            "military": -0.08,
            "elite": -0.05,
            "international": 0.15,
            "religious": 0.10
          },
          "example_text": "STK'lara yasal koruma sağlayın. Örgütlenme özgürlüğünü güçlendirin."
        }
      ]
    },
    "ekonomi": {
      "name": "Ekonomi ve Eşitlik",
      "icon": "💰",
      "templates": [
        {
          "id": "redistribution_1",
          "title": "Gelir Dağılımı Reformu",
          "description": "Zenginlik eşitsizliğini azaltma",
          "typical_intensity": "moderate",
          "typical_cost": 25,
          "primary_variables": ["v2x_egaldem"],
          "stakeholder_reactions": {
            "civil_society": 0.15,
            "military": 0.0,
            "elite": -0.20,
            "international": 0.10,
            "religious": 0.05
          },
          "example_text": "Artan oranlı vergi sistemi getirin. Sosyal yardımları artırın."
        }
      ]
    }
  }
}
```

**Toplam:** 5-6 kategori × 5-6 şablon = ~30 politika şablonu

### 7.4. stakeholder_profiles.json

```json
{
  "Turkey": {
    "1985": {
      "military": { "influence": 0.85, "satisfaction": 0.5 },
      "elite": { "influence": 0.70, "satisfaction": 0.5 },
      "civil_society": { "influence": 0.35, "satisfaction": 0.5 },
      "religious": { "influence": 0.50, "satisfaction": 0.5 },
      "international": { "influence": 0.60, "satisfaction": 0.5 }
    },
    "2000": {
      "military": { "influence": 0.75, "satisfaction": 0.5 },
      "elite": { "influence": 0.75, "satisfaction": 0.5 },
      "civil_society": { "influence": 0.50, "satisfaction": 0.5 },
      "religious": { "influence": 0.60, "satisfaction": 0.5 },
      "international": { "influence": 0.70, "satisfaction": 0.5 }
    }
  },
  "Norway": {
    "2020": {
      "military": { "influence": 0.20, "satisfaction": 0.5 },
      "elite": { "influence": 0.60, "satisfaction": 0.5 },
      "civil_society": { "influence": 0.85, "satisfaction": 0.5 },
      "religious": { "influence": 0.15, "satisfaction": 0.5 },
      "international": { "influence": 0.75, "satisfaction": 0.5 }
    }
  }
  // ... diğer ülkeler
}
```

**Not:** Etki seviyeleri V-Dem değişkenlerinden tahmin edilebilir:
- Ordu → `v2csstruc_1` (Güvenlik gücü)
- Elitler → `v2x_corr` (Yolsuzluk, ters oran)
- Sivil Toplum → `v2x_cspart`
- Dini → Ülkeye özgü (manuel)
- Uluslararası → Batı entegrasyonu (AB, NATO üyeliği)

### 7.5. Game State Object (Runtime)

```javascript
const gameState = {
  // Başlangıç Bilgileri
  initialCountry: "Turkey",
  initialYear: 1985,
  startPosition: {
    statePower: 0.45,
    societyPower: 0.38
  },
  startVariables: { /* 17 değişkenin başlangıç değerleri */ },

  // Mevcut Durum
  currentYear: 1987,        // Dinamik
  currentTurn: 3,
  maxTurns: 20,

  // Politik Sermaye
  politicalCapital: {
    current: 65,
    max: 100,
    regeneration: 20
  },

  // Faktör Skorları
  currentFactors: {
    statePower: 0.48,       // Dinamik
    societyPower: 0.42
  },

  // 17 Değişken Değerleri
  variables: {
    v2x_libdem: 0.56,       // Dinamik
    v2x_partipdem: 0.50,
    // ... 17 değişken
  },

  // Baskı Grupları
  stakeholders: {
    military: {
      influence: 0.85,      // Sabit (ülkeye özgü)
      satisfaction: 0.40    // Dinamik
    },
    elite: {
      influence: 0.70,
      satisfaction: 0.80
    },
    civil_society: {
      influence: 0.40,
      satisfaction: 0.65
    },
    religious: {
      influence: 0.50,
      satisfaction: 0.60
    },
    international: {
      influence: 0.60,
      satisfaction: 0.75
    }
  },

  // Trail (Gezilen Yol)
  trail: [
    { year: 1985, statePower: 0.45, societyPower: 0.38 },
    { year: 1986, statePower: 0.46, societyPower: 0.39 },
    { year: 1987, statePower: 0.48, societyPower: 0.42 }
  ],

  // Politika Tarihçesi
  policyHistory: [
    {
      turn: 1,
      year: 1985,
      policyText: "Basın özgürlüğü yasası çıkartıldı",
      cost: 25,
      effects: { /* değişken değişimleri */ },
      stakeholderReactions: { /* tepkiler */ }
    },
    // ...
  ],

  // Olaylar
  events: [
    {
      turn: 2,
      type: "news",
      text: "Muhalefet sokak protestoları düzenliyor"
    },
    {
      turn: 2,
      type: "crisis",
      text: "🚨 Askeri darbe girişimi!"
    }
  ],

  // Kriz Durumu
  activeCrisis: null,  // veya { type: "military_coup", ... }

  // Oyun Durumu
  gameStatus: "active",  // "active", "completed", "game_over"
  finalScore: null
};
```

---

## 8. AI Entegrasyonu

### 8.1. Ollama API Yapılandırması

**Endpoint:** `http://localhost:11434/api/generate`
**Model:** `deepseek-v3.1:671b-cloud`
**Mod:** Stream-based (JSON lines)

**Genel Ayarlar:**
```javascript
{
  temperature: 0.7,    // Dengeli yaratıcılık
  top_p: 0.9,
  stream: true
}
```

### 8.2. AI Kullanım Senaryoları

#### 8.2.1. Politika Üretimi

**Amaç:** Şablondan bağlama uygun politika metni üretmek

**Prompt:**
```javascript
const generatePolicyPrompt = (template, context) => `
Sen bir politik strateji danışmanısın.

Bağlam:
- Ülke: ${context.country}
- Yıl: ${context.year}
- Mevcut Leviathan Tipi: ${context.leviathanType}
- Özgürlük Skoru: ${context.freedomScore}/100

Politika Şablonu:
- Kategori: ${template.category}
- Başlık: ${template.title}
- Örnek: ${template.example_text}

Bu şablona dayanarak, yukarıdaki bağlamla uyumlu, kısa (2-3 cümle) bir politik aksiyon öner.

KURALLAR:
1. Sadece politika metnini yaz (açıklama yok)
2. Türkçe kullan
3. Gerçekçi ol (ülke ve yıl bağlamına uy)
4. 2-3 cümle ile sınırla

Politika:
`;

// Beklenen çıktı:
"Basın üzerindeki sansür mekanizmalarını kaldıran yeni bir yasa tasarısı hazırlayın. Medya kuruluşlarının lisans süreçleri basitleştirilecek ve muhalif yayınlara yasal koruma sağlanacak."
```

**İşlem:**
1. Template'ten rastgele seç
2. AI'ya gönder
3. Stream response al
4. Kart oluştur

#### 8.2.2. Politika Analizi (En Kritik!)

**Amaç:** Kullanıcının seçtiği/yazdığı politikayı analiz et

**Prompt:**
```javascript
const analyzePolicyPrompt = (policyText, context) => `
Sen bir V-Dem veri analisti ve politik bilimcisin.

Politika: "${policyText}"

Bağlam:
- Ülke: ${context.country}
- Yıl: ${context.year}
- Mevcut Faktörler: Devlet Gücü=${context.statePower}, Toplum Gücü=${context.societyPower}

GÖREVİN:
Aşağıdaki 17 V-Dem değişkeninden bu politika HANGİLERİNİ etkiler? (Maksimum 5 değişken seç)

DEĞİŞKENLER:
1. v2x_libdem (Liberal Demokrasi İndeksi, 0-1)
2. v2x_partipdem (Katılımcı Demokrasi İndeksi, 0-1)
3. v2x_delibdem (Müzakereci Demokrasi İndeksi, 0-1)
4. v2x_egaldem (Eşitlikçi Demokrasi İndeksi, 0-1)
5. v2x_freexp (İfade ve İnanç Özgürlüğü, 0-1)
6. v2mecenefm (Medya Sansürü Çabaları, 0-4, yüksek=kötü)
7. v2x_cspart (Sivil Toplum Katılımı, 0-1)
8. v2cseeorgs (Örgütlenme Özgürlüğü, 0-4)
9. v2cscnsult (Sivil Toplum Danışması, 0-4)
10. v2x_elecreg (Seçim Rejimi, 0-1)
11. v2x_elecoff (Seçimle İşbaşına Gelme, 0-1)
12. v2juhcind (Yargı Bağımsızlığı, 0-4)
13. v2juaccnt (Hesap Verilebilirlik, 0-4)
14. v2x_corr (Politik Yolsuzluk, 0-1, yüksek=kötü)
15. v2x_rule (Hukuk Üstünlüğü, 0-1)
16. v2xcs_ccsi (Core Civil Society Index, 0-1)
17. v2x_frassoc_thick (Association Freedom, 0-1)

Her değişken için belirle:
- direction: 1 (artış) veya -1 (azalış)
- intensity: "Soft", "Moderate", "Radical", veya "Extreme"
- reasoning: Kısa açıklama (1 cümle)

Ayrıca 5 baskı grubunun tepkisini belirle (-1.0 ~ +1.0):
- military (Ordu)
- elite (Ekonomik Seçkinler)
- civil_society (Sivil Toplum)
- religious (Dini Kurumlar)
- international (Uluslararası Toplum)

Ve politik sermaye maliyetini belirle: 10, 25, 50, veya 80

SADECE JSON formatında dön:
{
  "variables": {
    "değişken_adı": {
      "direction": 1 or -1,
      "intensity": "Soft"|"Moderate"|"Radical"|"Extreme",
      "reasoning": "..."
    }
  },
  "stakeholders": {
    "military": -0.15,
    "elite": 0.05,
    ...
  },
  "political_cost": 25
}
`;

// Beklenen JSON çıktı:
{
  "variables": {
    "v2x_freexp": {
      "direction": 1,
      "intensity": "Moderate",
      "reasoning": "Basın özgürlüğü artışı ifade özgürlüğünü güçlendirir"
    },
    "v2mecenefm": {
      "direction": -1,
      "intensity": "Moderate",
      "reasoning": "Sansür mekanizmaları azalır"
    },
    "v2x_libdem": {
      "direction": 1,
      "intensity": "Soft",
      "reasoning": "Liberal demokrasi genel olarak iyileşir"
    }
  },
  "stakeholders": {
    "military": -0.10,
    "elite": -0.05,
    "civil_society": 0.15,
    "religious": 0.0,
    "international": 0.20
  },
  "political_cost": 25
}
```

**İşlem:**
1. AI'ya prompt gönder
2. Stream JSON al
3. Parse et
4. Sigma değerleriyle çarp
5. State'i güncelle

**Hata Yönetimi:**
- JSON parse hatası → Fallback: Manuel default değerler
- AI yanıt yok → Retry 1 kere, yoksa hata mesajı

#### 8.2.3. Manuel Politika Geliştirme

**Amaç:** Kullanıcının yazdığı kısa metni şablona uygun hale getir

**Prompt:**
```javascript
const enhancePolicyPrompt = (userText, context) => `
Sen bir politik metin editörüsün.

Kullanıcının yazdığı kısa not: "${userText}"

Bağlam: ${context.country}, ${context.year}

Bu notu 2-3 cümlelik profesyonel bir politika metnine dönüştür.
Gerçekçi ve uygulanabilir olsun.

Politika:
`;

// Kullanıcı: "medyayı serbest bırak"
// AI: "Medya üzerindeki devlet kontrolünü kaldıran reform yasası çıkartın. Basın özgürlüğü koruma altına alınacak."
```

#### 8.2.4. Olay/Haber Üretimi

**Amaç:** Politika uygulandıktan sonra gazete manşetleri gibi olaylar üret

**Prompt:**
```javascript
const generateEventsPrompt = (policyText, effects, context) => `
Sen bir haber editörüsün.

Politika uygulandı: "${policyText}"

Etkilenen alanlar: ${Object.keys(effects).join(', ')}

${context.country}, ${context.year} yılı

Bu politikanın uygulanması sonrası çıkabilecek 2 haber başlığı yaz.
Kısa, gazete manşeti tarzında.

Her satırda bir başlık:
`;

// Beklenen çıktı:
// Basın Özgürlüğü Yasası Meclisten Geçti! Muhalefet Memnun
// Ordu Bildiri Yayınladı: "Reformlar Devlet Güvenliğini Tehdit Ediyor"
```

### 8.3. AI Performans Optimizasyonu

**Sorun:** AI yanıtı yavaş olabilir (3-5 saniye)

**Çözümler:**
1. **Stream Mode:** UI'da canlı yazma efekti (typing animation)
2. **Loading Spinner:** "Analiz ediliyor..." mesajı
3. **Cache:** Aynı şablonlardan üretilen politikalar cache'lenebilir
4. **Async/Parallel:** Birden fazla AI işlemi paralel çalıştır (politika üretimi + analiz)

**Fallback:**
- Ollama bağlantı hatası → Kullanıcıya mesaj + Retry butonu
- AI JSON hatası → Default manual değerler kullan

---

## 9. Oyun Akışı

### 9.1. Detaylı Oyun Döngüsü

**Tur Başlangıcı:**
```
1. Politik sermaye yenilenir (+20)
   gameState.politicalCapital.current += 20;
   gameState.politicalCapital.current = Math.min(
     gameState.politicalCapital.current,
     gameState.politicalCapital.max
   );

2. Dashboard güncellenir
   dashboard.update(gameState);

3. Baskı grupları paneli güncellenir
   stakeholderManager.render(gameState.stakeholders);

4. Eğer yeni tursa, yeni politikalar üretilir
   if (isNewTurn) {
     policyManager.generatePolicies(4, context);
   }
```

**Politika Seçimi:**
```
1. Kullanıcı kart tıklar VEYA manuel yazar

2. Önizleme kutusu güncellenir
   policyPreview.update(selectedPolicy);

3. "Gönder" butonu aktif olur
   submitBtn.disabled = false;

4. Kullanıcı "Gönder"e tıklar
```

**Politika Uygulama:**
```
1. Politik sermaye kontrolü
   if (gameState.politicalCapital.current < policyCost) {
     alert("Yetersiz politik sermaye!");
     return;
   }

2. Loading state
   UI.showLoading("Politika analiz ediliyor...");

3. AI analizi (paralel işlemler)
   const [aiAnalysis, newsEvents] = await Promise.all([
     policyEffects.analyzePolicyWithAI(policyText),
     generateEvents(policyText)
   ]);

4. Değişken değişimlerini hesapla
   const variableChanges = policyEffects.calculateVariableChanges(aiAnalysis);

5. State güncelleme
   a) Politik sermaye düş
      gameState.politicalCapital.current -= policyCost;

   b) Değişkenleri güncelle
      for (const [variable, change] of Object.entries(variableChanges)) {
        gameState.variables[variable] += change;
        // Clamp (değerler aralık dışına çıkmasın)
        gameState.variables[variable] = clamp(
          gameState.variables[variable],
          min, max
        );
      }

   c) Baskı gruplarını güncelle
      for (const [group, reaction] of Object.entries(aiAnalysis.stakeholders)) {
        gameState.stakeholders[group].satisfaction += reaction;
        gameState.stakeholders[group].satisfaction = clamp(
          gameState.stakeholders[group].satisfaction,
          0, 1
        );
      }

   d) Tarihçeye ekle
      gameState.policyHistory.push({
        turn: gameState.currentTurn,
        year: gameState.currentYear,
        policyText,
        cost: policyCost,
        effects: variableChanges,
        stakeholderReactions: aiAnalysis.stakeholders
      });

6. Faktör analizi - yeni pozisyon hesapla
   const newPosition = factorCalculator.calculateFactors(gameState.variables);

7. Gerçekçilik kısıtları uygula
   newPosition = applyRealisticConstraints(
     gameState.currentFactors,
     newPosition
   );

8. Animasyon
   await trailRenderer.animateTransition(
     gameState.currentFactors,
     newPosition,
     800  // ms
   );

9. State güncelle
   gameState.currentFactors = newPosition;
   gameState.trail.push({
     year: gameState.currentYear,
     ...newPosition
   });

10. Olayları göster
    newsEvents.forEach(event => {
      eventsFeed.addEvent(event);
      gameState.events.push({
        turn: gameState.currentTurn,
        type: "news",
        text: event
      });
    });

11. Kriz kontrolü
    const crisis = crisisManager.checkForCrisis(gameState.stakeholders);
    if (crisis) {
      await handleCrisis(crisis);
    }

12. Dashboard güncellemesi
    dashboard.update(gameState);

13. UI cleanup
    UI.hideLoading();
```

**Kriz İşleme:**
```
async function handleCrisis(crisis) {
  // 1. Popup göster
  const userChoice = await crisisPopup.show(crisis);

  if (userChoice === "concede") {
    // Taviz ver
    gameState.stakeholders[crisis.triggerGroup].satisfaction += 0.3;
    eventsFeed.addEvent(`Hükümet ${crisis.triggerGroup} grupuna taviz verdi.`);
  } else {
    // Riski göze al
    const roll = Math.random();

    if (roll < crisis.probability) {
      // Kriz gerçekleşti!
      applyCrisisEffects(crisis);

      // Game over kontrolü
      const gameOverRoll = Math.random();
      if (gameOverRoll < crisis.game_over_risk) {
        endGame("crisis");
        return;
      }
    } else {
      eventsFeed.addEvent("Kriz atlatıldı! Şanslısınız.");
    }
  }
}
```

**Tur Sonu:**
```
1. Tur ilerlet
   gameState.currentTurn++;
   gameState.currentYear++;

2. Maksimum tur kontrolü
   if (gameState.currentTurn > gameState.maxTurns) {
     endGame("completed");
     return;
   }

3. Yeni politikalar üret
   await policyManager.generatePolicies(4, context);

4. UI güncelle
   dashboard.update(gameState);
```

**Oyun Sonu:**
```
function endGame(reason) {
  gameState.gameStatus = reason;  // "completed", "crisis", "game_over"

  // Skor hesapla
  gameState.finalScore = calculateFinalScore(gameState);

  // Oyun sonu ekranı göster
  endGameScreen.show(gameState);
}

function calculateFinalScore(state) {
  // Stabilite: Krizden kaçınma
  const stabilityScore = (1 - (crisisCount / maxCrises)) * 100;

  // Demokrasi: Dar koridorda kalma
  const democracyScore = calculateDemocracyScore(state.trail);

  // Denge: Baskı gruplarını dengede tutma
  const balanceScore = calculateBalanceScore(state.stakeholders);

  return {
    stability: stabilityScore,
    democracy: democracyScore,
    balance: balanceScore,
    total: (stabilityScore + democracyScore + balanceScore) / 3
  };
}
```

---

## 10. Uygulama Planı

### 10.1. Sprint Yapısı

**Toplam Süre:** 5-6 gün (40-48 saat)

### Sprint 1: Veri Hazırlığı (1.5-2 gün) - GÜNCELLENMIŞ

**Hedef:** Gelişmiş 500+ V-Dem sistemi için tüm JSON dosyalarını hazırla

**Görevler:**

1. **`calculate_all_variable_volatility.py`** (3 saat) - YENİ
   ```python
   # V-Dem CSV'sinden TÜM 500+ değişkenin sigma değerlerini hesapla
   # Her değişken için: sigma, min, max
   # Output: all_variable_volatility.json (~100 KB)
   ```

2. **`calculate_correlation_matrix.py`** (3 saat) - YENİ
   ```python
   # 500+ değişken × 17 ana değişken korelasyon matrisi
   # Sadece |r| > 0.3 olanları kaydet
   # Output: correlation_matrix.json (~300 KB)
   ```

3. **`generate_initial_variables.py`** (2 saat) - YENİ
   ```python
   # Her ülke-yıl için 17 ana değişkenin başlangıç değerleri
   # Ana sayfadaki faktör skorları ile tutarlılık kontrolü
   # Output: initial_variables_by_country_year.json
   ```

4. **`generate_stakeholder_profiles.py`** (2 saat)
   ```python
   # Ülke ve yıllara göre baskı grubu etki seviyelerini belirle
   # V-Dem değişkenlerinden tahmin et
   # Output: stakeholder_profiles.json
   ```

5. **`extract_factor_loadings.py`** (2 saat)
   ```python
   # Mevcut faktör analizi sonuçlarından 17→2 matrisini çıkar
   # VEYA scikit-learn ile yeniden hesapla
   # Output: factor_loadings.json
   ```

6. **`policy_templates.json`** (3 saat)
   - Manuel hazırlama
   - 5-6 kategori, 5-6 şablon/kategori = 30 şablon
   - Her şablon için stakeholder_reactions manuel belirle
   - Örnek AI çıktıları ekle

**Teslim Edilecekler:**
- ✅ `data/processed/game/all_variable_volatility.json` (500+ değişken)
- ✅ `data/processed/game/correlation_matrix.json` (500+ × 17)
- ✅ `data/processed/game/initial_variables_by_country_year.json` (17 değişken başlangıçları)
- ✅ `data/processed/game/stakeholder_profiles.json`
- ✅ `data/processed/game/factor_loadings.json`
- ✅ `data/processed/game/policy_templates.json`

**Toplam:** 6 JSON dosyası (+ Python scriptleri)

---

### Sprint 2: UI Temel Yapısı (1 gün)

**Hedef:** HTML ve CSS hazır

**Görevler:**

1. **`freedom-game.css`** (4 saat)
   - Panel layout (65%-35%)
   - Grafik container (relative + SVG overlay)
   - Dashboard widgets (grid)
   - Baskı grupları paneli (liste + progress bars)
   - Politik sermaye göstergesi
   - Olaylar feed (scroll container)
   - Politika kartları grid
   - Önizleme kutusu
   - Manuel yazım modu
   - Popup/modal stilleri
   - Responsive (tablet)

2. **`game.html`** (3 saat)
   - Mevcut yapıyı koru
   - "Oyuna Başla" butonu event hazırlığı
   - `game-active-view` div (başlangıçta hidden)
   - Sol panel HTML (grafik, dashboard, baskı grupları, olaylar)
   - Sağ panel HTML (başlık, kartlar grid, butonlar, önizleme)
   - Popup HTML (kriz uyarısı, oyun sonu)

3. **`main.css` güncelleme** (10 dk)
   - Import ekle: `@import 'modules/freedom-game.css';`

**Teslim Edilecekler:**
- ✅ `src/web/styles/modules/freedom-game.css`
- ✅ `src/web/pages/game.html` (güncellenmiş)
- ✅ Tarayıcıda görsel kontrol (statik HTML)

---

### Sprint 3: Oyun Motoru Core (1.5 gün)

**Hedef:** JavaScript mantık katmanı

**Görevler:**

1. **`game-state.js`** (2 saat)
   ```javascript
   // Global state objesi
   // State güncelleme fonksiyonları
   // Getter/setter'lar
   ```

2. **`policy-effects.js`** (3 saat)
   ```javascript
   class PolicyEffectsCalculator {
     constructor(volatilityData) { ... }
     async analyzePolicyWithAI(policyText) { ... }
     calculateVariableChanges(aiAnalysis) { ... }
     applyRealisticConstraints(oldPos, newPos) { ... }
   }
   ```
   - AI entegrasyonu (Ollama)
   - JSON parse
   - Sigma çarpımı
   - Hata yönetimi

3. **`factor-calculator.js`** (1.5 saat)
   ```javascript
   class FactorCalculator {
     constructor(loadingsData) { ... }
     calculateFactors(variables) { ... }
     // Matris çarpımı (17 değişken → 2 faktör)
   }
   ```

4. **`stakeholder-manager.js`** (2 saat)
   ```javascript
   class StakeholderManager {
     constructor(profilesData) { ... }
     initialize(country, year) { ... }
     updateSatisfaction(reactions) { ... }
     render(stakeholders) { ... }  // DOM güncelleme
   }
   ```

5. **`crisis-manager.js`** (2 saat)
   ```javascript
   class CrisisManager {
     checkForCrisis(stakeholders) { ... }
     applyCrisisEffects(crisis, gameState) { ... }
   }
   ```

6. **`game-controller.js`** (4 saat)
   ```javascript
   class GameController {
     async initialize() { ... }
     async submitPolicy(policyText) { ... }
     async updateVisualization(newPosition) { ... }
     async generateEvents(policyText, changes) { ... }
     advanceTurn() { ... }
     endGame(reason) { ... }
   }
   ```
   - Ana orchestrator
   - Tüm modülleri entegre eder

**Teslim Edilecekler:**
- ✅ 6 JavaScript modülü
- ✅ Test edilmiş AI entegrasyonu (console.log)
- ✅ Faktör analizi doğrulaması

---

### Sprint 4: UI Bileşenleri (1 gün)

**Hedef:** DOM manipülasyonu ve animasyonlar

**Görevler:**

1. **`policy-manager.js`** (3 saat)
   ```javascript
   class PolicyManager {
     async loadTemplates() { ... }
     async generatePolicies(count, context) { ... }
     renderCards(policies) { ... }
     selectPolicy(policyId) { ... }
     async enhancePolicyWithAI(userText) { ... }
   }
   ```
   - AI politika üretimi
   - Kart render (DOM creation)
   - Seçim event'leri
   - Manuel yazım modu toggle

2. **`trail-renderer.js`** (2 saat)
   ```javascript
   class TrailRenderer {
     constructor(svgElement) { ... }
     addPoint(x, y) { ... }
     animateTransition(oldPos, newPos, duration) { ... }
     clear() { ... }
   }
   ```
   - SVG path çizimi
   - Smooth animasyon (requestAnimationFrame veya CSS transition)
   - Opacity gradient

3. **`dashboard.js`** (1.5 saat)
   ```javascript
   class GameDashboard {
     update(gameState) { ... }
     // Yıl, tur, özgürlük skoru, leviathan tipi
     // Sayı animasyonu (CountUp effect)
   }
   ```

4. **`events-feed.js`** (1.5 saat)
   ```javascript
   class EventsFeed {
     addEvent(eventText, eventType) { ... }
     clear() { ... }
     // Fade-in animasyon
     // Scroll yönetimi
   }
   ```

**Teslim Edilecekler:**
- ✅ 4 UI modülü
- ✅ Animasyonlar test edilmiş
- ✅ Politika kartları render ediliyor

---

### Sprint 5: Entegrasyon ve Test (1 gün)

**Hedef:** Her şey bir arada çalışsın

**Görevler:**

1. **`freedom-game.js`** (2 saat)
   ```javascript
   // Entry point
   // Tüm modülleri import et
   // "Oyuna Başla" event listener
   // GameController initialize
   ```

2. **HTML'e script ekleme** (10 dk)
   ```html
   <script type="module" src="/src/web/scripts/pages/freedom-game.js"></script>
   ```

3. **End-to-end test** (3 saat)
   - Oyun başlatma
   - Politika seçme
   - AI analizi
   - Grafik güncelleme
   - Baskı grupları
   - Kriz tetikleme
   - Tur ilerletme
   - Oyun bitirme

4. **Bug fix ve ince ayarlar** (3 saat)
   - Console error'ları temizle
   - Animasyon timing'leri ayarla
   - Loading state'leri ekle
   - Hata mesajları kullanıcı dostu yap

**Teslim Edilecekler:**
- ✅ Çalışan oyun (MVP)
- ✅ Temiz console (hata yok)
- ✅ Kullanıcı testi (1-2 tur oynanabilir)

---

### Sprint 6: İyileştirmeler (0.5 gün - Opsiyonel)

**Görevler:**

1. **Random Olaylar Sistemi** (1 saat)
   - `random-events.js`
   - Her turda %15 şans

2. **Oyun Sonu Ekranı İyileştirmesi** (1 saat)
   - Detaylı skor gösterimi
   - Trail grafiği büyük görünüm
   - Karşılaştırma (başlangıç vs bitiş)

3. **Korelasyon Matrisi** (Gelecek V2 - atlayabiliriz)

4. **Performans Optimizasyonu** (1 saat)
   - AI cache
   - Lazy loading
   - Debounce

**Teslim Edilecekler:**
- ⭕ Opsiyonel özellikler
- ⭕ Dokümantasyon güncellemeleri

---

## 11. Başarı Kriterleri

### 11.1. Minimum Viable Product (MVP)

**Zorunlu Özellikler:**

- ✅ **Oyun Başlatma:** Kullanıcı ülke ve yıl seçerek oyunu başlatabilir
- ✅ **Politika Seçimi:** 4 AI-üretilmiş politika kartı görüntülenir
- ✅ **AI Analizi:** Seçilen politika AI tarafından analiz edilir (değişken + baskı tepkileri)
- ✅ **Grafik Güncelleme:** Dar koridor grafiğinde pozisyon değişir (animasyonlu)
- ✅ **Trail Sistemi:** Gezilen yol SVG ile çizilir
- ✅ **Dashboard:** Yıl, tur, özgürlük skoru gösterilir
- ✅ **Baskı Grupları:** 5 grup memnuniyeti gösterilir ve güncellenir
- ✅ **Politik Sermaye:** Maliyet sistemi çalışır
- ✅ **Tur Sistemi:** 20 tur oynanabilir
- ✅ **Kriz Mekaniği:** En az 1 kriz türü tetiklenebilir

**Kabul Kriterleri:**
- Oyun baştan sona oynanabilir (20 tur)
- AI yanıtları tutarlı
- Grafik animasyonları smooth (30+ fps)
- Hata yok (console temiz)

### 11.2. İdeal Durum Özellikleri

**İyi Olursa:**

- ✅ **Manuel Politika Yazma:** Kullanıcı kendi politikasını yazabilir
- ✅ **AI Geliştirme:** Manuel yazılan politika AI ile genişletilebilir
- ✅ **Olaylar Feed:** AI-üretilmiş haberler gösterilir
- ✅ **Politika Kategorileri:** Etiketler ve renkler
- ✅ **Kriz Çeşitliliği:** 5 farklı kriz türü
- ✅ **Responsive Tasarım:** Tablet uyumlu (1024px+)
- ✅ **Oyun Sonu Ekranı:** Detaylı skor ve karşılaştırma

### 11.3. Performans Kriterleri

**Teknik Başarı Metrikleri:**

- **AI Yanıt Süresi:** < 5 saniye (politika analizi)
- **Animasyon FPS:** > 30 fps (trail çizimi)
- **Sayfa Yükleme:** < 3 saniye (tüm JSON'lar)
- **Bellek Kullanımı:** < 200 MB (20 tur boyunca)

### 11.4. Kullanıcı Deneyimi Kriterleri

**UX Başarı Göstergeleri:**

- Kullanıcı 1-2 dk içinde oyunu anlayabiliyor
- Politika kartları net ve okunabilir
- Baskı grupları paneli anlaşılır
- Kriz popup'ları bilgilendirici
- Hata mesajları kullanıcı dostu

---

## 12. Risk Yönetimi

### 12.1. Teknik Riskler

| Risk | Olasılık | Etki | Azaltma Stratejisi |
|------|----------|------|-------------------|
| **AI yavaş yanıt** | Yüksek | Orta | Stream UI + Loading spinner + Retry mekanizması |
| **AI JSON parse hatası** | Orta | Yüksek | Try-catch + Fallback default değerler + Strict JSON schema |
| **Sigma verisi eksik** | Düşük | Orta | Fallback default sigma = 0.05 |
| **Faktör matrisi yok** | Düşük | Yüksek | Basitleştirilmiş lineer formül kullan |
| **Grafik sınır dışına çıkma** | Orta | Düşük | Clamp fonksiyonu (mevcut game.js'ten) |
| **SVG performans sorunu** | Düşük | Düşük | Path basitleştirme, maksimum 20 nokta |
| **Bellek sızıntısı** | Düşük | Orta | Event listener cleanup + State reset |

### 12.2. İçerik Riskleri

| Risk | Olasılık | Etki | Azaltma Stratejisi |
|------|----------|------|-------------------|
| **Politika şablonları yetersiz** | Orta | Yüksek | En az 30 çeşitli şablon hazırla + AI variasyon |
| **Baskı grubu tepkileri tutarsız** | Orta | Orta | Template'lerde örnek değerler + AI validation |
| **Kriz tetikleme çok sık** | Düşük | Orta | Threshold ayarla (< 0.2 + > 0.6) + Probability düşür |

### 12.3. UX Riskleri

| Risk | Olasılık | Etki | Azaltma Stratejisi |
|------|----------|------|-------------------|
| **Oyun çok karmaşık** | Orta | Yüksek | Tutorial popup ekle + Tooltip'ler |
| **Baskı grupları kafası karıştırıcı** | Orta | Orta | Her grup için açıklama tooltip + Görsel göstergeler |
| **Politik sermaye sistemi anlaşılmaz** | Düşük | Orta | Maliyet her kartta belirgin gösterilsin |

### 12.4. Acil Durum Planları

**Senaryo 1: Ollama Bağlantı Hatası**
```
Kullanıcıya mesaj:
"AI servisi yanıt vermiyor. Lütfen Ollama'nın çalıştığından emin olun.
[Yeniden Dene] [Manuel Mod]"

Manuel Mod: Kullanıcı politika yazar, AI olmadan default etkiler uygulanır.
```

**Senaryo 2: Faktör Matrisi Yok**
```
Fallback:
// Basit lineer formül
statePower = avg([v2x_libdem, v2x_rule, v2juhcind, ...])
societyPower = avg([v2x_cspart, v2cseeorgs, ...])
```

**Senaryo 3: JSON Yükleme Hatası**
```
alert("Oyun verileri yüklenemedi. Lütfen internet bağlantınızı kontrol edin.");
// Yeniden yükleme butonu
```

---

## 13. Gelecek Özellikler (V2 Backlog)

### 13.1. Korelasyon Yayılımı
- 17 değişkenden tüm 531 V-Dem değişkenine etki yayılımı
- Daha derin simülasyon

### 13.2. Zaman Gecikmesi
- Politikaların 1-3 tur sonra etkisi
- Kısa/orta/uzun vadeli etkiler

### 13.3. Tarihsel Kalibrasyon
- Benzer geçmiş politikaların gerçek etkilerini kullan
- V-Dem tarihsel verisiyle cross-validation

### 13.4. Multiplayer Mode
- Birden fazla oyuncu aynı ülkeyi yönetir
- Koalisyon kurma
- Rekabet/işbirliği

### 13.5. Senaryo Editörü
- Kullanıcılar kendi krizlerini oluşturabilir
- Community-generated content

### 13.6. Leaderboard
- En iyi oyuncular (dar koridorda en uzun süre kalma)
- Global skor tablosu
- Achievement sistemi

### 13.7. Zorluk Modları
- **Kolay:** Sigma çarpanı 0.5x, kriz şansı düşük
- **Orta:** Normal
- **Zor:** Sigma çarpanı 1.5x, kriz şansı yüksek, politik sermaye az

### 13.8. Tarihsel Doğruluk Modu
- Gerçek V-Dem verisiyle karşılaştırma
- "2000'lerde Türkiye'yi sen yönetseydin ne olurdu?"

---

## 14. Ek Notlar

### 14.1. Akademik Referanslar

**Ana Kaynak:**
- Acemoğlu, D., & Robinson, J. A. (2019). *The Narrow Corridor: States, Societies, and the Fate of Liberty*. Penguin Press.

**V-Dem:**
- Coppedge, M., et al. (2024). *V-Dem Dataset v15*. Varieties of Democracy (V-Dem) Project.

### 14.2. Lisans ve Kullanım

**V-Dem Veri Kullanımı:**
- V-Dem verisi akademik kullanım için açık kaynak
- Citation gerekli: "Varieties of Democracy (V-Dem) Project, v15"

**AI Model:**
- DeepSeek v3.1 open-source model (Apache 2.0 license)
- Local Ollama kullanımı (privacy-friendly)

### 14.3. Test Senaryoları

**Senaryo 1: Liberal Demokratikleşme**
```
Ülke: Turkey, Yıl: 1985
Strategi: Sivil özgürlükler artırma, yargı bağımsızlığı, basın reformu
Beklenen Sonuç: Shackled bölgesine geçiş
Risk: Ordu memnuniyetsizliği → Darbe riski
```

**Senaryo 2: Otoriter Kayma**
```
Ülke: Norway, Yıl: 2020
Strategi: Medya sansürü, sivil toplum kısıtlaması
Beklenen Sonuç: Despotic bölgesine kayma
Risk: Uluslararası yaptırımlar, sermaye kaçışı
```

**Senaryo 3: Denge Oyunu**
```
Ülke: Afghanistan, Yıl: 2002
Strategi: Her baskı grubunu dengede tutma
Beklenen Sonuç: Kaotik ama stabil
Risk: Çok kriz, zor yönetim
```

---

## 15. Sözlük

| Terim | Açıklama |
|-------|----------|
| **Dar Koridor** | Güçlü devlet + Güçlü toplum = Dengeli demokrasi bölgesi |
| **Leviathan** | Devlet gücünün sembolik adı (Thomas Hobbes'tan) |
| **Shackled** | Prangalanmış Leviathan - İdeal rejim tipi |
| **Despotic** | Despotik Leviathan - Otoriter rejim |
| **Paper** | Kağıttan Leviathan - Zayıf kurumlar |
| **Absent** | Olmayan Leviathan - Devlet yokluğu |
| **V-Dem** | Varieties of Democracy - Akademik demokrasi veri seti |
| **Faktör Analizi** | İstatistiksel yöntem: Çok değişkeni az faktöre indirgeme |
| **Sigma (σ)** | Standart sapma - Oynaklık göstergesi |
| **Baskı Grubu** | Stakeholder - Siyasette çıkar grubu |
| **Politik Sermaye** | Oyun mekaniği - Politika uygulama kapasitesi |
| **Kriz** | Oyun olayı - Baskı grubu tepkisinden kaynaklanan şok |

---

## 16. Son Söz

Bu PRD, Özgürlük Dengesi oyununun tam teknik ve tasarım dokümantasyonudur.

**Kritik Başarı Faktörleri:**
1. **Gerçekçilik:** Bilimsel veri + Makul oyun mekaniği dengesi
2. **Eğlence:** Strateji derinliği + Görsel feedback
3. **Eğitici:** Dar Koridor teorisini deneyimleyerek öğrenme

**Başlangıç Adımı:** Sprint 1 - Veri Hazırlığı

**İletişim:**
- Sorular için: Bu PRD'yi referans al
- Güncellemeler: PRD versiyonla birlikte güncellenir

---

**PRD v1.0 - Tamamlandı**
**Hazırlayan:** Claude AI + Metin Çatal
**Tarih:** 2 Aralık 2025
