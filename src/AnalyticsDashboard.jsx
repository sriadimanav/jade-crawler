import { useState } from 'react'
import backIcon from './assets/back.svg'

// Mock data for presentation
const mockData = {
  summary: {
    totalTests: 156,
    passRate: 87.2,
    avgDuration: '2.4s',
    testsToday: 42,
  },
  weeklyTrend: [
    { day: 'Mon', passed: 28, failed: 4 },
    { day: 'Tue', passed: 32, failed: 6 },
    { day: 'Wed', passed: 25, failed: 3 },
    { day: 'Thu', passed: 38, failed: 5 },
    { day: 'Fri', passed: 42, failed: 4 },
    { day: 'Sat', passed: 18, failed: 2 },
    { day: 'Sun', passed: 12, failed: 1 },
  ],
  byType: [
    { type: 'Functional', count: 64, color: '#22c55e' },
    { type: 'UI/UX', count: 38, color: '#3b82f6' },
    { type: 'Performance', count: 28, color: '#f59e0b' },
    { type: 'Security', count: 16, color: '#ef4444' },
    { type: 'Integration', count: 10, color: '#8b5cf6' },
  ],
  byPriority: [
    { priority: 'Critical', passed: 24, failed: 2 },
    { priority: 'High', passed: 48, failed: 6 },
    { priority: 'Medium', passed: 52, failed: 8 },
    { priority: 'Low', passed: 12, failed: 4 },
  ],
  recentRuns: [
    { id: 'TC-047', name: 'User login with valid credentials', status: 'passed', time: '2 min ago' },
    { id: 'TC-023', name: 'Cart checkout flow', status: 'failed', time: '5 min ago' },
    { id: 'TC-089', name: 'Profile image upload', status: 'passed', time: '8 min ago' },
    { id: 'TC-012', name: 'Search functionality', status: 'passed', time: '12 min ago' },
    { id: 'TC-056', name: 'Payment processing', status: 'passed', time: '15 min ago' },
  ],
  devices: [
    { name: 'iPhone 14 Pro', tests: 52, passRate: 92 },
    { name: 'Samsung S23', tests: 48, passRate: 85 },
    { name: 'Pixel 7', tests: 32, passRate: 88 },
    { name: 'iPad Pro', tests: 24, passRate: 91 },
  ],
}

