#!/usr/bin/env python3
"""
Oyun Başlangıç Değişkenleri Üretici
Her ülke-yıl kombinasyonu için 17 ana değişkenin başlangıç değerlerini çıkarır.

Bu veriler oyunun başlangıç noktasını belirler - ana sayfadaki grafik pozisyonu
ile aynı verilerden türetilir.

Çıktı: data/processed/game_data/initial_variables.json
"""

import pandas as pd
import numpy as np
import json
from pathlib import Path
import sys

# Proje kök dizinini ekle
project_root = Path(__file__).parent.parent.parent
sys.path.append(str(project_root))

# 17 Ana Değişken
CORE_17_VARIABLES = [
    "v2x_libdem",           # Liberal Demokrasi İndeksi
    "v2x_partipdem",        # Katılımcı Demokrasi İndeksi
    "v2x_delibdem",         # Müzakereci Demokrasi İndeksi
    "v2x_egaldem",          # Eşitlikçi Demokrasi İndeksi
    "v2x_freexp",           # İfade ve İnanç Özgürlüğü
    "v2mecenefm",           # Medya Sansürü Çabaları
    "v2x_cspart",           # Sivil Toplum Katılımı
    "v2cseeorgs",           # Örgütlenme Özgürlüğü
    "v2cscnsult",           # Sivil Toplum Danışması
    "v2x_elecreg",          # Seçim Rejimi
    "v2x_elecoff",          # Seçimle İşbaşına Gelme
    "v2juhcind",            # Yargı Bağımsızlığı
    "v2juaccnt",            # Hesap Verilebilirlik
    "v2x_corr",             # Politik Yolsuzluk
    "v2x_rule",             # Hukuk Üstünlüğü
    "v2xcs_ccsi",           # Core Civil Society Index
    "v2x_frassoc_thick"     # Association Freedom
]

def generate_initial_variables(vdem_file_path, output_file_path):
    """
    V-Dem veri setinden her ülke-yıl için 17 ana değişkeni çıkar.

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

    # 17 ana değişkenin varlığını kontrol et
    missing_vars = [var for var in CORE_17_VARIABLES if var not in vdem.columns]
    if missing_vars:
        print(f"\n⚠ Uyarı: {len(missing_vars)} değişken bulunamadı:")
        for var in missing_vars:
            print(f"   - {var}")

        # Sadece mevcut değişkenlerle devam et
        available_vars = [var for var in CORE_17_VARIABLES if var in vdem.columns]
        print(f"\n   {len(available_vars)} mevcut değişkenle devam ediliyor...")
    else:
        available_vars = CORE_17_VARIABLES

    print(f"\n📈 {len(available_vars)} değişken için başlangıç değerleri çıkarılıyor...\n")

    # Sadece gerekli sütunları seç
    required_cols = ['country_name', 'country_text_id', 'year'] + available_vars
    df = vdem[required_cols].copy()

    # Başlangıç değerleri sözlüğü
    initial_data = {}
    countries_processed = 0
    total_entries = 0

    # Her ülke için
    for country in df['country_name'].unique():
        country_data = df[df['country_name'] == country].sort_values('year')

        if len(country_data) == 0:
            continue

        # Ülke ID'sini al
        country_id = country_data['country_text_id'].iloc[0]

        # Ülke için veri yapısı
        initial_data[country_id] = {
            "country_name": country,
            "country_id": country_id,
            "years": {}
        }

        # Her yıl için
        for _, row in country_data.iterrows():
            year = int(row['year'])

            # 17 değişkenin değerlerini al
            variables = {}
            for var in available_vars:
                value = row[var]

                # NaN kontrolü
                if pd.isna(value):
                    variables[var] = None
                else:
                    # Float'a çevir ve 6 ondalık basamağa yuvarla
                    try:
                        variables[var] = round(float(value), 6)
                    except:
                        variables[var] = None

            # Yıl verisini kaydet
            initial_data[country_id]["years"][str(year)] = variables
            total_entries += 1

        countries_processed += 1

        if countries_processed % 20 == 0:
            print(f"   İşlenen: {countries_processed} ülke, {total_entries:,} ülke-yıl")

    print(f"\n✓ Veri çıkarma tamamlandı!")
    print(f"   Toplam ülke: {countries_processed:,}")
    print(f"   Toplam ülke-yıl: {total_entries:,}")
    print(f"   Ortalama yıl/ülke: {total_entries/countries_processed:.1f}")

    # İstatistikler
    print(f"\n📊 Değişken İstatistikleri:")
    for var in available_vars:
        all_values = []
        for country_data in initial_data.values():
            for year_data in country_data["years"].values():
                val = year_data.get(var)
                if val is not None:
                    all_values.append(val)

        if all_values:
            print(f"   {var}:")
            print(f"      - Ortalama: {np.mean(all_values):.4f}")
            print(f"      - Min: {np.min(all_values):.4f}")
            print(f"      - Max: {np.max(all_values):.4f}")
            print(f"      - Eksik: {total_entries - len(all_values):,} ({(total_entries - len(all_values))/total_entries*100:.1f}%)")

    # Çıktı dizinini oluştur
    output_path = Path(output_file_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # JSON olarak kaydet
    output_json = {
        "metadata": {
            "description": "Her ülke-yıl için 17 ana V-Dem değişkeninin başlangıç değerleri",
            "source": "V-Dem v15 (1789-2023)",
            "total_countries": countries_processed,
            "total_country_years": total_entries,
            "variables": available_vars,
            "missing_variables": missing_vars if missing_vars else [],
            "date_generated": pd.Timestamp.now().strftime("%Y-%m-%d %H:%M:%S"),
            "usage": "Oyun başlangıcında ülke-yıl seçimi için kullanılır"
        },
        "countries": initial_data
    }

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output_json, f, indent=2, ensure_ascii=False)

    print(f"\n💾 Dosya kaydedildi: {output_path}")
    print(f"   Dosya boyutu: {output_path.stat().st_size / 1024 / 1024:.1f} MB")

    # Örnek ülkeler göster
    print(f"\n📍 Örnek Ülkeler:")
    sample_countries = list(initial_data.keys())[:5]
    for country_id in sample_countries:
        country_info = initial_data[country_id]
        year_count = len(country_info["years"])
        years = sorted([int(y) for y in country_info["years"].keys()])
        print(f"   - {country_info['country_name']} ({country_id}): "
              f"{year_count} yıl ({years[0]}-{years[-1]})")

    return output_json

def main():
    """Ana fonksiyon"""
    # Dosya yolları
    vdem_file = project_root / "data/raw/V-Dem-CY-Full+Others-v15.csv"
    output_file = project_root / "data/processed/game_data/initial_variables.json"

    print("="*70)
    print("  OYUN BAŞLANGIÇ DEĞİŞKENLERİ ÜRETİCİ")
    print("="*70)
    print()

    # Kontroller
    if not vdem_file.exists():
        print(f"❌ Hata: V-Dem dosyası bulunamadı!")
        print(f"   Aranan: {vdem_file}")
        return 1

    # Hesaplama
    try:
        result = generate_initial_variables(vdem_file, output_file)
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
