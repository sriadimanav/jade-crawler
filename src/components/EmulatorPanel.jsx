export function FloatingEmulator({
  show,
  position,
  emulatorImg,
  onDragStart,
  onPin,
  onClose,
}) {
  if (!show) return null

  return (
    <div className="emulator-floating" style={{ left: position.x, top: position.y }}>
      <div className="emulator-floating-header" onMouseDown={onDragStart}>
        <span>Device Preview</span>
        <div className="emulator-header-actions">
          <button onClick={onPin} className="emulator-pin-btn">Pin</button>
          <button onClick={onClose} className="emulator-close-btn">×</button>
        </div>
      </div>
      <div className="emulator-frame">
        <div className="emulator-notch"></div>
        {emulatorImg ? (
          <img src={emulatorImg} alt="Screen" className="emulator-screen" />
        ) : (
          <div className="emulator-placeholder">
            <span>No device connected</span>
          </div>
        )}
        <div className="emulator-home-bar"></div>
      </div>
    </div>
  )
}

export function PinnedEmulator({
  emulatorImg,
  screenshots,
  onUnpin,
  onSelectScreen,
}) {
  return (
    <>
      <div className="screenshots-header">
        <span>Device Preview</span>
        <button className="unpin-btn" onClick={onUnpin}>Unpin</button>
      </div>
      <div className="pinned-device-view">
        <div className="pinned-device-frame">
          <div className="emulator-notch"></div>
          {emulatorImg ? (
            <img src={emulatorImg} alt="Screen" className="emulator-screen" />
          ) : (
            <div className="emulator-placeholder">
              <span>No device connected</span>
            </div>
          )}
          <div className="emulator-home-bar"></div>
        </div>
        {screenshots.length > 0 && (
          <div className="pinned-thumbs">
            {screenshots.map((s, i) => (
              <div
                key={i}
                className={`pinned-thumb ${emulatorImg === s.url ? 'active' : ''}`}
                onClick={() => onSelectScreen(s.url)}
              >
                <div className="screenshot-badge">{i + 1}</div>
                <img src={s.url} alt={s.label} />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

export function ScreenshotsList({ screenshots, onSelect }) {
  return (
    <>
      <div className="screenshots-header">
        <span>Screenshots ({screenshots.length})</span>
      </div>
      <div className="screenshots-sections">
        {screenshots.length > 0 ? (
          <div className="screenshots-grid">
            {screenshots.map((s, i) => (
              <div
                key={i}
                className="screenshot-item"
                onClick={() => onSelect(s)}
              >
                <div className="screenshot-badge">{i + 1}</div>
                <img src={s.url} alt={s.label} />
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state-small">No screenshots yet</div>
        )}
      </div>
    </>
  )
}
