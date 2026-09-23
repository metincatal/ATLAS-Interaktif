/**
 * Kuramın temel kavramları: dört Leviathan tipi
 */

export const TYPE_ORDER = ['Shackled', 'Despotic', 'Paper', 'Absent'];

export const TYPES = {
    Shackled: {
        short: 'Zincirlenmiş',
        long: 'Zincirlenmiş Leviathan',
        en: 'Shackled Leviathan',
        color: '#3DBE9C',
        text: '#72D8BB',
        formula: 'güçlü devlet · güçlü toplum',
        desc: 'Devlet kamu hizmeti sunacak ve yasaları uygulayacak kadar kudretli; toplum onu denetleyecek kadar örgütlü. Özgürlüğün kalıcı olabildiği dar alan.',
        example: 'Kitaptaki örnekler: Batı Avrupa, İskandinavya, ABD',
    },
    Despotic: {
        short: 'Despotik',
        long: 'Despotik Leviathan',
        en: 'Despotic Leviathan',
        color: '#E8604F',
        text: '#F4907F',
        formula: 'devlet ≫ toplum',
        desc: 'Devlet toplumdan çok daha güçlü. Düzen ve kapasite olabilir, ancak hesap verebilirlik ve bireysel özgürlük sınırlıdır.',
        example: 'Kitaptaki örnek: Çin',
    },
    Paper: {
        short: 'Kâğıttan',
        long: 'Kâğıttan Leviathan',
        en: 'Paper Leviathan',
        color: '#E2A73E',
        text: '#EFC36F',
        formula: 'zayıf devlet · zayıf toplum',
        desc: 'Devlet de toplum da zayıf. Kâğıt üzerinde güçlü görünen kurumlar uygulamada ne düzen ne özgürlük sağlayabilir.',
        example: 'Kitaptaki örnekler: Latin Amerika’nın birçok ülkesi',
    },
    Absent: {
        short: 'Namevcut',
        long: 'Namevcut Leviathan',
        en: 'Absent Leviathan',
        color: '#A08AF4',
        text: '#BDAEF8',
        formula: 'toplum ≫ devlet',
        desc: 'Merkezî otorite zayıf ya da yok; düzeni gelenekler ve yerel yapılar belirler. Bu “normlar kafesi” de özgürlüğü kısıtlar.',
        example: 'Kitaptaki örnek: Nijerya’daki Tiv toplumu',
    },
};

export function typeChip(type, { label = null, small = false } = {}) {
    if (!type || !TYPES[type]) {
        return `<span class="chip${small ? ' chip-sm' : ''}"><span class="dot"></span>Veri yok</span>`;
    }
    return `<span class="chip t-${type}${small ? ' chip-sm' : ''}"><span class="dot"></span>${label ?? TYPES[type].long}</span>`;
}

export const STAKEHOLDERS = {
    military: { label: 'Ordu', icon: 'shield' },
    elite: { label: 'Ekonomik elit', icon: 'briefcase' },
    civil: { label: 'Sivil toplum', icon: 'people' },
    religious: { label: 'Dinî kurumlar', icon: 'dome' },
    international: { label: 'Uluslararası', icon: 'globe' },
};
