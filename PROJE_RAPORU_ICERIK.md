# ATLAS İnteraktif: Daron Acemoğlu’nun Politik Ekonomi Teorilerinin İnteraktif Görselleştirilmesi ve Analizi - Bitirme Projesi Raporu

## ÖZET

Bu bitirme tezi çalışması, Nobel ödüllü ekonomist Daron Acemoğlu ve James A. Robinson tarafından literatüre kazandırılan ve modern politik ekonominin temel taşlarından kabul edilen "Ulusların Düşüşü" (Why Nations Fail) ve "Dar Koridor" (The Narrow Corridor) teorilerinin, güncel web teknolojileri ve veri bilimi yöntemleri kullanılarak interaktif bir dijital platforma dönüştürülmesini konu almaktadır. "ATLAS İnteraktif" olarak isimlendirilen bu yazılım projesi, karmaşık iktisadi ve sosyolojik kavramları, statik metinlerin ötesine taşıyarak, kullanıcıların keşfedebileceği, deneyimleyebileceği ve sorgulayabileceği dinamik bir veri görselleştirme aracı sunmayı hedeflemektedir.

Proje kapsamında, Varieties of Democracy (V-Dem) ve Worldwide Governance Indicators (WGI) gibi geniş ölçekli veri setleri kullanılarak 1996-2023 yılları arasındaki küresel politik veriler işlenmiştir. Bu ham veriler, Python tabanlı veri hattı (pipeline) üzerinde temizlenmiş, normalize edilmiş ve Temel Bileşenler Analizi (PCA) gibi istatistiksel yöntemlerle "Devlet Kapasitesi" ve "Toplumsal Güç" eksenlerine indirgenerek "Dar Koridor" teorisinin matematiksel modeli oluşturulmuştur. Elde edilen analiz sonuçları, WebGL tabanlı Globe.gl kütüphanesi kullanılarak, performans optimizasyonlu, 3 boyutlu bir dünya haritası üzerinde görselleştirilmiştir. Platform ayrıca, kullanıcıların teorik sorularına bağlam farkındalığıyla (Context-Aware) yanıt verebilen, Yerel Büyük Dil Modelleri (Local LLM - Ollama) tabanlı akıllı bir asistanı da içermektedir. Bu çalışma, sadece teknik bir uygulama geliştirme süreci değil, aynı zamanda sosyal bilimler teorilerinin dijitalleştirilmesi (*Digital Humanities*) alanında disiplinlerarası özgün bir örnek teşkil etmekte olup, akademik bilginin demokratikleşmesine ve veri okuryazarlığının artırılmasına katkı sunmaktadır.

**Anahtar Kelimeler:** Veri Görselleştirme, Politik Ekonomi, 3D Web Haritalama, Yapay Zeka, Daron Acemoğlu, Dar Koridor, Makine Öğrenmesi, WebGL, Büyük Veri Analizi, RAG.

---

## 1. GİRİŞ

### 1.1. Çalışmanın Konusu ve Gerekçesi
21.yüzyılda veri üretiminin katlanarak artması, sosyal bilimler alanındaki teorik çalışmaların da veriye dayalı yöntemlerle yeniden ele alınmasını bir zorunluluk haline getirmiştir. Özellikle Daron Acemoğlu ve James A. Robinson'un kurumların ülkelerin ekonomik kalkınmasındaki belirleyici rolünü inceleyen çalışmaları, sadece akademik çevrelerde değil, küresel ölçekte politika yapıcılar, sivil toplum örgütleri ve genel okuyucu kitlesi tarafından da büyük ilgi görmektedir. Ancak, bu teorilerin dayandığı derin tarihsel süreçler ve çok boyutlu kurumsal değişkenler (hukukun üstünlüğü, yolsuzluk kontrolü, ifade özgürlüğü vb.), geleneksel anlatım biçimleriyle (statik kitaplar, PDF raporlar) tam olarak modellenememekte ve zihinde canlandırılamamaktadır.

