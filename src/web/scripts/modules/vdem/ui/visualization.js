import { state } from '../../../core/state.js';
import { loadVdemData, getVdemValue } from '../vdem-data.js';

export class VdemVisualization {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.currentVariable = null;
        this.selectedCountry = 'TUR'; // Default to Turkey
        this.showConfidenceInterval = true;
    }

    async renderVariable(variable) {
        this.currentVariable = variable;
        this.container.innerHTML = '<div class="loading">Veri yükleniyor...</div>';

        await loadVdemData();

        this.update();
    }

    update() {
        if (!this.currentVariable) return;

        // Clear container
        this.container.innerHTML = '';

        // Create Chart Container
        const chartContainer = document.createElement('div');
        chartContainer.className = 'vdem-chart-container';
        this.container.appendChild(chartContainer);

        // Render Header with Controls
        const headerRow = document.createElement('div');
        headerRow.className = 'chart-header-row';
        headerRow.style.display = 'flex';
        headerRow.style.justifyContent = 'space-between';
        headerRow.style.alignItems = 'center';
        headerRow.style.marginBottom = '15px';

        const header = document.createElement('h3');
        header.textContent = `${this.currentVariable.title} (${this.currentVariable.id})`;
        header.style.margin = '0';
        headerRow.appendChild(header);

        // Controls container
        const controls = document.createElement('div');
        controls.className = 'chart-controls';
        controls.style.display = 'flex';
        controls.style.gap = '10px';
        controls.style.alignItems = 'center';

        // Country selector
        const countrySelector = document.createElement('select');
        countrySelector.className = 'country-selector';
        countrySelector.innerHTML = `
            <option value="TUR">Türkiye</option>
            <option value="USA">ABD</option>
            <option value="DEU">Almanya</option>
            <option value="FRA">Fransa</option>
            <option value="GBR">İngiltere</option>
            <option value="RUS">Rusya</option>
            <option value="CHN">Çin</option>
        `;
        countrySelector.value = this.selectedCountry;
        countrySelector.addEventListener('change', (e) => {
            this.selectedCountry = e.target.value;
            this.update();
        });
        controls.appendChild(countrySelector);

        // Confidence interval toggle for Type C
        if (this.currentVariable.var_type === 'C') {
            const ciToggle = document.createElement('button');
            ciToggle.className = 'ci-toggle-btn';
            ciToggle.textContent = this.showConfidenceInterval ? '🔵 Güven Aralığı Açık' : '⚪ Güven Aralığı Kapalı';
            ciToggle.style.padding = '5px 10px';
            ciToggle.style.cursor = 'pointer';
            ciToggle.addEventListener('click', () => {
                this.showConfidenceInterval = !this.showConfidenceInterval;
                this.update();
            });
            controls.appendChild(ciToggle);
        }

        headerRow.appendChild(controls);
        chartContainer.appendChild(headerRow);

        // Chart Wrapper
        const chartWrapper = document.createElement('div');
        chartWrapper.className = 'chart-wrapper';
        chartContainer.appendChild(chartWrapper);

        // Draw Chart
        this.drawChart(chartWrapper);

        // Note
        if (this.currentVariable.var_type === 'C') {
            const note = document.createElement('div');
            note.className = 'chart-note';
            note.innerHTML = '<em>Not: Bu değişken uzman kodlamasına dayanmaktadır. Gölgeli alanlar güven aralığını (credible interval) gösterir.</em>';
            chartContainer.appendChild(note);
        }
    }

    drawChart(container) {
        const data = this.getChartData(this.currentVariable.id);

        if (!data || data.length === 0) {
            container.innerHTML = '<div class="no-data">Bu değişken için veri bulunamadı.</div>';
            return;
        }

        // Route to appropriate chart type based on variable type
        const varType = this.currentVariable.var_type;

        if (varType === 'A' || varType === 'A*') {
            this.drawStepChart(container, data);
        } else if (varType === 'C') {
            this.drawConfidenceLineChart(container, data);
        } else if (varType === 'D') {
            this.drawTimeSeriesChart(container, data);
        } else {
            // Default to simple line chart
            this.drawTimeSeriesChart(container, data);
        }
    }

    drawStepChart(container, data) {
        // Step chart for Type A (factual/categorical variables)
        const margin = { top: 20, right: 30, bottom: 30, left: 50 };
        const width = container.clientWidth || 600;
        const height = 400;
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        const svg = d3.select(container)
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Scales
        const x = d3.scaleLinear()
            .domain(d3.extent(data, d => d.year))
            .range([0, innerWidth]);

        // Determine if binary or multi-category
        const values = [...new Set(data.map(d => d.value))].sort((a, b) => a - b);
        const isBinary = values.length <= 2;

        const y = d3.scaleLinear()
            .domain([Math.min(...values) - 0.1, Math.max(...values) + 0.1])
            .range([innerHeight, 0]);

        // Axes
        svg.append("g")
            .attr("transform", `translate(0,${innerHeight})`)
            .call(d3.axisBottom(x).tickFormat(d3.format("d")));

        svg.append("g")
            .call(d3.axisLeft(y).ticks(values.length));

        // Step line (using step-after interpolation)
        const stepLine = d3.line()
            .x(d => x(d.year))
            .y(d => y(d.value))
            .curve(d3.curveStepAfter);

        svg.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", "#2563eb")
            .attr("stroke-width", 2.5)
            .attr("d", stepLine);

        // Add colored blocks for each period
        for (let i = 0; i < data.length - 1; i++) {
            const d = data[i];
            const nextD = data[i + 1];
            const blockColor = this.getColorForCategory(d.value);

            svg.append("rect")
                .attr("x", x(d.year))
                .attr("y", y(d.value) - 5)
                .attr("width", x(nextD.year) - x(d.year))
                .attr("height", 10)
                .attr("fill", blockColor)
                .attr("opacity", 0.3);
        }

        // Add points at transitions
        svg.selectAll(".transition-point")
            .data(data)
            .enter()
            .append("circle")
            .attr("cx", d => x(d.year))
            .attr("cy", d => y(d.value))
            .attr("r", 4)
            .attr("fill", "#2563eb")
            .attr("stroke", "white")
            .attr("stroke-width", 2);
    }

    drawConfidenceLineChart(container, data) {
        // Line chart with confidence ribbon for Type C (expert-coded variables)
        const margin = { top: 20, right: 30, bottom: 30, left: 50 };
        const width = container.clientWidth || 600;
        const height = 400;
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        const svg = d3.select(container)
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Scales
        const x = d3.scaleLinear()
            .domain(d3.extent(data, d => d.year))
            .range([0, innerWidth]);

        const allValues = this.showConfidenceInterval
            ? data.flatMap(d => [d.low, d.value, d.high])
            : data.map(d => d.value);
        const y = d3.scaleLinear()
            .domain([Math.min(...allValues) - 0.05, Math.max(...allValues) + 0.05])
            .range([innerHeight, 0]);

        // Axes
        svg.append("g")
            .attr("transform", `translate(0,${innerHeight})`)
            .call(d3.axisBottom(x).tickFormat(d3.format("d")));

        svg.append("g")
            .call(d3.axisLeft(y));

        // Confidence Interval Area (only if enabled)
        if (this.showConfidenceInterval) {
            const area = d3.area()
                .x(d => x(d.year))
                .y0(d => y(d.low))
                .y1(d => y(d.high))
                .curve(d3.curveMonotoneX);

            svg.append("path")
                .datum(data)
                .attr("fill", "#93c5fd")
                .attr("stroke", "none")
                .attr("opacity", 0.4)
                .attr("d", area);
        }

        // Main line (point estimate)
        const line = d3.line()
            .x(d => x(d.year))
            .y(d => y(d.value))
            .curve(d3.curveMonotoneX);

        svg.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", "#2563eb")
            .attr("stroke-width", 2.5)
            .attr("d", line);

        // Points
        svg.selectAll(".data-point")
            .data(data.filter((d, i) => i % 5 === 0)) // Show every 5th point to avoid clutter
            .enter()
            .append("circle")
            .attr("cx", d => x(d.year))
            .attr("cy", d => y(d.value))
            .attr("r", 3)
            .attr("fill", "#2563eb")
            .attr("stroke", "white")
            .attr("stroke-width", 1.5);
    }

    drawTimeSeriesChart(container, data) {
        // Standard time series for Type D (indices) and others
        const margin = { top: 20, right: 30, bottom: 30, left: 50 };
        const width = container.clientWidth || 600;
        const height = 400;
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        const svg = d3.select(container)
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Scales
        const x = d3.scaleLinear()
            .domain(d3.extent(data, d => d.year))
            .range([0, innerWidth]);

        const y = d3.scaleLinear()
            .domain([Math.min(...data.map(d => d.value)) - 0.05, Math.max(...data.map(d => d.value)) + 0.05])
            .range([innerHeight, 0]);

        // Axes
        svg.append("g")
            .attr("transform", `translate(0,${innerHeight})`)
            .call(d3.axisBottom(x).tickFormat(d3.format("d")));

        svg.append("g")
            .call(d3.axisLeft(y));

        // Area under curve for indices
        const area = d3.area()
            .x(d => x(d.year))
            .y0(innerHeight)
            .y1(d => y(d.value))
            .curve(d3.curveMonotoneX);

        svg.append("path")
            .datum(data)
            .attr("fill", "#dbeafe")
            .attr("stroke", "none")
            .attr("opacity", 0.5)
            .attr("d", area);

        // Line
        const line = d3.line()
            .x(d => x(d.year))
            .y(d => y(d.value))
            .curve(d3.curveMonotoneX);

        svg.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", "#1d4ed8")
            .attr("stroke-width", 2.5)
            .attr("d", line);

        // Points
        svg.selectAll(".data-point")
            .data(data.filter((d, i) => i % 5 === 0))
            .enter()
            .append("circle")
            .attr("cx", d => x(d.year))
            .attr("cy", d => y(d.value))
            .attr("r", 3)
            .attr("fill", "#1d4ed8")
            .attr("stroke", "white")
            .attr("stroke-width", 1.5);
    }

    getColorForCategory(value) {
        // Simple color mapping for categorical values
        const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];
        return colors[Math.floor(value) % colors.length];
    }

    highlightYear(year) {
        // Remove existing highlight
        d3.selectAll('.year-highlight').remove();
        d3.selectAll('.year-highlight-point').remove();

        if (!this.currentVariable) return;

        const data = this.getChartData(this.currentVariable.id);
        const yearData = data.find(d => d.year === year);

        if (!yearData) return;

        // Get SVG element
        const svg = d3.select('.chart-wrapper svg g');
        if (svg.empty()) return;

        // Get scales from the chart (we need to recalculate them)
        const container = document.querySelector('.chart-wrapper');
        const margin = { top: 20, right: 30, bottom: 30, left: 50 };
        const width = container.clientWidth || 600;
        const innerWidth = width - margin.left - margin.right;
        const height = 400;
        const innerHeight = height - margin.top - margin.bottom;

        const x = d3.scaleLinear()
            .domain(d3.extent(data, d => d.year))
            .range([0, innerWidth]);

        const allValues = this.currentVariable.var_type === 'C' && this.showConfidenceInterval
            ? data.flatMap(d => [d.low, d.value, d.high])
            : data.map(d => d.value);
        const y = d3.scaleLinear()
            .domain([Math.min(...allValues) - 0.05, Math.max(...allValues) + 0.05])
            .range([innerHeight, 0]);

        // Add vertical line at selected year
        svg.append('line')
            .attr('class', 'year-highlight')
            .attr('x1', x(year))
            .attr('y1', 0)
            .attr('x2', x(year))
            .attr('y2', innerHeight)
            .attr('stroke', '#ef4444')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '5,5')
            .attr('opacity', 0.7);

        // Add highlighted point
        svg.append('circle')
            .attr('class', 'year-highlight-point')
            .attr('cx', x(year))
            .attr('cy', y(yearData.value))
            .attr('r', 6)
            .attr('fill', '#ef4444')
            .attr('stroke', 'white')
            .attr('stroke-width', 2);

        // Add label
        svg.append('text')
            .attr('class', 'year-highlight')
            .attr('x', x(year))
            .attr('y', -5)
            .attr('text-anchor', 'middle')
            .attr('fill', '#ef4444')
            .attr('font-weight', 'bold')
            .attr('font-size', '12px')
            .text(`${year}: ${yearData.value.toFixed(3)}`);
    }

    getChartData(variableId) {
        // Extract real data from state
        const indicators = state.vdemDataByIndicator;
        if (!indicators || !indicators[variableId]) {
            console.warn(`No data found for variable ${variableId}`);
            return [];
        }

        const indicator = indicators[variableId];
        const yearData = indicator.values;

        // Get all years and sort them
        const years = Object.keys(yearData).map(y => parseInt(y, 10)).sort((a, b) => a - b);

        const chartData = [];

        for (const year of years) {
            const yearValues = yearData[String(year)];
            if (!yearValues) continue;

            // Get data for selected country
            let value = yearValues[this.selectedCountry];
            let low = null;
            let high = null;

            // If selected country data not available, skip this year
            if (value === null || value === undefined) {
                continue;
            }

            // For Type C variables, check if we have confidence intervals
            // V-Dem stores these as separate variables with _codelow and _codehigh suffixes
            const lowId = variableId + '_codelow';
            const highId = variableId + '_codehigh';

            if (indicators[lowId] && indicators[lowId].values[String(year)]) {
                low = indicators[lowId].values[String(year)][this.selectedCountry];
            }

            if (indicators[highId] && indicators[highId].values[String(year)]) {
                high = indicators[highId].values[String(year)][this.selectedCountry];
            }

            if (value !== null && value !== undefined && !Number.isNaN(value)) {
                chartData.push({
                    year: year,
                    value: value,
                    low: low !== null && low !== undefined ? low : value - 0.05,
                    high: high !== null && high !== undefined ? high : value + 0.05
                });
            }
        }

        return chartData;
    }
}
