export default function QuestionCard({
  question,
  selections,
  onToggle,
  onSkip,
  onSubmit,
}) {
  if (!question) return null

  return (
    <div className="msg assistant question-msg">
      <span className="msg-role">AI</span>
      <p className="question-text">{question.question}</p>
      {question.multi && <span className="question-hint">Select one or more</span>}
      <div className="question-options">
        {question.options.map((opt) => (
          <button
            key={opt}
            className={`question-option ${selections.includes(opt) ? 'selected' : ''}`}
            onClick={() => onToggle(opt)}
          >
            {opt}
          </button>
        ))}
      </div>
      <div className="question-actions">
        <button className="question-skip" onClick={onSkip}>
          Skip
        </button>
        <button
          className="question-confirm"
          onClick={onSubmit}
          disabled={selections.length === 0}
        >
          Confirm
        </button>
      </div>
    </div>
  )
}
