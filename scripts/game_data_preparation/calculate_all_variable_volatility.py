#!/usr/bin/env python3
"""
V-Dem Değişken Volatilite Hesaplayıcı
Tüm 500+ V-Dem değişkeni için historik volatilite (sigma) hesaplar.

Formül: σ = STD(|Δt|) where Δt = değer(t) - değer(t-1)
Tüm ülkeler ve yıllar üzerinden birleştirilmiş volatilite hesaplanır.

Çıktı: data/processed/game_data/variable_volatility.json
"""

import pandas as pd
import numpy as np
import json
from pathlib import Path
import sys

# Proje kök dizinini ekle
project_root = Path(__file__).parent.parent.parent
sys.path.append(str(project_root))

def calculate_variable_volatility(vdem_file_path, output_file_path):
    """
    V-Dem veri setindeki tüm numerik değişkenler için volatilite hesapla.

    Args:
        vdem_file_path: V-Dem CSV dosya yolu
        output_file_path: Çıktı JSON dosya yolu
    """
    print("📊 V-Dem veri seti yükleniyor...")
    print(f"   Dosya: {vdem_file_path}")

    # V-Dem veri setini yükle
    vdem = pd.read_csv(vdem_file_path, low_memory=False)

    print(f"✓ Veri yüklendi: {len(vdem):,} satır, {len(vdem.columns):,} sütun")
    print(f"   Yıl aralığı: {vdem['year'].min()} - {vdem['year'].max()}")
    print(f"   Ülke sayısı: {vdem['country_name'].nunique()}")

    # Meta sütunları (hesaplamaya dahil edilmeyecek)
    meta_columns = [
        'country_name', 'country_text_id', 'country_id', 'year',
        'historical_date', 'project', 'historical', 'histname',
        'codingstart', 'codingend', 'codingstart_contemp', 'codingend_contemp',
        'codingstart_hist', 'codingend_hist', 'gapstart1', 'gapstart2',
        'gapstart3', 'gapend1', 'gapend2', 'gapend3', 'gap_index', 'COWcode'
    ]

    # Numerik sütunları bul (meta sütunlar hariç)
    numeric_cols = []
    for col in vdem.columns:
        if col in meta_columns:
            continue
        # Sütun numerik mi kontrol et
        try:
            pd.to_numeric(vdem[col], errors='coerce')
            if vdem[col].dtype in ['float64', 'int64', 'float32', 'int32']:
                numeric_cols.append(col)
        except:
            continue

    print(f"\n📈 {len(numeric_cols):,} numerik değişken bulundu")
    print("   Volatilite hesaplaması başlıyor...\n")

    volatility_data = {}
    skipped_variables = []

    # Veriyi önce ülke ve yıla göre sırala (bir kez)
    vdem_sorted = vdem.sort_values(['country_name', 'year'])

    # Her değişken için volatilite hesapla
    for idx, col in enumerate(numeric_cols, 1):
        if idx % 50 == 0:
            print(f"   İşlenen: {idx}/{len(numeric_cols)} ({idx/len(numeric_cols)*100:.1f}%)")

        try:
            # Değişkeni numerik yap
            values = pd.to_numeric(vdem_sorted[col], errors='coerce')

            # Tüm değerlerin istatistikleri
            all_values = values.dropna()
            if len(all_values) < 10:
                skipped_variables.append(col)
                continue

            min_val = float(all_values.min())
            max_val = float(all_values.max())
            mean_val = float(all_values.mean())

            # Ülke bazlı değişimleri hesapla (vektörel işlem)
            # Her ülke için diff() hesapla
            yearly_changes = vdem_sorted.groupby('country_name')[col].apply(
                lambda x: pd.to_numeric(x, errors='coerce').diff().abs()
            ).dropna()

            if len(yearly_changes) < 10:
                skipped_variables.append(col)
                continue

            # Volatilite (standart sapma) hesapla
            sigma = float(yearly_changes.std())

            # Kaydet
            volatility_data[col] = {
                "sigma": round(sigma, 6),
                "min": round(min_val, 6),
                "max": round(max_val, 6),
                "mean": round(mean_val, 6),
                "sample_size": len(yearly_changes)
            }

        except Exception as e:
            print(f"⚠ Hata ({col}): {e}")
            skipped_variables.append(col)
            continue

    print(f"\n✓ Volatilite hesaplaması tamamlandı!")
    print(f"   Başarılı: {len(volatility_data):,} değişken")
    print(f"   Atlanan: {len(skipped_variables):,} değişken")

    # Çıktı dizinini oluştur
    output_path = Path(output_file_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # JSON olarak kaydet
    output_json = {
        "metadata": {
            "description": "V-Dem değişken volatilite (sigma) değerleri",
            "source": "V-Dem v15 (1789-2023)",
            "calculation": "Tüm ülkeler için yıllık mutlak değişimlerin standart sapması",
            "total_variables": len(volatility_data),
            "skipped_variables": len(skipped_variables),
            "date_calculated": pd.Timestamp.now().strftime("%Y-%m-%d %H:%M:%S")
        },
        "variables": volatility_data
    }

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output_json, f, indent=2, ensure_ascii=False)

    print(f"\n💾 Dosya kaydedildi: {output_path}")
    print(f"   Dosya boyutu: {output_path.stat().st_size / 1024:.1f} KB")

    # İstatistikler
    sigmas = [v['sigma'] for v in volatility_data.values()]
    print(f"\n📊 Volatilite İstatistikleri:")
    print(f"   Ortalama σ: {np.mean(sigmas):.6f}")
    print(f"   Medyan σ: {np.median(sigmas):.6f}")
    print(f"   Min σ: {np.min(sigmas):.6f}")
    print(f"   Max σ: {np.max(sigmas):.6f}")

    # En volatil değişkenler
    print(f"\n🔥 En Volatil 10 Değişken:")
    sorted_vars = sorted(volatility_data.items(), key=lambda x: x[1]['sigma'], reverse=True)
    for i, (var_name, var_data) in enumerate(sorted_vars[:10], 1):
        print(f"   {i}. {var_name}: σ = {var_data['sigma']:.6f}")

    # En stabil değişkenler
    print(f"\n🔒 En Stabil 10 Değişken:")
    for i, (var_name, var_data) in enumerate(sorted_vars[-10:], 1):
        print(f"   {i}. {var_name}: σ = {var_data['sigma']:.6f}")

    if skipped_variables:
        print(f"\n⚠ Atlanan Değişkenler ({len(skipped_variables)}):")
        for var in skipped_variables[:10]:
            print(f"   - {var}")
        if len(skipped_variables) > 10:
            print(f"   ... ve {len(skipped_variables) - 10} değişken daha")

    return output_json

def main():
    """Ana fonksiyon"""
    # Dosya yolları
    vdem_file = project_root / "data/raw/V-Dem-CY-Full+Others-v15.csv"
    output_file = project_root / "data/processed/game_data/variable_volatility.json"

    print("="*70)
    print("  V-DEM DEĞİŞKEN VOLATİLİTE HESAPLAYICI")
    print("="*70)
    print()

    # Kontroller
    if not vdem_file.exists():
        print(f"❌ Hata: V-Dem dosyası bulunamadı!")
        print(f"   Aranan: {vdem_file}")
        return 1

    # Hesaplama
    try:
        result = calculate_variable_volatility(vdem_file, output_file)
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
