const express = require('express');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/recipes', (req, res) => {
    db.getAllRecipes((err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: err.message });
      }
      res.json({ nodes: rows });
    });
  });

app.use('/icons', express.static(path.join(__dirname, '..', 'public/icons')));

app.get('/api/recipes/tree', (req, res) => {
  const ids = req.query.ids?.split(',').map(id => parseInt(id)).filter(Boolean);
  if (!ids || ids.length === 0) return res.status(400).json({ error: "Missing ids" });

  db.getRecipeTrees(ids, (err, graph) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(graph);
  });
});


app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});