import { useState, useRef, useEffect, useCallback } from 'react'
import backIcon from '../assets/back.svg'

// Generate curved path between two points
function generatePath(from, to) {
  const midX = (from.x + to.x) / 2
  const dx = Math.abs(to.x - from.x)
  const controlOffset = Math.min(dx * 0.5, 100)

  return `M ${from.x} ${from.y} C ${from.x + controlOffset} ${from.y}, ${to.x - controlOffset} ${to.y}, ${to.x} ${to.y}`
}

// Flow Node Component
function FlowNode({ node, variant, isSelected, onSelect, onDrag, onConnect, scale }) {
  const nodeRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0 })

  const handleMouseDown = (e) => {
    if (e.target.closest('.node-connector')) return
    e.stopPropagation()
    setIsDragging(true)
    dragStart.current = { x: e.clientX - node.x * scale, y: e.clientY - node.y * scale }
    onSelect(node.id)
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e) => {
      const newX = (e.clientX - dragStart.current.x) / scale
      const newY = (e.clientY - dragStart.current.y) / scale
      onDrag(node.id, newX, newY)
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
export default function FlowCanvas({ flow, variants, onBack, onSave, onUpdateFlow }) {
  const canvasRef = useRef(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [selectedNode, setSelectedNode] = useState(null)
  const [nodes, setNodes] = useState([])
  const [connections, setConnections] = useState([])
  const [isConnecting, setIsConnecting] = useState(null)
  const panStart = useRef({ x: 0, y: 0 })

  // Initialize nodes from flow steps
  useEffect(() => {
    if (!flow?.steps) return

    const initialNodes = flow.steps.map((step, i) => ({
      id: step.id,
      title: step.description?.split(' ').slice(0, 5).join(' ') + (step.description?.split(' ').length > 5 ? '...' : '') || `Step ${i + 1}`,
      description: step.description,
      variantId: step.variantId,
      tags: step.tags || [],
      x: 150 + (i % 3) * 320,
      y: 100 + Math.floor(i / 3) * 200,
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
  }, [flow])

  // Pan handlers
  const handleCanvasMouseDown = (e) => {
    if (e.target === canvasRef.current || e.target.classList.contains('canvas-grid')) {
      setIsPanning(true)
      panStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y }
      setSelectedNode(null)
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

  // Node drag handler
  const handleNodeDrag = useCallback((nodeId, x, y) => {
    setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, x, y } : n)))
  }, [])

  // Connection handler
  const handleConnect = useCallback((nodeId, side) => {
    if (!isConnecting) {
      setIsConnecting({ nodeId, side })
    } else if (isConnecting.nodeId !== nodeId) {
      // Create connection
      setConnections((prev) => [
        ...prev,
        { id: `conn-${Date.now()}`, from: isConnecting.nodeId, to: nodeId },
      ])
      setIsConnecting(null)
    } else {
      setIsConnecting(null)
    }
  }, [isConnecting])

  // Calculate connection paths
  const getConnectionPath = useCallback((conn) => {
    const fromNode = nodes.find((n) => n.id === conn.from)
    const toNode = nodes.find((n) => n.id === conn.to)
    if (!fromNode || !toNode) return null

    const from = { x: fromNode.x + 280, y: fromNode.y + 60 } // Right side
    const to = { x: toNode.x, y: toNode.y + 60 } // Left side

    return generatePath(from, to)
  }, [nodes])

  // Add new node
  const addNode = () => {
    const newNode = {
      id: `node-${Date.now()}`,
      title: 'New Step',
      description: 'Click to edit',
      variantId: variants[0]?.id,
      tags: [],
      x: 200 + offset.x * -1 / scale + Math.random() * 100,
      y: 200 + offset.y * -1 / scale + Math.random() * 100,
    }
    setNodes((prev) => [...prev, newNode])
  }

  // Delete selected node
  const deleteSelected = () => {
    if (!selectedNode) return
    setNodes((prev) => prev.filter((n) => n.id !== selectedNode))
    setConnections((prev) => prev.filter((c) => c.from !== selectedNode && c.to !== selectedNode))
    setSelectedNode(null)
  }

  // Get variant for a node
  const getVariant = (variantId) => variants.find((v) => v.id === variantId)

  // Variant colors
  const variantColors = {
    [variants[0]?.id]: '#22c55e',
    [variants[1]?.id]: '#3b82f6',
    [variants[2]?.id]: '#f59e0b',
    [variants[3]?.id]: '#8b5cf6',
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
          <button className="canvas-btn" onClick={addNode}>+ Add Node</button>
          <button className="canvas-btn danger" onClick={deleteSelected} disabled={!selectedNode}>Delete</button>
          <button className="canvas-btn primary" onClick={() => onSave?.({ ...flow, nodes, connections })}>Save</button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="canvas-toolbar">
        <button className="toolbar-btn" onClick={() => handleZoom(0.1)}>+</button>
        <span className="zoom-level">{Math.round(scale * 100)}%</span>
        <button className="toolbar-btn" onClick={() => handleZoom(-0.1)}>−</button>
        <div className="toolbar-divider" />
        <button className="toolbar-btn" onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }) }}>Reset</button>
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

      {/* Canvas */}
      <div
        ref={canvasRef}
        className={`flow-canvas ${isPanning ? 'panning' : ''} ${isConnecting ? 'connecting' : ''}`}
        onMouseDown={handleCanvasMouseDown}
        onWheel={handleWheel}
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
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="rgba(34, 197, 94, 0.6)" />
              </marker>
            </defs>
            {connections.map((conn) => {
              const path = getConnectionPath(conn)
              if (!path) return null
              const fromNode = nodes.find((n) => n.id === conn.from)
              const variant = getVariant(fromNode?.variantId)
              return (
                <path
                  key={conn.id}
                  d={path}
                  className="connection-path"
                  stroke={variant?.color || '#22c55e'}
                  markerEnd="url(#arrowhead)"
                />
              )
            })}
          </svg>

          {/* Nodes */}
          {nodes.map((node) => (
            <FlowNode
              key={node.id}
              node={node}
              variant={{ ...getVariant(node.variantId), color: getVariant(node.variantId)?.color || '#22c55e' }}
              isSelected={selectedNode === node.id}
              onSelect={setSelectedNode}
              onDrag={handleNodeDrag}
              onConnect={handleConnect}
              scale={scale}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
