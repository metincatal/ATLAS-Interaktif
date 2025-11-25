#!/usr/bin/env python3
"""
Tüm ülkeler için tarihi dönem + başkent bilgilerini birleştirir
"""

import json
import re
from pathlib import Path

# Dosya yolları
BASE_DIR = Path(__file__).parent.parent
COUNTRIES_LIST = BASE_DIR / "data/processed/vdem_historical/countries_years_list.txt"
HISTORICAL_NAMES = BASE_DIR / "data/historical_maps/historical_names.json"
CAPITAL_COORDS = BASE_DIR / "data/historical_maps/capital_coordinates.json"
OUTPUT_FILE = BASE_DIR / "data/historical_maps/unified_country_historical_data.json"

def parse_countries_list(file_path):
    """countries_years_list.txt dosyasını parse eder"""
    countries = {}

    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # Header'ları atla
    data_lines = [line for line in lines if not line.startswith('=') and line.strip()
                  and not 'Toplam Ülke' in line and not 'Veri Aralığı' in line
                  and not 'ÜLKE ADI' in line]

    for line in data_lines:
        # Format: "Country Name                    1789-2023    232"
        match = re.match(r'^(.+?)\s+(\d{4})-(\d{4})\s+(\d+)\s*$', line)
        if match:
            country_name = match.group(1).strip()
            start_year = int(match.group(2))
            end_year = int(match.group(3))
            data_count = int(match.group(4))

            countries[country_name] = {
                'start_year': start_year,
                'end_year': end_year,
                'data_count': data_count
            }

    return countries

def load_json(file_path):
    """JSON dosyasını yükler"""
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def create_unified_data(countries_data, historical_names_data, capitals_data):
    """Birleştirilmiş veriyi oluşturur"""

    # Mapping oluştur
    historical_map = {m['vdem_name']: m['historical_periods']
                     for m in historical_names_data['mappings']}
    capitals_map = capitals_data['capitals']

    unified = []

    for country_name, info in sorted(countries_data.items()):
        country_start = info['start_year']
        country_end = info['end_year']

        # Tarihi dönemleri al
        historical_periods = historical_map.get(country_name, [])

        # Başkent bilgilerini al
        capital_periods = capitals_map.get(country_name, [])

        # Periods oluştur
        periods = []

        if historical_periods and capital_periods:
            # Her tarihi dönem için başkent eşleştir
            for hist_period in historical_periods:
                hist_start = hist_period['start_year']
                hist_end = hist_period['end_year']

                # Bu dönem içindeki başkentleri bul
                matching_capitals = []
                for cap_period in capital_periods:
                    cap_start = cap_period['start_year']
                    cap_end = cap_period['end_year']

                    # Kesişim var mı?
                    overlap_start = max(hist_start, cap_start, country_start)
                    overlap_end = min(hist_end, cap_end, country_end)

                    if overlap_start <= overlap_end:
                        matching_capitals.append({
                            'start': overlap_start,
                            'end': overlap_end,
                            'capital': cap_period['capital'],
                            'lat': cap_period['lat'],
                            'lng': cap_period['lng']
                        })

                # Her başkent için period oluştur
                if matching_capitals:
                    for cap in matching_capitals:
                        periods.append({
                            'display_name': hist_period['display_name'],
                            'years': f"{cap['start']}-{cap['end']}",
                            'capital': cap['capital'],
                            'coordinates': {
                                'lat': cap['lat'],
                                'lng': cap['lng']
                            }
                        })
                else:
                    # Başkent yok ama tarihi dönem var
                    overlap_start = max(hist_start, country_start)
                    overlap_end = min(hist_end, country_end)
                    if overlap_start <= overlap_end:
                        periods.append({
                            'display_name': hist_period['display_name'],
                            'years': f"{overlap_start}-{overlap_end}",
                            'capital': None,
                            'coordinates': None
                        })

        elif capital_periods:
            # Sadece başkent var, tarihi dönem yok
            for cap_period in capital_periods:
                cap_start = max(cap_period['start_year'], country_start)
                cap_end = min(cap_period['end_year'], country_end)

                if cap_start <= cap_end:
                    periods.append({
                        'display_name': country_name,
                        'years': f"{cap_start}-{cap_end}",
                        'capital': cap_period['capital'],
                        'coordinates': {
                            'lat': cap_period['lat'],
                            'lng': cap_period['lng']
                        }
                    })

        else:
            # Ne tarihi dönem ne de başkent var
            periods.append({
                'display_name': country_name,
                'years': f"{country_start}-{country_end}",
                'capital': None,
                'coordinates': None
            })

        # Ülke verisini ekle
        unified.append({
            'vdem_name': country_name,
            'data_range': f"{country_start}-{country_end}",
            'total_data_points': info['data_count'],
            'periods': periods
        })

    return unified

def main():
    print("🚀 Birleştirilmiş tarihi veri oluşturuluyor...")

    # Dosyaları yükle
    print("📖 Dosyalar okunuyor...")
    countries_data = parse_countries_list(COUNTRIES_LIST)
    historical_names_data = load_json(HISTORICAL_NAMES)
    capitals_data = load_json(CAPITAL_COORDS)

    print(f"✓ {len(countries_data)} ülke bulundu")

    # Birleştirilmiş veri oluştur
    print("🔨 Veriler birleştiriliyor...")
    unified_data = create_unified_data(countries_data, historical_names_data, capitals_data)

    # Metadata ekle
    output = {
        'metadata': {
            'title': 'Birleştirilmiş Tarihi Ülke Verileri',
            'description': 'Tüm ülkeler için tarihi dönem adları, başkent bilgileri ve koordinatlar',
            'version': '1.0.0',
            'created': '2025-11-25',
            'total_countries': len(unified_data),
            'note': 'V-Dem ülke adları, tarihi dönem adları ve başkent bilgileri birleştirilmiştir'
        },
        'countries': unified_data
    }

    # JSON'a kaydet
    print(f"💾 Kaydediliyor: {OUTPUT_FILE}")
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"✅ Tamamlandı! {len(unified_data)} ülke için veri oluşturuldu")

    # İstatistikler
    total_periods = sum(len(c['periods']) for c in unified_data)
    with_capitals = sum(1 for c in unified_data for p in c['periods'] if p['capital'])
    without_capitals = sum(1 for c in unified_data for p in c['periods'] if not p['capital'])

    print(f"\n📊 İstatistikler:")
    print(f"  • Toplam ülke: {len(unified_data)}")
    print(f"  • Toplam period: {total_periods}")
    print(f"  • Başkent bilgisi olan: {with_capitals}")
    print(f"  • Başkent bilgisi olmayan: {without_capitals}")

if __name__ == '__main__':
    main()
