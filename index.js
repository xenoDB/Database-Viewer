import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs/promises'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const app = express()
const PORT = process.env.PORT || 3000
const ROOT_DIR = path.resolve(__dirname, './storage')

// Serve static files (e.g. CSS/JS) from the public folder
app.use('/static', express.static(path.join(__dirname, 'public')))

// Folder-tree builder (skips index.json)
async function buildTree(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  return Promise.all(
    entries
      .filter((entry) => entry.name !== 'index.json')
      .map(async (entry) => {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          return {
            name: entry.name,
            type: 'folder',
            children: await buildTree(fullPath)
          }
        } else {
          return {
            name: entry.name,
            type: 'file',
            path: path.relative(ROOT_DIR, fullPath).replace(/\\/g, '/')
          }
        }
      })
  )
}

// API endpoint to get folder tree
app.get('/api/tree', async (req, res) => {
  try {
    const tree = await buildTree(ROOT_DIR)
    res.json(tree)
  } catch (error) {
    console.error('Error building folder tree:', error)
    res.status(500).json({ error: 'Failed to build folder tree.' })
  }
})

// API endpoint to get JSON file content (compatible with Express v5)
app.get('/api/file/*', async (req, res) => {
  const relPath = req.params[0] // wildcard match
  const filePath = path.join(ROOT_DIR, relPath)
  try {
    const data = await fs.readFile(filePath, 'utf-8')
    res.json(JSON.parse(data))
  } catch (err) {
    console.error(err)
    res.status(404).send('File not found or invalid JSON')
  }
})

// Serve the main index.html
app.get('/', async (req, res) => {
  try {
    const html = await fs.readFile(path.join(__dirname, 'public/index.html'), 'utf-8')
    res.send(html)
  } catch (err) {
    console.error(err)
    res.status(500).send('Could not load index.html')
  }
})

// Start the server
app.listen(PORT, () => {
  console.log(`🌐 Server running at http://localhost:${PORT}`)
})
