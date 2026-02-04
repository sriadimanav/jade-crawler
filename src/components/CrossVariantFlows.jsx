import { useState } from 'react'

export default function CrossVariantFlows({
  flows,
  variants,
  onCreateFlow,
  onEditFlow,
  onDeleteFlow,
  onRunFlow,
  onClose,
}) {
  const [showCreate, setShowCreate] = useState(false)
  const [editingFlow, setEditingFlow] = useState(null)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="cross-flows-panel" onClick={(e) => e.stopPropagation()}>
        <div className="cross-flows-header">
          <div className="cross-flows-title">
            <span className="flows-icon">🔗</span>
            <h3>Cross-Variant Flows</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="cross-flows-body">
          {flows.length === 0 ? (
            <div className="cross-flows-empty">
              <span className="empty-icon">🔗</span>
              <p>No cross-variant flows yet</p>
              <span>Create flows that test end-to-end scenarios across multiple app variants</span>
            </div>
          ) : (
            <div className="cross-flows-list">
              {flows.map((flow) => (
                <div key={flow.id} className="cross-flow-card">
                  <div className="flow-card-header">
                    <span className="flow-name">{flow.name}</span>
                    <div className="flow-variants">
                      {flow.steps.map((step, i) => {
                        const variant = variants.find(v => v.id === step.variantId)
                        return (
                          <span key={i} className="flow-variant-badge" title={variant?.name}>
                            {variant?.icon || '📱'}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                  {flow.description && (
                    <p className="flow-description">{flow.description}</p>
                  )}
                  <div className="flow-steps-preview">
                    {flow.steps.slice(0, 3).map((step, i) => {
                      const variant = variants.find(v => v.id === step.variantId)
                      return (
                        <div key={i} className="flow-step-preview">
                          <span className="step-variant">{variant?.icon}</span>
                          <span className="step-text">{step.description}</span>
                        </div>
                      )
                    })}
                    {flow.steps.length > 3 && (
                      <div className="flow-step-more">+{flow.steps.length - 3} more steps</div>
                    )}
                  </div>
                  <div className="flow-card-actions">
                    <button className="primary" onClick={() => onRunFlow(flow)}>Open Canvas</button>
                    <button onClick={() => setEditingFlow(flow)}>Edit Steps</button>
                    <button className="delete" onClick={() => onDeleteFlow(flow.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="cross-flows-footer">
          <button className="create-flow-btn" onClick={() => setShowCreate(true)}>
            + Create New Flow
          </button>
        </div>

      </div>
      {(showCreate || editingFlow) && (
        <FlowEditor
          flow={editingFlow}
          variants={variants}
          onSave={(flow) => {
            if (editingFlow) {
              onEditFlow(flow)
            } else {
              onCreateFlow(flow)
            }
            setShowCreate(false)
            setEditingFlow(null)
          }}
          onClose={() => {
            setShowCreate(false)
            setEditingFlow(null)
          }}
        />
      )}
    </div>
  )
}

function FlowEditor({ flow, variants, onSave, onClose }) {
  const [name, setName] = useState(flow?.name || '')
  const [description, setDescription] = useState(flow?.description || '')
  const [steps, setSteps] = useState(flow?.steps || [])
  const [newStepVariant, setNewStepVariant] = useState(variants[0]?.id || '')
  const [newStepDesc, setNewStepDesc] = useState('')
  const [newStepTestCase, setNewStepTestCase] = useState('')

  const addStep = () => {
    if (!newStepVariant || !newStepDesc.trim()) return
    setSteps([
      ...steps,
      {
        id: `step-${Date.now()}`,
        variantId: newStepVariant,
        description: newStepDesc.trim(),
        linkedTestCase: newStepTestCase || null,
        syncPoint: false,
      },
    ])
    setNewStepDesc('')
    setNewStepTestCase('')
  }

  const removeStep = (index) => {
    setSteps(steps.filter((_, i) => i !== index))
  }

  const toggleSyncPoint = (index) => {
    setSteps(steps.map((s, i) =>
      i === index ? { ...s, syncPoint: !s.syncPoint } : s
    ))
  }

  const moveStep = (index, direction) => {
    const newSteps = [...steps]
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= steps.length) return
    ;[newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]]
    setSteps(newSteps)
  }

  const handleSave = () => {
    if (!name.trim() || steps.length === 0) return
    onSave({
      id: flow?.id || `flow-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      steps,
    })
  }

  return (
    <>
      <div className="flow-editor-backdrop" onClick={onClose} />
      <div className="flow-editor" onClick={(e) => e.stopPropagation()}>
        <div className="flow-editor-header">
          <h3>{flow ? 'Edit Flow' : 'Create Cross-Variant Flow'}</h3>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="flow-editor-body">
          <div className="flow-field">
            <label>Flow Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Order Delivery E2E"
            />
          </div>

          <div className="flow-field">
            <label>Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description..."
            />
          </div>

          <div className="flow-steps-section">
            <label>Steps</label>
            <div className="flow-steps-list">
              {steps.map((step, i) => {
                const variant = variants.find(v => v.id === step.variantId)
                return (
                  <div key={step.id} className={`flow-step-item ${step.syncPoint ? 'sync-point' : ''}`}>
                    <span className="step-number">{i + 1}</span>
                    <span className="step-variant-icon">{variant?.icon || '📱'}</span>
                    <span className="step-variant-name">{variant?.name}</span>
                    <span className="step-description">{step.description}</span>
                    <div className="step-actions">
                      <button
                        className={`sync-btn ${step.syncPoint ? 'active' : ''}`}
                        onClick={() => toggleSyncPoint(i)}
                        title="Sync Point"
                      >
                        ⏳
                      </button>
                      <button onClick={() => moveStep(i, -1)} disabled={i === 0}>↑</button>
                      <button onClick={() => moveStep(i, 1)} disabled={i === steps.length - 1}>↓</button>
                      <button className="remove-btn" onClick={() => removeStep(i)}>×</button>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flow-add-step">
              <select
                value={newStepVariant}
                onChange={(e) => setNewStepVariant(e.target.value)}
              >
                {variants.map((v) => (
                  <option key={v.id} value={v.id}>{v.icon} {v.name}</option>
                ))}
              </select>
              <input
                type="text"
                value={newStepDesc}
                onChange={(e) => setNewStepDesc(e.target.value)}
                placeholder="Step description..."
                onKeyDown={(e) => e.key === 'Enter' && addStep()}
              />
              <button onClick={addStep} disabled={!newStepDesc.trim()}>Add</button>
            </div>
          </div>
        </div>

        <div className="flow-editor-footer">
          <button className="flow-cancel-btn" onClick={onClose}>Cancel</button>
          <button
            className="flow-save-btn"
            onClick={handleSave}
            disabled={!name.trim() || steps.length === 0}
          >
            {flow ? 'Save Changes' : 'Create Flow'}
          </button>
        </div>
      </div>
    </>
  )
}
