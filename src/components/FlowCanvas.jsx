import { useState, useRef, useEffect, useCallback } from 'react'
import backIcon from '../assets/back.svg'
import FlowExecutor from './FlowExecutor'

// Generate curved path between two points
function generatePath(from, to) {
  const dx = to.x - from.x
  const dy = to.y - from.y

  // Calculate control points for a smooth bezier curve
  const curvature = Math.min(Math.abs(dx) * 0.4, 120)

  return `M ${from.x} ${from.y} C ${from.x + curvature} ${from.y}, ${to.x - curvature} ${to.y}, ${to.x} ${to.y}`
}

// Flow Node Component
function FlowNode({ node, variant, isSelected, onSelect, onDrag, onConnect, onEdit, scale, nodeRef }) {
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const lastPos = useRef({ x: node.x, y: node.y })

  const handleMouseDown = (e) => {
    if (e.target.closest('.node-connector')) return
    e.stopPropagation()
    setIsDragging(true)
    dragStart.current = { x: e.clientX - node.x * scale, y: e.clientY - node.y * scale }
    lastPos.current = { x: node.x, y: node.y }
    // Pass shift key for multi-select
    onSelect(node.id, e.shiftKey || e.metaKey)
  }

  const handleDoubleClick = (e) => {
    e.stopPropagation()
    onEdit?.(node)
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e) => {
      const newX = (e.clientX - dragStart.current.x) / scale
      const newY = (e.clientY - dragStart.current.y) / scale
      const deltaX = newX - lastPos.current.x
      const deltaY = newY - lastPos.current.y
      lastPos.current = { x: newX, y: newY }
      onDrag(node.id, newX, newY, deltaX, deltaY)
    }

    const handleMouseUp = () => setIsDragging(false)

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, node.id, onDrag, scale])

  const variantColor = variant?.color || '#22c55e'

  return (
    <div
      ref={nodeRef}
      className={`flow-node ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
      style={{
        left: node.x,
        top: node.y,
        borderColor: variantColor,
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      {/* Connection points */}
      <div
        className="node-connector left"
        style={{ borderColor: variantColor }}
        onMouseDown={(e) => { e.stopPropagation(); onConnect(node.id, 'left') }}
      />
      <div
        className="node-connector right"
        style={{ borderColor: variantColor }}
        onMouseDown={(e) => { e.stopPropagation(); onConnect(node.id, 'right') }}
      />

      <div className="node-header">
        <span className="node-icon" style={{ background: variantColor }}>{variant?.icon || '📱'}</span>
        <span className="node-title">{node.title}</span>
      </div>

      {node.description && (
        <p className="node-description">{node.description}</p>
      )}

      {node.tags && node.tags.length > 0 && (
        <div className="node-tags">
          {node.tags.map((tag, i) => (
            <span key={i} className="node-tag" style={{ background: `${variantColor}20`, color: variantColor }}>{tag}</span>
          ))}
        </div>
      )}

      <div className="node-variant-label" style={{ color: variantColor }}>
        {variant?.name || 'Unknown'}
      </div>
    </div>
  )
}

// Main Flow Canvas Component
export default function FlowCanvas({ flow, variants, onBack, onSave }) {
  const canvasRef = useRef(null)
  const nodeRefs = useRef({})
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [selectedNodes, setSelectedNodes] = useState([])
  const [selectedConnection, setSelectedConnection] = useState(null)
  const [nodes, setNodes] = useState([])
  const [connections, setConnections] = useState([])
  const [isConnecting, setIsConnecting] = useState(null)
  const [editingNode, setEditingNode] = useState(null)
  const [showExecutor, setShowExecutor] = useState(false)
  const panStart = useRef({ x: 0, y: 0 })

  // Undo/Redo history
  const [history, setHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const isUndoRedo = useRef(false)

  // Save state to history
  const saveToHistory = useCallback((newNodes, newConnections) => {
    if (isUndoRedo.current) {
      isUndoRedo.current = false
      return
    }

    const newState = { nodes: newNodes, connections: newConnections }
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1)
      newHistory.push(newState)
      // Keep only last 50 states
      if (newHistory.length > 50) newHistory.shift()
      return newHistory
    })
    setHistoryIndex(prev => Math.min(prev + 1, 49))
  }, [historyIndex])

  // Undo
  const undo = useCallback(() => {
    if (historyIndex <= 0) return
    isUndoRedo.current = true
    const prevState = history[historyIndex - 1]
    setNodes(prevState.nodes)
    setConnections(prevState.connections)
    setHistoryIndex(prev => prev - 1)
    setSelectedNodes([])
    setSelectedConnection(null)
  }, [history, historyIndex])

  // Redo
  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return
    isUndoRedo.current = true
    const nextState = history[historyIndex + 1]
    setNodes(nextState.nodes)
    setConnections(nextState.connections)
    setHistoryIndex(prev => prev + 1)
    setSelectedNodes([])
    setSelectedConnection(null)
  }, [history, historyIndex])

  // Initialize nodes from flow steps
  useEffect(() => {
    if (!flow?.steps) return

    const initialNodes = flow.steps.map((step, i) => ({
      id: step.id,
      title: step.description?.split(' ').slice(0, 5).join(' ') + (step.description?.split(' ').length > 5 ? '...' : '') || `Step ${i + 1}`,
      description: step.description,
      variantId: step.variantId,
      tags: step.tags || [],
      x: 150 + (i % 3) * 350,
      y: 100 + Math.floor(i / 3) * 180,
      linkedTestCase: step.linkedTestCase,
    }))

    // Generate connections (sequential by default)
    const initialConnections = []
    for (let i = 0; i < initialNodes.length - 1; i++) {
      initialConnections.push({
        id: `conn-${i}`,
        from: initialNodes[i].id,
        to: initialNodes[i + 1].id,
      })
    }

    setNodes(initialNodes)
    setConnections(initialConnections)
    // Initialize history
    setHistory([{ nodes: initialNodes, connections: initialConnections }])
    setHistoryIndex(0)
  }, [flow])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger shortcuts when typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

      // Delete - remove selected nodes or connection
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedConnection) {
          deleteSelectedConnection()
        } else if (selectedNodes.length > 0) {
          deleteSelected()
        }
      }

      // Cmd/Ctrl + Z - Undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      }

      // Cmd/Ctrl + Shift + Z or Cmd/Ctrl + Y - Redo
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        redo()
      }

      // Cmd/Ctrl + A - Select all nodes
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault()
        setSelectedNodes(nodes.map(n => n.id))
        setSelectedConnection(null)
      }

      // Escape - deselect all
      if (e.key === 'Escape') {
        setSelectedNodes([])
        setSelectedConnection(null)
        setIsConnecting(null)
      }

      // Enter - edit selected node (only if single node selected)
      if (e.key === 'Enter' && selectedNodes.length === 1) {
        const node = nodes.find(n => n.id === selectedNodes[0])
        if (node) setEditingNode(node)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedNodes, selectedConnection, undo, redo, nodes])

  // Pan handlers
  const handleCanvasMouseDown = (e) => {
    if (e.target === canvasRef.current || e.target.classList.contains('canvas-grid')) {
      setIsPanning(true)
      panStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y }
      setSelectedNodes([])
      setSelectedConnection(null)
    }
  }

  useEffect(() => {
    if (!isPanning) return

    const handleMouseMove = (e) => {
      setOffset({
        x: e.clientX - panStart.current.x,
        y: e.clientY - panStart.current.y,
      })
    }

    const handleMouseUp = () => setIsPanning(false)

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isPanning])

  // Zoom handlers
  const handleZoom = useCallback((delta) => {
    setScale((prev) => Math.min(Math.max(prev + delta, 0.25), 2))
  }, [])

  const handleWheel = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      handleZoom(e.deltaY > 0 ? -0.1 : 0.1)
    }
  }, [handleZoom])

  // Node drag handler - moves all selected nodes together
  const handleNodeDrag = useCallback((nodeId, x, y, deltaX, deltaY) => {
    setNodes((prev) => {
      // If the dragged node is in selection, move all selected nodes
      if (selectedNodes.includes(nodeId) && selectedNodes.length > 1) {
        return prev.map((n) => {
          if (selectedNodes.includes(n.id)) {
            return { ...n, x: n.x + deltaX, y: n.y + deltaY }
          }
          return n
        })
      }
      // Otherwise just move the single node
      return prev.map((n) => (n.id === nodeId ? { ...n, x, y } : n))
    })
  }, [selectedNodes])

  // Save to history after drag ends
  const handleNodeDragEnd = useCallback(() => {
    saveToHistory(nodes, connections)
  }, [nodes, connections, saveToHistory])

  // Connection handler
  const handleConnect = useCallback((nodeId, side) => {
    if (!isConnecting) {
      setIsConnecting({ nodeId, side })
    } else if (isConnecting.nodeId !== nodeId) {
      // Determine from/to based on sides
      const fromId = isConnecting.side === 'right' ? isConnecting.nodeId : nodeId
      const toId = isConnecting.side === 'right' ? nodeId : isConnecting.nodeId

      // Check if connection already exists
      const exists = connections.some(c => c.from === fromId && c.to === toId)
      if (!exists) {
        const newConnections = [
          ...connections,
          { id: `conn-${Date.now()}`, from: fromId, to: toId },
        ]
        setConnections(newConnections)
        saveToHistory(nodes, newConnections)
      }
      setIsConnecting(null)
    } else {
      setIsConnecting(null)
    }
  }, [isConnecting, connections, nodes, saveToHistory])

  // Get node height from ref or default
  const getNodeHeight = (nodeId) => {
    const ref = nodeRefs.current[nodeId]
    return ref?.offsetHeight || 100
  }

  // Calculate connection paths
  const getConnectionPath = useCallback((conn) => {
    const fromNode = nodes.find((n) => n.id === conn.from)
    const toNode = nodes.find((n) => n.id === conn.to)
    if (!fromNode || !toNode) return null

    const nodeWidth = 280
    const arrowLength = 10 // Arrow marker length

    // Get actual node heights from refs
    const fromHeight = getNodeHeight(fromNode.id)
    const toHeight = getNodeHeight(toNode.id)

    // Connector CSS: 14px circle, positioned with left/right: -8px, top: 50%
    // So connector center is 1px outside the node edge (8px outside - 7px radius)
    // Right connector center: node.x + nodeWidth + 1
    // Left connector center: node.x - 1
    const from = {
      x: fromNode.x + nodeWidth + 1,
      y: fromNode.y + fromHeight / 2
    }
    // End the path before the connector, leaving room for the arrow
    const to = {
      x: toNode.x - 1 - arrowLength,
      y: toNode.y + toHeight / 2
    }

    return generatePath(from, to)
  }, [nodes])

  // Handle connection click
  const handleConnectionClick = (e, connId) => {
    e.stopPropagation()
    setSelectedConnection(connId)
    setSelectedNodes([])
  }

  // Handle node selection (supports multi-select with shift/cmd)
  const handleNodeSelect = useCallback((nodeId, addToSelection) => {
    if (addToSelection) {
      // Toggle node in selection
      setSelectedNodes(prev =>
        prev.includes(nodeId)
          ? prev.filter(id => id !== nodeId)
          : [...prev, nodeId]
      )
    } else {
      // Single select
      setSelectedNodes([nodeId])
    }
    setSelectedConnection(null)
  }, [])

  // Add new node
  const addNode = () => {
    const newNode = {
      id: `node-${Date.now()}`,
      title: 'New Step',
      description: 'Double-click to edit',
      variantId: variants[0]?.id,
      tags: [],
      x: 200 + offset.x * -1 / scale + Math.random() * 100,
      y: 200 + offset.y * -1 / scale + Math.random() * 100,
    }
    const newNodes = [...nodes, newNode]
    setNodes(newNodes)
    saveToHistory(newNodes, connections)
  }

  // Delete selected nodes
  const deleteSelected = () => {
    if (selectedNodes.length === 0) return
    const newNodes = nodes.filter((n) => !selectedNodes.includes(n.id))
    const newConnections = connections.filter((c) => !selectedNodes.includes(c.from) && !selectedNodes.includes(c.to))
    setNodes(newNodes)
    setConnections(newConnections)
    setSelectedNodes([])
    saveToHistory(newNodes, newConnections)
  }

  // Delete selected connection
  const deleteSelectedConnection = () => {
    if (!selectedConnection) return
    const newConnections = connections.filter((c) => c.id !== selectedConnection)
    setConnections(newConnections)
    setSelectedConnection(null)
    saveToHistory(nodes, newConnections)
  }

  // Get variant for a node
  const getVariant = (variantId) => variants.find((v) => v.id === variantId)

  // Handle node edit
  const handleEditNode = (node) => {
    setEditingNode(node)
  }

  const handleSaveNode = (updatedNode) => {
    const newNodes = nodes.map(n => n.id === updatedNode.id ? updatedNode : n)
    setNodes(newNodes)
    setEditingNode(null)
    saveToHistory(newNodes, connections)
  }

  // Assign colors to variants
  variants.forEach((v, i) => {
    if (!v.color) v.color = ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'][i % 5]
  })

  return (
    <div className="flow-canvas-container">
      {/* Header */}
      <div className="flow-canvas-header">
        <div className="header-left">
          <button className="back-btn" onClick={onBack}>
            <img src={backIcon} alt="Back" />
          </button>
          <span className="flow-canvas-title">{flow?.name || 'Untitled Flow'}</span>
        </div>
        <div className="header-actions">
          <button className="canvas-btn" onClick={undo} disabled={historyIndex <= 0} title="Undo (Cmd+Z)">↩ Undo</button>
          <button className="canvas-btn" onClick={redo} disabled={historyIndex >= history.length - 1} title="Redo (Cmd+Shift+Z)">↪ Redo</button>
          <button className="canvas-btn" onClick={addNode}>+ Add Node</button>
          <button
            className="canvas-btn danger"
            onClick={selectedConnection ? deleteSelectedConnection : deleteSelected}
            disabled={selectedNodes.length === 0 && !selectedConnection}
          >
            Delete{selectedNodes.length > 1 ? ` (${selectedNodes.length})` : ''}
          </button>
          <button className="canvas-btn primary" onClick={() => onSave?.({ ...flow, nodes, connections })}>Save</button>
          <button
            className="canvas-btn run"
            onClick={() => setShowExecutor(true)}
            disabled={nodes.length === 0}
          >
            ▶ Run Flow
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="canvas-toolbar">
        <button className="toolbar-btn" onClick={() => handleZoom(0.1)}>+</button>
        <span className="zoom-level">{Math.round(scale * 100)}%</span>
        <button className="toolbar-btn" onClick={() => handleZoom(-0.1)}>−</button>
        <div className="toolbar-divider" />
        <button className="toolbar-btn reset" onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }) }}>Reset</button>
      </div>

      {/* Variant Legend */}
      <div className="canvas-legend">
        {variants.map((v) => (
          <div key={v.id} className="legend-item">
            <span className="legend-dot" style={{ background: v.color }}></span>
            <span>{v.icon} {v.name}</span>
          </div>
        ))}
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="canvas-shortcuts">
        <span>Shift+Click: Multi-select</span>
        <span>⌘A: Select all</span>
        <span>⌘Z: Undo</span>
        <span>⌘⇧Z: Redo</span>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className={`flow-canvas ${isPanning ? 'panning' : ''} ${isConnecting ? 'connecting' : ''}`}
        onMouseDown={handleCanvasMouseDown}
        onWheel={handleWheel}
        onMouseUp={handleNodeDragEnd}
      >
        <div
          className="canvas-content"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          }}
        >
          {/* Grid */}
          <div className="canvas-grid" />

          {/* Connections (SVG) */}
          <svg className="connections-layer">
            <defs>
              {/* Create markers for each unique color */}
              {[...new Set(connections.map(conn => {
                const fromNode = nodes.find(n => n.id === conn.from)
                return getVariant(fromNode?.variantId)?.color || '#22c55e'
              }))].map(color => (
                <marker
                  key={color}
                  id={`arrow-${color.replace('#', '')}`}
                  markerWidth="10"
                  markerHeight="10"
                  refX="0"
                  refY="5"
                  orient="auto"
                  markerUnits="userSpaceOnUse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 Z" fill={color} />
                </marker>
              ))}
              {/* Selected state marker */}
              <marker
                id="arrow-selected"
                markerWidth="10"
                markerHeight="10"
                refX="0"
                refY="5"
                orient="auto"
                markerUnits="userSpaceOnUse"
              >
                <path d="M 0 0 L 10 5 L 0 10 Z" fill="#ffffff" />
              </marker>
            </defs>
            {connections.map((conn) => {
              const path = getConnectionPath(conn)
              if (!path) return null
              const fromNode = nodes.find((n) => n.id === conn.from)
              const variant = getVariant(fromNode?.variantId)
              const color = variant?.color || '#22c55e'
              const isSelected = selectedConnection === conn.id
              return (
                <g key={conn.id}>
                  {/* Invisible wider path for easier clicking */}
                  <path
                    d={path}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="20"
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => handleConnectionClick(e, conn.id)}
                  />
                  {/* Visible path */}
                  <path
                    d={path}
                    className={`connection-path ${isSelected ? 'selected' : ''}`}
                    stroke={isSelected ? '#ffffff' : color}
                    strokeWidth={isSelected ? 3 : 2.5}
                    markerEnd={isSelected ? 'url(#arrow-selected)' : `url(#arrow-${color.replace('#', '')})`}
                    onClick={(e) => handleConnectionClick(e, conn.id)}
                  />
                </g>
              )
            })}
          </svg>

          {/* Nodes */}
          {nodes.map((node) => (
            <FlowNode
              key={node.id}
              node={node}
              variant={{ ...getVariant(node.variantId), color: getVariant(node.variantId)?.color || '#22c55e' }}
              isSelected={selectedNodes.includes(node.id)}
              onSelect={handleNodeSelect}
              onDrag={handleNodeDrag}
              onConnect={handleConnect}
              onEdit={handleEditNode}
              scale={scale}
              nodeRef={el => { if (el) nodeRefs.current[node.id] = el }}
            />
          ))}
        </div>
      </div>

      {/* Node Edit Modal */}
      {editingNode && (
        <NodeEditor
          node={editingNode}
          variants={variants}
          onSave={handleSaveNode}
          onClose={() => setEditingNode(null)}
        />
      )}

      {/* Flow Executor Modal */}
      {showExecutor && (
        <FlowExecutor
          flow={{ ...flow, steps: nodes.map(n => ({ id: n.id, variantId: n.variantId, description: n.description || n.title, linkedTestCase: n.linkedTestCase, deviceId: n.deviceId })) }}
          variants={variants}
          onClose={() => setShowExecutor(false)}
          onComplete={(result) => console.log('Flow completed:', result)}
        />
      )}
    </div>
  )
}

