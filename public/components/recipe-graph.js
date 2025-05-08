import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

function nameParser(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_')
    .replace(/[^\w_]/g, '');
}

class RecipeGraph extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.shadowRoot.innerHTML = `
      <style>
        svg {
          width: 100%;
          height: 100%;
          background: #1e1e1e;
        }
        .primary-node {
          filter: drop-shadow(0 0 5px white);
        }
      </style>
      <svg viewBox="-1000 -800 2000 2000" preserveAspectRatio="xMidYMid meet"></svg>
    `;

    this.svg = d3.select(this.shadowRoot.querySelector("svg"));
    this.zoomLayer = this.svg.append("g").classed("zoom-layer", true);

    this.svg.call(
      d3.zoom()
        .scaleExtent([0.25, 3])
        .on("zoom", (event) => {
          this.zoomLayer.attr("transform", event.transform);
        })
    );
  }

  isFluid(name) {
    const fluidKeywords = ['water', 'oil', 'gas', 'fluid', 'steam', 'brine', 'acid', 'ammonia', 'fluoroketone'];
    return fluidKeywords.some(kw => name.toLowerCase().includes(kw));
  }

  loadGraph(graph) {
    const layer = this.zoomLayer;
    layer.selectAll("*").remove();

    const nodes = graph.nodes.map(d => ({ ...d }));
    const links = graph.links.map(d => ({ ...d }));
    const root = nodes.find(n => n.isRoot);

    if (root) {
      root.fx = 0;
      root.fy = 0;
    }

    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links)
        .id(d => d.id)
        .distance(d => d.source.isRoot || d.target.isRoot ? 220 : 140)
        .strength(1))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("collide", d3.forceCollide().radius(d => d.isRoot ? 40 : 30))
      .force("x", d3.forceX().strength(0.05))
      .force("y", d3.forceY().strength(0.05))
      .force("radial", d3.forceRadial(300, 0, 0).strength(0.2));

    simulation.alpha(1).restart();
    setTimeout(() => simulation.stop(), 5000);

    const link = layer.append("g")
      .attr("stroke", "#aaa")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", d => {
        const sourceName = typeof d.source === 'object' ? d.source.name : '';
        const targetName = typeof d.target === 'object' ? d.target.name : '';
        const count = d.count || 1;
      
        const isFluid = this.isFluid(sourceName) || this.isFluid(targetName);
        // fluid units work differently, so to avoid having giant lines, I just use a different scale for them.
        if (isFluid) {
          return 1 + Math.log10(count);
        }
      
        return Math.sqrt(count);
      });
      

    const highlight = layer.append("g")
      .selectAll("circle")
      .data(nodes.filter(d => d.isRoot))
      .join("circle")
      .attr("r", 25)
      .attr("fill", "white")
      .attr("opacity", 0.3);

    const node = layer.append("g")
      .selectAll("image")
      .data(nodes)
      .join("image")
      .attr("href", d => `/icons/${nameParser(d.name)}.png`)
      .attr("width", d => d.isRoot ? 36 : 24)
      .attr("height", d => d.isRoot ? 36 : 24)
      .attr("x", d => d.isRoot ? -18 : -12)
      .attr("y", d => d.isRoot ? -18 : -12)
      .attr("class", d => d.isRoot ? "primary-node" : "")
      .call(drag(simulation));

    node.append("title").text(d => d.name);

    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

      highlight
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);

      node
        .attr("x", d => d.x - (d.isRoot ? 18 : 12))
        .attr("y", d => d.y - (d.isRoot ? 18 : 12));
    });

    function drag(sim) {
      return d3.drag()
        .on("start", event => {
          if (!event.active) sim.alphaTarget(0.3).restart();
          event.subject.fx = event.subject.x;
          event.subject.fy = event.subject.y;
        })
        .on("drag", event => {
          event.subject.fx = event.x;
          event.subject.fy = event.y;
        })
        .on("end", event => {
          if (!event.active) sim.alphaTarget(0);
          event.subject.fx = null;
          event.subject.fy = null;
        });
    }
  }
}

customElements.define("recipe-graph", RecipeGraph);