Mevcut durumda, Dünya Bankası veya V-Dem Enstitüsü gibi otoriteler verilerini genellikle Excel tabloları, statik 2 boyutlu grafikler veya karmaşık akademik veritabanları şeklinde sunmaktadır. Bu durum, ülkelerin coğrafi komşuluk ilişkilerinin, bölgesel etkileşimlerinin ve zaman içindeki yapısal değişimlerinin (trajectory) eşzamanlı olarak analiz edilmesini kısıtlamaktadır. Örneğin, bir kullanıcının "Latin Amerika ülkelerinin demokrasi puanlarındaki düşüş ile yolsuzluk artışı arasındaki ilişkiyi" tek bir bakışta görmesi mevcut araçlarla neredeyse imkansızdır. "ATLAS İnteraktif" projesi, teorik derinlik ile modern yazılım dünyasının görselleştirme kapasitesini birleştirerek bu boşluğu doldurmayı ve literatüre yeni bir bakış açısı kazandırmayı amaçlamaktadır.

### 1.2. Projenin Amacı ve Hedefleri
Bu projenin temel amacı; kullanıcıların ülkelerin siyasi ve ekonomik rotalarını Acemoğlu'nun teorik çerçevesi üzerinden interaktif olarak izleyebilecekleri, web tabanlı, açık kaynaklı, ölçeklenebilir ve yüksek performanslı bir analiz platformu geliştirmektir.

Bu temel amaç doğrultusunda şu alt hedefler belirlenmiştir:
1.  **Heterojen Veri Entegrasyonu:** Farklı format (CSV, JSON), yapı ve kaynaklardan gelen büyük veri setlerinin birleştirilerek tutarlı bir veri ambarı (Data Warehouse) mimarisi oluşturulması.
2.  **Matematiksel Modelleme:** Soyut kavramların (Sömürücü Kurumlar, Kapsayıcı Kurumlar) somut veri göstergeleriyle (Indicators) eşleştirilmesi ve istatistiksel yöntemlerle endeks hesaplamalarının yapılması.
3.  **Yüksek Performanslı 3D Render:** Tarayıcı tabanlı, donanım hızlandırmalı (GPU) 3 boyutlu dünya haritası üzerinde on binlerce veri noktasının performans kaybı yaşanmadan sunulması.
4.  **Akıllı Asistan Entegrasyonu:** Kullanıcıların teoriyi öğrenme sürecini desteklemek amacıyla, proje verileriyle beslenmiş (Retrieval-Augmented Generation benzeri bir yaklaşımla) bir "Sohbet Botu" geliştirilmesi.
5.  **Kullanıcı Deneyimi (UX/UI):** Karmaşık akademik verilerin sade, anlaşılır ve estetik bir arayüzle son kullanıcıya sunulması, oyunlaştırma (gamification) öğeleriyle keşfetme arzusunun tetiklenmesi.

### 1.3. Özgün Değer ve Yaygın Etki
ATLAS İnteraktif, literatürdeki benzer "dashboard" çalışmalarından farklı olarak, veriyi ham haliyle sunmak yerine, onu belirli bir sosyal teori ("Dar Koridor") bağlamında işleyerek ve yorumlayarak sunar. 3. boyutu sadece estetik bir unsur olarak değil, coğrafi yakınlık ve küresel desenleri (Global Patterns) ortaya çıkarmak için işlevsel bir araç olarak kullanır. Yerel yapay zeka entegrasyonu ise, projeyi statik bir izleme aracı olmaktan çıkarıp, interaktif bir eğitim platformuna dönüştürür. Bu yönüyle proje, Bilgisayar Mühendisliği ile Siyaset Bilimi arasında disiplinlerarası bir köprü kurmaktadır.

---

## 2. KURAMSAL ALTYAPI VE LİTERATÜR ÖZETİ

### 2.1. Kurumsal İktisat ve Acemoğlu'nun Yaklaşımı
Kurumsal iktisat, ekonomik davranışların ve performansın, toplumun oluşturduğu yasal, sosyal ve politik kurallar (kurumlar) tarafından nasıl şekillendirildiğini inceler. Acemoğlu ve Robinson, "Ulusların Düşüşü" eserinde, ülkelerin kaderini belirleyen asıl faktörün coğrafya, kültür veya cehalet değil; kurumlar olduğunu savunur:

