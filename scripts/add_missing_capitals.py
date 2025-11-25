#!/usr/bin/env python3
"""
Eksik başkent bilgilerini ekler
"""

import json
from pathlib import Path

# Dosya yolları
BASE_DIR = Path(__file__).parent.parent
UNIFIED_DATA = BASE_DIR / "data/historical_maps/unified_country_historical_data.json"
OUTPUT_FILE = BASE_DIR / "data/historical_maps/unified_country_historical_data_complete.json"

# Eksik başkent bilgileri veritabanı
CAPITAL_DATABASE = {
    # Büyük ülkeler
    "Afghanistan": {"capital": "Kabil", "lat": 34.5553, "lng": 66.0088},
    "Albania": {"capital": "Tiran", "lat": 41.3275, "lng": 19.8187},
    "Algeria": {"capital": "Cezayir", "lat": 36.7538, "lng": 3.0588},
    "Angola": {"capital": "Luanda", "lat": -8.8383, "lng": 13.2344},
    "Armenia": {"capital": "Erivan", "lat": 40.1792, "lng": 44.4991},
    "Azerbaijan": {"capital": "Bakü", "lat": 40.4093, "lng": 49.8671},
    "Bahrain": {"capital": "Manama", "lat": 26.0667, "lng": 50.5577},
    "Barbados": {"capital": "Bridgetown", "lat": 13.0969, "lng": -59.6145},
    "Belarus": {"capital": "Minsk", "lat": 53.9045, "lng": 27.5615},
    "Benin": {"capital": "Porto-Novo", "lat": 6.4969, "lng": 2.6289},
    "Bhutan": {"capital": "Thimphu", "lat": 27.4728, "lng": 89.6389},
    "Bolivia": {"capital": "La Paz", "lat": -16.5000, "lng": -68.1500},
    "Botswana": {"capital": "Gaborone", "lat": -24.6282, "lng": 25.9231},
    "Burkina Faso": {"capital": "Ouagadougou", "lat": 12.3714, "lng": -1.5197},
    "Burundi": {"capital": "Gitega", "lat": -3.4264, "lng": 29.9306},
    "Cambodia": {"capital": "Phnom Penh", "lat": 11.5564, "lng": 104.9282},
    "Cameroon": {"capital": "Yaoundé", "lat": 3.8480, "lng": 11.5021},
    "Cape Verde": {"capital": "Praia", "lat": 14.9330, "lng": -23.5133},
    "Central African Republic": {"capital": "Bangui", "lat": 4.3947, "lng": 18.5582},
    "Chad": {"capital": "N'Djamena", "lat": 12.1348, "lng": 15.0557},
    "Chile": {"capital": "Santiago", "lat": -33.4489, "lng": -70.6693},
    "Colombia": {"capital": "Bogota", "lat": 4.7110, "lng": -74.0721},
    "Comoros": {"capital": "Moroni", "lat": -11.7172, "lng": 43.2473},
    "Costa Rica": {"capital": "San José", "lat": 9.9281, "lng": -84.0907},
    "Cuba": {"capital": "Havana", "lat": 23.1136, "lng": -82.3666},
    "Cyprus": {"capital": "Lefkoşa", "lat": 35.1856, "lng": 33.3823},
    "Djibouti": {"capital": "Djibouti", "lat": 11.8251, "lng": 42.5903},
    "Dominican Republic": {"capital": "Santo Domingo", "lat": 18.4861, "lng": -69.9312},
    "Ecuador": {"capital": "Quito", "lat": -0.1807, "lng": -78.4678},
    "El Salvador": {"capital": "San Salvador", "lat": 13.6929, "lng": -89.2182},
    "Equatorial Guinea": {"capital": "Malabo", "lat": 3.7523, "lng": 8.7370},
    "Eritrea": {"capital": "Asmara", "lat": 15.3229, "lng": 38.9251},
    "Estonia": {"capital": "Tallinn", "lat": 59.4370, "lng": 24.7536},
    "Eswatini": {"capital": "Mbabane", "lat": -26.3054, "lng": 31.1367},
    "Fiji": {"capital": "Suva", "lat": -18.1248, "lng": 178.4501},
    "Gabon": {"capital": "Libreville", "lat": 0.4162, "lng": 9.4673},
    "Georgia": {"capital": "Tiflis", "lat": 41.7151, "lng": 44.8271},
    "Ghana": {"capital": "Accra", "lat": 5.6037, "lng": -0.1870},
    "Guatemala": {"capital": "Guatemala City", "lat": 14.6349, "lng": -90.5069},
    "Guinea": {"capital": "Conakry", "lat": 9.6412, "lng": -13.5784},
    "Guinea-Bissau": {"capital": "Bissau", "lat": 11.8037, "lng": -15.1804},
    "Guyana": {"capital": "Georgetown", "lat": 6.8013, "lng": -58.1551},
    "Haiti": {"capital": "Port-au-Prince", "lat": 18.5944, "lng": -72.3074},
    "Honduras": {"capital": "Tegucigalpa", "lat": 14.0723, "lng": -87.1921},
    "Iceland": {"capital": "Reykjavik", "lat": 64.1466, "lng": -21.9426},
    "Ireland": {"capital": "Dublin", "lat": 53.3498, "lng": -6.2603},
    "Jamaica": {"capital": "Kingston", "lat": 17.9714, "lng": -76.7931},
    "Jordan": {"capital": "Amman", "lat": 31.9454, "lng": 35.9284},
    "Kazakhstan": {"capital": "Astana", "lat": 51.1694, "lng": 71.4491},
    "Kenya": {"capital": "Nairobi", "lat": -1.2864, "lng": 36.8172},
    "Kosovo": {"capital": "Prishtina", "lat": 42.6629, "lng": 21.1655},
    "Kuwait": {"capital": "Kuwait City", "lat": 29.3759, "lng": 47.9774},
    "Kyrgyzstan": {"capital": "Bishkek", "lat": 42.8746, "lng": 74.5698},
    "Latvia": {"capital": "Riga", "lat": 56.9496, "lng": 24.1052},
    "Lebanon": {"capital": "Beirut", "lat": 33.8886, "lng": 35.4955},
    "Lesotho": {"capital": "Maseru", "lat": -29.3167, "lng": 27.4833},
    "Liberia": {"capital": "Monrovia", "lat": 6.3156, "lng": -10.8074},
    "Libya": {"capital": "Tripoli", "lat": 32.8872, "lng": 13.1913},
    "Lithuania": {"capital": "Vilnius", "lat": 54.6872, "lng": 25.2797},
    "Luxembourg": {"capital": "Luxembourg", "lat": 49.6116, "lng": 6.1319},
    "Madagascar": {"capital": "Antananarivo", "lat": -18.8792, "lng": 47.5079},
    "Malawi": {"capital": "Lilongwe", "lat": -13.9626, "lng": 33.7741},
    "Maldives": {"capital": "Male", "lat": 4.1755, "lng": 73.5093},
    "Mali": {"capital": "Bamako", "lat": 12.6392, "lng": -8.0029},
    "Malta": {"capital": "Valletta", "lat": 35.8989, "lng": 14.5146},
    "Mauritania": {"capital": "Nouakchott", "lat": 18.0735, "lng": -15.9582},
    "Mauritius": {"capital": "Port Louis", "lat": -20.1609, "lng": 57.5012},
    "Moldova": {"capital": "Chișinău", "lat": 47.0105, "lng": 28.8638},
    "Mongolia": {"capital": "Ulaanbaatar", "lat": 47.8864, "lng": 106.9057},
    "Montenegro": {"capital": "Podgorica", "lat": 42.4304, "lng": 19.2594},
    "Morocco": {"capital": "Rabat", "lat": 34.0209, "lng": -6.8416},
    "Mozambique": {"capital": "Maputo", "lat": -25.9655, "lng": 32.5832},
    "Namibia": {"capital": "Windhoek", "lat": -22.5597, "lng": 17.0832},
    "Nepal": {"capital": "Kathmandu", "lat": 27.7172, "lng": 85.3240},
    "Nicaragua": {"capital": "Managua", "lat": 12.1150, "lng": -86.2362},
    "Niger": {"capital": "Niamey", "lat": 13.5127, "lng": 2.1128},
    "Nigeria": {"capital": "Abuja", "lat": 9.0765, "lng": 7.3986},
    "Oman": {"capital": "Muscat", "lat": 23.5880, "lng": 58.3829},
    "Paraguay": {"capital": "Asunción", "lat": -25.2637, "lng": -57.5759},
    "Peru": {"capital": "Lima", "lat": -12.0464, "lng": -77.0428},
    "Qatar": {"capital": "Doha", "lat": 25.2854, "lng": 51.5310},
    "Rwanda": {"capital": "Kigali", "lat": -1.9403, "lng": 29.8739},
    "Senegal": {"capital": "Dakar", "lat": 14.7167, "lng": -17.4677},
    "Sierra Leone": {"capital": "Freetown", "lat": 8.4657, "lng": -13.2317},
    "Somalia": {"capital": "Mogadishu", "lat": 2.0469, "lng": 45.3182},
    "South Sudan": {"capital": "Juba", "lat": 4.8517, "lng": 31.5825},
    "Sri Lanka": {"capital": "Colombo", "lat": 6.9271, "lng": 79.8612},
    "Sudan": {"capital": "Khartoum", "lat": 15.5007, "lng": 32.5599},
    "Suriname": {"capital": "Paramaribo", "lat": 5.8520, "lng": -55.2038},
    "Syria": {"capital": "Damascus", "lat": 33.5138, "lng": 36.2765},
    "Syrian Arab Republic": {"capital": "Damascus", "lat": 33.5138, "lng": 36.2765},
    "Tajikistan": {"capital": "Dushanbe", "lat": 38.5598, "lng": 68.7870},
    "Tanzania": {"capital": "Dodoma", "lat": -6.1630, "lng": 35.7516},
    "Thailand": {"capital": "Bangkok", "lat": 13.7563, "lng": 100.5018},
    "The Gambia": {"capital": "Banjul", "lat": 13.4549, "lng": -16.5790},
    "Togo": {"capital": "Lomé", "lat": 6.1256, "lng": 1.2311},
    "Trinidad and Tobago": {"capital": "Port of Spain", "lat": 10.6603, "lng": -61.5089},
    "Tunisia": {"capital": "Tunis", "lat": 36.8065, "lng": 10.1815},
    "Turkmenistan": {"capital": "Ashgabat", "lat": 37.9601, "lng": 58.3261},
    "Uganda": {"capital": "Kampala", "lat": 0.3476, "lng": 32.5825},
    "Ukraine": {"capital": "Kiev", "lat": 50.4501, "lng": 30.5234},
    "United Arab Emirates": {"capital": "Abu Dhabi", "lat": 24.4539, "lng": 54.3773},
    "Uruguay": {"capital": "Montevideo", "lat": -34.9011, "lng": -56.1645},
    "Uzbekistan": {"capital": "Tashkent", "lat": 41.2995, "lng": 69.2401},
    "Vanuatu": {"capital": "Port Vila", "lat": -17.7333, "lng": 168.3273},
    "Venezuela": {"capital": "Caracas", "lat": 10.4806, "lng": -66.9036},
    "Viet Nam": {"capital": "Hanoi", "lat": 21.0285, "lng": 105.8542},
    "Yemen": {"capital": "Sana'a", "lat": 15.5527, "lng": 44.2075},
    "Zambia": {"capital": "Lusaka", "lat": -15.3875, "lng": 28.3228},
    "Zimbabwe": {"capital": "Harare", "lat": -17.8252, "lng": 31.0335},

    # Tarihi ülkeler
    "Baden": {"capital": "Karlsruhe", "lat": 49.0069, "lng": 8.4037},
    "Bavaria": {"capital": "München", "lat": 48.1351, "lng": 11.5820},
    "Brunswick": {"capital": "Braunschweig", "lat": 52.2689, "lng": 10.5268},
    "Hanover": {"capital": "Hannover", "lat": 52.3759, "lng": 9.7320},
    "Hesse-Darmstadt": {"capital": "Darmstadt", "lat": 49.8728, "lng": 8.6512},
    "Mecklenburg Schwerin": {"capital": "Schwerin", "lat": 53.6355, "lng": 11.4013},
    "Nassau": {"capital": "Wiesbaden", "lat": 50.0826, "lng": 8.2400},
    "Oldenburg": {"capital": "Oldenburg", "lat": 53.1435, "lng": 8.2146},
    "Papal States": {"capital": "Roma", "lat": 41.9028, "lng": 12.4964},
    "Parma": {"capital": "Parma", "lat": 44.8015, "lng": 10.3279},
    "Piedmont-Sardinia": {"capital": "Torino", "lat": 45.0703, "lng": 7.6869},
    "Saxe-Weimar-Eisenach": {"capital": "Weimar", "lat": 50.9787, "lng": 11.3236},
    "Saxony": {"capital": "Dresden", "lat": 51.0504, "lng": 13.7373},
    "Tuscany": {"capital": "Firenze", "lat": 43.7696, "lng": 11.2558},
    "Two Sicilies": {"capital": "Napoli", "lat": 40.8518, "lng": 14.2681},
    "Würtemberg": {"capital": "Stuttgart", "lat": 48.7758, "lng": 9.1829},
    "Modena": {"capital": "Modena", "lat": 44.6471, "lng": 10.9252},

    # Özel durumlar
    "Burma/Myanmar": {"capital": "Yangon", "lat": 16.8661, "lng": 96.1951},
    "Ivory Coast": {"capital": "Yamoussoukro", "lat": 6.8270, "lng": -5.2893},
    "Hong Kong": {"capital": "Victoria", "lat": 22.2783, "lng": 114.1747},
    "Hong Kong SAR (China)": {"capital": "Hong Kong", "lat": 22.3193, "lng": 114.1694},
    "Lao PDR": {"capital": "Vientiane", "lat": 17.9757, "lng": 102.6331},
    "Laos": {"capital": "Vientiane", "lat": 17.9757, "lng": 102.6331},
    "North Korea": {"capital": "Pyongyang", "lat": 39.0392, "lng": 125.7625},
    "Palestine/Gaza": {"capital": "Gaza", "lat": 31.5017, "lng": 34.4668},
    "Palestine/West Bank": {"capital": "Ramallah", "lat": 31.9038, "lng": 35.2034},
    "Papua New Guinea": {"capital": "Port Moresby", "lat": -9.4438, "lng": 147.1803},
    "Republic of the Congo": {"capital": "Brazzaville", "lat": -4.2634, "lng": 15.2429},
    "Sao Tome and Principe": {"capital": "São Tomé", "lat": 0.3365, "lng": 6.7273},
    "São Tomé and Príncipe": {"capital": "São Tomé", "lat": 0.3365, "lng": 6.7273},
    "Seychelles": {"capital": "Victoria", "lat": -4.6191, "lng": 55.4513},
    "Solomon Islands": {"capital": "Honiara", "lat": -9.4456, "lng": 159.9729},
    "Somaliland": {"capital": "Hargeisa", "lat": 9.5600, "lng": 44.0650},
    "South Korea": {"capital": "Seoul", "lat": 37.5665, "lng": 126.9780},
    "South Vietnam": {"capital": "Saigon", "lat": 10.8231, "lng": 106.6297},
    "Timor-Leste": {"capital": "Dili", "lat": -8.5569, "lng": 125.5603},
    "Zanzibar": {"capital": "Stone Town", "lat": -6.1659, "lng": 39.2026},
    "Bolivarian Republic of Venezuela": {"capital": "Caracas", "lat": 10.4806, "lng": -66.9036},
    "Côte d'Ivoire": {"capital": "Yamoussoukro", "lat": 6.8270, "lng": -5.2893},
    "Democratic People's Republic of Korea": {"capital": "Pyongyang", "lat": 39.0392, "lng": 125.7625},
    "Democratic Republic of the Congo": {"capital": "Kinshasa", "lat": -4.4419, "lng": 15.2663},
    "Republic of Korea": {"capital": "Seoul", "lat": 37.5665, "lng": 126.9780},
    "Republic of Vietnam": {"capital": "Saigon", "lat": 10.8231, "lng": 106.6297},
    "Republic of Yemen": {"capital": "Sana'a", "lat": 15.5527, "lng": 44.2075},

    # Son eksikler
    "Myanmar": {"capital": "Naypyidaw", "lat": 19.7633, "lng": 96.0785},
    "Vietnam": {"capital": "Hanoi", "lat": 21.0285, "lng": 105.8542},
    "Panama": {"capital": "Panama City", "lat": 8.9824, "lng": -79.5199},
    "Slovakia": {"capital": "Bratislava", "lat": 48.1486, "lng": 17.1077},
    "Slovenia": {"capital": "Ljubljana", "lat": 46.0569, "lng": 14.5058},
    "North Macedonia": {"capital": "Skopje", "lat": 41.9973, "lng": 21.4280},
}

