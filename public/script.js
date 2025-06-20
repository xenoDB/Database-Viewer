/**
 * Database Viewer - Frontend Script
 * Author: grdAyush (Ayush)
 * GitHub: https://github.com/grdAyush
 * 
 * This script handles the rendering of the folder tree, JSON file previewing,
 * folder-level and key-based searching, and theme management for the Database Viewer web application.
 */

let _currentJson = null
let _currentTree = null
let _currentFolderPath = []

/**
 * Fetches the folder tree from the server and renders it in the sidebar.
 */
async function fetchTree() {
  const res = await fetch('/api/tree')
  const tree = await res.json()
  _currentTree = tree
  renderTree(tree, document.getElementById('tree'))
}

/**
 * Recursively renders files and folders in a collapsible tree view.
 * @param {Array} nodes - Array of file/folder objects.
 * @param {HTMLElement} container - The DOM element to render into.
 * @param {Array} path - Current path as array of folder names.
 */
function renderTree(nodes, container, path = []) {
  const ul = document.createElement('ul')
  nodes.forEach((node) => {
    const li = document.createElement('li')
    const currentPath = [...path, node.name]

    if (node.type === 'folder') {
      li.innerHTML = `
        <div class="folder-item">
          <span class="folder-icon">📁</span>
          <span class="folder-name">${node.name}</span>
          <button class="folder-search-btn" onclick="openSearchModal('${currentPath.join('/')}')" title="Search in folder">
            <span class="search-icon">🔍</span>
          </button>
        </div>
      `
      const children = document.createElement('div')
      children.className = 'folder-children'
      children.style.display = 'none'
      li.appendChild(children)

      // Folder expand/collapse
      li.querySelector('.folder-name').addEventListener('click', () => {
        const isOpen = children.style.display !== 'none'
        children.style.display = isOpen ? 'none' : 'block'
        li.querySelector('.folder-icon').textContent = isOpen ? '📁' : '📂'
        if (!children.hasChildNodes() && !isOpen) {
          renderTree(node.children, children, currentPath)
        }
      })
    } else {
      li.innerHTML = `
        <div class="file-item">
          <span class="file-icon">📄</span>
          <span class="file-name">${node.name}</span>
        </div>
      `
      // File click: load and render JSON
      li.querySelector('.file-item').addEventListener('click', async () => {
        const preview = document.getElementById('preview')
        preview.innerHTML = '<div class="loading">Loading...</div>'
        document.getElementById('current-file').textContent = node.name
        try {
          const res = await fetch(`/api/file/${encodeURIComponent(node.path)}`)
          _currentJson = await res.json()
          renderJson(_currentJson)
        } catch (error) {
          preview.innerHTML = '<div class="error">Error loading file</div>'
        }
      })
    }
    ul.appendChild(li)
  })
  container.appendChild(ul)
}

/**
 * Renders a JSON object as a collapsible tree in the preview area.
 * @param {object|Array} json - The JSON data to render.
 */
function renderJson(json) {
  const preview = document.getElementById('preview')
  preview.innerHTML = ''

  if (!json || typeof json !== 'object') {
    preview.innerHTML = '<div class="error">Invalid JSON</div>'
    return
  }

  const tree = createJsonTree(json)
  preview.appendChild(tree)
}

/**
 * Recursively builds DOM elements to display JSON as a collapsible tree.
 * @param {*} data - JSON node (object/array/primitive)
 * @param {number} depth - Level of nesting (used for spacing)
 * @returns {HTMLElement}
 */
