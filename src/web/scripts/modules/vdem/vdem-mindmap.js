import { state, setState } from '../../core/state.js';
import { DATA_PATHS } from '../../config/constants.js';

const d3 = window.d3;
let mindmapPromise = null;

const NODE_WIDTH = 320;
const NODE_HEIGHT = 96;
const LEVEL_VERTICAL_GAP = 170;

export async function loadVdemMindmapStructure() {
    if (state.vdemMindmapData) {
        return state.vdemMindmapData;
    }
    if (!mindmapPromise) {
        mindmapPromise = fetchMindmap();
    }
    return mindmapPromise;
}

async function fetchMindmap() {
    const response = await fetch(DATA_PATHS.vdemMindmap);
    if (!response.ok) {
        throw new Error('V-Dem mind map JSON yüklenemedi');
    }
    const json = await response.json();
    setState('vdemMindmapData', json);
    return json;
}

export async function renderVdemMindmap(onSelect) {
    const data = await loadVdemMindmapStructure();
    if (!d3) {
        console.warn('D3 bulunamadı, mind map çizilemiyor');
        return;
    }
    const container = document.getElementById('vdem-mindmap');
    if (!container) return;
    
    container.innerHTML = '';
    const width = container.clientWidth || 2000;
    const height = container.clientHeight || 1400;
    
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
    const zoomGroup = svg.append('g').attr('class', 'mindmap-zoom');
    const linkLayer = zoomGroup.append('g').attr('class', 'mindmap-links');
    const nodeLayer = zoomGroup.append('g').attr('class', 'mindmap-nodes');
    
    const zoom = d3.zoom()
        .scaleExtent([0.35, 2.4])
        .on('zoom', (event) => {
            zoomGroup.attr('transform', event.transform);
        });
    
    svg.call(zoom);
    svg.on('dblclick.zoom', null);
    
    const root = d3.hierarchy(data);
    root.x0 = width / 2;
    root.y0 = 40;
    
    collapseAll(root);
    root.children = null; // sadece kök gösterilsin
    
    const treeLayout = d3.tree()
        .nodeSize([NODE_WIDTH + 80, LEVEL_VERTICAL_GAP])
        .separation((a, b) => (a.parent === b.parent ? 1.2 : 1.6));
    
    function collapseAll(node) {
        if (node.children) {
            node._children = node.children;
            node._children.forEach(collapseAll);
            node.children = null;
        }
    }
    
    function toggle(node) {
        if (node.children) {
            node._children = node.children;
            node.children = null;
        } else {
            node.children = node._children;
            node._children = null;
        }
    }
    
    function update(source) {
        const duration = 350;
        treeLayout(root);
        
        const nodes = root.descendants();
        const links = root.links();
        
        const left = Math.min(...nodes.map(d => d.x));
        const right = Math.max(...nodes.map(d => d.x));
        const xOffset = width / 2 - (left + right) / 2;
        
        nodes.forEach(d => {
            d.x = d.x + xOffset;
            d.y = d.depth * LEVEL_VERTICAL_GAP + 80;
        });
        
        const node = nodeLayer.selectAll('g.mindmap-node')
            .data(nodes, d => d.id || (d.id = `${d.data.id}-${d.depth}`));
        
        const nodeEnter = node.enter()
            .append('g')
            .attr('class', d => `mindmap-node node-type-${d.data.type || 'indicator'}${(d._children || d.children) ? ' has-children' : ''}`)
            .attr('transform', `translate(${source.x0 || root.x0},${source.y0 || root.y0})`)
            .style('cursor', 'pointer')
            .on('click', function(event, d) {
                if (event.detail > 1) return;
                event.stopPropagation();
                if (d.children || d._children) {
                    toggle(d);
                    update(d);
                }
            })
            .on('dblclick', function(event, d) {
                event.stopPropagation();
                if (typeof onSelect === 'function' && hasColumns(d.data)) {
                    onSelect(d.data, buildBreadcrumbs(d));
                }
            });
        
        nodeEnter.append('rect')
            .attr('width', NODE_WIDTH)
            .attr('height', NODE_HEIGHT)
            .attr('x', -NODE_WIDTH / 2)
            .attr('y', -NODE_HEIGHT / 2)
            .attr('opacity', 0.98);
        
        nodeEnter.append('text')
            .attr('class', 'node-title')
            .attr('x', -NODE_WIDTH / 2 + 16)
            .attr('y', -8)
            .attr('text-anchor', 'start')
            .text(d => d.data.label || d.data.id)
            .call(wrapText, NODE_WIDTH - 32);
        
        nodeEnter.append('text')
            .attr('class', 'node-caption')
            .attr('x', -NODE_WIDTH / 2 + 16)
            .attr('y', 18)
            .attr('text-anchor', 'start')
            .text(d => d.data.columns ? d.data.columns.join(', ') : (d.data.type || ''))
            .call(wrapText, NODE_WIDTH - 32);
        
        const toggleWrapper = nodeEnter.append('g')
            .attr('class', 'toggle-wrapper')
            .attr('transform', `translate(${NODE_WIDTH / 2 - 20},${-NODE_HEIGHT / 2 + 20})`)
            .style('pointer-events', 'none');
        
        toggleWrapper.append('circle')
            .attr('class', 'node-toggle')
            .attr('r', 11);
        
        toggleWrapper.append('text')
            .attr('class', 'node-toggle-text')
            .attr('text-anchor', 'middle')
            .attr('dy', '0.35em');
        
        const nodeUpdate = nodeEnter.merge(node);
        
        nodeUpdate
            .transition()
            .duration(duration)
            .attr('transform', d => `translate(${d.x},${d.y})`);
        
        nodeUpdate
            .classed('has-children', d => Boolean(d._children) || Boolean(d.children));
        
        nodeUpdate.selectAll('.toggle-wrapper')
            .style('display', d => (d._children || d.children) ? 'block' : 'none')
            .select('.node-toggle-text')
            .text(d => (d.children ? '−' : d._children ? '+' : ''));
        
        node.exit().transition()
            .duration(duration)
            .attr('transform', `translate(${source.x},${source.y})`)
            .remove();
        
        const link = linkLayer.selectAll('path.mindmap-link')
            .data(links, d => d.target.id);
        
        const diagonal = d3.linkVertical()
            .x(d => d.x)
            .y(d => d.y);
        
        const linkEnter = link.enter()
            .insert('path', 'g')
            .attr('class', 'mindmap-link')
            .attr('d', () => {
                const o = { x: source.x0 || root.x0, y: source.y0 || root.y0 };
                return diagonal({ source: o, target: o });
            });
        
        linkEnter.merge(link)
            .transition()
            .duration(duration)
            .attr('d', diagonal);
        
        link.exit()
            .transition()
            .duration(duration)
            .attr('d', () => {
                const o = { x: source.x, y: source.y };
                return diagonal({ source: o, target: o });
            })
            .remove();
        
        nodes.forEach(d => {
            d.x0 = d.x;
            d.y0 = d.y;
        });
    }
    
    update(root);
    svg.call(zoom.transform, d3.zoomIdentity.translate(width / 2, 80).scale(0.7));
    setState('vdemMindmapRendered', true);
}

function hasColumns(nodeData) {
    return Array.isArray(nodeData.columns) && nodeData.columns.length > 0;
}

function buildBreadcrumbs(node) {
    const parts = [];
    let current = node;
    while (current) {
        if (current.data?.label) {
            parts.unshift(current.data.label);
        }
        current = current.parent;
    }
    return parts;
}

function wrapText(textSelection, width) {
    textSelection.each(function () {
        const text = d3.select(this);
        const words = (text.text() || '').split(/\s+/).reverse();
        let word;
        let line = [];
        let lineNumber = 0;
        const lineHeight = 1.05;
        const x = parseFloat(text.attr('x')) || 0;
        const y = parseFloat(text.attr('y')) || 0;
        const dy = 0;
        let tspan = text.text(null).append('tspan').attr('x', x).attr('y', y).attr('dy', `${dy}em`);
        
        while ((word = words.pop())) {
            line.push(word);
            tspan.text(line.join(' '));
            if (tspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(' '));
                line = [word];
                tspan = text.append('tspan')
                    .attr('x', x)
                    .attr('y', y)
                    .attr('dy', `${++lineNumber * lineHeight + dy}em`)
                    .text(word);
            }
        }
    });
}
