# Kurulum

## Uygulamayı çalıştırmak

Gereken tek şey Python 3’tür.

```bash
python3 scripts/serve.py
```

Tarayıcıda `http://localhost:8000/src/web/` adresini açın. `npm` kuruluysa `npm start` aynı işi yapar ve tarayıcıyı kendisi açar.

`scripts/serve.py`, tarayıcı önbelleğini kapatır; kodda yaptığınız değişiklikler yenilemede hemen görünür.

## Testler

```bash
npm test
```

Node 18 ve üzeri gerekir; ek paket kurulmaz.

## Veriyi yeniden üretmek

Uygulama `data/web/` altındaki dosyalarla çalışır ve bunlar depoda hazırdır. Yeniden üretmek için:

1. Ham verileri `data/raw/` altına koyun (boyutları nedeniyle depoda değiller):
   - `V-Dem-CY-Full+Others-v15.csv` — https://www.v-dem.net
   - `wgidataset.csv` — Dünya Bankası Worldwide Governance Indicators (noktalı virgülle ayrılmış, ondalık ayracı virgül)
2. Python paketlerini kurun:

```bash
pip install pandas numpy scikit-learn factor_analyzer
```

3. Veri hattını çalıştırın:

```bash
python3 scripts/build_web_data.py
```

## Yayın

`main` dalına gönderilen her değişiklik `.github/workflows/deploy.yml` ile GitHub Pages’e yayımlanır. İş akışı yalnızca `src/web` ve `data/web` klasörlerini yayına alır.

## Yapay zekâ asistanı (isteğe bağlı)

Asistan bağlantı olmadan da hazır yanıtlarla çalışır. Yerel model için Ollama’yı tarayıcı erişimine izin verecek şekilde başlatın:

```bash
OLLAMA_ORIGINS="*" ollama serve
```

Uygulamada Asistan → ayarlar düğmesinden adresi ve modeli kaydedin. OpenAI uyumlu uç noktalar (ör. LM Studio) da desteklenir.