function createJsonTree(data, depth = 0) {
  const container = document.createElement('div')
  container.className = 'json-tree'

  function createNode(key, value) {
    const node = document.createElement('div')
    node.style.display = 'flex'
    node.style.alignItems = 'flex-start'

    let hasChildren = typeof value === 'object' && value !== null && Object.keys(value).length > 0
    let child
    if (hasChildren) {
      const toggle = document.createElement('span')
      toggle.className = 'json-toggle'
      toggle.textContent = '▼'
      toggle.setAttribute('aria-expanded', 'true')
      toggle.onclick = function () {
        if (child.style.display === 'none') {
          child.style.display = ''
          toggle.textContent = '▼'
          toggle.setAttribute('aria-expanded', 'true')
        } else {
          child.style.display = 'none'
          toggle.textContent = '▶'
          toggle.setAttribute('aria-expanded', 'false')
        }
      }
      node.appendChild(toggle)
    } else {
      const placeholder = document.createElement('span')
      placeholder.style.display = 'inline-block'
      placeholder.style.width = '1.2em'
      node.appendChild(placeholder)
    }

    // Key label
    if (key !== undefined && key !== null && key !== '') {
      const keySpan = document.createElement('span')
      keySpan.className = 'json-key'
      keySpan.textContent = key
      node.appendChild(keySpan)
      node.appendChild(document.createTextNode(': '))
    }

    // Value display
    if (Array.isArray(value)) {
      const arr = document.createElement('span')
      arr.textContent = `[Array(${value.length})]`
      arr.className = 'json-array-title'
      node.appendChild(arr)

      child = document.createElement('div')
      child.className = 'json-indent'
      value.forEach((item, idx) => {
        child.appendChild(createNode(idx, item))
      })
      node.appendChild(child)
    } else if (typeof value === 'object' && value !== null) {
      const obj = document.createElement('span')
      obj.textContent = '{Object}'
      obj.className = 'json-object-title'
      node.appendChild(obj)

      child = document.createElement('div')
      child.className = 'json-indent'
      Object.entries(value).forEach(([k, v]) => {
        child.appendChild(createNode(k, v))
      })
      node.appendChild(child)
    } else {
      const valSpan = document.createElement('span')
      if (typeof value === 'string') {
        valSpan.className = 'json-value-string'
        valSpan.textContent = `"${value}"`
      } else if (typeof value === 'number') {
        valSpan.className = 'json-value-number'
        valSpan.textContent = value
      } else if (typeof value === 'boolean') {
        valSpan.className = 'json-value-boolean'
        valSpan.textContent = value
      } else if (value === null) {
        valSpan.className = 'json-value-null'
        valSpan.textContent = 'null'
      } else {
        valSpan.textContent = value
      }
      node.appendChild(valSpan)
    }

    // Add spacing for top-level keys
    if (depth === 0) node.style.marginBottom = '0.45em';

    // Start collapsed for nested objects/arrays except root
    if (hasChildren && depth !== 0) {
      child.style.display = 'none'
      node.querySelector('.json-toggle').textContent = '▶'
      node.querySelector('.json-toggle').setAttribute('aria-expanded', 'false')
    }
    return node
  }

  if (Array.isArray(data)) {
    data.forEach((item, idx) => {
      container.appendChild(createNode(idx, item))
    })
  } else if (typeof data === 'object' && data !== null) {
    Object.entries(data).forEach(([k, v]) => {
      container.appendChild(createNode(k, v))
    })
  }
  return container
}

/**
 * Filters the currently loaded JSON by key (and optionally value) and renders the filtered result.
 */
function searchInJson() {
  const key = document.getElementById('searchKey').value.toLowerCase()
  const includeValues = document.getElementById('include-values').checked
  if (!_currentJson || !key) return

  const filtered = Array.isArray(_currentJson)
    ? _currentJson.filter((obj) =>
        Object.entries(obj).some(([k, v]) =>
          k.toLowerCase().includes(key) ||
          (includeValues && JSON.stringify(v).toLowerCase().includes(key))
        )
      )
    : Object.fromEntries(
        Object.entries(_currentJson).filter(([k, v]) =>
          k.toLowerCase().includes(key) ||
          (includeValues && JSON.stringify(v).toLowerCase().includes(key))
        )
      )

  renderJson(filtered)
}

/**
 * Opens the folder-level search modal and sets the active folder path.
 * @param {string} folderPath
 */
function openSearchModal(folderPath) {
  const modal = document.getElementById('search-modal')
  modal.style.display = 'flex'
  document.getElementById('folder-search').focus()
  _currentFolderPath = folderPath.split('/')
}

/**
 * Closes the folder-level search modal and clears search state.
 */
function closeSearchModal() {
  const modal = document.getElementById('search-modal')
  modal.style.display = 'none'
  document.getElementById('folder-search').value = ''
  document.getElementById('search-results').innerHTML = ''
}

/**
 * Recursively searches for files, folders, and keys inside JSON files within a tree.
 * Returns any matches by file/folder name or JSON key.
 * @param {Array} nodes
 * @param {string} query
 * @returns {Promise<Array>}
 */
async function searchInTreeWithKeys(nodes, query) {
  let results = [];
  for (const node of nodes) {
    // Match file/folder name
    if (node.name.toLowerCase().includes(query)) {
      results.push({ type: node.type, name: node.name, path: node.path, keys: [] });
    }
    // Recurse into folders
    if (node.type === 'folder' && node.children) {
      const childResults = await searchInTreeWithKeys(node.children, query);
      results = results.concat(childResults);
    }
    // For files: search inside JSON keys
    if (node.type === 'file') {
      try {
        const res = await fetch(`/api/file/${encodeURIComponent(node.path)}`);
        const json = await res.json();
        const matchedKeys = findMatchingKeys(json, query);
        if (matchedKeys.length > 0) {
          results.push({
            type: 'file-key',
            name: node.name,
            path: node.path,
            keys: matchedKeys
          });
        }
      } catch (err) {
        // Skip files that can't be read as JSON
      }
    }
  }
  return results;
}

/**
 * Recursively finds all keys (dotted-path) matching a query in a JSON object.
 * @param {object} obj
 * @param {string} query
 * @param {string} prefix
 * @returns {Array<string>}
 */
