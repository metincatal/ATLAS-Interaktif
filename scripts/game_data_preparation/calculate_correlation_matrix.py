#!/usr/bin/env python3
"""
V-Dem Korelasyon Matrisi Hesaplayıcı
500+ V-Dem değişkeninin 17 ana değişkenle korelasyonunu hesaplar.

Kullanım: Bir politika 500+ değişkeni etkilediğinde, korelasyon matrisi
ile bu etkiler 17 ana değişkene yayılır.

Çıktı: data/processed/game_data/correlation_matrix.json
"""

import pandas as pd
import numpy as np
import json
from pathlib import Path
import sys

# Proje kök dizinini ekle
project_root = Path(__file__).parent.parent.parent
sys.path.append(str(project_root))

# 17 Ana Değişken (Oyunun temelini oluşturan değişkenler)
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

def calculate_correlation_matrix(vdem_file_path, output_file_path, correlation_threshold=0.3):
    """
    V-Dem veri setindeki tüm değişkenlerin 17 ana değişkenle korelasyonunu hesapla.

    Args:
        vdem_file_path: V-Dem CSV dosya yolu
        output_file_path: Çıktı JSON dosya yolu
        correlation_threshold: Minimum korelasyon eşiği (|r| > threshold)
    """
    print("📊 V-Dem veri seti yükleniyor...")
    print(f"   Dosya: {vdem_file_path}")

    # V-Dem veri setini yükle
    vdem = pd.read_csv(vdem_file_path, low_memory=False)

    print(f"✓ Veri yüklendi: {len(vdem):,} satır, {len(vdem.columns):,} sütun")

    # 17 ana değişkenin varlığını kontrol et
    missing_core = [var for var in CORE_17_VARIABLES if var not in vdem.columns]
    if missing_core:
        print(f"\n⚠ Uyarı: {len(missing_core)} ana değişken bulunamadı:")
        for var in missing_core:
            print(f"   - {var}")
        print("\n   Mevcut değişkenlerle devam ediliyor...")
        core_vars = [var for var in CORE_17_VARIABLES if var in vdem.columns]
    else:
        core_vars = CORE_17_VARIABLES

    print(f"\n✓ {len(core_vars)} ana değişken bulundu")

    # Meta sütunları (hesaplamaya dahil edilmeyecek)
    meta_columns = [
        'country_name', 'country_text_id', 'country_id', 'year',
        'historical_date', 'project', 'historical', 'histname',
        'codingstart', 'codingend', 'codingstart_contemp', 'codingend_contemp',
        'codingstart_hist', 'codingend_hist', 'gapstart1', 'gapstart2',
        'gapstart3', 'gapend1', 'gapend2', 'gapend3', 'gap_index', 'COWcode'
    ]

    # Tüm numerik sütunları bul
    all_vars = []
    for col in vdem.columns:
        if col in meta_columns:
            continue
        if col in core_vars:
            continue  # Ana değişkenleri atlayacağız
        try:
            if vdem[col].dtype in ['float64', 'int64', 'float32', 'int32']:
                all_vars.append(col)
        except:
            continue

    print(f"📈 {len(all_vars):,} değişken için korelasyon hesaplanacak")
    print(f"   Korelasyon eşiği: |r| > {correlation_threshold}")
    print("\n   Hesaplama başlıyor...\n")

    correlation_matrix = {}
    total_correlations = 0
    processed = 0

    # Her değişken için 17 ana değişkenle korelasyonu hesapla
    for idx, var in enumerate(all_vars, 1):
        if idx % 100 == 0:
            print(f"   İşlenen: {idx}/{len(all_vars)} ({idx/len(all_vars)*100:.1f}%) - "
                  f"Toplam korelasyon: {total_correlations:,}")

        try:
            # Değişkeni numerik yap
            var_data = pd.to_numeric(vdem[var], errors='coerce')

            # NaN değerleri çok fazlaysa atla
            if var_data.isna().sum() / len(var_data) > 0.5:
                continue

            correlations = {}

            # Her ana değişkenle korelasyonu hesapla
            for core_var in core_vars:
                core_data = pd.to_numeric(vdem[core_var], errors='coerce')

                # İki seri arasında yeterli ortak nokta var mı?
                valid_mask = ~(var_data.isna() | core_data.isna())
                if valid_mask.sum() < 50:  # En az 50 ortak gözlem
                    continue

                # Pearson korelasyonu hesapla
                corr = var_data[valid_mask].corr(core_data[valid_mask])

                # Eşik kontrolü
                if not np.isnan(corr) and abs(corr) > correlation_threshold:
                    correlations[core_var] = round(corr, 4)
                    total_correlations += 1

            # Eğer en az bir korelasyon varsa kaydet
            if correlations:
                correlation_matrix[var] = correlations
                processed += 1

        except Exception as e:
            # Sessizce geç
            continue

    print(f"\n✓ Korelasyon hesaplaması tamamlandı!")
    print(f"   İşlenen değişken: {processed:,} / {len(all_vars):,}")
    print(f"   Toplam korelasyon bağlantısı: {total_correlations:,}")
    print(f"   Ortalama bağlantı/değişken: {total_correlations/processed:.1f}" if processed > 0 else "")

    # İstatistikler
    if processed > 0:
        print(f"\n📊 Korelasyon Dağılımı:")

        # Her ana değişkenin kaç kez bağlı olduğu
        core_var_counts = {var: 0 for var in core_vars}
        all_corr_values = []

        for var, correlations in correlation_matrix.items():
            for core_var, corr_value in correlations.items():
                core_var_counts[core_var] += 1
                all_corr_values.append(abs(corr_value))

        print("\n   Ana Değişken Bağlantıları:")
        sorted_counts = sorted(core_var_counts.items(), key=lambda x: x[1], reverse=True)
        for core_var, count in sorted_counts[:10]:
            print(f"   - {core_var}: {count:,} bağlantı")

        print(f"\n   Korelasyon Değerleri:")
        print(f"   - Ortalama |r|: {np.mean(all_corr_values):.3f}")
        print(f"   - Medyan |r|: {np.median(all_corr_values):.3f}")
        print(f"   - Max |r|: {np.max(all_corr_values):.3f}")

        # En yüksek korelasyonlar
        print(f"\n🔗 En Yüksek 10 Korelasyon:")
        all_pairs = []
        for var, correlations in correlation_matrix.items():
            for core_var, corr_value in correlations.items():
                all_pairs.append((var, core_var, abs(corr_value), corr_value))

        all_pairs.sort(key=lambda x: x[2], reverse=True)
        for i, (var, core_var, abs_corr, corr) in enumerate(all_pairs[:10], 1):
            direction = "+" if corr > 0 else "-"
            print(f"   {i}. {var} ↔ {core_var}: {direction}{abs_corr:.3f}")

    # Çıktı dizinini oluştur
    output_path = Path(output_file_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # JSON olarak kaydet
    output_json = {
        "metadata": {
            "description": "500+ V-Dem değişkeninin 17 ana değişkenle korelasyon matrisi",
            "source": "V-Dem v15 (1789-2023)",
            "correlation_method": "Pearson",
            "correlation_threshold": correlation_threshold,
            "total_variables": processed,
            "total_correlations": total_correlations,
            "core_variables": core_vars,
            "date_calculated": pd.Timestamp.now().strftime("%Y-%m-%d %H:%M:%S")
        },
        "correlations": correlation_matrix
    }

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output_json, f, indent=2, ensure_ascii=False)

    print(f"\n💾 Dosya kaydedildi: {output_path}")
    print(f"   Dosya boyutu: {output_path.stat().st_size / 1024:.1f} KB")

    return output_json

def main():
    """Ana fonksiyon"""
    # Dosya yolları
    vdem_file = project_root / "data/raw/V-Dem-CY-Full+Others-v15.csv"
    output_file = project_root / "data/processed/game_data/correlation_matrix.json"

    print("="*70)
    print("  V-DEM KORELASYON MATRİSİ HESAPLAYICI")
    print("="*70)
    print()

    # Kontroller
    if not vdem_file.exists():
        print(f"❌ Hata: V-Dem dosyası bulunamadı!")
        print(f"   Aranan: {vdem_file}")
        return 1

    # Hesaplama
    try:
        result = calculate_correlation_matrix(
            vdem_file,
            output_file,
            correlation_threshold=0.3  # |r| > 0.3
        )
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
