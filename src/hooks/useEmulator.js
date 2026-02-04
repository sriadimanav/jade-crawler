import { useState, useRef, useEffect, useCallback } from 'react'

export function useEmulator() {
  const [showEmulator, setShowEmulator] = useState(false)
  const [emulatorImg, setEmulatorImg] = useState(null)
  const [devicePinned, setDevicePinned] = useState(false)
  const [deviceConnected, setDeviceConnected] = useState(false)
  const [emulatorPos, setEmulatorPos] = useState({ x: window.innerWidth - 300, y: 80 })

  const emulatorDragging = useRef(false)
  const emulatorOffset = useRef({ x: 0, y: 0 })
  const dragListeners = useRef({ onMove: null, onUp: null })

  const handleConnect = () => {
    setDeviceConnected(true)
    setShowEmulator(true)
    setDevicePinned(true)
    setEmulatorImg('/phone-home.svg')
  }

  const handleDisconnect = () => {
    setDeviceConnected(false)
    setShowEmulator(false)
    setDevicePinned(false)
  }

  const onEmulatorDragStart = useCallback((e) => {
    emulatorDragging.current = true
    emulatorOffset.current = { x: e.clientX - emulatorPos.x, y: e.clientY - emulatorPos.y }

    const onMove = (ev) => {
      if (!emulatorDragging.current) return
      setEmulatorPos({
        x: ev.clientX - emulatorOffset.current.x,
        y: ev.clientY - emulatorOffset.current.y,
      })
    }

    const onUp = () => {
      emulatorDragging.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      dragListeners.current = { onMove: null, onUp: null }
    }

    dragListeners.current = { onMove, onUp }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [emulatorPos.x, emulatorPos.y])

  // Cleanup drag listeners on unmount
  useEffect(() => {
    return () => {
      if (dragListeners.current.onMove) {
        window.removeEventListener('mousemove', dragListeners.current.onMove)
        window.removeEventListener('mouseup', dragListeners.current.onUp)
      }
    }
  }, [])

  const pinToSidebar = () => setDevicePinned(true)
  const unpinFromSidebar = () => {
    setDevicePinned(false)
    setShowEmulator(true)
  }

  return {
    showEmulator,
    setShowEmulator,
    emulatorImg,
    setEmulatorImg,
    devicePinned,
    setDevicePinned,
    deviceConnected,
    setDeviceConnected,
    emulatorPos,
    handleConnect,
    handleDisconnect,
    onEmulatorDragStart,
    pinToSidebar,
    unpinFromSidebar,
  }
}
