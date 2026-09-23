# ATLAS İnteraktif — proje notları

Acemoğlu & Robinson’un Dar Koridor kuramını 197 ülkenin 1789–2023 verisiyle gösteren tek sayfalık web uygulaması (v3, 2026’da baştan yazıldı). Arayüz dili Türkçe.

## Çalıştırma
- `python3 scripts/serve.py` → http://localhost:8000/src/web/ (önbelleği kapatır; ES modülleri belge başına bir kez yüklendiği için değişiklik sonrası tam yenileme gerekir)
- `npm test` → `node --test tests/*.test.mjs` (dil ekleri, veri tutarlılığı, oyun motoru)
- `python3 scripts/build_web_data.py` → `data/web/` yeniden üretilir (ham `data/raw/*.csv` gerekir, depoda yok)

## Yapı
- `src/web/scripts/core/` yönlendirici (hash, `mount/unmount/update`), veri katmanı, Türkçe biçimlendirme, ikonlar, kuram, anlatı
- `src/web/scripts/components/` D3 koridor grafiği, zaman çizelgesi, ülke profili, ⌘K arama, asistan
- `src/web/scripts/pages/` home, theory, atlas (globe.gl 2.46.2, tembel yüklenir), corridor, game/ (engine saf mantık, DOM’suz)
- Yayın: `.github/workflows/deploy.yml` yalnızca `src/web` + `data/web` kopyalar

## Kurallar ve tuzaklar
- Tipler = K-ortalamalar kümeleri; grafikteki bölgeler küme merkezlerinin Voronoi hücreleri. Tip ya da denge hesaplarken `data.js` içindeki `corridorAt`, `corridorGap` (koridor eksenine dik uzaklık) kullanılmalı; `devlet − toplum` farkı yanıltır.
- Koordinatlar: x = toplumun gücü, y = devletin gücü (yıllık z-puanı).
- Türkçe ekler için `format.js` (`suffix`, `pctPoss`, `pctAbl`) kullanılmalı; ekler elle yazılmamalı.
- İkonlar yalnızca `core/icons.js` üzerinden (tek tip çizgi SVG); arayüzde emoji yok.
- Renk ve boşluk değerleri `styles/tokens.css` jetonlarından gelir.
