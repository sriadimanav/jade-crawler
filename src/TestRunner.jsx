import { useState, useRef, useEffect } from 'react'
import { exportTestCasesPDF, exportTestCasesCSV } from './exportUtils'
import { DEVICE_INFO } from './TestSuiteView'
import ModuleLibrary from './components/ModuleLibrary'
import ModuleEditor from './components/ModuleEditor'
import upIcon from './assets/up.svg'
import downIcon from './assets/down.svg'
import editIcon from './assets/edit.svg'
import closeIcon from './assets/close.svg'
import backIcon from './assets/back.svg'

function detectAction(step) {
  const s = step.toLowerCase()
  if (s.includes('type') || s.includes('enter') || s.includes('input')) return 'Type'
  if (s.includes('scroll')) return 'Scroll'
  if (s.includes('verify') || s.includes('validate') || s.includes('check') || s.includes('assert') || s.includes('confirm')) return 'Validate'
  if (s.includes('navigate') || s.includes('open') || s.includes('go to') || s.includes('visit')) return 'Navigate'
  if (s.includes('wait')) return 'Wait'
  return 'Tap'
}

function generateStepLogs(stepIndex, stepText) {
  const action = detectAction(stepText)
  return [
    { text: `[[STEP_START:${stepIndex + 1}]]`, color: 'grey' },
    { text: `[[STEP]] ${stepText}`, color: 'green' },
    { text: `Attempt at the task: 0`, color: 'orange' },
    { text: `Attempt at tapping: 0`, color: 'orange' },
    { text: `Action: ${action}`, color: 'grey' },
    { text: `Task: ${stepText}.`, color: 'grey' },
    { text: `Summary: Executed "${stepText}" successfully.`, color: 'grey' },
    { text: `[[STEP_STATUS]]`, color: 'green' },
  ]
}

