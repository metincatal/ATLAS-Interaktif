#!/usr/bin/env python3
"""
CShapes GeoJSON'dan belirli bir yıl için harita çıkartma
"""
import json
import sys
from datetime import datetime

def extract_map_for_year(geojson_path, target_year, output_path):
    """
    CShapes GeoJSON'dan belirli bir yıl için harita çıkart

    Args:
        geojson_path: CShapes GeoJSON dosya yolu
        target_year: Hedef yıl (int)
        output_path: Çıktı GeoJSON dosya yolu
    """
    print(f"📅 {target_year} yılı için harita çıkartılıyor...")

    # Hedef tarih (yılın ortası)
    target_date = datetime(target_year, 7, 1)

    # GeoJSON yükle
    with open(geojson_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Filtreleme
    matched_features = []

    for feature in data['features']:
        props = feature['properties']

        # Başlangıç ve bitiş tarihlerini parse et
        try:
            # gwsdate format: "31.12.1885 23:00:00"
            start_date = datetime.strptime(props['gwsdate'], "%d.%m.%Y %H:%M:%S")
            end_date = datetime.strptime(props['gwedate'], "%d.%m.%Y %H:%M:%S")

            # Hedef tarih bu aralıkta mı?
            if start_date <= target_date <= end_date:
                matched_features.append(feature)
        except Exception as e:
            print(f"⚠️  Tarih parse hatası: {e}")
            continue

    print(f"✓ {len(matched_features)} ülke/bölge bulundu")

    # Yeni GeoJSON oluştur
    output_data = {
        "type": "FeatureCollection",
        "metadata": {
            "year": target_year,
            "date": target_date.strftime("%Y-%m-%d"),
            "source": "CShapes 2.0",
            "country_count": len(matched_features)
        },
        "features": matched_features
    }

    # Kaydet
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)

    print(f"💾 Kaydedildi: {output_path}")

    return len(matched_features)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Kullanım: python extract_year.py <yıl>")
        print("Örnek: python extract_year.py 1923")
        sys.exit(1)

    year = int(sys.argv[1])

    if year < 1886 or year > 2019:
        print(f"⚠️  Uyarı: CShapes sadece 1886-2019 arası kapsar")
        sys.exit(1)

    extract_map_for_year(
        'cshapes_2.0.geojson',
        year,
        f'extracted/world_{year}.geojson'
    )
