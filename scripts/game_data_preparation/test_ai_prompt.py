#!/usr/bin/env python3
"""
AI Prompt Test Scripti
Oyun için kullanılacak AI promptunu test eder.
"""

import requests
import json

def test_ai_analysis():
    """AI policy analysis testi"""

    # Ollama endpoint
    url = "http://localhost:11434/api/generate"

    # Test politikası
    policy_title = "Basın Özgürlüğü Reformu"
    policy_description = "Medya üzerindeki devlet kontrolünü azaltma, bağımsız gazeteciliği güçlendirme"

    # Test context
    context = {
        "country": "Türkiye",
        "year": 2020,
        "statePower": -0.5,
        "societyPower": 0.3
    }

    # Prompt oluştur
    prompt = f"""Sen bir siyaset bilimcisin. Bir politika analizi yapacaksın.

POLİTİKA:
Başlık: {policy_title}
Açıklama: {policy_description}

Bağlam:
- Ülke: {context['country']}
- Yıl: {context['year']}
- Mevcut Faktörler: Devlet Gücü={context['statePower']}, Toplum Gücü={context['societyPower']}

GÖREVİN:
Aşağıdaki 17 V-Dem değişkeninden bu politika HANGİLERİNİ etkiler? (Maksimum 5 değişken seç)

DEĞİŞKENLER:
1. v2x_libdem (Liberal Demokrasi İndeksi, 0-1)
2. v2x_partipdem (Katılımcı Demokrasi İndeksi, 0-1)
3. v2x_delibdem (Müzakereci Demokrasi İndeksi, 0-1)
4. v2x_egaldem (Eşitlikçi Demokrasi İndeksi, 0-1)
5. v2x_freexp (İfade ve İnanç Özgürlüğü, 0-1)
6. v2mecenefm (Medya Sansürü Çabaları, 0-4, yüksek=kötü)
7. v2x_cspart (Sivil Toplum Katılımı, 0-1)
8. v2cseeorgs (Örgütlenme Özgürlüğü, 0-4)
9. v2cscnsult (Sivil Toplum Danışması, 0-4)
10. v2x_elecreg (Seçim Rejimi, 0-1)
11. v2x_elecoff (Seçimle İşbaşına Gelme, 0-1)
12. v2juhcind (Yargı Bağımsızlığı, 0-4)
13. v2juaccnt (Hesap Verilebilirlik, 0-4)
14. v2x_corr (Politik Yolsuzluk, 0-1, yüksek=kötü)
15. v2x_rule (Hukuk Üstünlüğü, 0-1)
16. v2xcs_ccsi (Core Civil Society Index, 0-1)
17. v2x_frassoc_thick (Association Freedom, 0-1)

Her değişken için belirle:
- direction: 1 (artış) veya -1 (azalış)
- intensity: "Soft", "Moderate", "Radical", veya "Extreme"
- reasoning: Kısa açıklama (1 cümle)

Ayrıca 5 baskı grubunun tepkisini belirle (-1.0 ~ +1.0):
- military (Ordu)
- elite (Ekonomik Seçkinler)
- civil_society (Sivil Toplum)
- religious (Dini Kurumlar)
- international (Uluslararası Toplum)

Ve politik sermaye maliyetini belirle: 10, 25, 50, veya 80

SADECE JSON formatında dön:
{{
  "variables": {{
    "değişken_adı": {{
      "direction": 1 or -1,
      "intensity": "Soft"|"Moderate"|"Radical"|"Extreme",
      "reasoning": "..."
    }}
  }},
  "stakeholders": {{
    "military": -0.15,
    "elite": 0.05,
    ...
  }},
  "political_cost": 25
}}"""

    # API request
    payload = {
        "model": "deepseek-v3.1:671b-cloud",
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.7,
            "top_p": 0.9
        }
    }

    print("="*70)
    print("  AI PROMPT TEST")
    print("="*70)
    print(f"\nPolitika: {policy_title}")
    print(f"Ülke: {context['country']} ({context['year']})")
    print("\nOllama'ya istek gönderiliyor...\n")

    try:
        response = requests.post(url, json=payload, timeout=60)
        response.raise_for_status()

        result = response.json()
        ai_response = result.get("response", "")

        print("AI Yanıtı:")
        print("-"*70)
        print(ai_response[:500] + "..." if len(ai_response) > 500 else ai_response)
        print("-"*70)

        # JSON parse dene
        try:
            # JSON'u temizle (eğer markdown code block içindeyse)
            if "```json" in ai_response:
                ai_response = ai_response.split("```json")[1].split("```")[0]
            elif "```" in ai_response:
                ai_response = ai_response.split("```")[1].split("```")[0]

            parsed = json.loads(ai_response.strip())

            print("\n✅ JSON Parse Başarılı!")
            print(f"\nEtkilenen Değişkenler: {len(parsed.get('variables', {}))}")
            for var, data in parsed.get('variables', {}).items():
                print(f"  - {var}: {data['direction']} × {data['intensity']} ({data.get('reasoning', 'N/A')[:50]}...)")

            print(f"\nPaydaş Tepkileri:")
            for stakeholder, reaction in parsed.get('stakeholders', {}).items():
                emoji = "👍" if reaction > 0 else "👎" if reaction < 0 else "😐"
                print(f"  {emoji} {stakeholder}: {reaction:+.2f}")

            print(f"\nPolitik Maliyet: {parsed.get('political_cost', 'N/A')}")

            return parsed

        except json.JSONDecodeError as e:
            print(f"\n❌ JSON Parse Hatası: {e}")
            print(f"\nHam yanıt:\n{ai_response}")
            return None

    except requests.exceptions.ConnectionError:
        print("❌ Hata: Ollama'ya bağlanılamadı!")
        print("   Ollama çalışıyor mu? Kontrol et: http://localhost:11434")
        return None

    except Exception as e:
        print(f"❌ Hata: {e}")
        return None

if __name__ == "__main__":
    result = test_ai_analysis()

    if result:
        print("\n" + "="*70)
        print("✅ Test Başarılı!")
        print("="*70)
        exit(0)
    else:
        print("\n" + "="*70)
        print("❌ Test Başarısız!")
        print("="*70)
        exit(1)
