import { useState } from 'react'

export default function CollapsibleTestCases({
  testCases,
  projectName,
  onExportCSV,
  onExportPDF,
  onViewSuite,
  onSelectTestCase,
}) {
  const [expanded, setExpanded] = useState(false)

  const visibleCases = expanded ? testCases : testCases.slice(0, 1)
  const hiddenCount = testCases.length - 1

  return (
    <div className="test-cases">
      <div className="tc-summary">
        <span>Generated {testCases.length} test case{testCases.length !== 1 ? 's' : ''}</span>
        <div className="tc-export-btns">
          <button onClick={() => onExportCSV(testCases, projectName)}>CSV</button>
          <button onClick={() => onExportPDF(testCases, projectName)}>PDF</button>
          <button className="view-suite-btn" onClick={(e) => { e.stopPropagation(); onViewSuite(testCases) }}>View Suite</button>
        </div>
      </div>

      {visibleCases.map((tc) => (
        <div key={tc.id} className="test-case-card clickable" onClick={() => onSelectTestCase(tc)}>
          <div className="tc-header">
            <span className="tc-id">{tc.id}</span>
            {tc.device && <span className={`device-badge ${tc.device}`}>{tc.device}</span>}
            {tc.type && <span className="tc-type-badge">{tc.type}</span>}
            {tc.priority && <span className={`tc-priority ${tc.priority}`}>{tc.priority}</span>}
          </div>
          <div className="tc-name">{tc.name}</div>
          <div className="tc-section">
            <strong>Preconditions:</strong>
            <p>{tc.preconditions}</p>
          </div>
          <div className="tc-steps">
            <strong>Steps:</strong>
            <ol>
              {tc.steps.map((step, si) => (
                <li key={si}>{step}</li>
              ))}
            </ol>
          </div>
          <div className="tc-expected">
            <strong>Expected Result:</strong> {tc.expected}
          </div>
        </div>
      ))}

      {testCases.length > 1 && (
        <button className="tc-expand-btn" onClick={() => setExpanded(!expanded)}>
          {expanded ? (
            <>Show less <span className="chevron up">‹</span></>
          ) : (
            <>Show {hiddenCount} more test case{hiddenCount !== 1 ? 's' : ''} <span className="chevron">›</span></>
          )}
        </button>
      )}
    </div>
  )
}
