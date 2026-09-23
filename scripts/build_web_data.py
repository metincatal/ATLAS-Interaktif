"""
ATLAS İnteraktif — Web veri hattı
=================================

Ham veri setlerinden (V-Dem v15, WGI) ve mevcut analiz çıktılarından web
uygulamasının kullandığı hafif JSON dosyalarını üretir: data/web/

Çalıştırma (proje kökünden):
    python3 scripts/build_web_data.py

Gerekenler: pandas, numpy, scikit-learn, factor_analyzer
Ham veriler (git'e dahil değil): data/raw/V-Dem-CY-Full+Others-v15.csv,
data/raw/wgidataset.csv

Neden var?
- Eski modern analizde (1996–2023) WGI ve V-Dem ülke ADLARIYLA birleştiriliyordu;
  "Russian Federation" / "Russia" gibi eşleşmeyen adlar yüzünden Rusya, Mısır,
  İran, Venezuela, Yemen vb. veriden düşüyordu. Burada birleştirme ülke
  KODLARIYLA (V-Dem country_text_id) yapılır; yöntem defterdekiyle aynıdır:
  yıllık z-skor -> 2 faktörlü, varimax rotasyonlu faktör analizi.
- 1789–1995 dönemi, tarihi analiz defterinin (V-Dem, yıllık faktör analizi)
  çıktısından alınır.
- Birleşik seri üzerinde tek bir K-ortalamalar (k=4) modeli kurulur; böylece
  her yıl ve her ülke aynı Leviathan sınıflandırmasıyla okunur.
- 116 MB'lık V-Dem JSON'u ve 30 MB'lık oyun verisi yerine, yalnızca ihtiyaç
  duyulan parçalar küçük dosyalara bölünür.
"""

from __future__ import annotations

import json
import math
import re
from pathlib import Path

import numpy as np
import pandas as pd
from factor_analyzer import FactorAnalyzer
from sklearn.cluster import KMeans

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
PROCESSED = ROOT / "data" / "processed"
HIST_MAPS = ROOT / "data" / "historical_maps"
OUT = ROOT / "data" / "web"

VDEM_CSV = RAW / "V-Dem-CY-Full+Others-v15.csv"
WGI_CSV = RAW / "wgidataset.csv"
NE_GEOJSON = ROOT / "data" / "source" / "ne_110m_admin_0_countries.geojson"

# WGI kodları -> V-Dem / ISO3 kodları
WGI_CODE_FIX = {"ROM": "ROU", "TMP": "TLS", "ZAR": "COD", "ADO": "AND", "KSV": "XKX", "WBG": "PSE"}
# Natural Earth ADM0_A3 -> uygulama kodu
NE_CODE_FIX = {"KOS": "XKX", "SOL": "SML", "PSX": "PSE", "SDS": "SSD", "SAH": "ESH"}

MODERN_VDEM = ["v2xcs_ccsi", "v2x_cspart", "v2x_freexp_altinf", "v2psoppaut", "v2csreprss"]
MODERN_WGI = ["pv", "ge", "rq", "rl", "cc"]

WGI_LAYERS = {
    "va": {"label": "Ses ve Hesap Verebilirlik", "short": "Hesap verebilirlik",
           "desc": "Vatandaşların hükümetini seçebilme, ifade, örgütlenme ve basın özgürlüğü algısı."},
    "pv": {"label": "Siyasi İstikrar ve Şiddetin Yokluğu", "short": "Siyasi istikrar",
           "desc": "Hükümetin anayasa dışı yollarla ya da şiddetle devrilme olasılığına dair algı."},
    "ge": {"label": "Hükümet Etkinliği", "short": "Hükümet etkinliği",
           "desc": "Kamu hizmetlerinin ve bürokrasinin kalitesi, siyasi baskıdan bağımsızlığı."},
    "rq": {"label": "Düzenleyici Kalite", "short": "Düzenleyici kalite",
           "desc": "Özel sektörü destekleyen sağlam politikalar geliştirip uygulayabilme kapasitesi."},
    "rl": {"label": "Hukukun Üstünlüğü", "short": "Hukukun üstünlüğü",
           "desc": "Sözleşmelerin, mülkiyet haklarının, polisin ve mahkemelerin güvenilirliği."},
    "cc": {"label": "Yolsuzluğun Kontrolü", "short": "Yolsuzluk kontrolü",
           "desc": "Kamu gücünün özel çıkar için kullanılmasının ne ölçüde engellendiği."},
}

