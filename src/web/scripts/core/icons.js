/**
 * Tek tip çizgi ikon seti: 24×24, stroke 1.6, currentColor
 */

const PATHS = {
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    chat: '<path d="M4.5 5.5h15v10.5H10l-5.5 4z"/><path d="M8.5 10.5h7"/>',
    globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5c2.4 2.7 3.5 5.5 3.5 8.5s-1.1 5.8-3.5 8.5c-2.4-2.7-3.5-5.5-3.5-8.5s1.1-5.8 3.5-8.5z"/>',
    corridor: '<path d="M4 4v16h16"/><path d="M6.5 17C9.5 15.5 11 13 12 10.5s3-4.5 6.5-5.5"/><path d="M9.5 18.5c3-1.5 4.5-4 5.5-6.5s2.5-4 5-4.5"/>',
    book: '<path d="M4 5.5c2.6-1 5.4-.9 8 .9v13c-2.6-1.8-5.4-1.9-8-.9z"/><path d="M20 5.5c-2.6-1-5.4-.9-8 .9v13c2.6-1.8 5.4-1.9 8-.9z"/>',
    scale: '<path d="M12 4.5v15"/><path d="M8 19.5h8"/><path d="M5 7.5h14"/><path d="M5 7.5L2.8 13a2.4 2.4 0 0 0 4.4 0z"/><path d="M19 7.5L16.8 13a2.4 2.4 0 0 0 4.4 0z"/>',
    home: '<path d="M4 11l8-6.5 8 6.5"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-5h4v5"/>',
    play: '<path d="M8 5.5v13l10.5-6.5z"/>',
    pause: '<path d="M8.5 5.5v13"/><path d="M15.5 5.5v13"/>',
    plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    x: '<path d="M6 6l12 12"/><path d="M18 6L6 18"/>',
    chevronR: '<path d="M9.5 6l6 6-6 6"/>',
    chevronL: '<path d="M14.5 6l-6 6 6 6"/>',
    chevronD: '<path d="M6 9.5l6 6 6-6"/>',
    chevronU: '<path d="M6 14.5l6-6 6 6"/>',
    arrowR: '<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>',
    arrowL: '<path d="M19 12H5"/><path d="M11 6l-6 6 6 6"/>',
    arrowUR: '<path d="M7 17L17 7"/><path d="M9 7h8v8"/>',
    layers: '<path d="M12 4l8.5 4.5L12 13 3.5 8.5z"/><path d="M3.5 12.5L12 17l8.5-4.5"/>',
    shield: '<path d="M12 3.5l7 2.5v5.5c0 4.4-2.9 7.7-7 9-4.1-1.3-7-4.6-7-9V6z"/>',
    briefcase: '<rect x="3.5" y="7.5" width="17" height="12" rx="2"/><path d="M9 7.5v-2h6v2"/><path d="M3.5 12.5h17"/>',
    people: '<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19c.7-3.2 2.8-5 5.5-5s4.8 1.8 5.5 5"/><circle cx="16.5" cy="9.5" r="2.5"/><path d="M16 14.2c2.3.2 4 1.7 4.6 4.3"/>',
    dome: '<path d="M6 20v-7a6 6 0 0 1 12 0v7"/><path d="M12 7V3.5"/><path d="M3.5 20h17"/><path d="M10 20v-4h4v4"/>',
    coins: '<ellipse cx="12" cy="7" rx="7" ry="3"/><path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7"/><path d="M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5"/>',
    calendar: '<rect x="4" y="5.5" width="16" height="14.5" rx="2"/><path d="M4 10h16"/><path d="M8.5 3.5v4"/><path d="M15.5 3.5v4"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><path d="M12 7.8v.2"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    map: '<path d="M3.5 6.5l5.5-2 6 2 5.5-2v13l-5.5 2-6-2-5.5 2z"/><path d="M9 4.5v13"/><path d="M15 6.5v13"/>',
    history: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v4h4"/><path d="M12 8v4l2.8 1.8"/>',
    bolt: '<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>',
    bulb: '<path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3.5a6 6 0 0 0-3.5 10.9c.6.5 1 1.3 1 2.1h5c0-.8.4-1.6 1-2.1A6 6 0 0 0 12 3.5z"/>',
    news: '<rect x="4" y="4.5" width="16" height="15" rx="2"/><path d="M8 9h8"/><path d="M8 12.5h8"/><path d="M8 16h5"/>',
    menu: '<path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/>',
    trendUp: '<path d="M4 16l5-5 4 4 7-7"/><path d="M15 8h5v5"/>',
    trendDown: '<path d="M4 8l5 5 4-4 7 7"/><path d="M15 16h5v-5"/>',
    warning: '<path d="M12 4l9 16H3z"/><path d="M12 10v4.5"/><path d="M12 17.3v.2"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".6"/>',
    shuffle: '<path d="M4 7h3.5c2 0 3.2 1 4.5 3l1 1.6c1.2 1.9 2.4 2.9 4.5 2.9H20"/><path d="M17 12l3 2.5-3 2.5"/><path d="M4 17h3.5c1.4 0 2.4-.5 3.3-1.5"/><path d="M13.7 8.5C14.6 7.5 15.6 7 17 7h3"/><path d="M17 4.5L20 7l-3 2.5"/>',
    sparkle: '<path d="M12 4l1.8 4.9L18.5 10l-4.7 1.8L12 17l-1.8-5.2L5.5 10l4.7-1.1z"/>',
    send: '<path d="M4.5 12L20 4.5 16 20l-4-6.5z"/><path d="M12 13.5L20 4.5"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2.5M12 18v2.5M3.5 12H6M18 12h2.5M6 6l1.8 1.8M16.2 16.2L18 18M6 18l1.8-1.8M16.2 7.8L18 6"/>',
    rotate: '<path d="M20 12a8 8 0 1 1-2.5-5.8"/><path d="M20 4.5v4h-4"/>',
    trash: '<path d="M5 7h14"/><path d="M10 7V5h4v2"/><path d="M7 7l1 12.5h8L17 7"/>',
    share: '<circle cx="6.5" cy="12" r="2.3"/><circle cx="17.5" cy="6" r="2.3"/><circle cx="17.5" cy="18" r="2.3"/><path d="M8.6 11l6.8-3.8"/><path d="M8.6 13l6.8 3.8"/>',
    external: '<path d="M14 4.5h5.5V10"/><path d="M19.5 4.5L11 13"/><path d="M17 14v5.5H4.5V7H10"/>',
    eye: '<path d="M3 12s3.3-6 9-6 9 6 9 6-3.3 6-9 6-9-6-9-6z"/><circle cx="12" cy="12" r="2.5"/>',
    flag: '<path d="M5 21V4.5"/><path d="M5 5h11l-2 4 2 4H5"/>',
    award: '<circle cx="12" cy="9" r="5"/><path d="M8.5 13l-1.5 7.5L12 18l5 2.5-1.5-7.5"/>',
    github: '<path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/>',
    copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2"/>',
    link: '<path d="M10.5 13.5a3.8 3.8 0 0 0 5.4 0l3-3a3.8 3.8 0 0 0-5.4-5.4l-1 1"/><path d="M13.5 10.5a3.8 3.8 0 0 0-5.4 0l-3 3a3.8 3.8 0 0 0 5.4 5.4l1-1"/>',
    crown: '<path d="M4.5 17.5L3.5 8l5 3.5L12 5l3.5 6.5 5-3.5-1 9.5z"/><path d="M5 20.5h14"/>',
    compass: '<circle cx="12" cy="12" r="8.5"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
    eyeOff: '<path d="M4.5 9.2C3.5 10.6 3 12 3 12s3.3 6 9 6c1.4 0 2.6-.4 3.7-.9"/><path d="M9.6 6.4c.8-.3 1.5-.4 2.4-.4 5.7 0 9 6 9 6s-.6 1.2-1.8 2.6"/><path d="M4 4l16 16"/>',
    hourglass: '<path d="M7 3.5h10"/><path d="M7 20.5h10"/><path d="M8 3.5c0 4 8 4.5 8 8.5s-8 4.5-8 8.5"/><path d="M16 3.5c0 4-8 4.5-8 8.5s8 4.5 8 8.5"/>',
    cpu: '<rect x="6.5" y="6.5" width="11" height="11" rx="2"/><path d="M10 10h4v4h-4z"/><path d="M9.5 3.5v3M14.5 3.5v3M9.5 17.5v3M14.5 17.5v3M3.5 9.5h3M3.5 14.5h3M17.5 9.5h3M17.5 14.5h3"/>',
};

/** İkonun SVG dizgesi */
export function icon(name, cls = '') {
    const body = PATHS[name] || PATHS.info;
    return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
}

/** Marka işareti: küre içinde dar koridor */
export function logoMark(size = 28) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false"><circle cx="16" cy="16" r="13" stroke="currentColor" stroke-width="1.6"/><path d="M7.5 23.5C11.5 21 13.5 17.5 15 14s4-6.5 9-8.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M11 26c4-2.5 6-6 7.5-9.5S22 11 26 9.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="18.2" cy="14.6" r="2.2" fill="#86AEFF"/></svg>`;
}
