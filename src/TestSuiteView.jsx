import { useState, useMemo, useCallback } from 'react'
import backIcon from './assets/back.svg'

const DEVICE_INFO = {
  mobile: 'iPhone 14 Pro — iOS 17.2',
  desktop: 'MacBook Pro — Chrome 120',
}

export { DEVICE_INFO }

export default function TestSuiteView({ testCases, runHistory, onRunTest, onRunAll, onBack, projectName }) {
  const [typeFilter, setTypeFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const getStatus = useCallback((tc) => {
    const history = runHistory[tc.id]
    if (!history || history.length === 0) return 'not_run'
    return history[history.length - 1].status
  }, [runHistory])

  const types = useMemo(() =>
    [...new Set(testCases.map((tc) => tc.type))].sort()
  , [testCases])

  const priorities = useMemo(() =>
    [...new Set(testCases.map((tc) => tc.priority))].sort()
  , [testCases])

  const { filtered, passed, failed, notRun } = useMemo(() => {
    let passed = 0, failed = 0, notRun = 0
    const filtered = testCases.filter((tc) => {
      const status = getStatus(tc)
      if (status === 'success') passed++
      else if (status === 'stopped') failed++
      else notRun++
      if (typeFilter !== 'all' && tc.type !== typeFilter) return false
      if (priorityFilter !== 'all' && tc.priority !== priorityFilter) return false
      if (statusFilter !== 'all' && status !== statusFilter) return false
      return true
    })
    return { filtered, passed, failed, notRun }
  }, [testCases, runHistory, typeFilter, priorityFilter, statusFilter, getStatus])

  return (
    <div className="suite">
      <div className="suite-header">
        <div className="header-left">
          <button className="back-btn" onClick={onBack}><img src={backIcon} alt="Back" /></button>
          <span className="suite-title">{projectName} — Test Suite</span>
        </div>
        <div className="header-actions">
          <button className="runner-run-btn" onClick={onRunAll}>Run All</button>
        </div>
      </div>

      <div className="suite-summary">
        <div className="summary-stat">
          <span className="stat-num">{testCases.length}</span>
          <span className="stat-label">Total</span>
        </div>
        <div className="summary-stat stat-pass">
          <span className="stat-num">{passed}</span>
          <span className="stat-label">Passed</span>
        </div>
        <div className="summary-stat stat-fail">
          <span className="stat-num">{failed}</span>
          <span className="stat-label">Failed</span>
        </div>
        <div className="summary-stat stat-pending">
          <span className="stat-num">{notRun}</span>
          <span className="stat-label">Not Run</span>
        </div>
        {testCases.length > 0 && (
          <div className="summary-bar">
            <div className="bar-pass" style={{ width: `${(passed / testCases.length) * 100}%` }} />
            <div className="bar-fail" style={{ width: `${(failed / testCases.length) * 100}%` }} />
          </div>
        )}
      </div>

      <div className="suite-filters">
        <div className="filter-group">
          <span className="filter-label">Type:</span>
          <button className={`filter-chip ${typeFilter === 'all' ? 'active' : ''}`} onClick={() => setTypeFilter('all')}>All</button>
          {types.map((t) => (
            <button key={t} className={`filter-chip ${typeFilter === t ? 'active' : ''}`} onClick={() => setTypeFilter(t)}>{t}</button>
          ))}
        </div>
        <div className="filter-group">
          <span className="filter-label">Priority:</span>
          <button className={`filter-chip ${priorityFilter === 'all' ? 'active' : ''}`} onClick={() => setPriorityFilter('all')}>All</button>
          {priorities.map((p) => (
            <button key={p} className={`filter-chip ${priorityFilter === p ? 'active' : ''}`} onClick={() => setPriorityFilter(p)}>{p}</button>
          ))}
        </div>
        <div className="filter-group">
          <span className="filter-label">Status:</span>
          <button className={`filter-chip ${statusFilter === 'all' ? 'active' : ''}`} onClick={() => setStatusFilter('all')}>All</button>
          <button className={`filter-chip ${statusFilter === 'success' ? 'active' : ''}`} onClick={() => setStatusFilter('success')}>Passed</button>
          <button className={`filter-chip ${statusFilter === 'stopped' ? 'active' : ''}`} onClick={() => setStatusFilter('stopped')}>Failed</button>
          <button className={`filter-chip ${statusFilter === 'not_run' ? 'active' : ''}`} onClick={() => setStatusFilter('not_run')}>Not Run</button>
        </div>
      </div>

      <div className="suite-table">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Preconditions</th>
              <th>Type</th>
              <th>Priority</th>
              <th>Expected Result</th>
              <th>Device</th>
              <th>Status</th>
              <th>Last Run</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((tc) => {
              const status = getStatus(tc)
              const history = runHistory[tc.id] || []
              const lastRun = history.length > 0 ? history[history.length - 1] : null
              return (
                <tr key={tc.id} className="suite-row" onClick={() => onRunTest(tc)}>
                  <td><span className="suite-id">{tc.id}</span></td>
                  <td className="suite-name">{tc.name}</td>
                  <td className="suite-precondition">{tc.preconditions || '—'}</td>
                  <td><span className="tc-type-badge">{tc.type}</span></td>
                  <td><span className={`tc-priority ${tc.priority}`}>{tc.priority}</span></td>
                  <td className="suite-expected">{tc.expected || '—'}</td>
                  <td>{tc.device ? DEVICE_INFO[tc.device]?.split(' — ')[0] || tc.device : '—'}</td>
                  <td>
                    <span className={`status-badge status-${status}`}>
                      {status === 'success' ? 'Passed' : status === 'stopped' ? 'Failed' : 'Not Run'}
                    </span>
                  </td>
                  <td className="suite-time">
                    {lastRun ? new Date(lastRun.timestamp).toLocaleTimeString() : '—'}
                  </td>
                  <td>
                    <button className="suite-run-btn" onClick={(e) => { e.stopPropagation(); onRunTest(tc) }}>Run</button>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={10} className="suite-empty">No test cases match filters</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
