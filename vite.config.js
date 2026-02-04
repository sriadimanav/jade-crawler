import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

const PROJECTS_DIR = path.resolve(__dirname, 'projects')

function safePath(base, ...segments) {
  const resolved = path.resolve(base, ...segments)
  if (!resolved.startsWith(base + path.sep) && resolved !== base) {
    return null
  }
  return resolved
}

function projectsApi() {
  return {
    name: 'projects-api',
    configureServer(server) {
      // GET /api/projects — scan projects folder
      server.middlewares.use('/api/projects', (req, res, next) => {
        if (req.method !== 'GET') return next()

        if (!fs.existsSync(PROJECTS_DIR)) {
          fs.mkdirSync(PROJECTS_DIR, { recursive: true })
        }

        const projects = []
        const dirs = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true })

        for (const dir of dirs) {
          if (!dir.isDirectory()) continue
          const dirPath = path.join(PROJECTS_DIR, dir.name)
          const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'))
          if (files.length === 0) continue

          // Find the most recently modified json
          let latest = null
          let latestMtime = 0
          for (const f of files) {
            const fp = path.join(dirPath, f)
            const stat = fs.statSync(fp)
            if (stat.mtimeMs > latestMtime) {
              latestMtime = stat.mtimeMs
              latest = fp
            }
          }

          if (latest) {
            try {
              const data = JSON.parse(fs.readFileSync(latest, 'utf-8'))
              projects.push({
                folderName: dir.name,
                name: data.name || dir.name,
                savedAt: data.savedAt || new Date(latestMtime).toISOString(),
                fileName: path.basename(latest),
              })
            } catch { /* skip */ }
          }
        }

        projects.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt))
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(projects))
      })

      // GET /api/projects/:folder/:file — load a project json
      server.middlewares.use('/api/project-file', (req, res, next) => {
        if (req.method !== 'GET') return next()
        const url = new URL(req.url, 'http://localhost')
        const folder = url.searchParams.get('folder')
        const file = url.searchParams.get('file')
        if (!folder || !file) { res.statusCode = 400; return res.end('Missing params') }

        const fp = safePath(PROJECTS_DIR, folder, file)
        if (!fp) { res.statusCode = 400; return res.end('Invalid path') }
        if (!fs.existsSync(fp)) { res.statusCode = 404; return res.end('Not found') }

        res.setHeader('Content-Type', 'application/json')
        res.end(fs.readFileSync(fp, 'utf-8'))
      })

      // POST /api/upload — upload a screenshot file
      server.middlewares.use('/api/upload', (req, res, next) => {
        if (req.method !== 'POST') return next()

        const chunks = []
        req.on('data', chunk => { chunks.push(chunk) })
        req.on('end', () => {
          try {
            const body = Buffer.concat(chunks)
            const boundary = req.headers['content-type'].split('boundary=')[1]
            const parts = body.toString('binary').split('--' + boundary)

            let folder = '', filename = '', fileData = null

            for (const part of parts) {
              if (part.includes('name="folder"')) {
                folder = part.split('\r\n\r\n')[1].split('\r\n')[0].trim()
              }
              if (part.includes('name="file"')) {
                const filenameMatch = part.match(/filename="([^"]+)"/)
                if (filenameMatch) filename = filenameMatch[1]
                const contentStart = part.indexOf('\r\n\r\n') + 4
                const contentEnd = part.lastIndexOf('\r\n')
                fileData = Buffer.from(part.substring(contentStart, contentEnd), 'binary')
              }
            }

            if (!folder || !filename || !fileData) {
              res.statusCode = 400
              return res.end(JSON.stringify({ error: 'Missing fields' }))
            }

            const screenshotsDir = safePath(PROJECTS_DIR, folder, 'screenshots')
            if (!screenshotsDir) {
              res.statusCode = 400
              return res.end(JSON.stringify({ error: 'Invalid path' }))
            }
            fs.mkdirSync(screenshotsDir, { recursive: true })

            // Deduplicate filename
            let finalName = filename
            let counter = 1
            while (fs.existsSync(path.join(screenshotsDir, finalName))) {
              const ext = path.extname(filename)
              const base = path.basename(filename, ext)
              finalName = `${base}-${counter}${ext}`
              counter++
            }

            fs.writeFileSync(path.join(screenshotsDir, finalName), fileData)
            const url = `/api/screenshot?folder=${encodeURIComponent(folder)}&file=${encodeURIComponent(finalName)}`
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true, filename: finalName, url }))
          } catch (err) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: err.message }))
          }
        })
      })

      // GET /api/screenshot — serve a screenshot image
      server.middlewares.use('/api/screenshot', (req, res, next) => {
        if (req.method !== 'GET') return next()
        const url = new URL(req.url, 'http://localhost')
        const folder = url.searchParams.get('folder')
        const file = url.searchParams.get('file')
        if (!folder || !file) { res.statusCode = 400; return res.end('Missing params') }

        const fp = safePath(PROJECTS_DIR, folder, 'screenshots', file)
        if (!fp) { res.statusCode = 400; return res.end('Invalid path') }
        if (!fs.existsSync(fp)) { res.statusCode = 404; return res.end('Not found') }

        const ext = path.extname(file).toLowerCase()
        const mimeTypes = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml' }
        res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream')
        res.end(fs.readFileSync(fp))
      })

      // POST /api/save — save a file to projects/:folder/:filename
      server.middlewares.use('/api/save', (req, res, next) => {
        if (req.method !== 'POST') return next()

        let body = ''
        req.on('data', chunk => { body += chunk })
        req.on('end', () => {
          try {
            const { folder, filename, content } = JSON.parse(body)
            const dirPath = safePath(PROJECTS_DIR, folder)
            if (!dirPath) { res.statusCode = 400; return res.end(JSON.stringify({ error: 'Invalid path' })) }
            const filePath = safePath(dirPath, filename)
            if (!filePath) { res.statusCode = 400; return res.end(JSON.stringify({ error: 'Invalid path' })) }
            fs.mkdirSync(dirPath, { recursive: true })
            fs.writeFileSync(filePath, content)
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true }))
          } catch (err) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: err.message }))
          }
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), projectsApi()],
  server: {
    allowedHosts: true,
  },
})