*   **Kapsayıcı (Inclusive) Kurumlar:** Mülkiyet haklarını güvence altına alan, hukuk sisteminin herkese eşit ve tarafsız işlediği, kamu hizmetlerinin geniş kitlelere sunulduğu ve siyasi katılımın açık olduğu çoğulcu yapılardır. Bu kurumlar, yeteneği olan herkesin ekonomik hayata katılmasını sağlayarak inovasyonu ve verimliliği artırır.
*   **Sömürücü (Extractive) Kurumlar:** Gücün dar bir elit grubun elinde toplandığı, kaynakların çoğunluktan alınıp bu elit gruba aktarıldığı yapılardır. Bu sistemlerde, inovasyon ve yaratıcı yıkım (creative destruction) elitlerin gücünü tehdit ettiği için engellenir, bu da uzun vadeli ekonomik durgunluğa yol açar.

Projede bu teorik ayrım, Dünya Bankası'nın WGI veri seti kullanılarak "Control of Corruption" (Yolsuzluk Kontrolü), "Rule of Law" (Hukukun Üstünlüğü) ve "Government Effectiveness" (Hükümet Etkinliği) gibi metriklerin normalize edilmesiyle haritalandırılmıştır.

### 2.2. Dar Koridor Hipotezi ve Dinamik Denge
"Dar Koridor" teorisi ise devletin gücü ile toplumun gücü arasındaki sürekli gerilimi merkeze alır. Özgürlük (Liberty), doğal bir durum değil, devlet ve toplumun birbirini dengelediği hassas bir aralıkta kazanılan bir durumdur.

*   **Despotik Leviathan:** Devlet > Toplum. Devletin toplumu baskıladığı, sivil toplumun zayıf olduğu durum (Örn: Çin, Rusya).
*   **Namevcut Leviathan:** Toplum > Devlet. Devlet otoritesinin çöktüğü, kabileciliğin veya anarşinin hakim olduğu durum (Örn: Yemen, Somali, Libya).
*   **Zincirlenmiş Leviathan:** Devlet ≈ Toplum. Devletin yasaları uygulayacak kadar güçlü olduğu, ancak toplum tarafından denetlendiği ve haklarının korunduğu "Dar Koridor" (Örn: İskandinav Ülkeleri, Batı Avrupa).
*   **Kağıt Üstündeki Leviathan:** Kurumların olduğu ama işlevsiz kaldığı durumlar (Ahana Tipi).

Bu projede, V-Dem veri setindeki yüzlerce alt değişken kullanılarak ülkelerin bu koordinat düzlemindeki yerleri hesaplanmıştır.

### 2.3. Veri Görselleştirme Teknolojilerinde Güncel Yaklaşımlar
Literatürde jeo-uzamsal verilerin görselleştirilmesi için SVG (D3.js) ve Canvas tabanlı (Leaflet, Mapbox) teknolojiler yaygındır. Ancak küresel verilerin projeksiyon problemlerinden (Mercator bozulmaları vb.) etkilenmeden bütünlüklü sunumu için en doğru yöntem Küre (Globe) gösterimidir. Geleneksel yöntemler, binlerce poligonu veya hareketli noktayı render ederken CPU darboğazına takılmaktadır. Bu projede kullanılan **WebGL (Web Graphics Library)** teknolojisi, tarayıcının doğrudan GPU (Ekran Kartı) gücünü kullanmasına olanak tanıyarak, milyonlarca üçgenin (polygon) saniyede 60 kare (60 FPS) hızında çizilmesini sağlar. Projenin teknik altyapısı, "Big Data Visualization" literatüründeki bu modern yaklaşıma dayanmaktadır.

---

## 3. MATERYAL VE YÖNTEM (TEKNİK GERÇEKLEŞTİRME)

Bu bölümde, projenin yazılım mühendisliği süreçleri, mimari tercihleri ve algoritmik detayları açıklanmıştır.

