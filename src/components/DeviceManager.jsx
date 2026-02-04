import { useState, useEffect } from 'react'

export default function DeviceManager({ variants, onUpdateVariant, onClose }) {
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Mock devices for development/demo
  const MOCK_DEVICES = [
    { id: 'emulator-5554', name: 'Pixel 6 API 33', type: 'android', status: 'online' },
    { id: 'emulator-5556', name: 'Pixel 4 API 30', type: 'android', status: 'online' },
    { id: 'iPhone-14-Pro', name: 'iPhone 14 Pro', type: 'ios', status: 'online' },
  ]

  // Fetch connected devices
  const fetchDevices = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/devices')
      if (!res.ok) throw new Error('Failed to fetch devices')
      const data = await res.json()
      const realDevices = data.devices || []
      // Use real devices if found, otherwise use mock devices for demo
      if (realDevices.length > 0) {
        setDevices(realDevices)
      } else {
        setError('No real devices found - showing demo devices')
        setDevices(MOCK_DEVICES)
      }
    } catch (err) {
      setError(err.message)
      // Mock devices for development
      setDevices(MOCK_DEVICES)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDevices()
  }, [])

  // Assign device to variant
  const assignDevice = (variantId, deviceId) => {
    const variant = variants.find(v => v.id === variantId)
    if (variant) {
      onUpdateVariant({ ...variant, deviceId })
    }
  }

  // Get assigned device for a variant
  const getAssignedDevice = (variantId) => {
    const variant = variants.find(v => v.id === variantId)
    return variant?.deviceId
  }

  // Check if device is assigned to another variant
  const isDeviceAssigned = (deviceId, excludeVariantId) => {
    return variants.some(v => v.deviceId === deviceId && v.id !== excludeVariantId)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="device-manager-panel" onClick={e => e.stopPropagation()}>
        <div className="device-manager-header">
          <div className="dm-title">
            <span className="dm-icon">📱</span>
            <h3>Device Assignment</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="device-manager-body">
          {/* Connected Devices Section */}
          <div className="dm-section">
            <div className="dm-section-header">
              <h4>Connected Devices</h4>
              <button className="refresh-btn" onClick={fetchDevices} disabled={loading}>
                {loading ? '↻ Scanning...' : '↻ Refresh'}
              </button>
            </div>

            {error && (
              <div className="dm-warning">
                <span>⚠️</span>
                <span>Could not detect devices. Using mock data for preview.</span>
              </div>
            )}

            {loading ? (
              <div className="dm-loading">Scanning for devices...</div>
            ) : devices.length === 0 ? (
              <div className="dm-empty">
                <span>No devices connected</span>
                <p>Connect Android emulators or iOS simulators to assign them to variants</p>
              </div>
            ) : (
              <div className="device-list">
                {devices.map(device => (
                  <div key={device.id} className={`device-card ${device.status}`}>
                    <div className="device-icon">
                      {device.type === 'android' ? '🤖' : '🍎'}
                    </div>
                    <div className="device-info">
                      <span className="device-name">{device.name}</span>
                      <span className="device-id">{device.id}</span>
                    </div>
                    <div className={`device-status ${device.status}`}>
                      {device.status === 'online' ? '● Online' : '○ Offline'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Variant Assignment Section */}
          <div className="dm-section">
            <div className="dm-section-header">
              <h4>Assign Devices to Variants</h4>
            </div>
            <p className="dm-hint">
              Each variant can be assigned to a specific device for parallel test execution.
            </p>

            <div className="variant-device-list">
              {variants.map(variant => {
                const assignedDeviceId = getAssignedDevice(variant.id)
                const assignedDevice = devices.find(d => d.id === assignedDeviceId)

                return (
                  <div key={variant.id} className="variant-device-row">
                    <div className="variant-info">
                      <span className="variant-icon">{variant.icon}</span>
                      <span className="variant-name">{variant.name}</span>
                    </div>
                    <div className="device-selector">
                      <select
                        value={assignedDeviceId || ''}
                        onChange={(e) => assignDevice(variant.id, e.target.value || null)}
                      >
                        <option value="">No device assigned</option>
                        {devices.filter(d => d.status === 'online').map(device => {
                          const assignedElsewhere = isDeviceAssigned(device.id, variant.id)
                          return (
                            <option
                              key={device.id}
                              value={device.id}
                              disabled={assignedElsewhere}
                            >
                              {device.type === 'android' ? '🤖' : '🍎'} {device.name}
                              {assignedElsewhere ? ' (assigned)' : ''}
                            </option>
                          )
                        })}
                      </select>
                      {assignedDevice && (
                        <span className={`assigned-status ${assignedDevice.status}`}>
                          ✓ {assignedDevice.name}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Instructions */}
          <div className="dm-section dm-instructions">
            <h4>Setup Instructions</h4>
            <div className="instruction-tabs">
              <div className="instruction-tab">
                <span className="tab-icon">🤖</span>
                <span>Android</span>
              </div>
            </div>
            <div className="instruction-content">
              <code>
                # List connected devices{'\n'}
                adb devices{'\n\n'}
                # Start emulator{'\n'}
                emulator -avd Pixel_6_API_33
              </code>
            </div>
          </div>
        </div>

        <div className="device-manager-footer">
          <span className="dm-status">
            {devices.filter(d => d.status === 'online').length} device(s) available
          </span>
          <button className="dm-done-btn" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}
