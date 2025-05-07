function nameParser(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_')
    .replace(/[^\w_]/g, '');
}

class RecipeList extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.recipes = [];
    this.selected = new Map();
  }

  async connectedCallback() {
    const res = await fetch('/api/recipes');
    const data = await res.json();
    this.recipes = data.nodes;

    this.shadowRoot.innerHTML = `
      <style>
        #search-container {
          background: #1e1e1e;
          color: #eee;
          border: 1px solid #444;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        #search {
          background: #2a2a2a;
          color: #eee;
          border: 1px solid #555;
          font-size: 1.1rem;
          padding: 0.75rem;
          width: 100%;
          box-sizing: border-box;
        }

        #results {
          background: #1e1e1e;
          border: 1px solid #333;
          max-height: 300px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .result-item, .selected-item {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.6rem 0.8rem;
          font-size: 1.1rem;
          min-height: 36px;
        }

        .result-item:hover {
          background-color: #333;
          border: 1px solid #666;
          cursor: pointer;
        }

        .result-item img,
        .selected-item img {
          width: 24px;
          height: 24px;
          object-fit: contain;
        }

        .selected-item {
          background-color: #333;
          justify-content: space-between;
        }

        .remove-btn {
          background: none;
          border: none;
          color: #f88;
          font-size: 1.2rem;
          cursor: pointer;
          margin-left: auto;
        }

        #visualize-btn {
          background: #444;
          color: #eee;
          border: 1px solid #666;
          font-size: 1.2rem;
          padding: 0.75rem;
          cursor: pointer;
        }

        #visualize-btn:hover {
          background: #666;
        }
      </style>

      <div id="search-container">
        <input type="text" id="search" placeholder="Search for recipes..." />
        <div id="results"></div>
        <div id="selected-list"></div>
        <button id="visualize-btn">Visualize</button>
      </div>
    `;

    const input = this.shadowRoot.querySelector('#search');
    const results = this.shadowRoot.querySelector('#results');
    const selectedList = this.shadowRoot.querySelector('#selected-list');
    const button = this.shadowRoot.querySelector('#visualize-btn');

    const renderSelected = () => {
      selectedList.innerHTML = '';
      for (const [id, name] of this.selected.entries()) {
        const div = document.createElement('div');
        div.className = 'selected-item';

        const icon = document.createElement('img');
        icon.src = `/icons/${nameParser(name)}.png`;
        icon.alt = name;
        icon.onerror = () => {
          icon.style.display = 'none';
        };

        const text = document.createElement('span');
        text.textContent = name;

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.textContent = '✖';
        removeBtn.addEventListener('click', () => {
          this.selected.delete(id);
          renderSelected();
        });

        div.appendChild(icon);
        div.appendChild(text);
        div.appendChild(removeBtn);
        selectedList.appendChild(div);
      }
    };

    input.addEventListener('input', () => {
      const query = input.value.toLowerCase();
      const matches = this.recipes.filter(r =>
        r.recipe_name.toLowerCase().includes(query)
      ).slice(0, 15);

      results.innerHTML = '';
      for (const match of matches) {
        const div = document.createElement('div');
        div.className = 'result-item';

        const icon = document.createElement('img');
        icon.src = `/icons/${nameParser(match.recipe_name)}.png`;
        icon.alt = match.recipe_name;
        icon.onerror = () => {
          icon.style.display = 'none';
        };

        const text = document.createElement('span');
        text.textContent = match.recipe_name;

        div.appendChild(icon);
        div.appendChild(text);

        div.addEventListener('click', () => {
          if (!this.selected.has(match.recipe_id)) {
            this.selected.set(match.recipe_id, match.recipe_name);
            renderSelected();
            input.value = '';
            results.innerHTML = '';
          }
        });

        results.appendChild(div);
      }
    });

    button.addEventListener('click', () => {
      const ids = Array.from(this.selected.keys());
      if (ids.length > 0) {
        this.dispatchEvent(new CustomEvent('recipe-selected', {
          detail: ids,
          bubbles: true
        }));
      }
    });
  }
}

customElements.define('recipe-list', RecipeList);
