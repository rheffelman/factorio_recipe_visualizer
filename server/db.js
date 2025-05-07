const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, '..', 'data', 'recipe.db'));

function getCraftingGraph(callback) {
  const sql = `
  SELECT 
    ri.recipe_id,
    r.recipe_name,
    ir.recipe_name AS ingredient_name,
    ri.ingredient_count,
    rr.result_name,
    rr.result_count
  FROM "Recipe_Ingredients" ri
  JOIN "Recipes" r ON ri.recipe_id = r.recipe_id
  JOIN "Recipes" ir ON ri.ingredient_id = ir.recipe_id
  JOIN "Recipe_Results" rr ON rr.recipe_id = ri.recipe_id
`;


  db.all(sql, [], (err, rows) => {
    if (err) {
      return callback(err);
    }

    const nodes = new Set();
    const links = [];

    for (const row of rows) {
      nodes.add(row.recipe_name);
      nodes.add(row.ingredient_name);
      links.push({
        source: row.ingredient_name,
        target: row.recipe_name,
        count: row.ingredient_count
      });
    }

    callback(null, {
      nodes: Array.from(nodes).map(id => ({ id })),
      links
    });
  });
}

function getRecipeTree(recipeId, callback) {
  const db = new sqlite3.Database(path.join(__dirname, '..', 'data', 'recipe.db'));

  const visited = new Set();
  const nodes = new Map();
  const links = [];

  async function recurse(id) {
    if (visited.has(id)) return;
    visited.add(id);

    console.log(`Visiting recipe ${id}`);

    const recipe = await new Promise((resolve, reject) => {
      db.get(`SELECT recipe_name FROM Recipes WHERE recipe_id = ?`, [id], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });

    if (!recipe) {
      console.log(`Recipe ${id} not found.`);
      return;
    }

    nodes.set(id, { id, name: recipe.recipe_name });

    const ingredients = await new Promise((resolve, reject) => {
      db.all(`
        SELECT ri.ingredient_id, ri.ingredient_count, ir.recipe_name AS ingredient_name
        FROM Recipe_Ingredients ri
        JOIN Recipes ir ON ri.ingredient_id = ir.recipe_id
        WHERE ri.recipe_id = ?
      `, [id], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });

    for (const ing of ingredients) {
      nodes.set(ing.ingredient_id, { id: ing.ingredient_id, name: ing.ingredient_name });
      links.push({ source: ing.ingredient_id, target: id, count: ing.ingredient_count });
      await recurse(ing.ingredient_id);
    }
  }

  recurse(recipeId).then(() => {
    callback(null, {
      nodes: Array.from(nodes.values()),
      links
    });
  }).catch(callback);
}

function getRecipeTrees(ids, callback) {
  const db = new sqlite3.Database(path.join(__dirname, '..', 'data', 'recipe.db'));
  const visited = new Set();
  const nodes = new Map();
  const links = [];

  async function recurse(id) {
    if (visited.has(id)) return;
    visited.add(id);

    const recipe = await new Promise((resolve, reject) => {
      db.get(`SELECT recipe_name FROM Recipes WHERE recipe_id = ?`, [id], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });

    if (!recipe) return;
    nodes.set(id, { id, name: recipe.recipe_name });

    const ingredients = await new Promise((resolve, reject) => {
      db.all(`
        SELECT ri.ingredient_id, ri.ingredient_count, ir.recipe_name AS ingredient_name
        FROM Recipe_Ingredients ri
        JOIN Recipes ir ON ri.ingredient_id = ir.recipe_id
        WHERE ri.recipe_id = ?
      `, [id], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });

    for (const ing of ingredients) {
      nodes.set(ing.ingredient_id, { id: ing.ingredient_id, name: ing.ingredient_name });
      links.push({ source: ing.ingredient_id, target: id, count: ing.ingredient_count });
      await recurse(ing.ingredient_id);
    }
  }

  Promise.all(ids.map(recurse)).then(() => {
    callback(null, {
      nodes: Array.from(nodes.values()),
      links
    });
  }).catch(callback);
}

function getAllRecipes(callback) {
  db.all(`SELECT recipe_id, recipe_name FROM Recipes`, [], callback);
}

module.exports = {
  getCraftingGraph,
  getRecipeTree,
  getRecipeTrees,
  getAllRecipes
};