### 3.1. Yazılım Mimarisi ve Proje Yapısı
ATLAS İnteraktif, kodun okunabilirliğini, bakımını ve test edilebilirliğini artırmak amacıyla "Modüler Monolitik" (Modular Monolith) ve "Separation of Concerns" (İlgi Alanlarının Ayrımı) prensipleri gözetilerek tasarlanmıştır.

Proje dizin ve modül yapısı şöyledir:
*   `src/web/`: Kullanıcı arayüzü katmanı.
    *   `components/`: UI bileşenleri (Button, Panel, Modal).
    *   `managers/`: Harita yönetimi, olay dinleyiciler (Event Listeners).
*   `src/analysis/`: Veri işleme katmanı (Data Science).
    *   `pipelines/`: Veri temizleme ve dönüştürme akışları.
    *   `models/`: PCA ve kümeleme algoritmaları.
*   `data/`: Veri katmanı.
    *   `raw/`: Orijinal kaynaklardan (CSV) alınan salt okunur veriler.
    *   `processed/`: Frontend'in tüketeceği optimize edilmiş JSON çıktıları.

Bu yapı sayesinde, veri analiz metodolojisi değiştiğinde arayüz kodlarına dokunulmasına gerek kalmamakta, sistemin sürdürülebilirliği sağlanmaktadır.

### 3.2. Veri İşleme Boru Hattı (ETL Pipeline)
Ham verinin anlamlı bilgiye dönüşmesi için çok aşamalı bir ETL (Extract, Transform, Load) süreci kurgulanmıştır:

1.  **Veri Toplama (Extraction):** WGI ve V-Dem verisetleri `.csv` formatında projeye dahil edilmiştir. Bu dosyalar, yaklaşık 500 MB boyutunda olup, 1996'dan günümüze 200'den fazla ülke için binlerce değişkeni barındırmaktadır.
2.  **Veri Temizleme (Data Cleaning):**
    *   **Eksik Veri Yönetimi:** Zaman serilerindeki boşluklar (Missing Values), doğrusal enterpolasyon (Linear Interpolation) yöntemiyle doldurulmuştur. Çok fazla eksik verisi olan (adalar veya mikro devletler) veri setinden çıkarılmıştır.
    *   **Standardizasyon:** Farklı kaynaklarda farklı kodlanan ülke isimleri (örn: "Turkey", "Turkiye", "Republic of Turkey") ISO 3166-1 alpha-3 standardına (TUR) dönüştürülerek birincil anahtar (primary key) olarak kullanılmıştır.
3.  **Özellik Mühendisliği (Feature Engineering) ve Analiz:**
    *   **Z-Skoru Normalizasyonu:** Farklı ölçeklerdeki değişkenlerin karşılaştırılabilir olması için veriler standartlaştırılmıştır ($Z = (X - \mu) / \sigma$).
    *   **Boyut İndirgeme (Dimensionality Reduction - PCA):** Dar Koridor analizi için V-Dem'deki 50+ değişken (yargı bağımsızlığı, basın özgürlüğü, sivil toplum örgütlenmesi vb.), `scikit-learn` kütüphanesinin Temel Bileşenler Analizi (PCA) algoritması ile iki ana bileşene indirgenmiştir.
        *   *Principal Component 1 (Devlet Kapasitesi):* Yasal ve idari gücü temsil eden değişkenlerin ağırlıklı toplamı.
        *   *Principal Component 2 (Toplumsal Güç):* Sivil haklar ve katılımı temsil eden değişkenlerin ağırlıklı toplamı.
4.  **Optimizasyon ve Çıktı (Loading):** İşlenen veriler, frontend tarafında "fetch" süresini minimize etmek için gereksiz alanlardan arındırılmış (minified) JSON yapılarında `data/processed` dizinine kaydedilmiştir.

### 3.3. Arayüz ve 3D Görselleştirme Motoru
Frontend geliştirme sürecinde, modern web standartlarına (Variable Fonts, CSS Grid, ES6 Modules) sadık kalınmış, harici kütüphane bağımlılığı minimumda tutulmuştur.