VDEM_LAYERS = {
    "v2x_polyarchy": {"label": "Seçimsel Demokrasi", "desc": "Seçimlerin serbest ve adil olması, oy hakkı, ifade ve örgütlenme özgürlüğü."},
    "v2x_libdem": {"label": "Liberal Demokrasi", "desc": "Seçimsel demokrasiye ek olarak bireysel hakların ve yargı/yasama denetiminin korunması."},
    "v2x_partipdem": {"label": "Katılımcı Demokrasi", "desc": "Vatandaşların seçim dışı siyasal süreçlere etkin katılımı."},
    "v2x_egaldem": {"label": "Eşitlikçi Demokrasi", "desc": "Hakların, özgürlüklerin ve kaynakların toplumsal gruplar arasında eşit dağılımı."},
    "v2x_freexp_altinf": {"label": "İfade Özgürlüğü", "desc": "İfade özgürlüğü ve alternatif bilgi kaynaklarına erişim."},
    "v2xcs_ccsi": {"label": "Sivil Toplumun Gücü", "desc": "Sivil toplum örgütlerinin devlet denetiminden bağımsızlığı ve katılım serbestisi."},
    "v2x_civlib": {"label": "Sivil Özgürlükler", "desc": "Fiziksel bütünlük, özel ve siyasi özgürlüklerin güvencesi."},
    "v2x_rule": {"label": "Hukukun Üstünlüğü (V-Dem)", "desc": "Yasaların şeffaf, bağımsız, öngörülebilir ve eşit uygulanması."},
    "v2x_jucon": {"label": "Yargı Denetimi", "desc": "Yürütmenin yargı kararlarına uyması ve yargının bağımsız hareket edebilmesi."},
    "v2xlg_legcon": {"label": "Yasama Denetimi", "desc": "Yasamanın yürütmeyi sorgulayabilme ve denetleyebilme kapasitesi."},
    "v2x_corr": {"label": "Siyasi Yolsuzluk", "desc": "Yürütme, yasama, yargı ve kamu sektöründe yolsuzluk yaygınlığı (yüksek = kötü).", "invert": True},
    "v2x_gender": {"label": "Kadınların Siyasi Güçlenmesi", "desc": "Kadınların temel özgürlükleri, sivil topluma ve siyasete katılımı."},
}

GAME_VARS = [
    "v2x_libdem", "v2x_partipdem", "v2x_delibdem", "v2x_egaldem", "v2x_freexp", "v2mecenefm",
    "v2x_cspart", "v2cseeorgs", "v2cscnsult", "v2x_elecreg", "v2x_elecoff", "v2juhcind",
    "v2juaccnt", "v2x_corr", "v2x_rule", "v2xcs_ccsi", "v2x_frassoc_thick",
]
STAKEHOLDERS = ["military", "elite", "civil_society", "religious", "international"]

TYPES = ["Shackled", "Despotic", "Paper", "Absent"]

# Tarihi ve Natural Earth'te Türkçe adı olmayan birimler
EXTRA_TR_NAMES = {
    "Baden": "Baden", "Bavaria": "Bavyera", "Brunswick": "Braunschweig", "Hanover": "Hannover",
    "Hesse-Darmstadt": "Hessen-Darmstadt", "Hesse-Kassel": "Hessen-Kassel", "Mecklenburg Schwerin": "Mecklenburg-Schwerin",
    "Modena": "Modena Dükalığı", "Nassau": "Nassau", "Oldenburg": "Oldenburg", "Papal States": "Papalık Devletleri",
    "Parma": "Parma Dükalığı", "Piedmont-Sardinia": "Piyemonte-Sardinya", "Saxe-Weimar-Eisenach": "Saksonya-Weimar-Eisenach",
    "Saxony": "Saksonya", "Tuscany": "Toskana", "Two Sicilies": "İki Sicilya Krallığı", "Württemberg": "Württemberg",
    "Würtemberg": "Württemberg", "Zanzibar": "Zanzibar", "Somaliland": "Somaliland", "Hong Kong": "Hong Kong",
    "Palestine/Gaza": "Filistin (Gazze)", "Palestine/West Bank": "Filistin (Batı Şeria)", "Republic of Vietnam": "Güney Vietnam",
    "German Democratic Republic": "Doğu Almanya", "Singapore": "Singapur", "Barbados": "Barbados", "Maldives": "Maldivler",
    "Seychelles": "Seyşeller", "Mauritius": "Mauritius", "Cape Verde": "Yeşil Burun Adaları", "Comoros": "Komorlar",
    "Sao Tome and Principe": "São Tomé ve Príncipe", "Malta": "Malta", "Bahrain": "Bahreyn", "Solomon Islands": "Solomon Adaları",
    "Vanuatu": "Vanuatu", "Fiji": "Fiji", "Trinidad and Tobago": "Trinidad ve Tobago", "Jamaica": "Jamaika",
    "Luxembourg": "Lüksemburg", "Qatar": "Katar", "Kosovo": "Kosova", "Taiwan": "Tayvan", "Timor-Leste": "Doğu Timor",
}