function findMatchingKeys(obj, query, prefix = '') {
  let matches = [];
  if (typeof obj === 'object' && obj !== null) {
    for (const k of Object.keys(obj)) {
      if (k.toLowerCase().includes(query)) {
        matches.push(prefix ? prefix + '.' + k : k);
      }
      const more = findMatchingKeys(obj[k], query, prefix ? prefix + '.' + k : k);
      matches = matches.concat(more);
    }
  }
  return matches;
}

/**
 * Helper to get a value by its dotted path (e.g., 'foo.bar.baz') in an object.
 * @param {object} obj
 * @param {string} path
 * @returns {*}
 */
function getByPath(obj, path) {
  return path.split('.').reduce((acc, k) => (acc && (k in acc) ? acc[k] : undefined), obj);
}

/**
 * Helper to set a value by its dotted path in an object, creating any missing objects along the path.
 * @param {object} obj
 * @param {string} path
 * @param {*} value
 */
function setByPath(obj, path, value) {
  const keys = path.split('.');
  let current = obj;
  keys.forEach((k, idx) => {
    if (idx === keys.length - 1) {
      current[k] = value;
    } else {
      if (!(k in current)) current[k] = {};
      current = current[k];
    }
  });
}

/**
 * Renders search results for folder/global search with logic for file/folder/key matches.
 * Clicking a key-match result shows only the matched key(s).
 * @param {Array} results
 */
function displaySearchResults(results) {
  const container = document.getElementById('search-results');
  if (results.length === 0) {
    container.innerHTML = '<div class="no-results">No results found</div>';
    return;
  }

  const ul = document.createElement('ul');
  ul.className = 'results-list';

  results.forEach(result => {
    const li = document.createElement('li');
    if (result.type === 'file-key') {
      li.innerHTML = `
        <div class="result-item">
          <span class="file-icon">📄</span>
          <span class="result-name">${result.name}</span>
          <span class="result-type">key match</span>
        </div>
        <div style="padding-left:2.5em; font-size:0.98em; color:#60a5fa; cursor:pointer;">
          ${result.keys.map(k => `<code>${k}</code>`).join(', ')}
        </div>
      `;
    } else {
      li.innerHTML = `
        <div class="result-item">
          <span class="${result.type}-icon">${result.type === 'folder' ? '📁' : '📄'}</span>
          <span class="result-name">${result.name}</span>
          <span class="result-type">${result.type}</span>
        </div>
      `;
    }

    if (result.type === 'file' || result.type === 'file-key') {
      li.style.cursor = "pointer";
      li.addEventListener('click', async () => {
        closeSearchModal();
        document.getElementById('current-file').textContent = result.name;
        const preview = document.getElementById('preview');
        preview.innerHTML = '<div class="loading">Loading...</div>';
        try {
          const res = await fetch(`/api/file/${encodeURIComponent(result.path)}`);
          const json = await res.json();

          if (result.type === 'file-key' && result.keys && result.keys.length > 0) {
            // Show only matched key(s)
            const filtered = {};
            result.keys.forEach(keyPath => {
              const value = getByPath(json, keyPath);
              setByPath(filtered, keyPath, value);
            });
            _currentJson = filtered;
            renderJson(filtered);
          } else {
            _currentJson = json;
            renderJson(_currentJson);
          }
        } catch (err) {
          preview.innerHTML = '<div class="error">Error loading file</div>';
        }
      });
    }
    ul.appendChild(li);
  });

  container.innerHTML = '';
  container.appendChild(ul);
}

/**
 * Handles input in the folder search modal, performing a global search in the selected folder.
 */
document.getElementById('folder-search').addEventListener('input', async (e) => {
  const query = e.target.value.toLowerCase()
  if (!query) {
    document.getElementById('search-results').innerHTML = ''
    return
  }
  let nodes = _currentTree;
  for (const folder of _currentFolderPath) {
    const found = nodes.find(n => n.name === folder && n.type === 'folder');
    if (!found) break;
    nodes = found.children;
  }
  const results = await searchInTreeWithKeys(nodes, query);
  displaySearchResults(results);
});

/**
 * Toggles dark/light theme and remembers preference.
 */
function toggleTheme() {
  const theme = document.documentElement.getAttribute('data-theme')
  const newTheme = theme === 'dark' ? 'light' : 'dark'
  document.documentElement.setAttribute('data-theme', newTheme)
  localStorage.setItem('theme', newTheme)
  document.body.style.transition = 'all 0.3s ease'
  setTimeout(() => {
    document.body.style.transition = ''
  }, 300)
}

// Hide search modal when background is clicked
window.addEventListener('click', (e) => {
  const modal = document.getElementById('search-modal')
  if (e.target === modal) {
    closeSearchModal()
  }
})

// Restore saved theme on load
const savedTheme = localStorage.getItem('theme')
if (savedTheme) {
  document.documentElement.setAttribute('data-theme', savedTheme)
}

// Initial load
fetchTree()