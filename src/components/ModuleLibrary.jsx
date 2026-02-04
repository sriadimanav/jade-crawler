import { useState } from 'react'
import searchIcon from '../assets/search.svg'

export default function ModuleLibrary({
  modules,
  onSave,
  onDelete,
  onInsert,
  onEdit,
  onClose,
}) {
  const [search, setSearch] = useState('')
  const [selectedTag, setSelectedTag] = useState(null)

  // Get all unique tags
  const allTags = [...new Set(modules.flatMap((m) => m.tags || []))]

  // Filter modules
  const filtered = modules.filter((m) => {
    const matchesSearch =
      !search ||
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.description?.toLowerCase().includes(search.toLowerCase())
    const matchesTag = !selectedTag || m.tags?.includes(selectedTag)
    return matchesSearch && matchesTag
  })

  return (
    <div className="module-library">
      <div className="module-library-header">
        <h3>Reusable Modules</h3>
        <button className="module-close-btn" onClick={onClose}>×</button>
      </div>

      <div className="module-library-filters">
        <div className="module-search-wrapper">
          <img src={searchIcon} alt="" className="module-search-icon" />
          <input
            type="text"
            placeholder="Search modules..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="module-search"
          />
        </div>
        {allTags.length > 0 && (
          <div className="module-tags">
            <button
              className={`module-tag ${!selectedTag ? 'active' : ''}`}
              onClick={() => setSelectedTag(null)}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                className={`module-tag ${selectedTag === tag ? 'active' : ''}`}
                onClick={() => setSelectedTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="module-library-list">
        {filtered.length === 0 ? (
          <div className="module-empty">
            {modules.length === 0
              ? 'No modules saved yet. Select steps in the test runner and click "Save as Module".'
              : 'No modules match your search.'}
          </div>
        ) : (
          filtered.map((module) => (
            <div key={module.id} className="module-card">
              <div className="module-card-header">
                <span className="module-name">{module.name}</span>
                <span className="module-step-count">{module.steps.length} steps</span>
              </div>
              {module.description && (
                <p className="module-description">{module.description}</p>
              )}
              {module.tags?.length > 0 && (
                <div className="module-card-tags">
                  {module.tags.map((tag) => (
                    <span key={tag} className="module-card-tag">{tag}</span>
                  ))}
                </div>
              )}
              <div className="module-card-steps">
                {module.steps.slice(0, 3).map((step, i) => (
                  <div key={i} className="module-step-preview">
                    {i + 1}. {typeof step === 'string' ? step : step.text}
                  </div>
                ))}
                {module.steps.length > 3 && (
                  <div className="module-step-more">+{module.steps.length - 3} more</div>
                )}
              </div>
              <div className="module-card-actions">
                {onInsert && (
                  <button className="module-insert-btn" onClick={() => onInsert(module)}>
                    Insert
                  </button>
                )}
                {onEdit && (
                  <button className="module-edit-btn" onClick={() => onEdit(module)}>
                    Edit
                  </button>
                )}
                <button className="module-delete-btn" onClick={() => onDelete(module.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
