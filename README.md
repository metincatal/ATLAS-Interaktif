# ATLAS İnteraktif

**Özgürlük, devlet ile toplum arasındaki dar bir koridorda yaşar.**

Daron Acemoğlu ve James A. Robinson’un *Ulusların Düşüşü* (2012) ve *Dar Koridor* (2019) kitaplarındaki fikirleri, 197 ülkenin 1789–2023 arasındaki verisiyle keşfetmenizi sağlayan interaktif bir platform.

> **Canlı:** https://metincatal.github.io/ATLAS-Interaktif/

---

## Neler var?

| Bölüm | Ne yapar? |
|---|---|
| **Atlas** | 3B küre ya da düz harita. 21 katman: Leviathan tipi, devletin ve toplumun gücü, Dünya Bankası WGI’nın 6 yönetişim göstergesi, V-Dem’in 12 demokrasi göstergesi. Zaman çizelgesiyle 1789’dan bugüne oynatılabilir; istenirse tarihî sınırlar (1783–2019) üst üste bindirilir. Bir ülkeye tıklayınca veriden üretilen bir profil açılır. |
| **Dar Koridor Gözlemevi** | Tüm ülkeler devlet–toplum düzleminde. Zamanı oynatın, en fazla 8 ülkenin rotasını izleyin, tiplere göre süzün. |
| **Oyunlar** | Üç oyun, hepsi tamamen tarayıcıda (sunucu yok). Ayrıntılar aşağıda. |
| **Kuram** | Kapsayıcı ve sömürücü kurumlar, dört Leviathan, Kızıl Kraliçe etkisi ve uygulamanın yöntemi. |
| **Asistan** | Kuramı ve seçili ülkeyi açıklayan hazır yanıtlar; isteğe bağlı olarak yerel bir yapay zekâ modeli (Ollama ya da OpenAI uyumlu uç nokta) bağlanabilir. |

Her görünümün adresi paylaşılabilir: ör. `#/atlas?c=TUR&y=1950&l=vdem:v2x_libdem` ya da `#/koridor?c=TUR,RUS,NOR&y=1990`.

### Oyunlar (`#/oyun`)

| Oyun | Ne yapar? |
|---|---|
| **Özgürlük Dengesi** (`#/oyun/denge`) | Tek oyunculu strateji. Gerçek bir ülkeyi gerçek bir yıldan devralın; her yıl politika kartları ve gündem olaylarıyla onu koridora taşıyın. Koridorda yerinde saymak aşınma demektir (Kızıl Kraliçe), aynı yıl çok reform yapmak kaybedenlerin tepkisini büyütür, memnuniyetsiz güç odakları olasılığa bağlı kriz çıkarır, bazı kararların etkisi yıllara yayılır. Puan, aynı yıllarda ülkenin **gerçek tarihinin** aynı formülle aldığı puanla karşılaştırılır. |
| **Günün senaryosu** | Herkes aynı gün aynı ülke, yıl ve tohumla oynar (gün İstanbul saatine göre değişir); ilk deneme resmî sonuçtur. Sonuç, yıl yıl koridor şeridi ve **tekrar bağlantısıyla** paylaşılır. |
| **Tekrar kodu** (`#/oyun/tekrar?k=…`) | Motor tohumlu olduğu için bir oyunun bütün hamleleri tek satırlık bir koda sığar. Kod açılınca oyun baştan oynatılır, puan yeniden hesaplanır ve doğrulanır; oyun yıl yıl izlenebilir. |
| **Kızıl Kraliçe** (`#/oyun/kizil-kralice`) | İki oyunculu düello: biri Devlet, biri Toplum. Her tur iki taraf da gizlice bir duruş (İnşa / Baskı / Uzlaşı ya da Örgütlen / Direnç / Katıl) ve isterse bir özel kart seçer; hamleler birlikte açılır. Puan = o turun refahı × dengeden alınan pay; refah en çok koridorda birikir. Aynı cihazda iki kişi ya da üç seviyeli yapay zekâya karşı oynanır. |
| **Leviathan Avı** (`#/oyun/leviathan-avi`) | Günlük bulmaca: adı gizli bir ülkenin koridor rotasından ülkeyi altı tahminde bulun. Her tahmin başkentler arası uzaklığı, yönü ve iki rotanın benzerliğini söyler; yanlış tahminler ipucu açar. |

Kızıl Kraliçe'nin kuralları bot simülasyonlarıyla dengelendi: yapay zekâ rastgele oyuncuyu açık farkla yener, seçkin senaryolarda iki taraf da kazanabilir. Kurallar değişince senaryo dengeleri `node scripts/duel_balance.mjs` ile yeniden ölçülür.

---

## Hızlı başlangıç

Derleme adımı yoktur; yalnızca Python 3 gerekir.

