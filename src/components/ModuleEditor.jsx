import { useState } from 'react'

export default function ModuleEditor({ module, onSave, onCancel }) {
  const [name, setName] = useState(module?.name || '')
  const [description, setDescription] = useState(module?.description || '')
  const [tagsInput, setTagsInput] = useState(module?.tags?.join(', ') || '')
  const [steps, setSteps] = useState(
    module?.steps?.map((s) => (typeof s === 'string' ? s : s.text)) || []
  )
  const [editingStep, setEditingStep] = useState(null)
  const [editingText, setEditingText] = useState('')

  const handleSave = () => {
    if (!name.trim()) return

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t)

    onSave({
      id: module?.id || `module-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      tags,
      steps,
      createdAt: module?.createdAt || Date.now(),
      updatedAt: Date.now(),
    })
  }

  const addStep = () => {
    setSteps([...steps, 'New step'])
    setEditingStep(steps.length)
    setEditingText('New step')
  }

  const updateStep = (index) => {
    if (!editingText.trim()) {
      // Delete empty steps
      setSteps(steps.filter((_, i) => i !== index))
    } else {
      setSteps(steps.map((s, i) => (i === index ? editingText.trim() : s)))
    }
    setEditingStep(null)
    setEditingText('')
  }

  const deleteStep = (index) => {
    setSteps(steps.filter((_, i) => i !== index))
  }

  const moveStep = (from, to) => {
    if (to < 0 || to >= steps.length) return
    const arr = [...steps]
    const [item] = arr.splice(from, 1)
    arr.splice(to, 0, item)
    setSteps(arr)
  }

  const startEditing = (index) => {
    setEditingStep(index)
    setEditingText(steps[index])
  }

  return (
    <div className="module-editor-overlay" onClick={onCancel}>
      <div className="module-editor" onClick={(e) => e.stopPropagation()}>
        <div className="module-editor-header">
          <h3>{module ? 'Edit Module' : 'Create Module'}</h3>
          <button className="module-close-btn" onClick={onCancel}>×</button>
        </div>

        <div className="module-editor-form">
          <div className="module-field">
            <label>Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Login Flow"
              autoFocus
            />
          </div>

          <div className="module-field">
            <label>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this module do?"
              rows={2}
            />
          </div>

          <div className="module-field">
            <label>Tags (comma-separated)</label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g., auth, login, common"
            />
          </div>

          <div className="module-field">
            <label>Steps ({steps.length})</label>
            <div className="module-steps-list">
              {steps.map((step, i) => (
                <div key={i} className="module-step-item">
                  <div className="module-step-order">
                    <button
                      onClick={() => moveStep(i, i - 1)}
                      disabled={i === 0}
                    >
                      ↑
                    </button>
                    <span>{i + 1}</span>
                    <button
                      onClick={() => moveStep(i, i + 1)}
                      disabled={i === steps.length - 1}
                    >
                      ↓
                    </button>
                  </div>
                  {editingStep === i ? (
                    <input
                      type="text"
                      className="module-step-input"
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onBlur={() => updateStep(i)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') updateStep(i)
                        if (e.key === 'Escape') {
                          setEditingStep(null)
                          setEditingText('')
                        }
                      }}
                      autoFocus
                    />
                  ) : (
                    <span
                      className="module-step-text"
                      onClick={() => startEditing(i)}
                    >
                      {step}
                    </span>
                  )}
                  <button
                    className="module-step-delete"
                    onClick={() => deleteStep(i)}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button className="module-add-step" onClick={addStep}>
                + Add Step
              </button>
            </div>
          </div>
        </div>

        <div className="module-editor-actions">
          <button className="module-cancel-btn" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="module-save-btn"
            onClick={handleSave}
            disabled={!name.trim() || steps.length === 0}
          >
            {module ? 'Update Module' : 'Save Module'}
          </button>
        </div>
      </div>
    </div>
  )
}
