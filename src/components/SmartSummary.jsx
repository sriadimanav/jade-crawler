import { useState } from 'react'

// Threshold for when to show smart summary (character count)
const LONG_MESSAGE_THRESHOLD = 400

// Extract first sentence or first ~150 chars as summary
function extractSummary(text) {
  const firstSentence = text.match(/^[^.!?]+[.!?]/)
  if (firstSentence && firstSentence[0].length < 200) {
    return firstSentence[0].trim()
  }
  const truncated = text.slice(0, 150)
  const lastSpace = truncated.lastIndexOf(' ')
  return truncated.slice(0, lastSpace) + '...'
}

// Extract bullet points if any exist
function extractBullets(text) {
  const bulletRegex = /^[\s]*[-•*]\s+(.+)$/gm
  const matches = []
  let match
  while ((match = bulletRegex.exec(text)) !== null && matches.length < 3) {
    matches.push(match[1].trim())
  }
  return matches
}

export function isLongMessage(text) {
  return text && text.length > LONG_MESSAGE_THRESHOLD
}

export default function SmartSummary({ text }) {
  const [expanded, setExpanded] = useState(false)

  if (!text || text.length <= LONG_MESSAGE_THRESHOLD) {
    return <p>{text}</p>
  }

  const summary = extractSummary(text)
  const bullets = extractBullets(text)

  if (expanded) {
    return (
      <div className="smart-summary expanded">
        <p>{text}</p>
        <button className="read-more-btn" onClick={() => setExpanded(false)}>
          Show less <span className="chevron up">‹</span>
        </button>
      </div>
    )
  }

  return (
    <div className="smart-summary">
      <div className="summary-header">
        <span className="summary-icon">⚡</span>
        <span className="summary-title">Smart Summary</span>
      </div>
      <p className="summary-text">{summary}</p>
      {bullets.length > 0 && (
        <ul className="summary-bullets">
          {bullets.map((bullet, i) => (
            <li key={i}><strong>{bullet.split(':')[0]}:</strong> {bullet.split(':').slice(1).join(':') || bullet}</li>
          ))}
        </ul>
      )}
      <button className="read-more-btn" onClick={() => setExpanded(true)}>
        Read more <span className="chevron">›</span>
      </button>
    </div>
  )
}
