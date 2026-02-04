import { useState, useRef, useEffect } from 'react'
import { importProjectJSON, fetchProjects, fetchProjectFile } from './exportUtils'
import logoSvg from './assets/green-gem-logo.svg'
import projectIcon from './assets/project.svg'

export default function ProjectScreen({ onCreateProject, onLoadProject }) {
  const [name, setName] = useState('')
  const [recentProjects, setRecentProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const fileRef = useRef(null)
  const toastTimer = useRef(null)

  const showToast = (msg) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 3000)
  }

  useEffect(() => {
    loadRecent()
  }, [])

  const loadRecent = async () => {
    setLoading(true)
    try {
      const projects = await fetchProjects()
      setRecentProjects(projects)
    } catch { /* ignore */ }
    setLoading(false)
  }

  const handleCreate = () => {
    if (!name.trim()) return
    const duplicate = recentProjects.some(
      (p) => p.name.toLowerCase() === name.trim().toLowerCase()
    )
    if (duplicate) {
      showToast('A project with this name already exists')
      return
    }
    onCreateProject(name.trim())
  }

  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const data = await importProjectJSON(file)
      onLoadProject(data)
    } catch (err) {
      showToast(err.message)
    }
    e.target.value = ''
  }

  const handleOpenRecent = async (project) => {
    try {
      const data = await fetchProjectFile(project.folderName, project.fileName)
      onLoadProject(data)
    } catch (err) {
      showToast(err.message)
    }
  }

  const formatDate = (iso) => {
    try {
      const d = new Date(iso)
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return ''
    }
  }

  return (
    <div className="project-screen">
      <div className="project-card">
        <div className="project-logo">
          <img src={logoSvg} alt="Jade" />
        </div>
        <h1 className="project-title">Jade</h1>
        <p className="project-subtitle">AI-powered mobile app testing</p>

        <div className="project-section">
          <h2>New Project</h2>
          <div className="project-create-row">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="Project name..."
              className="project-name-input"
            />
            <button onClick={handleCreate} className="project-create-btn">
              Create
            </button>
          </div>
        </div>

        {(loading || recentProjects.length > 0) && (
          <>
            <div className="project-divider"><span>recent projects</span></div>
            <div className="project-section">
              {loading ? (
                <p className="project-hint">Loading projects...</p>
              ) : (
                <div className="recent-projects-grid">
                  {recentProjects.map((p) => (
                    <button key={p.folderName} className="recent-project-tile" onClick={() => handleOpenRecent(p)}>
                      <img className="tile-icon" src={projectIcon} alt="" />
                      <div className="tile-name">{p.name}</div>
                      <div className="tile-date">{formatDate(p.savedAt)}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        <div className="project-divider"><span>or</span></div>

        <div className="project-section">
          <button className="project-import-btn" onClick={() => fileRef.current.click()}>
            Import Project File
          </button>
          <input ref={fileRef} type="file" accept=".json" hidden onChange={handleImport} />
        </div>

      </div>

      {toast && (
        <div className="project-toast" onClick={() => setToast('')}>
          {toast}
        </div>
      )}
    </div>
  )
}
