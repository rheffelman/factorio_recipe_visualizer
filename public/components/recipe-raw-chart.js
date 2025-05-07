import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

function nameParser(name) {
    return name
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/-/g, '_')
      .replace(/[^\w_]/g, '');
  }

class RecipeRawChart extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
        <style>
            svg {
                width: 100%;
                height: 100%;
                background: #1e1e1e;
                font-family: sans-serif;
            }
            .label {
                fill: #eee;
                font-size: 12px;
                alignment-baseline: middle;
            }
            .bar-line {
                stroke: #6cf;
                stroke-width: 2;
            }
            .dot {
                fill: #6cf;
            }
        </style>
        <svg viewBox="0 0 600 800" preserveAspectRatio="xMidYMid meet"></svg>
    `;
    this.svg = d3.select(this.shadowRoot.querySelector("svg"));
  }

  isFluid(name) {
    const fluidKeywords = ['water', 'oil', 'gas', 'fluid', 'steam', 'brine', 'acid', 'ammonia', 'fluoroketone'];
    return fluidKeywords.some(kw => name.toLowerCase().includes(kw));
  }

  loadGraph(graph) {
    const rawCounts = this.calculateRawIngredients(graph);
    this.renderChart(rawCounts);
  }

  calculateRawIngredients(graph) {
    const nodeMap = new Map(graph.nodes.map(n => [n.id, n]));
    const childLinks = new Map();
  
    for (const link of graph.links) {
      const tgt = typeof link.target === "object" ? link.target.id : link.target;
      if (!childLinks.has(tgt)) {
        childLinks.set(tgt, []);
      }
      childLinks.get(tgt).push(link);
    }
  
    const rootIds = new Set(graph.nodes.filter(n => n.isRoot).map(n => n.id));
    const leafTotals = new Map();
  
    const walk = (nodeId, multiplier) => {
      const children = childLinks.get(nodeId);
  
      if (!children || children.length === 0) {
        const name = nodeMap.get(nodeId)?.name || nodeId;
        
        // I don't want to show fluids because they use different units and mess up the plot. 
        if (this.isFluid(name)) return;
  
        leafTotals.set(name, (leafTotals.get(name) || 0) + multiplier);
        return;
      }
  
      for (const link of children) {
        const ingId = typeof link.source === "object" ? link.source.id : link.source;
        const count = link.count || 1;
        walk(ingId, multiplier * count);
      }
    };
  
    for (const rootId of rootIds) {
      walk(rootId, 1);
    }
  
    return Array.from(leafTotals.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }
  
  renderChart(data) {
    const svg = this.svg;
    svg.selectAll("*").remove();
  
    const margin = { top: 20, right: 20, bottom: 20, left: 160 };
    const width = 600 - margin.left - margin.right;
    const height = Math.max(600, data.length * 40);
  
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  
    const x = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.count) * 1.2])
      .range([0, width]);
  
    const y = d3.scaleBand()
      .domain(data.map(d => d.name))
      .range([0, height - margin.top - margin.bottom])
      .padding(0.4);
  
    const iconSize = 24;
  
    const row = g.selectAll(".row")
      .data(data)
      .join("g")
      .attr("class", "row")
      .attr("transform", d => `translate(0, ${y(d.name)})`);

    row.append("text")
      .attr("class", "label")
      .attr("x", -10)
      .attr("y", y.bandwidth() / 2)
      .attr("text-anchor", "end")
      .attr("alignment-baseline", "middle")
      .text(d => `${d.name} (${d.count})`);
  
    // lollipop "stick"
    row.append("line")
      .attr("class", "bar-line")
      .attr("x1", 0)
      .attr("x2", d => x(d.count))
      .attr("y1", y.bandwidth() / 2)
      .attr("y2", y.bandwidth() / 2);
  
    // lollipop "candy" icon
    row.append("image")
    .attr("href", d => `/icons/${nameParser(d.name)}.png`)
    .attr("x", d => x(d.count) - iconSize / 2)
    .attr("y", (y.bandwidth() - iconSize) / 2)
    .attr("width", iconSize)
    .attr("height", iconSize)
    .append("title")
    .text(d => `${d.name}: ${d.count}`);
  
  }
  
}

customElements.define("recipe-raw-chart", RecipeRawChart);
