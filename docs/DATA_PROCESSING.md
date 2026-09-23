# Veri İşleme Dokümantasyonu

## Web verisi: `scripts/build_web_data.py`

Uygulamanın okuduğu her dosya bu betikle `data/web/` altına üretilir:

| Dosya | İçerik | Boyut |
|---|---|---|
| `corridor.json` | 197 ülke × 1789–2023: `[yıl, toplumun gücü, devletin gücü, tip]`, küme merkezleri | ~500 KB |
| `countries.json` | Türkçe/İngilizce ad, ISO kodu, bölge, etiket noktası, tarihî adlar (Türkçeleştirilmiş), başkentler | ~85 KB |
| `world.geojson` | Natural Earth 1:110m, koordinatlar sadeleştirilmiş | ~170 KB |
| `wgi.json` | 6 WGI göstergesi, 1996–2023 | ~180 KB |
| `vdem/*.json` | 12 V-Dem göstergesi, 1789–2024 (gösterge başına bir dosya) | ~250 KB/adet |
| `game/*.json` | Oyun başlangıcı için ülke başına güç odakları ve 17 V-Dem değişkeni | ~20 KB/adet |
| `borders/*.json` | Tarihî sınırlar (Douglas–Peucker ile sadeleştirilmiş çizgiler) | ~200–330 KB/adet |
| `meta.json` | Gösterge adları, açıklamalar, kaynaklar | ~4 KB |

### Neden yeniden üretildi?

- Eski modern analizde (1996–2023) WGI ile V-Dem **ülke adlarıyla** birleştiriliyordu. “Russian Federation / Russia”, “Egypt, Arab Rep. / Egypt” gibi eşleşmeyen adlar yüzünden Rusya, Mısır, İran, Venezuela, Yemen, Suudi Arabistan, Kuzey Kore vb. seriden düşüyordu. Birleştirme artık **ülke kodlarıyla** (V-Dem `country_text_id`) yapılıyor; yöntem defterdekiyle birebir aynı (yıllık z-puanı → 2 faktörlü varimax faktör analizi). Mevcut ülkelerde eski sonuçlarla korelasyon 0,9999.
- 1789–1995 konumları tarihî analiz defterinin çıktısından alınır (V-Dem, yıllık faktör analizi).
- Birleşik seri üzerinde tek bir K-ortalamalar (k = 4) modeli kurulur; böylece her yıl aynı sınıflandırmayla okunur ve grafikteki bölgeler (küme merkezlerinin Voronoi hücreleri) etiketlerle %99,9 tutarlıdır.
- Canlı sitede hiç çalışmayan WGI ve V-Dem katmanları (ham dosyalar `.gitignore`’daydı) artık küçük, yayımlanabilir dosyalardan geliyor.

---

## 📊 Veri Kaynakları

### 1. V-Dem Dataset (v15)
- **Kaynak**: Varieties of Democracy Institute
- **Dosya**: `data/raw/V-Dem-CY-Full+Others-v15.csv`
- **Boyut**: ~384MB
- **Satır**: ~470,000
- **Sütun**: 4000+
- **Kapsam**: 1789-2023, 202 ülke

**Kullanılan Değişkenler**:
- `v2xcs_ccsi`: Civil Society Core Index
- `v2x_cspart`: Civil Society Participation
- `v2x_freexp_altinf`: Freedom of Expression
- `v2psoppaut`: Opposition Autonomy
- `v2csreprss`: CSO Repression

### 2. WGI (Worldwide Governance Indicators)
- **Kaynak**: World Bank
- **Dosya**: `data/raw/wgidataset.csv`
- **Boyut**: ~1.9MB
- **Kapsam**: 1996-2023, 214 ülke

**Göstergeler**:
- **VA**: Voice and Accountability
- **PV**: Political Stability and Absence of Violence
- **GE**: Government Effectiveness
- **RQ**: Regulatory Quality
- **RL**: Rule of Law
- **CC**: Control of Corruption

### 3. Freedom House
- **Kaynak**: Freedom in the World
- **Dosya**: `data/raw/FIW13-25-Tablo 1.csv`
- **Kapsam**: 2013-2025

## 🔄 Veri İşleme Pipeline

### Aşama 1: Veri Temizleme
```python
# notebooks/dar_koridor_analiz.ipynb

# 1. Eksik değerleri temizle
df = df.dropna(subset=['year', 'country_name'])

# 2. Ülke isimlerini standartlaştır
df['country_name'] = df['country_name'].str.strip()

# 3. Yıl aralığını filtrele
df = df[(df['year'] >= 1996) & (df['year'] <= 2023)]
```

