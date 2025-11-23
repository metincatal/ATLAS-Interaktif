#!/usr/bin/env python3
"""
Tarihi Harita Yükleme Test Script
Test edilen yıllar: 1881, 1923, 2020
"""
import json
from pathlib import Path
from datetime import datetime

# Veri dizini
DATA_DIR = Path(__file__).parent

def load_index():
    """Master index'i yükle"""
    with open(DATA_DIR / 'index.json', 'r', encoding='utf-8') as f:
        return json.load(f)

def load_historical_names():
    """Tarihi ad eşleştirmelerini yükle"""
    with open(DATA_DIR / 'historical_names.json', 'r', encoding='utf-8') as f:
        return json.load(f)

def get_map_for_year(year, index_data):
    """
    Belirli bir yıl için en uygun haritayı bul

    Args:
        year: Hedef yıl
        index_data: Master index verisi

    Returns:
        dict: Harita milestone bilgisi veya None
    """
    # Tam eşleşme ara
    for milestone in index_data['milestones']:
        if milestone['year'] == year:
            return milestone

    # En yakın önceki milestone'u bul
    suitable_milestones = [m for m in index_data['milestones'] if m['year'] <= year]

    if suitable_milestones:
        # En yakın olanı seç
        return max(suitable_milestones, key=lambda m: m['year'])

    return None

def get_historical_name(vdem_name, year, names_data):
    """
    V-Dem ülke adını tarihi ada çevir

    Args:
        vdem_name: V-Dem'deki modern ad
        year: Hedef yıl
        names_data: Tarihi ad eşleştirme verisi

    Returns:
        dict: Tarihi ad bilgisi veya None
    """
    for mapping in names_data['mappings']:
        if mapping['vdem_name'] == vdem_name:
            for period in mapping['historical_periods']:
                if period['start_year'] <= year <= period['end_year']:
                    return period

    return None

def test_map_loading(test_year):
    """
    Belirli bir yıl için harita yükleme testini yap

    Args:
        test_year: Test edilecek yıl
    """
    print(f"\n{'='*60}")
    print(f"TEST: {test_year} Yılı için Harita Yükleme")
    print(f"{'='*60}")

    # Index'i yükle
    index_data = load_index()
    names_data = load_historical_names()

    # Uygun haritayı bul
    milestone = get_map_for_year(test_year, index_data)

    if not milestone:
        print(f"❌ {test_year} için uygun harita bulunamadı!")
        return False

    print(f"\n📅 Hedef Yıl: {test_year}")
    print(f"📍 Kullanılacak Milestone: {milestone['year']}")
    print(f"📂 Dosya Yolu: {milestone['path']}")
    print(f"🗂️  Kaynak: {milestone['source']}")

    # Harita dosyasını yükle
    map_path = DATA_DIR / milestone['path']

    if not map_path.exists():
        print(f"❌ Harita dosyası bulunamadı: {map_path}")
        return False

    with open(map_path, 'r', encoding='utf-8') as f:
        map_data = json.load(f)

    print(f"✓ Harita başarıyla yüklendi")
    print(f"✓ Feature sayısı: {len(map_data['features'])}")

    # Türkiye'yi bul ve tarihi adını göster
    print(f"\n🇹🇷 Türkiye Testi:")

    # CShapes ve Historical Basemaps farklı property isimleri kullanıyor
    turkey_found = False

    for feature in map_data['features']:
        props = feature['properties']

        # CShapes formatı
        if 'cntry_name' in props and 'Turkey' in props['cntry_name']:
            print(f"   GeoJSON'daki ad: {props['cntry_name']}")
            print(f"   Başkent: {props.get('capname', 'N/A')}")
            turkey_found = True
            break

        # Historical Basemaps formatı
        if 'NAME' in props and props['NAME'] == 'Ottoman Empire':
            print(f"   GeoJSON'daki ad: {props['NAME']}")
            print(f"   Bölge: {props.get('SUBJECTO', 'N/A')}")
            turkey_found = True
            break

    if turkey_found:
        # Tarihi ad eşleştirmesi yap
        historical = get_historical_name('Türkiye', test_year, names_data)

        if historical:
            print(f"   Görüntülenecek ad: {historical['display_name']}")
            print(f"   İngilizce ad: {historical['display_name_en']}")
            print(f"   Not: {historical['notes']}")
        else:
            print(f"   Görüntülenecek ad: Türkiye (mapping bulunamadı)")
    else:
        print(f"   ⚠️  Türkiye bulunamadı (bu yıl için normal olabilir)")

    # Bazı diğer ülkeleri test et
    print(f"\n🌍 Diğer Önemli Ülkeler:")

    test_countries = {
        'Russia': 'Rusya',
        'Germany': 'Almanya',
        'China': 'Çin',
        'India': 'Hindistan'
    }

    found_count = 0
    for vdem_name, tr_name in test_countries.items():
        historical = get_historical_name(vdem_name, test_year, names_data)
        if historical:
            print(f"   • {tr_name}: {historical['display_name']}")
            found_count += 1

    print(f"\n✓ Test tamamlandı! ({found_count}/{len(test_countries)} ülke tarihi ad eşleştirmesi yapıldı)")
    return True

def main():
    """Ana test fonksiyonu"""
    print("\n" + "="*60)
    print("ATLAS İnteraktif - Tarihi Harita Yükleme Testi")
    print("="*60)

    # Sistem bilgisi
    print(f"\n📊 Sistem Bilgisi:")
    print(f"   Test Tarihi: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"   Veri Dizini: {DATA_DIR}")

    # Test yılları
    test_years = [1881, 1923, 2020]

    results = []
    for year in test_years:
        success = test_map_loading(year)
        results.append((year, success))

    # Özet
    print(f"\n{'='*60}")
    print("TEST ÖZETİ")
    print(f"{'='*60}\n")

    for year, success in results:
        status = "✓ BAŞARILI" if success else "❌ BAŞARISIZ"
        print(f"{year}: {status}")

    all_passed = all(result[1] for result in results)

    if all_passed:
        print(f"\n🎉 Tüm testler başarıyla tamamlandı!")
        return 0
    else:
        print(f"\n⚠️  Bazı testler başarısız oldu.")
        return 1

if __name__ == "__main__":
    exit(main())