TR_OVERRIDES = {
    "CHN": "Çin", "TWN": "Tayvan", "ZAF": "Güney Afrika", "CYP": "Kıbrıs", "PSE": "Filistin (Batı Şeria)",
    "CZE": "Çekya", "SWZ": "Esvatini", "MKD": "Kuzey Makedonya", "BLR": "Belarus",
}
SHORT_NAMES = {
    "USA": "ABD", "GBR": "Birleşik Krallık", "ARE": "BAE", "COD": "Kongo DC", "COG": "Kongo",
    "CAF": "Orta Afrika Cum.", "DOM": "Dominik Cum.", "BIH": "Bosna-Hersek", "PNG": "Papua Yeni Gine",
    "GNQ": "Ekvator Ginesi", "TTO": "Trinidad ve Tobago", "STP": "São Tomé", "PSE": "Batı Şeria", "PSG": "Gazze",
    "CPV": "Yeşil Burun", "SAX": "Saksonya-Weimar", "TWS": "İki Sicilya", "VDR": "Güney Vietnam",
}
HIST_TR = {
    "Ottoman Empire": "Osmanlı İmparatorluğu", "Republic of Turkey": "Türkiye Cumhuriyeti", "Republic of Türkiye": "Türkiye Cumhuriyeti",
    "Part of the Ottoman Empire": "Osmanlı İmparatorluğu’nun parçası", "Ottoman Eyalet": "Osmanlı eyaleti", "Direct Ottoman rule": "Doğrudan Osmanlı yönetimi",
    "Ottoman Eyalet of Egypt": "Osmanlı Mısır Eyaleti", "Ottoman Eyalet of Tripolitania": "Osmanlı Trablusgarp Eyaleti",
    "Khedivate of Egypt": "Mısır Hidivliği", "Khedivate of Egypt under British occupation": "İngiliz işgalinde Mısır Hidivliği",
    "Khedivate of Egypt within Ottoman Eyalet": "Osmanlı’ya bağlı Mısır Hidivliği", "Sultanate of Egypt under British protectorate": "İngiliz himayesinde Mısır Sultanlığı",
    "Egyptian Kingdom under British military presence": "Mısır Krallığı", "Republic of Egypt": "Mısır Cumhuriyeti", "Arab Republic of Egypt": "Mısır Arap Cumhuriyeti",
    "Part of United Arab Republic": "Birleşik Arap Cumhuriyeti’nin parçası",
    "Russian Empire": "Rus İmparatorluğu", "Russian Socialist Federative Republic": "Rusya SFSC (Sovyetler Birliği)", "Russian Federation": "Rusya Federasyonu", "Russia": "Rusya",
    "Ukrainian Soviet Socialist Republic": "Ukrayna SSC", "Byelorussian Soviet Socialist Republic": "Belarus SSC", "Georgia Soviet Socialist Republic": "Gürcistan SSC",
    "Armenia Soviet Socialist Republic": "Ermenistan SSC", "Azerbaijan Soviet Socialist Republic": "Azerbaycan SSC", "Estonian Soviet Socialist Republic": "Estonya SSC",
    "Latvian Soviet Socialist Republic": "Letonya SSC", "Lithuanian Soviet Socialist Republic": "Litvanya SSC", "Moldavian Soviet Socialist Republic": "Moldova SSC",
    "Kazakh Soviet Socialist Republic under Soviet rule": "Kazak SSC", "Kirghiz Soviet Socialist Republic under Soviet rule": "Kırgız SSC",
    "Tajik Soviet Socialist Republic under Soviet rule": "Tacik SSC", "Turkmen Soviet Socialist Republic under Soviet rule": "Türkmen SSC",
    "German Empire": "Alman İmparatorluğu", "Weimar Republic": "Weimar Cumhuriyeti", "Third Reich": "Nazi Almanyası", "Federal Republic of Germany": "Almanya Federal Cumhuriyeti",
    "Kingdom of Prussia": "Prusya Krallığı", "North German Confederation": "Kuzey Alman Konfederasyonu", "Kingdom of Bavaria": "Bavyera Krallığı", "Electorate of Bavaria": "Bavyera Prens Seçiciliği",
    "Kingdom of Saxony": "Saksonya Krallığı", "Kingdom of Hanover": "Hannover Krallığı", "Kingdom of Wurtemberg": "Württemberg Krallığı",
    "Great Qing Empire": "Qing İmparatorluğu", "Republic of China": "Çin Cumhuriyeti", "People's Republic of China": "Çin Halk Cumhuriyeti",
    "Persia": "İran (Pers)", "Iran": "İran", "Islamic Republic of Iran": "İran İslam Cumhuriyeti",
    "Tokugawa Japan": "Tokugawa Japonyası", "Empire of Japan": "Japon İmparatorluğu", "Empire of Japan under US occupation": "ABD işgalinde Japonya", "State of Japan": "Japonya",
    "Kingdom of France": "Fransa Krallığı", "French First Republic": "Birinci Fransız Cumhuriyeti", "French Empire": "Fransız İmparatorluğu",
    "French Second Republic": "İkinci Fransız Cumhuriyeti", "French Third Republic": "Üçüncü Fransız Cumhuriyeti", "French State": "Vichy Fransası",
    "French Fourth Republic": "Dördüncü Fransız Cumhuriyeti", "French Fifth Republic": "Beşinci Fransız Cumhuriyeti",
    "Great Britain": "Büyük Britanya", "United Kingdom of Great Britain and Ireland": "Büyük Britanya ve İrlanda Birleşik Krallığı",
    "United Kingdom of Great Britain and Northern Ireland": "Büyük Britanya ve Kuzey İrlanda Birleşik Krallığı",
    "Kingdom of Italy": "İtalya Krallığı", "Italian Republic": "İtalya Cumhuriyeti", "Kingdom of Spain": "İspanya Krallığı",
    "Second Spanish Republic": "İkinci İspanya Cumhuriyeti", "Spanish State": "Frankocu İspanya", "Kingdom of Portugal": "Portekiz Krallığı", "Portuguese Republic": "Portekiz Cumhuriyeti",
    "British India": "Britanya Hindistanı", "Republic of India": "Hindistan Cumhuriyeti", "Empire of India": "Hindistan İmparatorluğu",
    "Empire of Brazil": "Brezilya İmparatorluğu", "Kingdom of Brazil": "Brezilya Krallığı", "Viceroyalty of Brazil": "Brezilya Genel Valiliği",
    "Republic of the United States of Brazil": "Birleşik Brezilya Devletleri Cumhuriyeti", "Federative Republic of Brazil": "Brezilya Federatif Cumhuriyeti",
    "Kingdom of Greece": "Yunanistan Krallığı", "Hellenic State": "Yunan Devleti", "Second Hellenic Republic": "İkinci Helen Cumhuriyeti", "Third Hellenic Republic": "Üçüncü Helen Cumhuriyeti",
    "Austrian hereditary lands": "Habsburg veraset toprakları", "Austrian half of the Habsburg Empire - Cisleithania": "Avusturya-Macaristan’ın Avusturya yarısı",
    "Republic of Austria": "Avusturya Cumhuriyeti", "Kingdom of Hungary": "Macaristan Krallığı", "Hungarian half of the Habsburg Empire": "Avusturya-Macaristan’ın Macar yarısı",
    "Polish-Lithuanian Commonwealth": "Lehistan-Litvanya Birliği", "Duchy of Warsaw": "Varşova Dükalığı", "Congress Poland": "Kongre Polonyası",
    "Second Polish Commonwealth": "İkinci Polonya Cumhuriyeti", "People's Republic of Poland": "Polonya Halk Cumhuriyeti", "Third Polish Commonwealth": "Polonya Cumhuriyeti",
    "Kingdom of Serbs, Croats, and Slovenes/Kingdom of Yugoslavia": "Yugoslavya Krallığı", "Socialist Federal Republic of Yugoslavia": "Yugoslavya SFC",
    "Federal Republic of Yugoslavia": "Yugoslavya Federal Cumhuriyeti", "Czechoslovakia": "Çekoslovakya", "Czecho-Slovakia": "Çekoslovakya",
    "Kingdom of Great Joseon": "Joseon Krallığı", "Great Korean Empire": "Kore İmparatorluğu", "Korea under Japanese occupation": "Japon işgalinde Kore",
    "Democratic People's Republic of Korea": "Kore Demokratik Halk Cumhuriyeti", "Republic of Korea": "Kore Cumhuriyeti",
    "Kingdom of Siam": "Siyam Krallığı", "Siam": "Siyam", "Kingdom of Thailand": "Tayland Krallığı",
    "Viceroyalty of New Spain": "Yeni İspanya Genel Valiliği", "Viceroyalty of Peru": "Peru Genel Valiliği", "Viceroyalty of Rio de la Plata": "Río de la Plata Genel Valiliği",
    "Viceroyalty of New Granada": "Yeni Granada Genel Valiliği", "Mexican Empire": "Meksika İmparatorluğu", "Second Mexican Empire": "İkinci Meksika İmparatorluğu",
    "United Mexican States": "Birleşik Meksika Devletleri", "Dutch East Indies": "Hollanda Doğu Hint Adaları", "Dutch East Indies Colony": "Hollanda Doğu Hint Adaları",
    "Republic of Indonesia": "Endonezya Cumhuriyeti", "Emirate of Afghanistan": "Afganistan Emirliği", "Kingdom of Afghanistan": "Afganistan Krallığı",
    "Islamic Emirate of Afghanistan": "Afganistan İslam Emirliği", "Islamic Republic of Afghanistan": "Afganistan İslam Cumhuriyeti",
    "Emirate of Nejd": "Necid Emirliği", "Nejd and Hejaz formally united as Kingdom of Saudi Arabia": "Suudi Arabistan Krallığı",
    "Syrian Arab Republic": "Suriye Arap Cumhuriyeti", "Beylik of Tunis": "Tunus Beyliği", "French protectorate of Tunisia": "Fransız himayesinde Tunus",
    "Tunisian Republic": "Tunus Cumhuriyeti", "Kingdom of Morocco": "Fas Krallığı", "People's Democratic Republic of Algeria": "Cezayir Demokratik Halk Cumhuriyeti",
    "Kingdom of the Netherlands": "Hollanda Krallığı", "Kingdom of Belgium": "Belçika Krallığı", "Kingdom of Denmark": "Danimarka Krallığı",
    "Kingdom of Denmark-Norway": "Danimarka-Norveç Krallığı", "Kingdom of Norway": "Norveç Krallığı", "Swiss Confederation": "İsviçre Konfederasyonu",
    "Kingdom of Romania": "Romanya Krallığı", "Socialist Republic of Romania": "Romanya Sosyalist Cumhuriyeti", "Kingdom of Bulgaria": "Bulgaristan Krallığı",
    "Principality of Bulgaria": "Bulgaristan Prensliği", "Kingdom of Serbia": "Sırbistan Krallığı", "Principality of Serbia under Ottoman suzerainty": "Osmanlı’ya bağlı Sırbistan Prensliği",
    "Principality of Wallachia under Ottoman suzerainty": "Osmanlı’ya bağlı Eflak Prensliği", "Grand Duchy of Finland": "Finlandiya Büyük Dükalığı",
    "Socialist Republic of Vietnam": "Vietnam Sosyalist Cumhuriyeti", "Democratic Republic of Vietnam": "Vietnam Demokratik Cumhuriyeti", "French Indochina": "Fransız Çinhindi",
    "Kingdom of the Two Sicilies": "İki Sicilya Krallığı", "Papal States": "Papalık Devletleri", "Grand Duchy of Tuscany": "Toskana Büyük Dükalığı",
    "Kingdom of Piedmont-Sardinia": "Piyemonte-Sardinya Krallığı", "Union of South Africa": "Güney Afrika Birliği", "Republic of South Africa": "Güney Afrika Cumhuriyeti",
    "Empire of Ethiopia": "Etiyopya İmparatorluğu", "Socialist Ethiopia": "Sosyalist Etiyopya", "Federal Democratic Republic of Ethiopia": "Etiyopya Federal Demokratik Cumhuriyeti",
    "Colony and Protectorate of Nigeria": "Nijerya Sömürgesi", "Federal Republic of Nigeria": "Nijerya Federal Cumhuriyeti",
    "Republic of Iraq": "Irak Cumhuriyeti", "The Kingdom of Iraq": "Irak Krallığı", "State of Israel": "İsrail Devleti",
    "The Hashemite Kingdom of Jordan": "Ürdün Haşimi Krallığı", "Emirate of Transjordan": "Ürdün Emirliği", "Mutawakkilite Kingdom of Yemen": "Mütevekkil Yemen Krallığı",
    "Republic of Yemen": "Yemen Cumhuriyeti", "Libyan Kingdom": "Libya Krallığı", "Great Socialist People's Libyan Arab Jamahiriya": "Libya Arap Cemahiriyesi",
    "State of Libya": "Libya Devleti", "Republic of Zaire": "Zaire Cumhuriyeti", "Congo Free State": "Kongo Özgür Devleti", "Belgian colony of Belgian Congo": "Belçika Kongosu",
}


