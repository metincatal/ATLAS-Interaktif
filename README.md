# ATLAS İnteraktif

**Daron Acemoğlu'nun Teorilerini İnteraktif Görselleştirme Platformu**

## 🎯 Proje Hakkında

ATLAS İnteraktif, Nobel ödüllü ekonomist **Daron Acemoğlu** ve **James A. Robinson**'un "Ulusların Düşüşü" (Why Nations Fail) ve "Dar Koridor" (The Narrow Corridor) kitaplarında ortaya koyduğu teorileri görselleştiren interaktif bir web uygulamasıdır.

### Özellikler

- 🌍 **3D İnteraktif Dünya Haritası**: Globe.gl kullanılarak oluşturulmuş dönen 3D dünya
- 📊 **WGI Göstergeleri**: Worldwide Governance Indicators verilerinin görselleştirilmesi
- 🏛️ **Dar Koridor Analizi**: Ülkelerin devlet-toplum dengesi analizi
- 💬 **AI Asistan**: Daron Acemoğlu'nun teorileri hakkında soru-cevap
- 📈 **Zaman Serisi**: 1996-2023 yılları arası veriler
- 🎨 **Modern UI**: Responsive ve kullanıcı dostu arayüz

## 📁 Proje Yapısı

```
ATLAS-Interaktif/
├── src/
│   ├── web/                    # Web uygulaması
│   │   ├── styles/            # Modüler CSS dosyaları
│   │   ├── scripts/           # Modüler JavaScript dosyaları
│   │   ├── assets/            # Görseller ve statik dosyalar
│   │   └── index.html         # Ana HTML dosyası
│   └── analysis/              # Veri analizi
│       └── notebooks/         # Jupyter notebook'lar
├── data/                      # Veri dosyaları
│   ├── raw/                   # Ham veriler
│   ├── processed/             # İşlenmiş veriler
│   └── training/              # Eğitim verileri (makaleler)
├── docs/                      # Dokümantasyon
└── tests/                     # Test dosyaları
```

Detaylı mimari için: [ARCHITECTURE.md](docs/ARCHITECTURE.md)

## 🚀 Kurulum

### Gereksinimler

- Python 3.8+
- Modern web tarayıcı (Chrome, Firefox, Safari, Edge)
- Ollama (AI Chat özelliği için, opsiyonel)

### Adımlar

1. **Depoyu klonlayın:**
```bash
git clone https://github.com/kullanici_adi/ATLAS-Interaktif.git
cd ATLAS-Interaktif
```

2. **Python bağımlılıklarını yükleyin:**
```bash
pip install -r requirements.txt
```

3. **Lokal sunucu başlatın:**
```bash
# Python'un built-in sunucusuyla
python -m http.server 8000

# Veya
python3 -m http.server 8000
```

4. **Tarayıcıda açın:**
```
http://localhost:8000
```

### AI Chat Özelliği (Opsiyonel)

AI Chat özelliğini kullanmak için [Ollama](https://ollama.ai/) kurulumu gerekir:

```bash
# Ollama'yı yükleyin (macOS/Linux)
curl -fsSL https://ollama.ai/install.sh | sh

# Modeli indirin
ollama pull gpt-oss:120b-cloud

# Ollama servisini başlatın
ollama serve
```

## 📖 Kullanım

### Teori Sayfası

Uygulama açıldığında Daron Acemoğlu'nun iki ana teorisini açıklayan sayfa görünür:
- **Ulusların Düşüşü**: Kapsayıcı vs Sömürücü Kurumlar
- **Dar Koridor**: Devlet-Toplum Dengesi

### Ana Sayfa (3D Harita)

- **Ülke Seçimi**: Ülkelere tıklayarak detaylı bilgi alın
- **WGI Göstergeleri**: WGI butonuyla yönetişim göstergelerini görselleştirin
- **Dar Koridor**: Ülkelerin zaman içindeki konumunu inceleyin
- **AI Asistan**: Sol alttaki butona tıklayarak soru sorun

## 🛠️ Teknolojiler

### Frontend
- **Globe.gl**: 3D dünya haritası
- **D3.js**: Veri görselleştirme
- **PapaParse**: CSV işleme
- Vanilla JavaScript (ES6 Modules)
- CSS3 (Modüler yapı)

### Backend & Analiz
- **Python**: Veri işleme
- **Pandas**: Veri analizi
- **Factor Analysis**: Faktör analizi
- **Jupyter**: İnteraktif analiz

### AI
- **Ollama**: Lokal LLM API
- **GPT-OSS**: Açık kaynak model

## 📊 Veri Kaynakları

- **V-Dem Dataset**: Demokrasi göstergeleri (v15)
- **WGI**: Worldwide Governance Indicators
- **Freedom House**: Freedom in the World veriler
- **Daron Acemoğlu**: Makaleler ve kitap bölümleri

## 🤝 Katkıda Bulunma

Katkılarınızı bekliyoruz! Lütfen:

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/AmazingFeature`)
3. Commit edin (`git commit -m 'Add some AmazingFeature'`)
4. Push edin (`git push origin feature/AmazingFeature`)
5. Pull Request açın

## 📝 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için [LICENSE](LICENSE) dosyasına bakın.

## 👥 İletişim

Proje Linki: [https://github.com/metincatal/ATLAS-Interaktif](https://github.com/metincatal/ATLAS-Interaktif)

## 🙏 Teşekkürler

- Daron Acemoğlu ve James A. Robinson - İlham veren teoriler için
- V-Dem Institute - Kapsamlı demokrasi verileri için
- World Bank - WGI verileri için
- Globe.gl - Harika 3D dünya haritası kütüphanesi için

---

**Not**: Bu proje modüler hiyerarşik yapıya geçiş sürecindedir. Bazı özellikler kademeli olarak tamamlanmaktadır.

