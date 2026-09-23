# ATLAS İnteraktif — Mimari

Sürüm 3 ile uygulama baştan yazıldı. Bu belge yeni yapıyı ve temel kararları özetler.

## İlkeler

- **Derleme adımı yok.** Tarayıcıya doğrudan ES modülleri gider; GitHub Pages’e `src/web` ve `data/web` kopyalanır.
- **Veri önce.** Uygulamanın gösterdiği her şey `data/web/` altındaki küçük JSON dosyalarından gelir. Eski sürümdeki 116 MB’lık V-Dem JSON’u ve 30 MB’lık oyun verisi, gösterge ve ülke başına küçük dosyalara bölündü; hepsi ihtiyaç anında yüklenir.
- **Tek sınıflandırma.** Koridor grafiği, atlas, profil ve oyun aynı küme merkezlerini kullanır. Grafikteki bölgeler, küme merkezlerinin Voronoi hücreleridir; bu yüzden bir noktanın rengi ile içinde durduğu bölge her zaman tutarlıdır (eski sürümde nokta renkleri ile arka plandaki görsel çelişiyordu).
- **Çevrimdışı çalışan oyun.** Oyun artık yerel bir yapay zekâya bağlı değildir; kuramla uyumlu, sınanmış bir kurallar motoruyla çalışır.

## Katmanlar

```
index.html ─ main.js ─ core/router.js ──┬─ pages/home.js
                                        ├─ pages/theory.js
                                        ├─ pages/atlas.js ─ components/country-profile.js
                                        ├─ pages/corridor.js
                                        └─ pages/game/{setup,play}.js ─ engine.js, policies.js, events.js
```

### core/
| Modül | Görev |
|---|---|
| `router.js` | Hash tabanlı yönlendirme (`#/atlas?c=TUR&y=2023`). Sayfalar `mount(root, params)` ile açılır, `unmount()` ile temizlenir; yalnızca parametre değişirse `update(params)` çağrılır. |
| `data.js` | Veri yükleme ve önbellek; `corridorAt`, `corridorYear`, `typeCounts`, `corridorGap`, `wgiAt`, `vdemAt`, arama. Veri olmayan ara yıllarda (ör. 1997) en yakın önceki yıl kullanılır. |
| `format.js` | Türkçe sayı biçimi ve ek uyumu (`2003’te`, `%64’ünden`, `Türkiye’nin`). |
| `narrative.js` | Seçilen ülke ve yıl için veriden cümle üretir (eski sürümde yalnızca iki ülke için sabit metin vardı). |
| `theory.js` | Dört Leviathan tipinin adları, renkleri, açıklamaları. |
| `icons.js` | Tek tip çizgi ikon seti (24×24, 1,6 kalınlık). Arayüzde emoji kullanılmaz. |
| `store.js` | Olay veriyolu, tarayıcı depolaması (hatalara dayanıklı), asistan bağlamı. |

### components/
`corridor-chart.js` (D3; tam ve mini sürüm, izler, etiket çakışma önleme, Delaunay tabanlı yakın nokta seçimi), `timeline.js`, `country-profile.js`, `search.js` (⌘K paleti), `assistant.js`, `sparkline.js`, `tooltip.js`, `toast.js`.

### Oyun motoru (`pages/game/engine.js`)
Saf mantıktır; DOM’a dokunmaz, Node’da test edilir. Her yıl:
1. Gündem olayı (varsa) seçilir, etkisi hemen uygulanır; riskli seçenekler olasılığa bağlıdır.
2. En fazla üç politika uygulanır; değerler yükseldikçe azalan getiri vardır. Aynı yıl devleti ve toplumu birlikte güçlendirmek %12 “Kızıl Kraliçe primi” getirir.
3. Denge koridor eksenine (Kâğıttan → Zincirlenmiş merkezleri) dik uzaklıkla ölçülür. Denge bozulursa geride kalan taraf daha da geriler; koridorda reform yapılmazsa ülke yavaşça dışarı kayar.
4. Konum her yıl başlangıç noktasına doğru hafifçe çekilir (kurumsal süreklilik) ve küçük bir rastlantı eklenir.
5. Güç odaklarının memnuniyeti zamanla ortalamaya döner; siyasi sermaye memnuniyete bağlı yenilenir.
6. Etkili bir odak çok memnuniyetsizse ertesi yıl zorunlu kriz gelir (darbe, ayaklanma, sermaye kaçışı, yaptırım, dinî tepki). Devletin gücü −2,6’nın altına düşerse devlet çöker.

Denge, geliştirme sırasında yüzlerce simüle oyunla ayarlandı ve `tests/engine.test.mjs` ile korunuyor: makul bir reform stratejisi zor başlangıçlardan (ör. Türkiye 2016, Rusya 2012) çoğunlukla B–C notu alır; baskı stratejisi her zaman en düşük notu alır.

## Stil sistemi

`styles/tokens.css` renk, yazı ve boşluk jetonlarını tanımlar. Yazı tipleri: Newsreader (başlıklar), IBM Plex Sans (arayüz), IBM Plex Mono (sayılar). Leviathan renkleri: Zincirlenmiş `#3DBE9C`, Despotik `#E8604F`, Kâğıttan `#E2A73E`, Namevcut `#A08AF4`.

## Erişilebilirlik ve mobil

- Gerçek `button`, `a`, `input` öğeleri; odak halkaları; `aria` etiketleri; `prefers-reduced-motion` desteği.
- 760 px altında üst gezinme yerini alt sekme çubuğuna bırakır; Atlas panelleri alttan açılan sayfalara dönüşür.
- WebGL yoksa Atlas otomatik olarak düz haritaya geçer.
