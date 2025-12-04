#!/usr/bin/env python3
"""
Paydaş (Stakeholder) Profilleri Üretici
Her ülke-yıl için 5 baskı grubunun başlangıç influence ve satisfaction değerlerini hesaplar.

Baskı Grupları:
1. Askeri (Military) - Ordu ve güvenlik güçleri
2. Ekonomik Elitler (Economic Elite) - İşadamları, büyük sermaye
3. Sivil Toplum (Civil Society) - STK'lar, aktivistler
4. Dini Kurumlar (Religious) - Dini liderler ve organizasyonlar
5. Uluslararası (International) - Dış güçler, uluslararası örgütler

Çıktı: data/processed/game_data/stakeholder_profiles.json
"""

import pandas as pd
import numpy as np
import json
from pathlib import Path
import sys

# Proje kök dizinini ekle
project_root = Path(__file__).parent.parent.parent
sys.path.append(str(project_root))

def normalize(value, reverse=False):
    """
    Değeri 0-1 aralığına normalize et.

    Args:
        value: Ham değer
        reverse: True ise tersten normalize et (yüksek değer = düşük normalized)

    Returns:
        0-1 arası normalize edilmiş değer
    """
    if pd.isna(value):
        return 0.5  # Varsayılan

    # Değer zaten 0-1 aralığındaysa
    if 0 <= value <= 1:
        return (1 - value) if reverse else value

    # 0-4 aralığındaysa (V-Dem ordinal)
    if 0 <= value <= 4:
        normalized = value / 4.0
        return (1 - normalized) if reverse else normalized

    # Diğer durumlar için varsayılan
    return 0.5

def calculate_military_influence(row):
    """
    Askeri gücün influence değerini hesapla.

    Yüksek askeri etki = Yüksek influence
    """
    # v2csstruc_1: Güvenlik gücü (0-1, yüksek = güçlü)
    # v2xlg_legcon: Yasama üzerinde executive kontrol (0-1, yüksek = güçlü executive)
    # v2exfemhos: Kadın yönetici (0/1, ters oran - erkek dominant = askeri etki)

    security_force = normalize(row.get('v2csstruc_1', 0.5))
    exec_power = normalize(row.get('v2xlg_legcon', 0.5))

    # Ağırlıklı ortalama
    influence = (security_force * 0.7) + (exec_power * 0.3)

    return round(min(max(influence, 0.1), 0.9), 3)

def calculate_elite_influence(row):
    """
    Ekonomik elitlerin influence değerini hesapla.

    Yüksek yolsuzluk + düşük eşitlik = Yüksek elite influence
    """
    # v2x_corr: Yolsuzluk (0-1, yüksek = kötü, ters oran)
    # v2x_egaldem: Eşitlikçi demokrasi (0-1, yüksek = iyi, ters oran)
    # v2clacjust: Sosyal sınıf adaleti (0-4, yüksek = iyi, ters oran)

    corruption = normalize(row.get('v2x_corr', 0.5), reverse=True)
    inequality = normalize(row.get('v2x_egaldem', 0.5), reverse=True)
    class_justice = normalize(row.get('v2clacjust', 0.5), reverse=True)

    # Ağırlıklı ortalama
    influence = (corruption * 0.4) + (inequality * 0.4) + (class_justice * 0.2)

    return round(min(max(influence, 0.1), 0.9), 3)

def calculate_civil_society_influence(row):
    """
    Sivil toplumun influence değerini hesapla.

    Güçlü sivil toplum = Yüksek influence
    """
    # v2x_cspart: Sivil toplum katılımı (0-1, yüksek = iyi)
    # v2cseeorgs: Örgütlenme özgürlüğü (0-4, yüksek = iyi)
    # v2xcs_ccsi: Core Civil Society Index (0-1, yüksek = iyi)

    participation = normalize(row.get('v2x_cspart', 0.5))
    org_freedom = normalize(row.get('v2cseeorgs', 0.5))
    cs_index = normalize(row.get('v2xcs_ccsi', 0.5))

    # Ağırlıklı ortalama
    influence = (participation * 0.3) + (org_freedom * 0.3) + (cs_index * 0.4)

    return round(min(max(influence, 0.1), 0.9), 3)

