import './components/recipe-list.js';
import './components/recipe-graph.js';
import './components/recipe-raw-chart.js';

document.body.addEventListener('recipe-selected', async e => {
  const ids = e.detail;
  const res = await fetch(`/api/recipes/tree?ids=${ids.join(',')}`);
  const graph = await res.json();

  for (const node of graph.nodes) {
    if (ids.includes(node.id)) node.isRoot = true;
  }

  document.querySelector('recipe-graph').loadGraph(graph);
  document.querySelector('recipe-raw-chart').loadGraph(graph);
});


function makeResizable(leftPane, resizer, rightPane, isLeft) {
  resizer.addEventListener('mousedown', (e) => {
    e.preventDefault();

    function onMouseMove(e) {
      const totalWidth = document.getElementById('layout').offsetWidth;
      const x = e.clientX;

      if (isLeft) {
        const newLeftWidth = Math.max(150, x);
        leftPane.style.width = `${newLeftWidth}px`;
      } else {
        const newRightWidth = Math.max(150, totalWidth - x);
        rightPane.style.width = `${newRightWidth}px`;
      }
    }

    function onMouseUp() {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  });
}

makeResizable(
  document.getElementById('left-pane'),
  document.getElementById('resize-left'),
  document.getElementById('center-pane'),
  true
);

makeResizable(
  document.getElementById('center-pane'),
  document.getElementById('resize-right'),
  document.getElementById('right-pane'),
  false
);