def r(x, n=3):
    if x is None:
        return None
    try:
        if isinstance(x, float) and math.isnan(x):
            return None
    except TypeError:
        return None
    return round(float(x), n)


def clean_histname(name: str | float) -> str | None:
    if not isinstance(name, str) or not name.strip():
        return None
    s = re.sub(r"\s*\[.*?\]\s*", " ", name)
    s = re.sub(r"\s*\(.*?\)\s*$", "", s).strip()
    s = re.sub(r"\s+", " ", s)
    return s or None


def write_json(path: Path, obj) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
    print(f"  ✓ {path.relative_to(ROOT)}  ({path.stat().st_size / 1024:.0f} KB)")


# ---------------------------------------------------------------------------
# 1. Kaynakları yükle
# ---------------------------------------------------------------------------

def load_vdem() -> pd.DataFrame:
    cols = ["country_name", "country_text_id", "year", "histname"]
    cols += sorted(set(MODERN_VDEM + list(VDEM_LAYERS)))
    print("V-Dem yükleniyor…")
    df = pd.read_csv(VDEM_CSV, usecols=cols, low_memory=False)
    df = df.rename(columns={"country_text_id": "id"})
    return df


def load_wgi() -> pd.DataFrame:
    print("WGI yükleniyor…")
    df = pd.read_csv(WGI_CSV, sep=";", usecols=["code", "countryname", "year", "indicator", "estimate"])
    df["estimate"] = pd.to_numeric(df["estimate"].astype(str).str.replace(",", "."), errors="coerce")
    df["id"] = df["code"].replace(WGI_CODE_FIX)
    return df