def calculate_religious_influence(row, country_name):
    """
    Dini kurumların influence değerini hesapla.

    Ülkeye özgü heuristikler + V-Dem verileri
    """
    # v2clrelig: Dini özgürlük (0-4, yüksek = serbest, ters korelasyon ile etki)
    # v2catralag: Din-devlet ayrımı (0-3, yüksek = ayrı, ters korelasyon)

    religious_freedom = normalize(row.get('v2clrelig', 0.5))
    state_religion = normalize(row.get('v2catralag', 0.5), reverse=True)

    # Temel influence
    base_influence = (religious_freedom * 0.4) + (state_religion * 0.6)

    # Ülkeye özgü düzeltmeler (bazı ülkeler için)
    country_adjustments = {
        'Iran': 0.9,
        'Saudi Arabia': 0.9,
        'Vatican': 0.95,
        'Israel': 0.75,
        'Turkey': 0.65,
        'Pakistan': 0.75,
        'Indonesia': 0.6,
        'Italy': 0.55,
        'Poland': 0.6,
        'Brazil': 0.55
    }

    if country_name in country_adjustments:
        base_influence = (base_influence * 0.3) + (country_adjustments[country_name] * 0.7)

    return round(min(max(base_influence, 0.1), 0.9), 3)

def calculate_international_influence(row, country_name):
    """
    Uluslararası güçlerin influence değerini hesapla.

    Batı entegrasyonu + dış yardım bağımlılığı = Yüksek influence
    """
    # v2cafexch: Dış yardım/ticaret bağımlılığı (0-4)
    # v2caminor: Azınlık hakları (uluslararası baskı göstergesi, 0-4)

    foreign_dep = normalize(row.get('v2cafexch', 0.5))
    minority_rights = normalize(row.get('v2caminor', 0.5))

    # Temel influence
    base_influence = (foreign_dep * 0.5) + (minority_rights * 0.5)

    # Ülkeye özgü düzeltmeler (Batı ile entegrasyon)
    western_integration = {
        # AB Üyeleri
        'Germany': 0.85, 'France': 0.85, 'United Kingdom': 0.8,
        'Italy': 0.8, 'Spain': 0.8, 'Poland': 0.8,
        'Netherlands': 0.85, 'Belgium': 0.85, 'Austria': 0.85,

        # NATO Üyeleri (AB dışı)
        'Turkey': 0.75, 'Norway': 0.85, 'Canada': 0.75,

        # ABD Etkisi Altında
        'South Korea': 0.8, 'Japan': 0.8, 'Philippines': 0.75,
        'Saudi Arabia': 0.7, 'Israel': 0.85,

        # Az Etki
        'Russia': 0.2, 'China': 0.2, 'Iran': 0.15,
        'North Korea': 0.1, 'Cuba': 0.3, 'Venezuela': 0.3,

        # Orta
        'India': 0.5, 'Brazil': 0.6, 'Mexico': 0.65,
        'Argentina': 0.6, 'South Africa': 0.6
    }

    if country_name in western_integration:
        base_influence = (base_influence * 0.3) + (western_integration[country_name] * 0.7)

    return round(min(max(base_influence, 0.1), 0.9), 3)

def calculate_satisfaction(influence, democracy_level):
    """
    Başlangıç satisfaction değerini hesapla.

    Yüksek demokrasi = Dengeli satisfaction (0.5-0.7 arası)
    Düşük demokrasi = Baskın gruplara yüksek, diğerlerine düşük
    """
    # Demokrasi seviyesi yüksekse, herkes orta-yüksek satisfaction
    if democracy_level > 0.7:
        return round(0.5 + (np.random.random() * 0.2), 3)

    # Demokrasi düşükse, influence ile korelasyon
    if democracy_level < 0.4:
        if influence > 0.6:
            # Yüksek influence = Yüksek satisfaction (rejimden memnun)
            return round(0.6 + (np.random.random() * 0.3), 3)
        else:
            # Düşük influence = Düşük satisfaction (rejimden memnun değil)
            return round(0.2 + (np.random.random() * 0.3), 3)

    # Orta demokrasi - karma
    return round(0.4 + (np.random.random() * 0.3), 3)