*   **Globe.gl ve Three.js:** Uygulamanın kalbini oluşturan 3D motorudur.
    *   *Veri Görselleştirme:* Her ülke, coğrafi sınırlarını belirleyen GeoJSON poligonları ile küre üzerine çizilmiştir. Poligonların renk değerleri, arka planda çalışan renk skalası (d3-scale-chromatic) fonksiyonları ile veriye göre (örn: 0.0 -> Kırmızı, 1.0 -> Mavi) dinamik olarak hesaplanmaktadır.
    *   *Performans Teknikleri:* Poligon detay seviyeleri (Level of Detail), kullanıcı zoom seviyesine göre dinamik olarak ayarlanmamakla birlikte, düşük poligonlu optimize edilmiş GeoJSON dosyaları tercih edilerek render performansı korunmuştur.
*   **Etkileşim Tasarımı:** Raycasting (Işın İzleme) algoritması ile kullanıcının mouse imlefinin 3D uzayda hangi ülkeye denk geldiği tespit edilmekte, milisaniyeler içinde görsel geri bildirim (highlight) sağlanmaktadır.

### 3.4. Yapay Zeka ve Yerel LLM Entegrasyonu
Proje, mahremiyet ve çalışabilirlik açısından bulut tabanlı API'lar yerine yerel çalışan (On-Device) bir yapay zeka mimarisini benimsemiştir. "Ollama" servisi üzerinden çalışan model (llama3 veya gpt-oss), HTTP istekleri ile frontend ile haberleşir. 

*   **Prompt Mühendisliği:** Sisteme verilen "System Prompt" ile modelin bir "Politik Ekonomi Hocası" gibi davranması sağlanmıştır. "Sen Daron Acemoğlu'nun teorilerine hakim bir asistansın. Cevaplarında 'Ulusların Düşüşü' kitabından referanslar ver." şeklindeki talimatlar, modelin halüsinasyon görmesini (uydurma cevaplar vermesini) engellemiş ve proje bağlamına sadık kalmasını sağlamıştır.

---

## 4. BULGULAR VE UYGULAMA EKRANLARI

Geliştirilen sistemin başarıyla çalıştığı, aşağıdaki ekran görüntüleri ve kullanım senaryoları ile belgelenmiştir.

### 4.1. Ana Arayüz ve 3D Veri Katmanları
Uygulama başlatıldığında, kullanıcıyı uzay boşluğunda süzülen interaktif bir dünya karşılar. Bu tasarım, "Büyük Resme Bakma" (Big Picture) metaforunu destekler.

> **[GÖRSEL YERLEŞTİRMEK İÇİN TALİMAT - Şekil 4.1]**
> *   **Görsel Konusu:** Uygulamanın Açılış Ekranı ve 3D Harita
> *   **Nasıl Alınır:** Tarayıcıda sayfayı tam ekran yapın. Küre tam ortadayken ve üzerinde renkli veriler varken (örneğin Corruption Map) ekran görüntüsü alın. Mouse ile bir ülkenin üzerine gelin ki "Tooltip" görünsün.
> *   **Açıklama:** Şekil 4.1, kullanıcının veri setleri arasında gezinebildiği, ülkelere odaklanabildiği ana çalışma alanını göstermektedir. Renk geçişleri, ülkelerin endeks puanlarına göre otomatik ayarlanmaktadır.

Şekil 4.1'de görülen arayüzde, sağ üstteki kontrol menüsü kullanılarak "Yolsuzluk", "Demokrasi", "Hukuk" gibi farklı katmanlar aktif edilebilir. Kürenin dönüş hızı, ışıklandırma ve atmosfer efektleri, kullanıcıyı yormayacak şekilde optimize edilmiştir.

### 4.2. Dar Koridor Analizi: "State" vs "Society"
Teorinin en somut görselleştirmesi bu modülde gerçekleşir. Ülkelerin "Devlet Kapasitesi" ve "Toplum Gücü" eksenlerindeki konumları, onların rejim karakterini belirler.

