#!/usr/bin/env python3
"""
dar_koridor_by_country.json dosyasından dar_koridor_all_years.json oluşturur
"""

import json
from pathlib import Path

# Dosya yolları
BASE_DIR = Path(__file__).parent.parent
INPUT_FILE = BASE_DIR / "data/processed/wgi_vdem_modern/dar_koridor_by_country.json"
OUTPUT_FILE = BASE_DIR / "data/processed/wgi_vdem_modern/dar_koridor_all_years.json"

def generate_all_years_format():
    print("📊 dar_koridor_all_years.json oluşturuluyor...\n")

    # Ülkelere göre organize edilmiş veriyi yükle
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        by_country = json.load(f)

    # Yıllara göre organize et
    by_years = {}

    for country_name, country_data in by_country.items():
        for entry in country_data:
            year = entry['year']

            if year not in by_years:
                by_years[year] = []

            by_years[year].append({
                'country': country_name,
                'statePower': entry['statePower'],
                'societyPower': entry['societyPower'],
                'cluster': entry['cluster'],
                'leviathanType': entry['leviathanType']
            })

    # Yılları sırala
    sorted_years = {year: by_years[year] for year in sorted(by_years.keys())}

    # Her yıl için ülkeleri alfabetik sırala
    for year in sorted_years:
        sorted_years[year] = sorted(sorted_years[year], key=lambda x: x['country'])

    # Dosyaya yaz
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(sorted_years, f, ensure_ascii=False, indent=2)

    print(f"✅ Dosya oluşturuldu: {OUTPUT_FILE}")
    print(f"   Yıl sayısı: {len(sorted_years)}")
    print(f"   Yıl aralığı: {min(sorted_years.keys())} - {max(sorted_years.keys())}")

    # İlk ve son yıl için örnek
    first_year = min(sorted_years.keys())
    last_year = max(sorted_years.keys())
    print(f"   {first_year} yılı ülke sayısı: {len(sorted_years[first_year])}")
    print(f"   {last_year} yılı ülke sayısı: {len(sorted_years[last_year])}")

if __name__ == '__main__':
    generate_all_years_format()