def generate_stakeholder_profiles(vdem_file_path, output_file_path):
    """
    V-Dem veri setinden paydaş profillerini üret.

    Args:
        vdem_file_path: V-Dem CSV dosya yolu
        output_file_path: Çıktı JSON dosya yolu
    """
    print("📊 V-Dem veri seti yükleniyor...")
    print(f"   Dosya: {vdem_file_path}")

    # V-Dem veri setini yükle
    vdem = pd.read_csv(vdem_file_path, low_memory=False)

    print(f"✓ Veri yüklendi: {len(vdem):,} satır")
    print(f"   Yıl aralığı: {vdem['year'].min()} - {vdem['year'].max()}")
    print(f"   Ülke sayısı: {vdem['country_name'].nunique()}")

    print(f"\n📈 Paydaş profilleri hesaplanıyor...\n")

    stakeholder_data = {}
    countries_processed = 0
    total_entries = 0

    # Her ülke için
    for country in vdem['country_name'].unique():
        country_data = vdem[vdem['country_name'] == country].sort_values('year')

        if len(country_data) == 0:
            continue

        # Ülke ID'sini al
        country_id = country_data['country_text_id'].iloc[0]

        # Ülke için veri yapısı
        stakeholder_data[country_id] = {
            "country_name": country,
            "country_id": country_id,
            "years": {}
        }

        # Her yıl için
        for _, row in country_data.iterrows():
            year = int(row['year'])

            # Demokrasi seviyesi (satisfaction hesabı için)
            democracy_level = normalize(row.get('v2x_libdem', 0.5))

            # 5 paydaş grubunu hesapla
            stakeholders = {
                "military": {
                    "influence": calculate_military_influence(row),
                    "satisfaction": None  # Aşağıda hesaplanacak
                },
                "elite": {
                    "influence": calculate_elite_influence(row),
                    "satisfaction": None
                },
                "civil_society": {
                    "influence": calculate_civil_society_influence(row),
                    "satisfaction": None
                },
                "religious": {
                    "influence": calculate_religious_influence(row, country),
                    "satisfaction": None
                },
                "international": {
                    "influence": calculate_international_influence(row, country),
                    "satisfaction": None
                }
            }

            # Satisfaction değerlerini hesapla
            for group_name, group_data in stakeholders.items():
                group_data["satisfaction"] = calculate_satisfaction(
                    group_data["influence"],
                    democracy_level
                )

            # Yıl verisini kaydet
            stakeholder_data[country_id]["years"][str(year)] = stakeholders
            total_entries += 1

        countries_processed += 1

        if countries_processed % 20 == 0:
            print(f"   İşlenen: {countries_processed} ülke, {total_entries:,} ülke-yıl")

    print(f"\n✓ Paydaş profilleri hesaplandı!")
    print(f"   Toplam ülke: {countries_processed:,}")
    print(f"   Toplam ülke-yıl: {total_entries:,}")

    # İstatistikler
    print(f"\n📊 Paydaş İstatistikleri:")
    for group in ["military", "elite", "civil_society", "religious", "international"]:
        all_influences = []
        all_satisfactions = []

        for country_data in stakeholder_data.values():
            for year_data in country_data["years"].values():
                all_influences.append(year_data[group]["influence"])
                all_satisfactions.append(year_data[group]["satisfaction"])

        print(f"\n   {group.upper()}:")
        print(f"      Influence  - Ort: {np.mean(all_influences):.3f}, "
              f"Min: {np.min(all_influences):.3f}, Max: {np.max(all_influences):.3f}")
        print(f"      Satisfaction - Ort: {np.mean(all_satisfactions):.3f}, "
              f"Min: {np.min(all_satisfactions):.3f}, Max: {np.max(all_satisfactions):.3f}")

    # Çıktı dizinini oluştur
    output_path = Path(output_file_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # JSON olarak kaydet
    output_json = {
        "metadata": {
            "description": "Her ülke-yıl için 5 paydaş grubunun influence ve satisfaction değerleri",
            "source": "V-Dem v15 (1789-2023)",
            "total_countries": countries_processed,
            "total_country_years": total_entries,
            "stakeholder_groups": ["military", "elite", "civil_society", "religious", "international"],
            "date_generated": pd.Timestamp.now().strftime("%Y-%m-%d %H:%M:%S"),
            "usage": "Oyun başlangıcında paydaş başlangıç değerleri için kullanılır"
        },
        "countries": stakeholder_data
    }

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output_json, f, indent=2, ensure_ascii=False)

    print(f"\n💾 Dosya kaydedildi: {output_path}")
    print(f"   Dosya boyutu: {output_path.stat().st_size / 1024 / 1024:.1f} MB")

    # Örnek ülke göster
    print(f"\n📍 Örnek: Türkiye 2020")
    if 'TUR' in stakeholder_data and '2020' in stakeholder_data['TUR']['years']:
        turkey_2020 = stakeholder_data['TUR']['years']['2020']
        for group, data in turkey_2020.items():
            print(f"   {group:15} - Influence: {data['influence']:.3f}, "
                  f"Satisfaction: {data['satisfaction']:.3f}")

    return output_json

def main():
    """Ana fonksiyon"""
    # Dosya yolları
    vdem_file = project_root / "data/raw/V-Dem-CY-Full+Others-v15.csv"
    output_file = project_root / "data/processed/game_data/stakeholder_profiles.json"

    print("="*70)
    print("  PAYDAŞ PROFİLLERİ ÜRETİCİ")
    print("="*70)
    print()

    # Kontroller
    if not vdem_file.exists():
        print(f"❌ Hata: V-Dem dosyası bulunamadı!")
        print(f"   Aranan: {vdem_file}")
        return 1

    # Rastgelelik için seed
    np.random.seed(42)

    # Hesaplama
    try:
        result = generate_stakeholder_profiles(vdem_file, output_file)
        print("\n" + "="*70)
        print("✅ İşlem başarıyla tamamlandı!")
        print("="*70)
        return 0
    except Exception as e:
        print(f"\n❌ Hata oluştu: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    exit(main())
