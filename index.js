/**
 * Database Viewer - Express Backend
 * Author: grdAyush (Ayush)
 * GitHub: https://github.com/grdAyush
 *
 * This is the main server file for Database Viewer.
 * It serves the frontend (public), provides API endpoints for folder tree and JSON file contents,
 * and powers the application's backend logic.
 */

import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs/promises'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const app = express()
const PORT = process.env.PORT || 3000

// Path to the root data directory (where your JSON is stored)
const ROOT_DIR = path.resolve(__dirname, './storage')

// Serve static frontend assets (CSS, JS, etc.) from the "public" directory
app.use('/static', express.static(path.join(__dirname, 'public')))

/**
 * Recursively builds the folder/file tree for the frontend.
 * Skips any file named "index.json".
 * @param {string} dir - Directory path to scan
 * @returns {Promise<Array>} - Folder/file tree structure
 */
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

/**
 * API endpoint: Returns the full folder/file tree as JSON.
 */
app.get('/api/tree', async (req, res) => {
  try {
    const tree = await buildTree(ROOT_DIR)
    res.json(tree)
  } catch (error) {
    console.error('Error building folder tree:', error)
    res.status(500).json({ error: 'Failed to build folder tree.' })
  }
})

/**
 * API endpoint: Returns the contents of a JSON file, parsed.
 * Wildcard route allows nested files (subfolders).
 */
app.get('/api/file/:path(*)', async (req, res) => {
  const relPath = req.params.path
  const filePath = path.join(ROOT_DIR, relPath)
  try {
    const data = await fs.readFile(filePath, 'utf-8')
    res.json(JSON.parse(data))
  } catch (err) {
    console.error('File read error:', err)
    res.status(404).send('File not found or invalid JSON')
  }
})

/**
 * Serves the main frontend HTML (single-page app entrypoint).
 */
app.get('/', async (req, res) => {
  try {
    const html = await fs.readFile(path.join(__dirname, 'public/index.html'), 'utf-8')
    res.send(html)
  } catch (err) {
    console.error('Could not load index.html:', err)
    res.status(500).send('Could not load index.html')
  }
})

/**
 * Starts the Express server.
 */
app.listen(PORT, () => {
  console.log(`🌐 Server running at http://localhost:${PORT}`)
})

/**
 * © 2025 grdAyush (Ayush)
 * https://github.com/grdAyush/Database-Viewer
 * Please star the repo if you like this project!
 */