# ---------------------------------------------------------------------------
# 2. Modern dönem (1996–2023): WGI + V-Dem faktör analizi — kodla birleştirme
# ---------------------------------------------------------------------------

def modern_corridor(vdem: pd.DataFrame, wgi: pd.DataFrame) -> pd.DataFrame:
    w = wgi[wgi["year"] >= 1996].pivot_table(index=["id", "year"], columns="indicator", values="estimate").reset_index()
    w.columns.name = None
    v = vdem[vdem["year"] >= 1996][["id", "year"] + MODERN_VDEM].dropna()
    m = pd.merge(w[["id", "year"] + MODERN_WGI], v, on=["id", "year"], how="inner").dropna()
    indicators = MODERN_WGI + MODERN_VDEM
    std = m.copy()
    for ind in indicators:
        std[ind] = std.groupby("year")[ind].transform(lambda x: (x - x.mean()) / x.std())
    fa = FactorAnalyzer(n_factors=2, rotation="varimax")
    fa.fit(std[indicators])
    load = pd.DataFrame(fa.loadings_, index=indicators, columns=["F1", "F2"])
    scores = fa.transform(std[indicators])
    # Hangi faktör devlet (WGI yönetişim), hangisi toplum (V-Dem sivil alan)?
    wgi_on_f1 = load.loc[MODERN_WGI, "F1"].abs().mean() > load.loc[MODERN_WGI, "F2"].abs().mean()
    state_idx, soc_idx = (0, 1) if wgi_on_f1 else (1, 0)
    state = scores[:, state_idx] * np.sign(load.loc[MODERN_WGI].iloc[:, state_idx].mean())
    society = scores[:, soc_idx] * np.sign(load.loc[MODERN_VDEM].iloc[:, soc_idx].mean())
    out = pd.DataFrame({"id": m["id"].values, "year": m["year"].values, "state": state, "society": society})
    print(f"  Modern: {len(out)} gözlem, {out['id'].nunique()} ülke, {out['year'].min()}–{out['year'].max()}")
    print("  Faktör yükleri:\n" + load.round(3).to_string())
    return out


