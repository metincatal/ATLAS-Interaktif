# ATLAS İnteraktif

**Daron Acemoğlu'nun Teorilerini İnteraktif Görselleştirme Platformu**

> [**Canlı Demo**](https://metincatal.github.io/ATLAS-Interaktif/)

---

## Proje Hakkında

ATLAS İnteraktif, Nobel ödüllü ekonomist **Daron Acemoğlu** ve **James A. Robinson**'un ortaya koyduğu teorileri görselleştiren interaktif bir web uygulamasıdır. Uygulama üç ana bölümden oluşur:

- **Teori Sayfası** — "Ulusların Düşüşü" ve "Dar Koridor" kitaplarının temel kavramlarını açıklar
- **3D Dünya Haritası** — WGI ve V-Dem verileriyle ülkelerin yönetişim göstergelerini görselleştirir
- **Özgürlük Dengesi Oyunu** — Ülke yöneterek devlet-toplum dengesini keşfetmenizi sağlayan strateji oyunu

---

## Özellikler

### 3D İnteraktif Dünya Haritası
- **Globe.gl** ile oluşturulmuş dönen 3D dünya
- Ülkelere tıklayarak detaylı yönetişim verileri
- WGI (Worldwide Governance Indicators) göstergeleri
- V-Dem demokrasi endeksleri ve mindmap görselleştirmesi
- Tarihi haritalar ve ülke karşılaştırmaları

### Dar Koridor Analizi
- Devlet kapasitesi vs toplum kapasitesi grafiği
- Ülkelerin zaman içindeki hareketleri (1789–2023)
- Leviathan tipi sınıflandırması (Prangalanmış, Despotik, Kağıttan, Mevcut Olmayan)
- İnteraktif zoom ve filtreleme

### Özgürlük Dengesi Oyunu
- Gerçek verilerle başlayan strateji oyunu
- Politika seçimi ve uygulama mekanikleri
- Paydaş tepkileri ve sermaye birikimi
- Dar koridor üzerinde canlı konum takibi
- Tur bazlı ilerleme sistemi

### AI Asistan
- Daron Acemoğlu'nun teorileri hakkında soru-cevap
- Ollama tabanlı lokal LLM desteği

---

## Hızlı Başlangıç

### Canlı Erişim

Uygulamayı doğrudan tarayıcınızdan kullanabilirsiniz:

**https://metincatal.github.io/ATLAS-Interaktif/**

### Lokal Kurulum

```bash
# Depoyu klonlayın
git clone https://github.com/metincatal/ATLAS-Interaktif.git
cd ATLAS-Interaktif

# Bağımlılıkları yükleyin
npm install

# Lokal sunucuyu başlatın
npm start
```

Tarayıcınızda `http://localhost:8000` adresini açın.

### AI Chat (Opsiyonel)

```bash
# Ollama kurulumu
curl -fsSL https://ollama.ai/install.sh | sh

# Modeli indirin ve başlatın
ollama pull gpt-oss:120b-cloud
ollama serve
```

---

## Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| 3D Harita | Globe.gl |
| Veri Görselleştirme | D3.js |
| CSV İşleme | PapaParse |
| Frontend | Vanilla JavaScript (ES6 Modules), CSS3 |
| Veri Analizi | Python, Pandas, Factor Analysis |
| AI | Ollama, GPT-OSS |
| Deploy | GitHub Actions, GitHub Pages |

---

## Proje Yapısı

```
ATLAS-Interaktif/
├── src/web/                    # Web uygulaması
│   ├── index.html              # Teori sayfası (giriş)
│   ├── game.html               # Oyun hazırlık sayfası
│   ├── game-play.html          # Oyun sayfası
│   ├── styles/                 # Modüler CSS
│   ├── scripts/
│   │   ├── main.js             # Ana giriş noktası
│   │   ├── config/             # Yapılandırma
│   │   ├── core/               # Çekirdek işlevsellik
│   │   ├── modules/            # Özellik modülleri
│   │   │   ├── corridor/       # Dar koridor grafiği
│   │   │   ├── game/           # Oyun mekanikleri
│   │   │   ├── wgi/            # WGI göstergeleri
│   │   │   ├── vdem/           # V-Dem verileri
│   │   │   └── chat/           # AI asistan
│   │   ├── pages/              # Sayfa orchestration
│   │   └── utils/              # Yardımcı fonksiyonlar
│   └── assets/                 # Görseller
├── data/                       # Veri dosyaları
│   ├── raw/                    # Ham veriler (WGI CSV)
│   ├── processed/              # İşlenmiş veriler (JSON)
│   └── historical_maps/        # Tarihi harita verileri
├── scripts/                    # Python veri işleme
├── tests/                      # Testler
└── .github/workflows/          # CI/CD
```

---

## Veri Kaynakları

- **V-Dem Dataset v15** — Demokrasi göstergeleri (1789–2023)
- **Worldwide Governance Indicators** — Yönetişim göstergeleri (1996–2023)
- **Freedom House** — Freedom in the World verileri
- **Daron Acemoğlu & J.A. Robinson** — Akademik makaleler ve kitaplar

---

## Lisans

MIT License — Detaylar için [LICENSE](LICENSE) dosyasına bakın.

---

## İletişim

Proje: [github.com/metincatal/ATLAS-Interaktif](https://github.com/metincatal/ATLAS-Interaktif)
