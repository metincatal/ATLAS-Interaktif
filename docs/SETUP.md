# Kurulum Kılavuzu - ATLAS İnteraktif

## 🛠️ Gereksinimler

### Zorunlu
- Python 3.8 veya üzeri
- Modern web tarayıcı (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)

### Opsiyonel
- Ollama (AI Chat özelliği için)
- Git (versiyon kontrolü için)

## 📦 Kurulum Adımları

### 1. Projeyi İndirin

#### Git ile:
```bash
git clone https://github.com/kullanici_adi/ATLAS-Interaktif.git
cd ATLAS-Interaktif
```

#### Veya ZIP ile:
1. GitHub'dan "Download ZIP" butonuna tıklayın
2. ZIP dosyasını açın
3. Terminal'de klasöre gidin

### 2. Python Bağımlılıklarını Yükleyin

```bash
# Virtual environment oluşturun (önerilir)
python3 -m venv .venv

# Virtual environment'ı aktif edin
# macOS/Linux:
source .venv/bin/activate
# Windows:
.venv\Scripts\activate

# Bağımlılıkları yükleyin
pip install -r requirements.txt
```

### 3. Veri Dosyalarını Kontrol Edin

Veri dosyaları yeni klasör yapısında şu konumlarda olmalı:

```
data/
├── raw/
│   ├── V-Dem-CY-Full+Others-v15.csv
│   ├── wgidataset.csv
│   └── ...
└── processed/
    ├── v2_1/
    │   ├── dar_koridor_all_years.json
    │   └── dar_koridor_by_country.json
    └── ...
```

**NOT**: Büyük veri dosyaları `.gitignore`'da olduğu için Git'ten gelmeyebilir. Bu durumda ayrıca sağlanmalıdır.

### 4. Lokal Sunucu Başlatın

```bash
# Python'un built-in HTTP sunucusu
python3 -m http.server 8000

# Veya npm yüklüyse:
npx serve -s . -p 8000
```

### 5. Tarayıcıda Açın

```
http://localhost:8000
```

Veya doğrudan yeni yapıya:
```
http://localhost:8000/src/web/index.html
```

## 🤖 AI Chat Kurulumu (Opsiyonel)

AI Chat özelliği için Ollama kurulumu:

### 1. Ollama'yı Yükleyin

#### macOS/Linux:
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

#### Windows:
[Ollama indirme sayfası](https://ollama.ai/download)ndan yükleyiciyi indirin

### 2. Modeli İndirin

```bash
ollama pull gpt-oss:120b-cloud
```

**NOT**: Bu model büyük olabilir (~70GB). Alternatif olarak daha küçük modeller kullanılabilir:

```bash
# Alternatif modeller
ollama pull llama2:7b
ollama pull mistral:7b
```

Model ismini `src/web/scripts/config/api-config.js` dosyasında değiştirebilirsiniz.

### 3. Ollama Servisini Başlatın

```bash
ollama serve
```

Ollama varsayılan olarak `http://localhost:11434` adresinde çalışır.

## 🐛 Sorun Giderme

### Python HTTP Sunucusu Hatası

**Hata**: `python3: command not found`

**Çözüm**:
```bash
# Python 2 kullanın
python -m SimpleHTTPServer 8000

# Veya Python'un yüklü olduğunu kontrol edin
python --version
python3 --version
```

### Port Zaten Kullanımda

**Hata**: `OSError: [Errno 48] Address already in use`

**Çözüm**:
```bash
# Farklı bir port kullanın
python3 -m http.server 8080

# Veya çalışan servisi durdurun
lsof -ti:8000 | xargs kill
```

### CORS Hatası

**Hata**: `Access to fetch ... has been blocked by CORS policy`

**Çözüm**:
- Lokal HTTP sunucusu kullandığınızdan emin olun (dosyayı doğrudan tarayıcıda açmayın)
- `file://` protokolü yerine `http://localhost` kullanın

### Veri Dosyaları Yüklenmedi

**Hata**: `Failed to fetch ... dar_koridor_all_years.json`

**Çözüm**:
1. Veri dosyalarının doğru konumda olduğundan emin olun
2. Dosya yollarını kontrol edin (`data/processed/v2_1/`)
3. `.gitignore` dosyasını kontrol edin

### Ollama Bağlantı Hatası

**Hata**: `Failed to fetch ... http://localhost:11434`

**Çözüm**:
1. Ollama servisinin çalıştığından emin olun: `ollama serve`
2. Port numarasını kontrol edin (varsayılan: 11434)
3. Modelin yüklü olduğunu kontrol edin: `ollama list`

## 🔧 Geliştirme Modu

### Hot Reload İçin

```bash
# Live Server (VS Code Extension) kullanın
# Veya
npx live-server --port=8000
```

### Debugging

1. Tarayıcı DevTools'u açın (F12)
2. Console sekmesinde hataları kontrol edin
3. Network sekmesinde API çağrılarını izleyin

### Modül Düzenleme

JavaScript modüllerini düzenlerken:
- Tarayıcı cache'ini temizleyin (Ctrl+Shift+R / Cmd+Shift+R)
- DevTools'da "Disable cache" seçeneğini aktif edin

## 📱 Mobil Test

Mobil cihazda test etmek için:

```bash
# Local IP'nizi bulun
# macOS/Linux:
ifconfig | grep "inet "
# Windows:
ipconfig

# Aynı ağdaki mobil cihazda:
http://192.168.X.X:8000
```

## ✅ Kurulum Doğrulama

Başarılı kurulum için kontrol listesi:

- [ ] Ana sayfa açılıyor
- [ ] 3D globe görünüyor
- [ ] Teori sayfası çalışıyor
- [ ] Ülkelere tıklama çalışıyor
- [ ] Sağ panel açılıyor
- [ ] Dar Koridor grafiği görünüyor
- [ ] AI Chat açılıyor (Ollama yüklüyse)

## 📞 Yardım

Sorun yaşıyorsanız:
1. [Issues](https://github.com/kullanici_adi/ATLAS-Interaktif/issues) sayfasını kontrol edin
2. Yeni bir issue açın
3. Hata mesajını ve tarayıcı bilgilerini ekleyin

---

**İyi Çalışmalar!** 🚀

