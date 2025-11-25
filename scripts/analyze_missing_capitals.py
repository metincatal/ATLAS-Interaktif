#!/usr/bin/env python3
"""
Eksik başkent bilgilerini analiz eder
"""

import json
from pathlib import Path

# Dosya yolları
BASE_DIR = Path(__file__).parent.parent
UNIFIED_DATA = BASE_DIR / "data/historical_maps/unified_country_historical_data.json"

def analyze_missing_capitals():
    print("📊 Eksik başkent bilgileri analiz ediliyor...\n")

    with open(UNIFIED_DATA, 'r', encoding='utf-8') as f:
        data = json.load(f)

    countries = data['countries']

    # İstatistikler
    total_countries = len(countries)
    total_periods = sum(len(c['periods']) for c in countries)
    missing_capitals = []

    for country in countries:
        for period in country['periods']:
            if period['capital'] is None:
                missing_capitals.append({
                    'vdem_name': country['vdem_name'],
                    'display_name': period['display_name'],
                    'years': period['years'],
                    'data_points': country['total_data_points']
                })

    print(f"Toplam Ülke: {total_countries}")
    print(f"Toplam Period: {total_periods}")
    print(f"Başkent bilgisi eksik period: {len(missing_capitals)}")
    print(f"Başkent bilgisi olan period: {total_periods - len(missing_capitals)}\n")

    # En çok veri noktası olan eksik başkentleri göster
    missing_capitals.sort(key=lambda x: x['data_points'], reverse=True)

    print("=" * 80)
    print("EN ÖNEMLİ EKSİK BAŞKENTLER (Veri Noktası Sayısına Göre)")
    print("=" * 80)

    for i, item in enumerate(missing_capitals[:30], 1):
        print(f"{i:2}. {item['vdem_name']:30} | {item['display_name']:35} | {item['years']:12} | {item['data_points']:3} veri")

    # Eksik başkentleri dosyaya kaydet
    output_file = BASE_DIR / "data/historical_maps/missing_capitals.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({
            'metadata': {
                'total_missing': len(missing_capitals),
                'generated': '2025-11-25'
            },
            'missing': missing_capitals
        }, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Eksik başkentler listesi kaydedildi: {output_file}")

if __name__ == '__main__':
    analyze_missing_capitals()