export default function TestRunner({
  testCase,
  projectName,
  screenshots = [],
  reusableModules = [],
  onSaveModule,
  onDeleteModule,
  onBack,
  onRunComplete,
  onUpdateSteps
}) {
  const [steps, setSteps] = useState(() => [...testCase.steps])
  const [running, setRunning] = useState(false)
  const [currentStep, setCurrentStep] = useState(-1)
  const [logs, setLogs] = useState([])
  const [toast, setToast] = useState(null)
  const [runResult, setRunResult] = useState(null)
  const [stepStatuses, setStepStatuses] = useState(() => steps.map(() => 'pending'))
  const [newStep, setNewStep] = useState('')
  const [editingIdx, setEditingIdx] = useState(-1)
  const [editingText, setEditingText] = useState('')
  const [activeScreenshot, setActiveScreenshot] = useState(screenshots[0] || null)
  const abortRef = useRef(false)
  const logsEndRef = useRef(null)
  const newStepRef = useRef(null)
  const [leftWidth, setLeftWidth] = useState(38)
  const [logsHeight, setLogsHeight] = useState(240)
  const draggingRef = useRef(false)

  // Module state
  const [selectedSteps, setSelectedSteps] = useState([])
  const [showModuleLibrary, setShowModuleLibrary] = useState(false)
  const [showModuleEditor, setShowModuleEditor] = useState(false)
  const [editingModule, setEditingModule] = useState(null)
  const [insertPosition, setInsertPosition] = useState(null)

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const delay = (ms) => new Promise((r) => setTimeout(r, ms))

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const getScreenshotForStep = (idx) => {
    if (screenshots.length === 0) return null
    return screenshots[idx % screenshots.length]
  }

  const run = async () => {
    abortRef.current = false
    setRunning(true)
    setRunResult(null)
    setSelectedSteps([])

    const startFrom = stepStatuses.findIndex((s) => s !== 'done')
    const start = startFrom === -1 ? 0 : startFrom

    setStepStatuses((prev) => prev.map((s, i) => (i >= start ? 'pending' : s)))

    let stopped = false

    for (let i = start; i < steps.length; i++) {
      if (abortRef.current) { stopped = true; break }

      setCurrentStep(i)
      setActiveScreenshot(getScreenshotForStep(i))
      setStepStatuses((prev) => prev.map((s, j) => (j === i ? 'running' : s)))

      const stepLogs = generateStepLogs(i, steps[i])
      for (const line of stepLogs) {
        if (abortRef.current) { stopped = true; break }
        setLogs((prev) => [...prev, line])
        await delay(200)
      }

      if (abortRef.current) {
        stopped = true
        setStepStatuses((prev) => prev.map((s, j) => (j === i ? 'stopped' : s)))
        break
      }

      setStepStatuses((prev) => prev.map((s, j) => (j === i ? 'done' : s)))
      await delay(800)
    }

    setRunning(false)
    setCurrentStep(-1)

    if (stopped) {
      setRunResult('stopped')
      setLogs((prev) => [...prev, { text: '', color: 'grey' }, { text: '--- RUN STOPPED ---', color: 'red' }])
      setStepStatuses((prev) => {
        onRunComplete?.({ status: 'stopped', stepsCompleted: prev.filter((s) => s === 'done').length, totalSteps: steps.length })
        return prev
      })
    } else {
      setRunResult('success')
      setLogs((prev) => [...prev, { text: '', color: 'grey' }, { text: `--- ALL ${steps.length} STEPS PASSED ---`, color: 'pass' }])
      onRunComplete?.({ status: 'success', stepsCompleted: steps.length, totalSteps: steps.length })
    }
  }

  const stop = () => { abortRef.current = true }

  // ── Step editing ──
  const addStep = () => {
    if (!newStep.trim() || running) return
    const updated = [...steps, newStep.trim()]
    setSteps(updated)
    setStepStatuses((prev) => [...prev, 'pending'])
    setNewStep('')
    setRunResult(null)
    onUpdateSteps?.(updated)
    newStepRef.current?.focus()
  }

  const deleteStep = (idx) => {
    if (running) return
    const updated = steps.filter((_, i) => i !== idx)
    setSteps(updated)
    setStepStatuses((prev) => prev.filter((_, i) => i !== idx))
    setSelectedSteps((prev) => prev.filter((i) => i !== idx).map((i) => (i > idx ? i - 1 : i)))
    setRunResult(null)
    onUpdateSteps?.(updated)
  }

  const startEdit = (idx) => {
    if (running) return
    setEditingIdx(idx)
    setEditingText(steps[idx])
  }

  const saveEdit = () => {
    if (editingIdx < 0 || !editingText.trim()) return
    const updated = steps.map((s, i) => (i === editingIdx ? editingText.trim() : s))
    setSteps(updated)
    setStepStatuses((prev) => prev.map((s, i) => (i === editingIdx ? 'pending' : s)))
    setEditingIdx(-1)
    setEditingText('')
    setRunResult(null)
    onUpdateSteps?.(updated)
  }

  const cancelEdit = () => {
    setEditingIdx(-1)
    setEditingText('')
  }

  const moveStep = (from, to) => {
    if (running || to < 0 || to >= steps.length) return
    const updated = [...steps]
    const [item] = updated.splice(from, 1)
    updated.splice(to, 0, item)
    setSteps(updated)
    setStepStatuses((prev) => {
      const arr = [...prev]
      const [si] = arr.splice(from, 1)
      arr.splice(to, 0, si)
      return arr
    })
    setSelectedSteps([])
    setRunResult(null)
    onUpdateSteps?.(updated)
  }

  // ── Step selection for modules ──
  const toggleStepSelection = (idx) => {
    if (running) return
    setSelectedSteps((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx].sort((a, b) => a - b)
    )
  }

  const selectAllSteps = () => {
    if (running) return
    setSelectedSteps(steps.map((_, i) => i))
  }

  const clearSelection = () => {
    setSelectedSteps([])
  }

  // ── Module operations ──
  const handleSaveAsModule = () => {
    if (selectedSteps.length === 0) return
    const selectedStepTexts = selectedSteps.map((i) => steps[i])
    setEditingModule({
      id: null,
      name: '',
      description: '',
      tags: [],
      steps: selectedStepTexts,
    })
    setShowModuleEditor(true)
  }

  const handleSaveModule = (module) => {
    onSaveModule?.(module)
    setShowModuleEditor(false)
    setEditingModule(null)
    setSelectedSteps([])
  }

  const handleInsertModule = (module) => {
    if (running) return
    const pos = insertPosition !== null ? insertPosition : steps.length
    const moduleSteps = module.steps.map((s) => (typeof s === 'string' ? s : s.text))
    const updated = [...steps.slice(0, pos), ...moduleSteps, ...steps.slice(pos)]
    setSteps(updated)
    setStepStatuses((prev) => [
      ...prev.slice(0, pos),
      ...moduleSteps.map(() => 'pending'),
      ...prev.slice(pos),
    ])
    setRunResult(null)
    onUpdateSteps?.(updated)
    setShowModuleLibrary(false)
    setInsertPosition(null)
    showToast(`Inserted "${module.name}" (${moduleSteps.length} steps)`)
  }

  const handleEditModule = (module) => {
    setEditingModule(module)
    setShowModuleLibrary(false)
    setShowModuleEditor(true)
  }

  const handleSave = async () => {
    await exportTestCasesCSV([{ ...testCase, steps }], projectName)
    showToast('Test case saved')
  }

  const onDragStart = (e) => {
    e.preventDefault()
    draggingRef.current = true
    const body = document.querySelector('.runner-body')
    const onMove = (ev) => {
      if (!draggingRef.current || !body) return
      const rect = body.getBoundingClientRect()
      const pct = ((ev.clientX - rect.left) / rect.width) * 100
      setLeftWidth(Math.min(60, Math.max(20, pct)))
    }
    const onUp = () => {
      draggingRef.current = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  const onVDragStart = (e) => {
    e.preventDefault()
    draggingRef.current = true
    const right = document.querySelector('.runner-right')
    const onMove = (ev) => {
      if (!draggingRef.current || !right) return
      const rect = right.getBoundingClientRect()
      const fromBottom = rect.bottom - ev.clientY
      setLogsHeight(Math.min(rect.height * 0.7, Math.max(100, fromBottom)))
    }
    const onUp = () => {
      draggingRef.current = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  const handleReport = async () => {
    await exportTestCasesPDF([{ ...testCase, steps }], projectName)
    showToast('Report downloaded')
  }

  return (
    <div className="runner">
      <div className="runner-header">
        <div className="header-left">
          <button className="back-btn" onClick={onBack}><img src={backIcon} alt="Back" /></button>
          <span className="runner-tc-id">{testCase.id}</span>
          <span>{testCase.name}</span>
          {testCase.device && <span className="runner-device-info">{DEVICE_INFO[testCase.device] || testCase.device}</span>}
        </div>
        <div className="header-actions">
          <button className="runner-report-btn" onClick={() => setShowModuleLibrary(true)}>
            Modules ({reusableModules.length})
          </button>
          <button className="runner-report-btn" onClick={handleReport}>Get Report</button>
          <button className="runner-report-btn" onClick={handleSave}>Save</button>
          {running ? (
            <button className="runner-stop-btn" onClick={stop}>Stop</button>
          ) : (
            <button className="runner-run-btn" onClick={run}>Run</button>
          )}
        </div>
      </div>

      <div className="runner-body">
        {/* Left: Device / Screenshot preview */}
        <div className="runner-left" style={{ flex: `0 0 ${leftWidth}%` }}>
          <div className="device-frame">
            {activeScreenshot ? (
              <img src={activeScreenshot.url} alt={activeScreenshot.label || 'Screen'} />
            ) : (
              <div className="device-placeholder">No screenshot</div>
            )}
          </div>
          {activeScreenshot && (
            <div className="device-label">{activeScreenshot.label || activeScreenshot.name}</div>
          )}
        </div>

        {/* Drag handle */}
        <div className="runner-resize-handle" onMouseDown={onDragStart} />

        {/* Right: Steps + Logs */}
        <div className="runner-right">
          <div className="runner-steps">
            {/* Module actions bar */}
            {!running && (
              <div className="module-actions">
                {selectedSteps.length > 0 ? (
                  <>
                    <button className="module-btn primary" onClick={handleSaveAsModule}>
                      Save as Module ({selectedSteps.length})
                    </button>
                    <button className="module-btn" onClick={clearSelection}>
                      Clear Selection
                    </button>
                  </>
                ) : (
                  <>
                    <button className="module-btn" onClick={selectAllSteps} disabled={steps.length === 0}>
                      Select All
                    </button>
                    <button className="module-btn" onClick={() => { setInsertPosition(steps.length); setShowModuleLibrary(true) }}>
                      Insert Module
                    </button>
                  </>
                )}
              </div>
            )}

            <ol>
              {steps.map((step, i) => (
                <li
                  key={i}
                  className={`runner-step ${stepStatuses[i]} ${currentStep === i ? 'active' : ''} ${selectedSteps.includes(i) ? 'selected' : ''}`}
                  onClick={() => !running && setActiveScreenshot(getScreenshotForStep(i))}
                >
                  {editingIdx === i ? (
                    <div className="step-edit-row">
                      <input
                        className="step-edit-input"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit() }}
                        autoFocus
                      />
                      <button className="step-edit-save" onClick={saveEdit}>Save</button>
                      <button className="step-edit-cancel" onClick={cancelEdit}>Cancel</button>
                    </div>
                  ) : (
                    <div className="step-content-row">
                      {!running && (
                        <input
                          type="checkbox"
                          className="step-checkbox"
                          checked={selectedSteps.includes(i)}
                          onChange={() => toggleStepSelection(i)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                      <span className="step-text">{step}</span>
                      {!running && (
                        <div className="step-actions">
                          <button onClick={(e) => { e.stopPropagation(); moveStep(i, i - 1) }} disabled={i === 0} title="Move up"><img src={upIcon} alt="Up" /></button>
                          <button onClick={(e) => { e.stopPropagation(); moveStep(i, i + 1) }} disabled={i === steps.length - 1} title="Move down"><img src={downIcon} alt="Down" /></button>
                          <button onClick={(e) => { e.stopPropagation(); startEdit(i) }} title="Edit"><img src={editIcon} alt="Edit" /></button>
                          <button onClick={(e) => { e.stopPropagation(); deleteStep(i) }} title="Delete"><img src={closeIcon} alt="Delete" /></button>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ol>

            {/* Add new step */}
            {!running && (
              <div className="add-step-row">
                <input
                  ref={newStepRef}
                  className="add-step-input"
                  value={newStep}
                  onChange={(e) => setNewStep(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addStep() }}
                  placeholder='Type a step... e.g. Tap "Login"'
                />
                <button className="add-step-btn" onClick={addStep} disabled={!newStep.trim()}>Add</button>
              </div>
            )}

            {runResult && (
              <div className={`run-result run-result-${runResult}`}>
                {runResult === 'success'
                  ? `All ${steps.length} steps passed`
                  : 'Run stopped'}
              </div>
            )}
          </div>

          <div className="runner-resize-handle-h" onMouseDown={onVDragStart} />
          <div className="runner-logs" style={{ flex: `0 0 ${logsHeight}px` }}>
            <div className="runner-logs-header">
              <span>Logs</span>
            </div>
            <div className="runner-logs-body">
              {logs.length === 0 && (
                <span className="runner-logs-empty">Click "Run" to start execution...</span>
              )}
              {logs.map((line, i) => (
                <div key={i} className={`log-line log-${line.color}`}>{line.text}</div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>
      </div>

      {/* Module Library Modal */}
      {showModuleLibrary && (
        <div className="module-editor-overlay" onClick={() => setShowModuleLibrary(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <ModuleLibrary
              modules={reusableModules}
              onSave={handleSaveModule}
              onDelete={onDeleteModule}
              onInsert={handleInsertModule}
              onEdit={handleEditModule}
              onClose={() => setShowModuleLibrary(false)}
            />
          </div>
        </div>
      )}

      {/* Module Editor Modal */}
      {showModuleEditor && (
        <ModuleEditor
          module={editingModule}
          onSave={handleSaveModule}
          onCancel={() => { setShowModuleEditor(false); setEditingModule(null) }}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