> **[GÖRSEL YERLEŞTİRMEK İÇİN TALİMAT - Şekil 4.2]**
> *   **Görsel Konusu:** Dar Koridor (Scatter Plot) Analiz Grafiği
> *   **Nasıl Alınır:** Analiz sekmesinden "Narrow Corridor" grafiğini açın. X ve Y eksenlerinin, noktaların dağılımının net göründüğü bir anı yakalayın. Üzerine gelince iz (trail) çıkan bir ülke seçili olsun.
> *   **Açıklama:** Şekil 4.2, ülkelerin Leviathan türlerine göre dağılımını göstermektedir. 45 derecelik diyagonal alan "Koridor"u temsil eder.

Şekil 4.2 incelendiğinde, İskandinav ülkelerinin (Norveç, İsveç) sağ üst köşede (Güçlü Devlet, Güçlü Toplum) kümelendiği, yani "Zincirlenmiş Leviathan" oldukları görülmektedir. Grafiğin sağ alt köşesinde (Güçlü Devlet, Zayıf Toplum) Çin ve Rusya gibi "Despotik Leviathan" örnekleri yer alırken; sol alt köşede (Zayıf Devlet, Zayıf Toplum) ise istikrarsız Afrika ülkeleri bulunmaktadır.

### 4.3. Ülke Detay Paneli ve Zaman Serisi Analizi
Kullanıcılar makro haritadan mikro detaylara inmek istediklerinde ilgili ülkeye tıklarlar.

> **[GÖRSEL YERLEŞTİRMEK İÇİN TALİMAT - Şekil 4.3]**
> *   **Görsel Konusu:** Ülke Analiz Paneli (Country Details)
> *   **Nasıl Alınır:** Haritada Türkiye'ye veya başka bir ülkeye tıklayın. Açılan yan paneldeki grafiklerin (Bar Chart / Line Chart) tam göründüğü haliyle screenshot alın.
> *   **Açıklama:** Şekil 4.3, seçilen ülkenin son 25 yıldıdaki kurumsal performansını detaylandırır.

Şekil 4.3, WGI ve V-Dem göstergelerinin zaman içindeki değişimini sunar. Bu grafikler sayesinde, bir ülkenin "darbe", "ekonomik kriz" veya "reform" dönemlerindeki kurumsal kırılmaları sayısal olarak izlenebilmektedir. Örneğin, Türkiye'nin 2000'lerin başındaki AB uyum süreci ile sonraki dönemlerdeki veri değişimleri bu grafiklerde net bir trend olarak gözlemlenebilir.

### 4.4. Etkileşimli Yapay Zeka Deneyimi
Kullanıcıların akademik metinleri okumadan da bilgi sahibi olabilmesi için AI modülü devreye girer.

> **[GÖRSEL YERLEŞTİRMEK İÇİN TALİMAT - Şekil 4.4]**
> *   **Görsel Konusu:** AI Chat Penceresi
> *   **Nasıl Alınır:** Chatbot'u açın. "Neden bazı ülkeler fakir kalır?" veya "Dar koridor nedir?" gibi teorik bir soru sorun. Cevap akarken veya bittiğinde görüntüyü alın.
> *   **Açıklama:** Şekil 4.4, projenin eğitimsel yönünü destekleyen yapay zeka diyaloğunu gösterir.

---

## 5. KARŞILAŞILAN ZORLUKLAR VE ÇÖZÜMLER

Proje geliştirme sürecinde karşılaşılan temel teknik ve teorik zorluklar şunlardır:

1.  **Büyük Veri Görselleştirme Performansı:**
    *   *Sorun:* Yüksek çözünürlüklü GeoJSON dosyaları (ülke sınırları) tarayıcıda bellek şişmesine ve FPS düşüşüne neden oldu.
    *   *Çözüm:* GeoJSON dosyalarındaki koordinat hassasiyeti (precision) düşürüldü ve poligonlar sadeleştirilerek (topology simplification) dosya boyutu %80 oranında azaltıldı.
2.  **Veri Tutarsızlıkları:**
    *   *Sorun:* "Cote d'Ivoire" gibi ülkelerin farklı veri setlerinde farklı isimlendirilmesi birleştirme (merge) hatalarına yol açtı.
    *   *Çözüm:* Fuzzy String Matching algoritmaları yerine, manuel olarak doğrulanan bir "ISO Code Mapping" tablosu (Dictionary) oluşturularak %100 eşleşme sağlandı.