```bash
npm start
```

Bu komut `python3 scripts/serve.py` ile yerel bir sunucu başlatır ve `http://localhost:8000/src/web/` adresini açar. (`npm` yoksa doğrudan `python3 scripts/serve.py` çalıştırabilirsiniz.)

> Sayfayı dosya olarak (`file://`) açmayın; tarayıcılar veri dosyalarının yüklenmesini engeller.

### Testler

```bash
npm test
```

Node’un yerleşik test çalıştırıcısıyla Türkçe dil eklerini, veri tutarlılığını, üç oyunun motorunu, tekrar kodlarının birebir yeniden üretimini ve düellonun dengesini sınar.

### Yapay zekâ (isteğe bağlı)

Asistan, yapay zekâ olmadan da hazır yanıtlarla çalışır. Serbest sorular için:

```bash
ollama pull llama3.1
```

```bash
OLLAMA_ORIGINS="*" ollama serve
```

Ardından uygulamada Asistan → ayarlar düğmesinden bağlantıyı kaydedin.

---

## Veri ve yöntem

Uygulamanın kullandığı tüm dosyalar `data/web/` altındadır ve `scripts/build_web_data.py` ile üretilir.

1. **Göstergeler.** 1996–2023: WGI’dan 5 yönetişim (hukukun üstünlüğü, hükümet etkinliği, yolsuzluk kontrolü, düzenleyici kalite, siyasi istikrar) ve V-Dem’den 5 sivil alan göstergesi. 1789–1995: V-Dem’in 17 tarihî göstergesi.
2. **Yıllık standartlaştırma.** Her gösterge her yıl kendi içinde z-puanına çevrilir; konumlar o yılın dünya ortalamasına göre görelidir.
3. **Faktör analizi.** Varimax rotasyonlu iki faktör: *devletin gücü* ve *toplumun gücü*.
4. **Kümeleme.** Tüm ülke-yıllarda K-ortalamalar (k = 4); kümeler Zincirlenmiş, Despotik, Kâğıttan ve Namevcut Leviathan olarak adlandırılır. Grafiklerdeki bölgeler bu kümelerin sınırlarıdır.

Leviathan tipleri kitabın kavramlarının veriye dayalı bir yorumudur; yazarların kendi sınıflandırması değildir.

Veriyi yeniden üretmek için (ham dosyalar depoda yoktur):

```bash
pip install pandas scikit-learn factor_analyzer
```

```bash
python3 scripts/build_web_data.py
```

Gerekli ham dosyalar: `data/raw/V-Dem-CY-Full+Others-v15.csv` ve `data/raw/wgidataset.csv`. Ayrıntılar: [docs/DATA_PROCESSING.md](docs/DATA_PROCESSING.md).

---

## Proje yapısı

```
src/web/                 Tek sayfalık uygulama (derleme yok, ES modülleri)
  index.html             Kabuk
  styles/                tokens · base · components · layout · pages/*
  scripts/
    main.js              Başlatma, gezinme, kısayollar
    core/                Yönlendirici, veri katmanı, biçimlendirme, ikonlar, kuram, anlatı
    components/          Koridor grafiği, zaman çizelgesi, ülke profili, arama, asistan…
    pages/               home · theory · atlas · corridor
      game/              Özgürlük Dengesi: hub, setup, play, report, replay, engine, policies, events, daily, replay-code
      duel/              Kızıl Kraliçe: page, engine, ai, cards, scenarios
      hunt/              Leviathan Avı: page, logic
data/web/                Uygulamanın okuduğu hafif veri (≈ 8 MB)
data/processed/          Analiz defterlerinin çıktıları (veri hattının girdisi)
scripts/build_web_data.py  Veri hattı
scripts/serve.py         Yerel geliştirme sunucusu
scripts/duel_balance.mjs Kızıl Kraliçe senaryolarının dengesini ölçer
src/analysis/notebooks/  Özgün analiz defterleri
tests/                   Birim testleri
```

Mimari ayrıntıları: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Kaynaklar

- Acemoglu, D. & Robinson, J. A. (2012). *Why Nations Fail*. Crown.
- Acemoglu, D. & Robinson, J. A. (2019). *The Narrow Corridor*. Penguin Press.
- Coppedge, M. vd. (2025). *V-Dem Country-Year Dataset v15*. Varieties of Democracy Project.
- Kaufmann, D. & Kraay, A. *Worldwide Governance Indicators*. Dünya Bankası.
- Sınırlar: Natural Earth (kamu malı), Historical Basemaps (1783–1880), CShapes 2.0 (1886–2019). Bayraklar: flagcdn.com.

Bu proje kitapların yazarlarıyla bağlantılı değildir. Kod MIT lisanslıdır; veri setleri kendi lisanslarına tabidir.