def historical_corridor(vdem: pd.DataFrame) -> pd.DataFrame:
    name_to_id = dict(zip(vdem["country_name"], vdem["id"]))
    with open(PROCESSED / "vdem_historical" / "dar_koridor_combined_all_years.json", encoding="utf-8") as f:
        years = json.load(f)["years"]
    rows, unknown = [], set()
    for y, items in years.items():
        y = int(y)
        if y >= 1996:
            continue
        for it in items:
            cid = name_to_id.get(it["name"])
            if not cid:
                unknown.add(it["name"])
                continue
            rows.append({"id": cid, "year": y, "state": it["statePower"], "society": it["societyPower"]})
    if unknown:
        print("  ! Tarihi dönemde eşleşmeyen adlar:", sorted(unknown))
    out = pd.DataFrame(rows).drop_duplicates(["id", "year"])
    print(f"  Tarihi: {len(out)} gözlem, {out['id'].nunique()} ülke, {out['year'].min()}–{out['year'].max()}")
    return out


def classify(df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    km = KMeans(n_clusters=4, random_state=42, n_init=20)
    df = df.copy()
    df["cluster"] = km.fit_predict(df[["state", "society"]])
    mapping = {}
    for i, (sp, sop) in enumerate(km.cluster_centers_):
        if sp > 0 and sop > 0:
            mapping[i] = "Shackled"
        elif sp < 0 and sop < 0:
            mapping[i] = "Paper"
        elif sp < 0 and sop > 0:
            mapping[i] = "Absent"
        else:
            mapping[i] = "Despotic" if sp > 0 else "Paper"
    if sorted(mapping.values()) != sorted(TYPES):
        raise RuntimeError(f"Küme eşlemesi dört tipi kapsamıyor: {mapping}")
    df["type"] = df["cluster"].map(mapping)
    centroids = {mapping[i]: [r(c[1], 4), r(c[0], 4)] for i, c in enumerate(km.cluster_centers_)}  # [toplum, devlet]
    print("  Küme merkezleri [toplum, devlet]:", centroids)
    print("  Dağılım:", df["type"].value_counts().to_dict())
    return df, centroids


# ---------------------------------------------------------------------------
# 3. Ülke kaydı ve dünya geometrisi
# ---------------------------------------------------------------------------

def build_world_and_registry(vdem: pd.DataFrame, wgi: pd.DataFrame, corridor_ids: set) -> dict:
    with open(NE_GEOJSON, encoding="utf-8") as f:
        ne = json.load(f)

    features, ne_meta = [], {}
    for feat in ne["features"]:
        p = feat["properties"]
        code = NE_CODE_FIX.get(p["ADM0_A3"], p["ADM0_A3"])
        iso2 = p.get("ISO_A2_EH") if p.get("ISO_A2_EH") not in (None, "-99") else None
        ne_meta[code] = {
            "tr": p.get("NAME_TR") or p.get("NAME"),
            "en": p.get("NAME_EN") or p.get("NAME"),
            "iso2": iso2.lower() if iso2 else None,
            "continent": p.get("CONTINENT"),
            "region": p.get("SUBREGION"),
            "label": [r(p.get("LABEL_X"), 2), r(p.get("LABEL_Y"), 2)],
        }

        def rnd(coords):
            if isinstance(coords[0], (int, float)):
                return [round(coords[0], 2), round(coords[1], 2)]
            return [rnd(c) for c in coords]

        features.append({
            "type": "Feature",
            "id": code,
            "properties": {"id": code},
            "geometry": {"type": feat["geometry"]["type"], "coordinates": rnd(feat["geometry"]["coordinates"])},
        })
    write_json(OUT / "world.geojson", {"type": "FeatureCollection", "features": features})

    # V-Dem adları ve tarihsel adlar
    vnames = vdem.groupby("id")["country_name"].first().to_dict()
    hist = {}
    for cid, g in vdem.sort_values("year").groupby("id"):
        periods, last = [], None
        for y, hn in zip(g["year"], g["histname"]):
            name = clean_histname(hn)
            if name is None:
                continue
            name = HIST_TR.get(name, name)
            if last and last["name"] == name and last["to"] == y - 1:
                last["to"] = int(y)
            else:
                last = {"from": int(y), "to": int(y), "name": name}
                periods.append(last)
        hist[cid] = [[p["from"], p["to"], p["name"]] for p in periods]

    wnames = wgi.groupby("id")["countryname"].first().to_dict()
    ids = set(vnames) | set(ne_meta) | set(wnames)
    registry = {}
    for cid in sorted(ids):
        meta = ne_meta.get(cid, {})
        en = vnames.get(cid) or meta.get("en") or wnames.get(cid)
        tr = TR_OVERRIDES.get(cid) or meta.get("tr") or EXTRA_TR_NAMES.get(en) or en
        entry = {"tr": tr, "en": en}
        if cid in SHORT_NAMES:
            entry["short"] = SHORT_NAMES[cid]
        if meta.get("iso2"):
            entry["iso2"] = meta["iso2"]
        if meta.get("continent"):
            entry["continent"] = meta["continent"]
        if meta.get("region"):
            entry["region"] = meta["region"]
        if meta.get("label") and meta["label"][0] is not None:
            entry["label"] = meta["label"]
        if hist.get(cid) and len(hist[cid]) > 1:
            entry["hist"] = hist[cid]
        entry["onMap"] = cid in ne_meta
        entry["corridor"] = cid in corridor_ids
        registry[cid] = entry
    return registry


# ---------------------------------------------------------------------------
# 4. Katmanlar
# ---------------------------------------------------------------------------

def build_wgi_layer(wgi: pd.DataFrame) -> dict:
    years = sorted(int(y) for y in wgi["year"].unique())
    data = {}
    for ind in WGI_LAYERS:
        sub = wgi[wgi["indicator"] == ind].pivot_table(index="id", columns="year", values="estimate")
        data[ind] = {cid: [r(row.get(y), 2) for y in years] for cid, row in sub.iterrows() if row.notna().any()}
    return {"years": years, "indicators": WGI_LAYERS, "data": data, "domain": [-2.5, 2.5]}


def build_vdem_layers(vdem: pd.DataFrame) -> dict:
    y0, y1 = int(vdem["year"].min()), int(vdem["year"].max())
    years = list(range(y0, y1 + 1))
    index = {}
    for ind, meta in VDEM_LAYERS.items():
        sub = vdem.pivot_table(index="id", columns="year", values=ind)
        data = {}
        for cid, row in sub.iterrows():
            vals = [r(row.get(y), 3) for y in years]
            if any(v is not None for v in vals):
                data[cid] = vals
        write_json(OUT / "vdem" / f"{ind}.json", {"start": y0, "end": y1, "data": data})
        first = min((next(i for i, v in enumerate(vals) if v is not None) for vals in data.values()), default=0)
        index[ind] = {**meta, "start": y0 + first, "end": y1, "domain": [0, 1]}
    return index


# ---------------------------------------------------------------------------
# 5. Oyun başlangıç verisi (ülke başına küçük dosya)
# ---------------------------------------------------------------------------

def build_game_files(corridor: pd.DataFrame) -> list:
    with open(PROCESSED / "game_data" / "initial_variables.json", encoding="utf-8") as f:
        init = json.load(f)["countries"]
    with open(PROCESSED / "game_data" / "stakeholder_profiles.json", encoding="utf-8") as f:
        stake = json.load(f)["countries"]
    available = []
    for cid, g in corridor.groupby("id"):
        if cid not in init:
            continue
        years = {}
        for _, row in g.iterrows():
            y = str(int(row["year"]))
            v = init[cid]["years"].get(y)
            s = stake.get(cid, {}).get("years", {}).get(y)
            if not v:
                continue
            item = {"v": [r(v.get(k), 3) for k in GAME_VARS]}
            if s:
                item["s"] = [[r(s[k]["influence"], 3), r(s[k]["satisfaction"], 3)] for k in STAKEHOLDERS]
            years[y] = item
        if years:
            (OUT / "game").mkdir(parents=True, exist_ok=True)
            with open(OUT / "game" / f"{cid}.json", "w", encoding="utf-8") as f:
                json.dump({"vars": GAME_VARS, "stakeholders": STAKEHOLDERS, "years": years}, f, ensure_ascii=False, separators=(",", ":"))
            available.append(cid)
    print(f"  ✓ data/web/game/*.json  ({len(available)} ülke)")
    return available


# ---------------------------------------------------------------------------
# 6. Tarihi sınırlar (çizgi olarak, hafifletilmiş)
# ---------------------------------------------------------------------------

def simplify(points: list, tol: float) -> list:
    """Douglas–Peucker çizgi sadeleştirme (derece cinsinden tolerans)"""
    if len(points) < 3:
        return points
    ax, ay = points[0]
    bx, by = points[-1]
    dx, dy = bx - ax, by - ay
    norm = math.hypot(dx, dy)
    best_i, best_d = 0, -1.0
    for i in range(1, len(points) - 1):
        px, py = points[i]
        d = abs(dy * px - dx * py + bx * ay - by * ax) / norm if norm else math.hypot(px - ax, py - ay)
        if d > best_d:
            best_i, best_d = i, d
    if best_d <= tol:
        return [points[0], points[-1]]
    left = simplify(points[: best_i + 1], tol)
    right = simplify(points[best_i:], tol)
    return left[:-1] + right


def build_borders() -> list:
    with open(HIST_MAPS / "index.json", encoding="utf-8") as f:
        index = json.load(f)
    milestones = []
    for m in index["milestones"]:
        src = HIST_MAPS / m["path"]
        if not src.exists():
            continue
        with open(src, encoding="utf-8") as f:
            gj = json.load(f)
        lines = []
        for feat in gj["features"]:
            geom = feat.get("geometry")
            if not geom:
                continue
            polys = [geom["coordinates"]] if geom["type"] == "Polygon" else geom["coordinates"] if geom["type"] == "MultiPolygon" else []
            for poly in polys:
                for ring in poly:
                    xs = [c[0] for c in ring]
                    ys = [c[1] for c in ring]
                    if max(xs) - min(xs) < 0.6 and max(ys) - min(ys) < 0.6:
                        continue  # çok küçük adalar
                    simple = simplify([(c[0], c[1]) for c in ring], 0.06)
                    pts, last = [], None
                    for lng, lat in simple:
                        p = (round(lng, 2), round(lat, 2))
                        if p != last:
                            pts.extend(p)
                            last = p
                    if len(pts) >= 8:
                        lines.append(pts)
        write_json(OUT / "borders" / f"{m['year']}.json", lines)
        milestones.append({"year": m["year"], "source": m["source"]})
    return milestones


def build_capitals(vdem: pd.DataFrame) -> dict:
    name_to_id = dict(zip(vdem["country_name"], vdem["id"]))
    with open(HIST_MAPS / "unified_country_historical_data.json", encoding="utf-8") as f:
        unified = json.load(f)
    caps = {}
    for c in unified["countries"]:
        cid = name_to_id.get(c["vdem_name"])
        if not cid:
            continue
        periods = []
        for p in c["periods"]:
            if not p.get("capital") or not p.get("coordinates"):
                continue
            a, b = (int(x) for x in p["years"].split("-"))
            periods.append([a, b, p["capital"], r(p["coordinates"]["lat"], 2), r(p["coordinates"]["lng"], 2)])
        if periods:
            caps[cid] = periods
    return caps


# ---------------------------------------------------------------------------

def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    vdem = load_vdem()
    wgi = load_wgi()

    print("Dar Koridor serisi kuruluyor…")
    modern = modern_corridor(vdem, wgi)
    historical = historical_corridor(vdem)
    corridor, centroids = classify(pd.concat([historical, modern], ignore_index=True))

    series = {}
    for cid, g in corridor.sort_values("year").groupby("id"):
        series[cid] = [[int(y), r(so, 3), r(st, 3), TYPES.index(t)] for y, so, st, t in zip(g["year"], g["society"], g["state"], g["type"])]
    years = sorted(int(y) for y in corridor["year"].unique())

    print("Ülke kaydı ve dünya geometrisi…")
    registry = build_world_and_registry(vdem, wgi, set(series))
    capitals = build_capitals(vdem)
    for cid, periods in capitals.items():
        if cid in registry:
            registry[cid]["capitals"] = periods

    write_json(OUT / "corridor.json", {
        "types": TYPES,
        "years": years,
        "modernFrom": 1996,
        "centroids": centroids,
        "series": series,
    })

    print("Katmanlar…")
    write_json(OUT / "wgi.json", build_wgi_layer(wgi))
    vdem_index = build_vdem_layers(vdem)

    print("Oyun verisi…")
    game_ids = build_game_files(corridor)
    for cid in game_ids:
        if cid in registry:
            registry[cid]["game"] = True

    print("Tarihi sınırlar…")
    milestones = build_borders()

    write_json(OUT / "countries.json", registry)
    write_json(OUT / "meta.json", {
        "generated": pd.Timestamp.now().strftime("%Y-%m-%d"),
        "corridor": {"years": [years[0], years[-1]], "modernFrom": 1996, "countries": len(series)},
        "wgi": {k: v for k, v in WGI_LAYERS.items()},
        "vdem": vdem_index,
        "borders": milestones,
        "sources": {
            "vdem": "V-Dem Country-Year Full+Others v15 (Coppedge vd., 2025)",
            "wgi": "Worldwide Governance Indicators, Dünya Bankası (2024 güncellemesi)",
            "borders": "Historical Basemaps (1783–1880), CShapes 2.0 (1886–2019)",
            "world": "Natural Earth 1:110m (kamu malı)",
        },
    })
    print("Bitti.")


if __name__ == "__main__":
    main()
