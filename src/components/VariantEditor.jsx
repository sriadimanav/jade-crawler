import { useState, useEffect } from 'react'

const VARIANT_ICONS = ['📱', '🚗', '🏪', '💼', '🖥️', '⌚', '📟', '🎮']

export default function VariantEditor({ variant, onSave, onDelete, onClose }) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('📱')
  const [owner, setOwner] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (variant) {
      setName(variant.name || '')
      setIcon(variant.icon || '📱')
      setOwner(variant.owner || '')
      setDescription(variant.description || '')
    }
  }, [variant])

  const handleSave = () => {
    if (!name.trim()) return
    onSave({
      id: variant?.id || `variant-${Date.now()}`,
      name: name.trim(),
      icon,
      owner: owner.trim(),
      description: description.trim(),
      screens: variant?.screens || [],
      testCases: variant?.testCases || [],
    })
  }

  const isEdit = !!variant?.id

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="variant-editor" onClick={(e) => e.stopPropagation()}>
        <div className="variant-editor-header">
          <h3>{isEdit ? 'Edit Variant' : 'Add New Variant'}</h3>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="variant-editor-body">
          <div className="variant-field">
            <label>Icon</label>
            <div className="variant-icon-picker">
              {VARIANT_ICONS.map((ic) => (
                <button
                  key={ic}
                  className={`icon-option ${icon === ic ? 'selected' : ''}`}
                  onClick={() => setIcon(ic)}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          <div className="variant-field">
            <label>Variant Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., User App, Driver App..."
            />
          </div>

          <div className="variant-field">
            <label>Owner</label>
            <input
              type="text"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="e.g., rahul, priya..."
            />
          </div>

          <div className="variant-field">
            <label>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this variant..."
              rows={3}
            />
          </div>
        </div>

        <div className="variant-editor-footer">
          {isEdit && onDelete && (
            <button className="variant-delete-btn" onClick={() => onDelete(variant.id)}>
              Delete Variant
            </button>
          )}
          <div className="variant-editor-actions">
            <button className="variant-cancel-btn" onClick={onClose}>Cancel</button>
            <button
              className="variant-save-btn"
              onClick={handleSave}
              disabled={!name.trim()}
            >
              {isEdit ? 'Save Changes' : 'Create Variant'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