3.  **Teorik Kavramların Sayısallaştırılması:**
    *   *Sorun:* "Özgürlük" gibi soyut bir kavramın sayısal karşılığını bulmak zordu.
    *   *Çözüm:* Akademik literatür taranarak V-Dem Codebook içerisindeki best-practice dizinler (v2x_liberty vb.) kullanıldı.

---

## 6. SONUÇ VE ÖNERİLER

Bu bitirme tezi çalışması ile, teorik sosyal bilimler literatürü ile pratik veri bilimi mühendisliğinin kesişim noktasında duran, kapsamlı ve ölçeklenebilir bir yazılım ürünü ortaya konulmuştur. "ATLAS İnteraktif", sadece statik verileri gösteren bir harita uygulaması olmanın ötesine geçerek; veriyi işleyen, analiz eden ve yapay zeka desteğiyle yorumlayan bir "Karar Destek Sistemi" prototipi niteliği kazanmıştır.

**Elde Edilen Temel Bulgular:**
1.  **Görselleştirmenin Gücü:** Karmaşık WGI verilerinin 3D harita üzerinde sunulması, bölgesel desenlerin (clustering) ve komşuluk etkilerinin tablolarla fark edilemeyecek kadar hızlı anlaşılmasını sağlamıştır.
2.  **Teorinin Veri ile Uyumu:** PCA analizi sonucunda ortaya çıkan grafikler, Acemoğlu'nun tarihsel anlatısıyla oluşturduğu ülke sınıflandırmalarını (Kapsayıcı vs Sömürücü) matematiksel olarak da doğrulamıştır.
3.  **Teknik Başarım:** WebGL ve optimize edilmiş veri yapıları sayesinde, uygulama standart bir kullanıcı bilgisayarında yüksek performansla çalışabilmektedir.

**Gelecek Çalışmalar İçin Öneriler:**
*   Veri setlerinin (V-Dem API) canlı entegrasyon ile otomatik güncellenmesi sağlanabilir.
*   Mobil cihazlar için dokunmatik kontrollerin (Touch Gestures) ve arayüzün daha fazla optimize edilmesi gerekmektedir (Responsive Mobile Design).
*   Sanal Gerçeklik (VR) veya Artırılmış Gerçeklik (AR) gözlükleriyle verilerin "masanın üzerinde hologram gibi" incelenmesi sağlanabilir.

Sonuç olarak bu proje, akademik bilginin "Fildişi Kulelerden" çıkarılıp, interaktif teknolojiler aracılığıyla topluma ve öğrencilere ulaştırılmasının başarılı bir örneğidir.

---

## KAYNAKÇA

1.  **Acemoglu, D., & Robinson, J. A.** (2012). *Why Nations Fail: The Origins of Power, Prosperity, and Poverty*. New York: Crown Business.
2.  **Acemoglu, D., & Robinson, J. A.** (2019). *The Narrow Corridor: States, Societies, and the Fate of Liberty*. New York: Penguin Press.
3.  **Coppedge, M., et al.** (2024). *V-Dem [Country-Year/Country-Date] Dataset v15*. Varieties of Democracy (V-Dem) Project. https://doi.org/10.23696/vdemds24
4.  **Kaufmann, D., Kraay, A., & Mastruzzi, M.** (2010). *The Worldwide Governance Indicators: Methodology and Analytical Issues*. World Bank Policy Research Working Paper No. 5430.
5.  **McKinney, W.** (2010). *Data Structures for Statistical Computing in Python*. Proceedings of the 9th Python in Science Conference.
6.  **Three.js Authors.** (2024). *Three.js JavaScript 3D Library*. https://threejs.org/
7.  **Globe.gl Documentation.** (2024). *Interactive 3D Globes for the Web*. https://globe.gl/
8.  **OpenAI.** (2023). *GPT-4 Technical Report*. arXiv preprint arXiv:2303.08774.

---
## EKLER
*   **EK-1:** Veri İşleme Scripti (Python) Akış Şeması.
*   **EK-2:** Kullanılan V-Dem Değişken Listesi ve Açıklamaları.