def add_missing_capitals():
    print("🔨 Eksik başkentler ekleniyor...\n")

    with open(UNIFIED_DATA, 'r', encoding='utf-8') as f:
        data = json.load(f)

    countries = data['countries']
    added_count = 0
    not_found_count = 0
    not_found_list = []

    for country in countries:
        vdem_name = country['vdem_name']

        for period in country['periods']:
            if period['capital'] is None:
                # V-Dem adına göre başkent ara
                if vdem_name in CAPITAL_DATABASE:
                    capital_info = CAPITAL_DATABASE[vdem_name]
                    period['capital'] = capital_info['capital']
                    period['coordinates'] = {
                        'lat': capital_info['lat'],
                        'lng': capital_info['lng']
                    }
                    added_count += 1
                    print(f"✓ {vdem_name:30} → {capital_info['capital']}")
                else:
                    not_found_count += 1
                    if vdem_name not in not_found_list:
                        not_found_list.append(vdem_name)

    # Güncellenmiş veriyi kaydet
    data['metadata']['version'] = '1.1.0'
    data['metadata']['updated'] = '2025-11-25'
    data['metadata']['note'] += ' Eksik başkentler eklendi.'

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"\n{'='*80}")
    print(f"✅ {added_count} başkent eklendi")
    print(f"⚠️  {not_found_count} başkent bulunamadı")
    print(f"📁 Yeni dosya: {OUTPUT_FILE}")

    if not_found_list:
        print(f"\n❌ Başkent bulunamayan ülkeler:")
        for name in sorted(not_found_list):
            print(f"   - {name}")

if __name__ == '__main__':
    add_missing_capitals()
