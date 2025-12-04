#!/usr/bin/env python3
"""
Faktör Yükleme (Loading) Matrisi Çıkarıcı
17 V-Dem değişkenini 2 faktöre (State Power, Society Power) dönüştüren
loading matrisini hesaplar veya mevcut analizden çıkarır.

Bu matris oyunda 17 değişken → 2 faktör dönüşümü için kullanılır.

Çıktı: data/processed/game_data/factor_loadings.json
"""

import pandas as pd
import numpy as np
import json
from pathlib import Path
import sys
from sklearn.decomposition import FactorAnalysis
from sklearn.preprocessing import StandardScaler

# Proje kök dizinini ekle
project_root = Path(__file__).parent.parent.parent
sys.path.append(str(project_root))

# 17 Ana Değişken (Faktör analizine girecek)
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

def extract_factor_loadings(vdem_file_path, output_file_path):
    """
    V-Dem veri setinden faktör yükleme matrisini hesapla.

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

    # 17 ana değişkenin varlığını kontrol et
    missing_vars = [var for var in CORE_17_VARIABLES if var not in vdem.columns]
    if missing_vars:
        print(f"\n⚠ Uyarı: {len(missing_vars)} değişken bulunamadı:")
        for var in missing_vars:
            print(f"   - {var}")

        available_vars = [var for var in CORE_17_VARIABLES if var in vdem.columns]
        print(f"\n   {len(available_vars)} mevcut değişkenle devam ediliyor...")
    else:
        available_vars = CORE_17_VARIABLES

    # 17 değişkeni seç
    df = vdem[available_vars].copy()

    # NaN değerleri ortalama ile doldur
    print(f"\n📈 Faktör analizi hazırlığı...")
    print(f"   Eksik değer oranı: {df.isna().sum().sum() / (len(df) * len(available_vars)) * 100:.1f}%")

    for col in available_vars:
        if df[col].isna().sum() > 0:
            df[col].fillna(df[col].mean(), inplace=True)

    # Standardize et
    scaler = StandardScaler()
    df_scaled = scaler.fit_transform(df)

    print(f"✓ Veri standardize edildi (mean=0, std=1)")

    # Faktör analizi (2 faktör)
    print(f"\n🔬 Faktör analizi çalıştırılıyor (n_factors=2)...")

    fa = FactorAnalysis(n_components=2, random_state=42, max_iter=1000)
    fa.fit(df_scaled)

    # Yükleme matrisini al
    loadings = fa.components_.T  # Shape: (17, 2)

    print(f"✓ Faktör analizi tamamlandı!")

    # Varyans açıklaması (yaklaşık)
    # FactorAnalysis'te explained_variance_ doğrudan yok, hesaplayalım
    factor_scores = fa.transform(df_scaled)
    total_var = np.var(df_scaled, axis=0).sum()
    factor1_var = np.var(factor_scores[:, 0])
    factor2_var = np.var(factor_scores[:, 1])

    explained_var_1 = factor1_var / total_var
    explained_var_2 = factor2_var / total_var

    print(f"\n📊 Varyans Açıklaması:")
    print(f"   Faktör 1 (State Power): {explained_var_1*100:.1f}%")
    print(f"   Faktör 2 (Society Power): {explained_var_2*100:.1f}%")
    print(f"   Toplam: {(explained_var_1 + explained_var_2)*100:.1f}%")

    # Yüklemeleri yazdır
    print(f"\n📋 Faktör Yüklemeleri:")
    print(f"   {'Değişken':<25} {'Factor 1':>10} {'Factor 2':>10}")
    print(f"   {'-'*25} {'-'*10} {'-'*10}")

    for i, var in enumerate(available_vars):
        loading1 = loadings[i, 0]
        loading2 = loadings[i, 1]
        print(f"   {var:<25} {loading1:>10.4f} {loading2:>10.4f}")

    # En yüksek yüklemeler
    print(f"\n🔝 Factor 1 (State Power) - En Yüksek Yüklemeler:")
    factor1_sorted = sorted(enumerate(loadings[:, 0]), key=lambda x: abs(x[1]), reverse=True)
    for i, (idx, loading) in enumerate(factor1_sorted[:5], 1):
        var_name = available_vars[idx]
        print(f"   {i}. {var_name}: {loading:.4f}")

    print(f"\n🔝 Factor 2 (Society Power) - En Yüksek Yüklemeler:")
    factor2_sorted = sorted(enumerate(loadings[:, 1]), key=lambda x: abs(x[1]), reverse=True)
    for i, (idx, loading) in enumerate(factor2_sorted[:5], 1):
        var_name = available_vars[idx]
        print(f"   {i}. {var_name}: {loading:.4f}")

    # JSON formatına dönüştür
    loadings_dict = {
        "factor1_state": [round(float(loadings[i, 0]), 6) for i in range(len(available_vars))],
        "factor2_society": [round(float(loadings[i, 1]), 6) for i in range(len(available_vars))]
    }

    # Çıktı dizinini oluştur
    output_path = Path(output_file_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # JSON olarak kaydet
    output_json = {
        "metadata": {
            "description": "17 V-Dem değişkenini 2 faktöre (State Power, Society Power) dönüştüren yükleme matrisi",
            "source": "V-Dem v15 (1789-2023)",
            "method": "Factor Analysis (sklearn)",
            "n_components": 2,
            "variables_count": len(available_vars),
            "explained_variance": {
                "factor1_state": round(float(explained_var_1), 4),
                "factor2_society": round(float(explained_var_2), 4),
                "total": round(float(explained_var_1 + explained_var_2), 4)
            },
            "date_calculated": pd.Timestamp.now().strftime("%Y-%m-%d %H:%M:%S"),
            "usage": "Oyunda 17 değişken değerleri bu matrisle çarpılarak 2 faktör skoru hesaplanır"
        },
        "loadings": loadings_dict,
        "variables": available_vars,
        "formula": {
            "description": "Faktör skorları hesaplama formülü",
            "state_power": "Σ(variable[i] × factor1_state[i]) for i in 0..16",
            "society_power": "Σ(variable[i] × factor2_society[i]) for i in 0..16",
            "note": "Değişkenler önce standardize edilmeli (mean=0, std=1)"
        }
    }

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output_json, f, indent=2, ensure_ascii=False)

    print(f"\n💾 Dosya kaydedildi: {output_path}")
    print(f"   Dosya boyutu: {output_path.stat().st_size / 1024:.1f} KB")

    # Kullanım örneği
    print(f"\n📖 Kullanım Örneği:")
    print(f"""
    # JavaScript'te kullanım:
    const loadings = await fetch('factor_loadings.json').then(r => r.json());

    // 17 değişken değerleri (standardize edilmiş)
    const variables = [0.5, -0.3, 0.8, ...]; // 17 değer

    // State Power hesapla
    let statePower = 0;
    for (let i = 0; i < 17; i++) {{
        statePower += variables[i] * loadings.loadings.factor1_state[i];
    }}

    // Society Power hesapla
    let societyPower = 0;
    for (let i = 0; i < 17; i++) {{
        societyPower += variables[i] * loadings.loadings.factor2_society[i];
    }}
    """)

    return output_json

def main():
    """Ana fonksiyon"""
    # Dosya yolları
    vdem_file = project_root / "data/raw/V-Dem-CY-Full+Others-v15.csv"
    output_file = project_root / "data/processed/game_data/factor_loadings.json"

    print("="*70)
    print("  FAKTÖR YÜKLEME MATRİSİ ÇIKARICI")
    print("="*70)
    print()

    # Kontroller
    if not vdem_file.exists():
        print(f"❌ Hata: V-Dem dosyası bulunamadı!")
        print(f"   Aranan: {vdem_file}")
        return 1

    # Hesaplama
    try:
        result = extract_factor_loadings(vdem_file, output_file)
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
