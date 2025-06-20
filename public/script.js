let _currentJson = null
let _currentTree = null
let _currentFolderPath = []

async function fetchTree() {
  const res = await fetch('/api/tree')
  const tree = await res.json()
  _currentTree = tree
  renderTree(tree, document.getElementById('tree'))
}

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
      li.querySelector('.file-item').addEventListener('click', async () => {
        // Add loading state
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

// --- JSON TREE VIEWER START ---
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

function createJsonTree(data, depth = 0) {
  const container = document.createElement('div')
  container.className = 'json-tree'

  // Helper for expandable/collapsible nodes
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

    // Key
    if (key !== undefined && key !== null && key !== '') {
      const keySpan = document.createElement('span')
      keySpan.className = 'json-key'
      keySpan.textContent = key
      node.appendChild(keySpan)
      node.appendChild(document.createTextNode(': '))
    }

    // Value
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

    // Start collapsed for nested objects/arrays (except root)
    if (hasChildren && depth !== 0) {
      child.style.display = 'none'
      node.querySelector('.json-toggle').textContent = '▶'
      node.querySelector('.json-toggle').setAttribute('aria-expanded', 'false')
    }
    return node
  }

  // Root node(s)
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
// --- JSON TREE VIEWER END ---

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

function openSearchModal(folderPath) {
  const modal = document.getElementById('search-modal')
  modal.style.display = 'flex'
  document.getElementById('folder-search').focus()
  _currentFolderPath = folderPath.split('/')
}

function closeSearchModal() {
  const modal = document.getElementById('search-modal')
  modal.style.display = 'none'
  document.getElementById('folder-search').value = ''
  document.getElementById('search-results').innerHTML = ''
}

// Search in folder functionality
document.getElementById('folder-search').addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase()
  if (!query) {
    document.getElementById('search-results').innerHTML = ''
    return
  }

  const results = searchInTree(_currentTree, query)
  displaySearchResults(results)
})

// Recursively search for files/folders AND keys inside JSON files
async function searchInTreeWithKeys(nodes, query, path = []) {
  let results = [];
  for (const node of nodes) {
    if (node.name.toLowerCase().includes(query)) {
      results.push({ type: node.type, name: node.name, path: node.path, keys: [] });
    }
    if (node.type === 'folder' && node.children) {
      const childResults = await searchInTreeWithKeys(node.children, query, [...path, node.name]);
      results = results.concat(childResults);
    }
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
        // Ignore file read errors
      }
    }
  }
  return results;
}

// Recursively find all keys matching query in JSON object
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

// Display search results with previews for file-key matches
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
        <div style="padding-left:2.5em; font-size:0.98em; color:#60a5fa;">${result.keys.map(k => `<code>${k}</code>`).join(', ')}</div>
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
      li.querySelector('.result-item').addEventListener('click', async () => {
        closeSearchModal();
        document.getElementById('current-file').textContent = result.name;
        const preview = document.getElementById('preview');
        preview.innerHTML = '<div class="loading">Loading...</div>';
        try {
          const res = await fetch(`/api/file/${encodeURIComponent(result.path)}`);
          _currentJson = await res.json();
          renderJson(_currentJson);
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

function displaySearchResults(results) {
  const container = document.getElementById('search-results')
  if (results.length === 0) {
    container.innerHTML = '<div class="no-results">No results found</div>'
    return
  }

  const ul = document.createElement('ul')
  ul.className = 'results-list'

  results.forEach(result => {
    const li = document.createElement('li')
    li.innerHTML = `
      <div class="result-item">
        <span class="${result.type}-icon">${result.type === 'folder' ? '📁' : '📄'}</span>
        <span class="result-name">${result.name}</span>
        <span class="result-type">${result.type}</span>
      </div>
    `

    if (result.type === 'file') {
      li.querySelector('.result-item').addEventListener('click', async () => {
        closeSearchModal()
        document.getElementById('current-file').textContent = result.name
        const preview = document.getElementById('preview')
        preview.innerHTML = '<div class="loading">Loading...</div>'
        try {
          const res = await fetch(`/api/file/${encodeURIComponent(result.path)}`)
          _currentJson = await res.json()
          renderJson(_currentJson)
        } catch (err) {
          preview.innerHTML = '<div class="error">Error loading file</div>'
        }
      })
    }

    ul.appendChild(li)
  })

  container.innerHTML = ''
  container.appendChild(ul)
}

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

// Close modal when clicking outside
window.addEventListener('click', (e) => {
  const modal = document.getElementById('search-modal')
  if (e.target === modal) {
    closeSearchModal()
  }
})

const savedTheme = localStorage.getItem('theme')
if (savedTheme) {
  document.documentElement.setAttribute('data-theme', savedTheme)
}

fetchTree()