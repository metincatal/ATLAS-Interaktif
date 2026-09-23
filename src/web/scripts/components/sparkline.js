/**
 * Küçük çizgi grafik (SVG dizgesi üretir)
 */

export function sparkline(series, { width = 150, height = 30, domain = null, zero = null, color = '#86AEFF', xDomain = null, marker = null } = {}) {
    const d3 = window.d3;
    if (!d3 || !series.length) return `<svg width="${width}" height="${height}" aria-hidden="true"></svg>`;
    const xs = xDomain || d3.extent(series, (d) => d.year);
    const ys = domain || d3.extent(series, (d) => d.value);
    const x = d3.scaleLinear().domain(xs).range([2, width - 4]);
    const y = d3.scaleLinear().domain(ys).range([height - 3, 3]);
    const line = d3.line().x((d) => x(d.year)).y((d) => y(d.value)).curve(d3.curveMonotoneX).defined((d) => d.value !== null);
    const base = zero !== null ? y(zero) : height - 3;
    const area = d3.area().x((d) => x(d.year)).y0(base).y1((d) => y(d.value)).curve(d3.curveMonotoneX).defined((d) => d.value !== null);
    const last = series[series.length - 1];
    const m = marker !== null ? series.find((d) => d.year === marker) : null;
    return `<svg viewBox="0 0 ${width} ${height}" aria-hidden="true" focusable="false" style="width:100%;height:auto;display:block;overflow:visible">
        ${zero !== null ? `<line x1="0" x2="${width}" y1="${base}" y2="${base}" stroke="#EDE8DF" stroke-opacity="0.12" stroke-dasharray="2 3" vector-effect="non-scaling-stroke"/>` : ''}
        <path d="${area(series)}" fill="${color}" fill-opacity="0.1"/>
        <path d="${line(series)}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
        ${m ? `<line x1="${x(m.year)}" x2="${x(m.year)}" y1="0" y2="${height}" stroke="#EDE8DF" stroke-opacity="0.35" vector-effect="non-scaling-stroke"/>` : ''}
        <circle cx="${x((m || last).year)}" cy="${y((m || last).value)}" r="2.6" fill="${color}"/>
    </svg>`;
}