// Mock devices for node editor
const MOCK_DEVICES = [
  { id: 'emulator-5554', name: 'Pixel 6 API 33', type: 'android', status: 'online' },
  { id: 'emulator-5556', name: 'Pixel 4 API 30', type: 'android', status: 'online' },
  { id: 'iPhone-14-Pro', name: 'iPhone 14 Pro', type: 'ios', status: 'online' },
]

// Node Editor Modal
function NodeEditor({ node, variants, onSave, onClose }) {
  const [title, setTitle] = useState(node.title || '')
  const [description, setDescription] = useState(node.description || '')
  const [variantId, setVariantId] = useState(node.variantId || variants[0]?.id)
  const [deviceId, setDeviceId] = useState(node.deviceId || '')
  const [devices, setDevices] = useState([])
  const [loadingDevices, setLoadingDevices] = useState(true)

  // Fetch devices
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const res = await fetch('/api/devices')
        if (res.ok) {
          const data = await res.json()
          if (data.devices?.length > 0) {
            setDevices(data.devices)
          } else {
            setDevices(MOCK_DEVICES)
          }
        } else {
          setDevices(MOCK_DEVICES)
        }
      } catch {
        setDevices(MOCK_DEVICES)
      } finally {
        setLoadingDevices(false)
      }
    }
    fetchDevices()
  }, [])

  // Handle Escape and Enter keys
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSave()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [title, description, variantId, deviceId])

  const handleSave = () => {
    onSave({
      ...node,
      title: title.trim() || 'Untitled',
      description: description.trim(),
      variantId,
      deviceId: deviceId || null
    })
  }

  const selectedVariant = variants.find(v => v.id === variantId)

  return (
    <>
      <div className="node-editor-backdrop" onClick={onClose} />
      <div className="node-editor-modal">
        <div className="node-editor-header">
          <h3>Edit Node</h3>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>
        <div className="node-editor-body">
          <div className="node-field">
            <label>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Step title..."
              autoFocus
            />
          </div>
          <div className="node-field">
            <label>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Step description..."
              rows={3}
            />
          </div>
          <div className="node-fields-row">
            <div className="node-field">
              <label>Variant</label>
              <select value={variantId} onChange={(e) => setVariantId(e.target.value)}>
                {variants.map(v => (
                  <option key={v.id} value={v.id}>{v.icon} {v.name}</option>
                ))}
              </select>
            </div>
            <div className="node-field">
              <label>Device {selectedVariant?.deviceId && <span className="inherited-hint">(variant default)</span>}</label>
              <select
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                disabled={loadingDevices}
              >
                <option value="">
                  {selectedVariant?.deviceId
                    ? `Inherit from variant`
                    : 'Select device...'}
                </option>
                {devices.filter(d => d.status === 'online').map(device => (
                  <option key={device.id} value={device.id}>
                    {device.type === 'android' ? '🤖' : '🍎'} {device.name}
                  </option>
                ))}
              </select>
              {selectedVariant?.deviceId && !deviceId && (
                <span className="device-inherited">
                  → {devices.find(d => d.id === selectedVariant.deviceId)?.name || selectedVariant.deviceId}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="node-editor-footer">
          <span className="editor-hint">⌘+Enter to save</span>
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
          <button className="save-btn" onClick={handleSave}>Save</button>
        </div>
      </div>
    </>
  )
}
