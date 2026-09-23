# ATLAS İnteraktif — proje notları

Acemoğlu & Robinson’un Dar Koridor kuramını 197 ülkenin 1789–2023 verisiyle gösteren tek sayfalık web uygulaması (v3, 2026’da baştan yazıldı). Arayüz dili Türkçe.

## Çalıştırma
- `python3 scripts/serve.py` → http://localhost:8000/src/web/ (önbelleği kapatır; ES modülleri belge başına bir kez yüklendiği için değişiklik sonrası tam yenileme gerekir)
- `npm test` → `node --test tests/*.test.mjs` (dil ekleri, veri tutarlılığı, üç oyunun motoru, tekrar kodu, düello dengesi)
- `node scripts/duel_balance.mjs` → Kızıl Kraliçe senaryolarının dengesini ölçer; kurallar değişince çıktısı `pages/duel/scenarios.js` içindeki `balance` alanlarına yazılır
- `python3 scripts/build_web_data.py` → `data/web/` yeniden üretilir (ham `data/raw/*.csv` gerekir, depoda yok)

## Yapı
- `src/web/scripts/core/` yönlendirici (hash, `mount/unmount/update`), veri katmanı, Türkçe biçimlendirme, ikonlar, kuram, anlatı
- `src/web/scripts/components/` D3 koridor grafiği, zaman çizelgesi, ülke profili, ⌘K arama, asistan
- `src/web/scripts/pages/` home, theory, atlas (globe.gl 2.46.2, tembel yüklenir), corridor ve üç oyun:
  - `game/` Özgürlük Dengesi (`#/oyun` merkez, `#/oyun/denge` kurulum, `#/oyun/oyna`, `#/oyun/tekrar`); `engine.js` saf mantık, `daily.js` günün senaryosu, `replay-code.js` tekrar kodu
  - `duel/` Kızıl Kraliçe (`#/oyun/kizil-kralice`); `engine.js`, `ai.js` (pişmanlık eşleştirmeli Nash + iki adımlı arama), `cards.js`
  - `hunt/` Leviathan Avı (`#/oyun/leviathan-avi`); `logic.js` saf mantık, `map.js` tahmin haritası (yön tam açıyla değil 45°'lik dilimle çizilir, yoksa halka + yön cevabı ele verir)
- `core/random.js` tohumlu rastlantı: oyun motorları yalnızca bunu kullanır
- Yayın: `.github/workflows/deploy.yml` yalnızca `src/web` + `data/web` kopyalar

## Kurallar ve tuzaklar
- Tipler = K-ortalamalar kümeleri; grafikteki bölgeler küme merkezlerinin Voronoi hücreleri. Tip ya da denge hesaplarken `data.js` içindeki `corridorAt`, `corridorGap` (koridor eksenine dik uzaklık) kullanılmalı; `devlet − toplum` farkı yanıltır.
- Koordinatlar: x = toplumun gücü, y = devletin gücü (yıllık z-puanı).
- Türkçe ekler için `format.js` (`suffix`, `pctPoss`, `pctAbl`) kullanılmalı; ekler elle yazılmamalı.
- İkonlar yalnızca `core/icons.js` üzerinden (tek tip çizgi SVG); arayüzde emoji yok.
- Renk ve boşluk değerleri `styles/tokens.css` jetonlarından gelir. Düellonun iki tarafı `--side-state` / `--side-society` renklerini kullanır (Leviathan tip renkleri değil).
- Oyun motorları belirlenimcidir: rastlantı yalnızca tohumdan türetilir. Özgürlük Dengesi kurallarını değiştirmek eski tekrar kodlarını bozar; `ENGINE_VERSION` artırılmalı. Etki büyüklükleri gerçek veriye göre ayarlıdır (yıllık hareket medyanı ~0,05 z-puanı).
- Düelloda pay ve güç araçlarının etkinliği `balance`'a bağlıdır: bu bir tip ya da mutlak denge ölçüsü değil, başlangıçtan bu yana devletin ve toplumun büyüme farkıdır (Go'daki komi gibi); böylece senaryolar eşit başlar. Kural değişikliğinden sonra `tests/duel.test.mjs` ve `scripts/duel_balance.mjs` çalıştırılmalı.
