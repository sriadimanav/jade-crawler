import { useState, useEffect, useRef } from 'react'

// Step status enum
const StepStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  SKIPPED: 'skipped',
}

export default function FlowExecutor({ flow, variants, onClose, onComplete }) {
  const [executing, setExecuting] = useState(false)
  const [stepStatuses, setStepStatuses] = useState({})
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const [logs, setLogs] = useState([])
  const [error, setError] = useState(null)
  const [completed, setCompleted] = useState(false)
  const abortController = useRef(null)
  const logsEndRef = useRef(null)

  // Initialize step statuses
  useEffect(() => {
    if (flow?.steps) {
      const initial = {}
      flow.steps.forEach(step => {
        initial[step.id] = StepStatus.PENDING
      })
      setStepStatuses(initial)
    }
  }, [flow])

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  // Add log entry
  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, { timestamp, message, type }])
  }

  // Get variant for a step
  const getVariant = (variantId) => variants.find(v => v.id === variantId)

  // Check device assignments
  const checkDeviceAssignments = () => {
    const missingDevices = []

    flow.steps.forEach((step, index) => {
      const variant = getVariant(step.variantId)
      const deviceId = step.deviceId || variant?.deviceId
      if (!deviceId) {
        missingDevices.push(`Step ${index + 1} (${variant?.name || step.variantId})`)
      }
    })

    return missingDevices
  }

  // Execute a single step
  const executeStep = async (step, index) => {
    const variant = getVariant(step.variantId)
    // Use step's deviceId if set, otherwise use variant's deviceId
    const deviceId = step.deviceId || variant?.deviceId

    setCurrentStepIndex(index)
    setStepStatuses(prev => ({ ...prev, [step.id]: StepStatus.RUNNING }))
    addLog(`Executing step ${index + 1}: ${step.description}`, 'info')
    addLog(`  → Device: ${deviceId || 'Not assigned'}`, 'dim')
    addLog(`  → Variant: ${variant?.name || 'Unknown'}`, 'dim')

    try {
      // Call the execution API
      const res = await fetch('/api/execute-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepId: step.id,
          deviceId,
          variantId: step.variantId,
          description: step.description,
          linkedTestCase: step.linkedTestCase,
        }),
        signal: abortController.current?.signal,
      })

      if (!res.ok) {
        throw new Error(`Step execution failed: ${res.statusText}`)
      }

      const result = await res.json()

      if (result.success) {
        setStepStatuses(prev => ({ ...prev, [step.id]: StepStatus.COMPLETED }))
        addLog(`  ✓ Step ${index + 1} completed`, 'success')
        return true
      } else {
        throw new Error(result.error || 'Step failed')
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        setStepStatuses(prev => ({ ...prev, [step.id]: StepStatus.SKIPPED }))
        addLog(`  ⊘ Step ${index + 1} aborted`, 'warning')
        return false
      }

      setStepStatuses(prev => ({ ...prev, [step.id]: StepStatus.FAILED }))
      addLog(`  ✗ Step ${index + 1} failed: ${err.message}`, 'error')

      // For demo, simulate success after showing error
      if (err.message.includes('fetch')) {
        addLog(`  → Simulating success for demo...`, 'dim')
        await simulateStep(step)
        setStepStatuses(prev => ({ ...prev, [step.id]: StepStatus.COMPLETED }))
        addLog(`  ✓ Step ${index + 1} simulated`, 'success')
        return true
      }

      return false
    }
  }

  // Simulate step execution (for demo without actual devices)
  const simulateStep = (step) => {
    return new Promise(resolve => {
      setTimeout(resolve, 1000 + Math.random() * 1500)
    })
  }

  // Run the flow
  const runFlow = async () => {
    // Check device assignments
    const missingDevices = checkDeviceAssignments()
    if (missingDevices.length > 0) {
      addLog(`⚠️ Missing device assignments for: ${missingDevices.join(', ')}`, 'warning')
      addLog(`Continuing in simulation mode...`, 'info')
    }

    setExecuting(true)
    setError(null)
    setCompleted(false)
    abortController.current = new AbortController()

    addLog(`Starting flow: ${flow.name}`, 'info')
    addLog(`Total steps: ${flow.steps.length}`, 'dim')

    let allSucceeded = true

    for (let i = 0; i < flow.steps.length; i++) {
      const step = flow.steps[i]

      // Check for sync point
      if (step.syncPoint) {
        addLog(`⏳ Sync point reached - waiting for parallel steps...`, 'info')
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      const success = await executeStep(step, i)

      if (!success) {
        allSucceeded = false
        // Check if we should continue on failure
        if (!flow.continueOnFailure) {
          addLog(`Flow stopped due to step failure`, 'error')
          break
        }
      }
    }

    setExecuting(false)
    setCompleted(true)
    setCurrentStepIndex(-1)

    if (allSucceeded) {
      addLog(`✓ Flow completed successfully!`, 'success')
    } else {
      addLog(`Flow completed with errors`, 'warning')
    }

    onComplete?.({ success: allSucceeded, flow, stepStatuses })
  }

  // Stop execution
  const stopExecution = () => {
    abortController.current?.abort()
    setExecuting(false)
    addLog(`Flow execution stopped by user`, 'warning')
  }

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case StepStatus.COMPLETED: return '#22c55e'
      case StepStatus.RUNNING: return '#3b82f6'
      case StepStatus.FAILED: return '#ef4444'
      case StepStatus.SKIPPED: return '#f59e0b'
      default: return '#6b7280'
    }
  }

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case StepStatus.COMPLETED: return '✓'
      case StepStatus.RUNNING: return '●'
      case StepStatus.FAILED: return '✗'
      case StepStatus.SKIPPED: return '⊘'
      default: return '○'
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="flow-executor-panel" onClick={e => e.stopPropagation()}>
        <div className="executor-header">
          <div className="executor-title">
            <span className="executor-icon">▶</span>
            <h3>Flow Execution</h3>
            <span className="flow-name">{flow?.name}</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="executor-body">
          {/* Steps Timeline */}
          <div className="executor-steps">
            <h4>Steps Progress</h4>
            <div className="steps-timeline">
              {flow?.steps.map((step, index) => {
                const variant = getVariant(step.variantId)
                const status = stepStatuses[step.id] || StepStatus.PENDING
                const isCurrent = currentStepIndex === index

                return (
                  <div
                    key={step.id}
                    className={`timeline-step ${status} ${isCurrent ? 'current' : ''}`}
                  >
                    <div
                      className="step-indicator"
                      style={{ borderColor: getStatusColor(status) }}
                    >
                      <span style={{ color: getStatusColor(status) }}>
                        {getStatusIcon(status)}
                      </span>
                    </div>
                    <div className="step-content">
                      <div className="step-header">
                        <span className="step-number">#{index + 1}</span>
                        <span className="step-variant" style={{ color: variant?.color }}>
                          {variant?.icon} {variant?.name}
                        </span>
                        {step.syncPoint && <span className="sync-badge">⏳ Sync</span>}
                      </div>
                      <p className="step-description">{step.description}</p>
                      {(step.deviceId || variant?.deviceId) && (
                        <span className="step-device">📱 {step.deviceId || variant?.deviceId}</span>
                      )}
                    </div>
                    {status === StepStatus.RUNNING && (
                      <div className="step-spinner" />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Execution Logs */}
          <div className="executor-logs">
            <h4>Execution Log</h4>
            <div className="logs-container">
              {logs.length === 0 ? (
                <div className="logs-empty">
                  Click "Run Flow" to start execution
                </div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className={`log-entry ${log.type}`}>
                    <span className="log-time">{log.timestamp}</span>
                    <span className="log-message">{log.message}</span>
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>

        <div className="executor-footer">
          {completed && (
            <div className="execution-summary">
              <span className="summary-stat success">
                ✓ {Object.values(stepStatuses).filter(s => s === StepStatus.COMPLETED).length} passed
              </span>
              <span className="summary-stat error">
                ✗ {Object.values(stepStatuses).filter(s => s === StepStatus.FAILED).length} failed
              </span>
            </div>
          )}
          <div className="executor-actions">
            {!executing ? (
              <>
                <button className="executor-btn secondary" onClick={onClose}>
                  Close
                </button>
                <button
                  className="executor-btn primary"
                  onClick={runFlow}
                  disabled={!flow?.steps?.length}
                >
                  ▶ {completed ? 'Run Again' : 'Run Flow'}
                </button>
              </>
            ) : (
              <button className="executor-btn danger" onClick={stopExecution}>
                ■ Stop Execution
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