### Aşama 2: Faktör Analizi
```python
from factor_analyzer import FactorAnalyzer

# Seçilen değişkenler
variables = [
    'v2xcs_ccsi',    # Civil Society
    'v2x_cspart',    # CS Participation
    'v2x_freexp_altinf',  # Freedom of Expression
    'v2psoppaut',    # Opposition Autonomy
    'v2csreprss',    # CSO Repression
    'rl_est',        # Rule of Law (WGI)
    'ge_est',        # Gov Effectiveness (WGI)
    'cc_est',        # Control of Corruption (WGI)
    'rq_est',        # Regulatory Quality (WGI)
    'pv_est'         # Political Stability (WGI)
]

# Faktör analizi (2 faktör)
fa = FactorAnalyzer(n_factors=2, rotation='varimax')
fa.fit(df[variables])

# Faktör skorları
factor_scores = fa.transform(df[variables])
df['statePower'] = factor_scores[:, 0]
df['societyPower'] = factor_scores[:, 1]
```

### Aşama 3: Dar Koridor Sınıflandırması
```python
def classify_leviathan(state_power, society_power):
    """
    Leviathan tipini belirler
    """
    if state_power > 0 and society_power > 0:
        return 'Shackled'  # Zincirlenmiş
    elif state_power > 0 and society_power <= 0:
        return 'Despotic'  # Despotik
    elif state_power <= 0 and society_power > 0:
        return 'Paper'  # Kağıt
    else:
        return 'Absent'  # Mevcut Olmayan

df['leviathanType'] = df.apply(
    lambda row: classify_leviathan(row['statePower'], row['societyPower']),
    axis=1
)
```

### Aşama 4: Veri Dışa Aktarma
```python
# Yıllara göre organize et
by_year = {}
for year in df['year'].unique():
    year_data = df[df['year'] == year]
    by_year[str(year)] = year_data.to_dict('records')

# JSON'a kaydet
with open('dar_koridor_all_years.json', 'w', encoding='utf-8') as f:
    json.dump(by_year, f, ensure_ascii=False, indent=2)

# Ülkelere göre organize et
by_country = {}
for country in df['country_name'].unique():
    country_data = df[df['country_name'] == country]
    by_country[country] = country_data.to_dict('records')

# JSON'a kaydet
with open('dar_koridor_by_country.json', 'w', encoding='utf-8') as f:
    json.dump(by_country, f, ensure_ascii=False, indent=2)
```

## 📁 İşlenmiş Veri Formatları

### `dar_koridor_all_years.json`
```json
{
  "2023": [
    {
      "country": "Türkiye",
      "statePower": 0.45,
      "societyPower": -0.23,
      "leviathanType": "Despotic",
      "cluster": 2,
      "year": 2023
    },
    ...
  ],
  "2022": [...],
  ...
}
```

### `dar_koridor_by_country.json`
```json
{
  "Türkiye": [
    {
      "year": 1996,
      "statePower": 0.12,
      "societyPower": 0.05,
      "leviathanType": "Shackled"
    },
    {
      "year": 1997,
      ...
    }
  ],
  ...
}
```

## 📈 Veri Versiyonları

### v1 (`data/processed/v1/`)
- **İlk versiyon**
- Sadece V-Dem verileri
- 1996-2022

### v2 (`data/processed/v2/`)
- V-Dem + WGI birleştirilmiş
- Geliştirilmiş faktör analizi
- 1996-2022

### v2_1 (`data/processed/v2_1/`) ⭐ **Aktif**
- Yıl ve ülke bazlı organizasyon
- Ek metadata
- 1996-2023
- Cluster analizi eklendi

### v3 (`data/processed/v3/`)
- Deneysel özellikler
- Ek göstergeler

## 🔧 Veri Güncelleme

Yeni veri eklemek için:

1. **Ham veriyi ekleyin**: `data/raw/`
2. **Notebook'u çalıştırın**: `notebooks/dar_koridor_analiz_2_1.ipynb`
3. **Çıktıyı kaydedin**: `data/processed/v2_1/`
4. **Uygulamayı test edin**

## 📊 İstatistikler

### Genel
- **Toplam Ülke**: 156
- **Yıl Aralığı**: 1996-2023 (28 yıl)
- **Toplam Gözlem**: ~4,300

### Leviathan Dağılımı (2023)
- **Shackled (Zincirlenmiş)**: %32
- **Despotic (Despotik)**: %41
- **Paper (Kağıt)**: %18
- **Absent (Mevcut Olmayan)**: %9

## 🚨 Veri Kalitesi Notları

### Eksik Veriler
- Bazı ülkeler için bazı yıllar eksik olabilir
- WGI verileri 1996'dan önce yok
- Freedom House verileri sınırlı

### Dikkat Edilmesi Gerekenler
- Ülke adı eşleştirmeleri (`COUNTRY_NAME_MAP`)
- ISO kodları tutarsızlıkları
- Zaman serisi boşlukları

## 🔗 Referanslar

- [V-Dem Codebook](https://www.v-dem.net/data/the-v-dem-dataset/)
- [WGI Methodology](https://info.worldbank.org/governance/wgi/Home/Documents)
- [Factor Analysis in Python](https://factor-analyzer.readthedocs.io/)

---

**Son Güncelleme**: 2025-11-15