export default function AnalyticsDashboard({ onBack, projectName = 'Jade Analytics' }) {
  const [timeRange, setTimeRange] = useState('week')

  const maxWeeklyTotal = Math.max(...mockData.weeklyTrend.map(d => d.passed + d.failed))
  const totalByType = mockData.byType.reduce((sum, t) => sum + t.count, 0)

  return (
    <div className="analytics">
      <div className="analytics-header">
        <div className="header-left">
          <button className="back-btn" onClick={onBack}>
            <img src={backIcon} alt="Back" />
          </button>
          <span className="analytics-title">{projectName}</span>
        </div>
        <div className="time-range-selector">
          <button
            className={`range-btn ${timeRange === 'day' ? 'active' : ''}`}
            onClick={() => setTimeRange('day')}
          >Today</button>
          <button
            className={`range-btn ${timeRange === 'week' ? 'active' : ''}`}
            onClick={() => setTimeRange('week')}
          >This Week</button>
          <button
            className={`range-btn ${timeRange === 'month' ? 'active' : ''}`}
            onClick={() => setTimeRange('month')}
          >This Month</button>
        </div>
      </div>

      <div className="analytics-content">
        {/* Summary Cards */}
        <div className="summary-cards">
          <div className="summary-card">
            <div className="card-icon tests-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                <path d="M9 12l2 2 4-4"/>
              </svg>
            </div>
            <div className="card-info">
              <span className="card-value">{mockData.summary.totalTests}</span>
              <span className="card-label">Total Tests</span>
            </div>
            <div className="card-trend up">+12%</div>
          </div>

          <div className="summary-card">
            <div className="card-icon pass-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9 12l2 2 4-4"/>
              </svg>
            </div>
            <div className="card-info">
              <span className="card-value">{mockData.summary.passRate}%</span>
              <span className="card-label">Pass Rate</span>
            </div>
            <div className="card-trend up">+3.2%</div>
          </div>

          <div className="summary-card">
            <div className="card-icon time-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
              </svg>
            </div>
            <div className="card-info">
              <span className="card-value">{mockData.summary.avgDuration}</span>
              <span className="card-label">Avg Duration</span>
            </div>
            <div className="card-trend down">-0.3s</div>
          </div>

          <div className="summary-card">
            <div className="card-icon today-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <path d="M16 2v4M8 2v4M3 10h18"/>
              </svg>
            </div>
            <div className="card-info">
              <span className="card-value">{mockData.summary.testsToday}</span>
              <span className="card-label">Tests Today</span>
            </div>
            <div className="card-trend up">+8</div>
          </div>
        </div>

        <div className="charts-grid">
          {/* Weekly Trend Chart */}
          <div className="chart-card wide">
            <div className="chart-header">
              <h3>Test Results Trend</h3>
              <div className="chart-legend">
                <span className="legend-item"><span className="legend-dot passed"></span>Passed</span>
                <span className="legend-item"><span className="legend-dot failed"></span>Failed</span>
              </div>
            </div>
            <div className="bar-chart">
              {mockData.weeklyTrend.map((day, i) => (
                <div key={i} className="bar-group">
                  <div className="bar-container">
                    <div
                      className="bar passed"
                      style={{ height: `${(day.passed / maxWeeklyTotal) * 100}%` }}
                    >
                      <span className="bar-value">{day.passed}</span>
                    </div>
                    <div
                      className="bar failed"
                      style={{ height: `${(day.failed / maxWeeklyTotal) * 100}%` }}
                    >
                      {day.failed > 2 && <span className="bar-value">{day.failed}</span>}
                    </div>
                  </div>
                  <span className="bar-label">{day.day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Donut Chart - By Type */}
          <div className="chart-card">
            <div className="chart-header">
              <h3>Tests by Type</h3>
            </div>
            <div className="donut-chart-container">
              <div className="donut-chart">
                <svg viewBox="0 0 100 100">
                  {(() => {
                    let cumulative = 0
                    return mockData.byType.map((item, i) => {
                      const percent = (item.count / totalByType) * 100
                      const dashArray = `${percent} ${100 - percent}`
                      const rotation = cumulative * 3.6 - 90
                      cumulative += percent
                      return (
                        <circle
                          key={i}
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke={item.color}
                          strokeWidth="20"
                          strokeDasharray={dashArray}
                          strokeDashoffset="0"
                          transform={`rotate(${rotation} 50 50)`}
                          style={{ opacity: 0.9 }}
                        />
                      )
                    })
                  })()}
                </svg>
                <div className="donut-center">
                  <span className="donut-value">{totalByType}</span>
                  <span className="donut-label">Total</span>
                </div>
              </div>
              <div className="donut-legend">
                {mockData.byType.map((item, i) => (
                  <div key={i} className="donut-legend-item">
                    <span className="legend-color" style={{ background: item.color }}></span>
                    <span className="legend-name">{item.type}</span>
                    <span className="legend-value">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Horizontal Bar - By Priority */}
          <div className="chart-card">
            <div className="chart-header">
              <h3>Results by Priority</h3>
            </div>
            <div className="horizontal-bars">
              {mockData.byPriority.map((item, i) => {
                const total = item.passed + item.failed
                const passPercent = (item.passed / total) * 100
                return (
                  <div key={i} className="h-bar-row">
                    <span className="h-bar-label">{item.priority}</span>
                    <div className="h-bar-track">
                      <div className="h-bar-fill passed" style={{ width: `${passPercent}%` }}></div>
                      <div className="h-bar-fill failed" style={{ width: `${100 - passPercent}%` }}></div>
                    </div>
                    <span className="h-bar-value">{item.passed}/{total}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Device Coverage */}
          <div className="chart-card">
            <div className="chart-header">
              <h3>Device Coverage</h3>
            </div>
            <div className="device-list">
              {mockData.devices.map((device, i) => (
                <div key={i} className="device-row">
                  <div className="device-info">
                    <span className="device-name">{device.name}</span>
                    <span className="device-tests">{device.tests} tests</span>
                  </div>
                  <div className="device-progress">
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{ width: `${device.passRate}%` }}
                      ></div>
                    </div>
                    <span className="progress-value">{device.passRate}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="chart-card">
            <div className="chart-header">
              <h3>Recent Activity</h3>
              <button className="view-all-btn">View All</button>
            </div>
            <div className="activity-list">
              {mockData.recentRuns.map((run, i) => (
                <div key={i} className="activity-row">
                  <div className={`activity-status ${run.status}`}>
                    {run.status === 'passed' ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M5 12l5 5L20 7"/>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    )}
                  </div>
                  <div className="activity-info">
                    <span className="activity-id">{run.id}</span>
                    <span className="activity-name">{run.name}</span>
                  </div>
                  <span className="activity-time">{run.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
