import { useState, useRef, useEffect } from 'react'
import './App.css'
import { analyzeScreenshots, generateQuestions } from './ai'
import { exportProjectJSON, exportTestCasesCSV, exportTestCasesPDF } from './exportUtils'
import ProjectScreen from './ProjectScreen'
import TestRunner from './TestRunner'
import TestSuiteView from './TestSuiteView'
import AnalyticsDashboard from './AnalyticsDashboard'
import backIcon from './assets/back.svg'

// Custom hooks
import { useScreenshots, useEmulator, useChat, useTestGeneration } from './hooks'

// Components
import { QuestionCard, FloatingEmulator, PinnedEmulator, ScreenshotsList, SmartSummary, isLongMessage, CollapsibleTestCases, VariantTabs, VariantEditor, CrossVariantFlows, FlowCanvas } from './components'

// Pre-bundled app screenshots for emulator demo
import img1 from './assets/1_landing_page.png'
import img2 from './assets/2_phone_number_input_screen.png'
import img3 from './assets/3_otp_verification_screen.png'
import img4 from './assets/4_accept_consent_screen.png'
import img5 from './assets/5_home_screen.png'
import img6 from './assets/6_progress_stepper_screen.png'
import img7 from './assets/7_property_details_screen.png'
import img8 from './assets/8_offer_screen.png'

const APP_SCREENS = [
  { url: img1, name: '1_landing_page.png', label: 'landing page' },
  { url: img2, name: '2_phone_number_input_screen.png', label: 'phone number input screen' },
  { url: img3, name: '3_otp_verification_screen.png', label: 'otp verification screen' },
  { url: img4, name: '4_accept_consent_screen.png', label: 'accept consent screen' },
  { url: img5, name: '5_home_screen.png', label: 'home screen' },
  { url: img6, name: '6_progress_stepper_screen.png', label: 'journey progress stepper screen' },
  { url: img7, name: '7_property_details_screen.png', label: 'property details form screen' },
  { url: img8, name: '8_offer_screen.png', label: 'offer screen' },
]

function App() {
  // View state
  const [currentView, setCurrentView] = useState('projects')
  const [projectName, setProjectName] = useState('')
  const [previousView, setPreviousView] = useState('workspace')

  // App state
  const [appName, setAppName] = useState('')
  const [waitingForAppName, setWaitingForAppName] = useState(false)
  const [selectedTestCase, setSelectedTestCase] = useState(null)
  const [runQueue, setRunQueue] = useState([])
  const [runHistory, setRunHistory] = useState({})

  // Reusable modules
  const [reusableModules, setReusableModules] = useState([])

  // Variants & Cross-variant flows
  const [variants, setVariants] = useState([
    { id: 'default', name: 'Main App', icon: '📱', owner: '', description: '', screens: [], testCases: [], messages: [], mobileScreenshots: [], desktopScreenshots: [] }
  ])
  const [activeVariant, setActiveVariant] = useState(null)
  const prevVariantRef = useRef(null)
  const [crossVariantFlows, setCrossVariantFlows] = useState([
    // Demo flow for testing
    {
      id: 'demo-flow-1',
      name: 'Order Delivery E2E',
      description: 'Complete order flow across User and Driver apps',
      steps: [
        { id: 's1', variantId: 'default', description: 'User opens app and browses menu', tags: ['User App'] },
        { id: 's2', variantId: 'default', description: 'User adds items to cart', tags: ['User App'] },
        { id: 's3', variantId: 'default', description: 'User completes payment', tags: ['User App', 'Payment'] },
        { id: 's4', variantId: 'default', description: 'Driver receives order notification', tags: ['Driver App'] },
        { id: 's5', variantId: 'default', description: 'Driver accepts and picks up order', tags: ['Driver App'] },
        { id: 's6', variantId: 'default', description: 'User tracks delivery in real-time', tags: ['User App', 'Tracking'] },
      ],
    },
  ])
  const [showVariantEditor, setShowVariantEditor] = useState(false)
  const [editingVariant, setEditingVariant] = useState(null)
  const [showCrossFlows, setShowCrossFlows] = useState(false)
  const [selectedFlow, setSelectedFlow] = useState(null)

  // UI state
  const [toast, setToast] = useState(null)
  const [showClearPrompt, setShowClearPrompt] = useState(false)
  const [bellNotification, setBellNotification] = useState(null)
  const [showBellPopup, setShowBellPopup] = useState(false)

  // Custom hooks
  const screenshots = useScreenshots(projectName)
  const emulator = useEmulator()
  const chat = useChat()
  const testGen = useTestGeneration()

  const autoSaveTimer = useRef(null)
  const isLoadingProject = useRef(false)

  // ── Effects ──

  // Initialize activeVariant on mount
  useEffect(() => {
    if (!activeVariant && variants.length > 0) {
      setActiveVariant(variants[0])
    }
  }, [])

  // Handle variant switching - save/load per-variant data
  useEffect(() => {
    if (!activeVariant) return

    const prevVariant = prevVariantRef.current

    // Save current data to previous variant before switching
    if (prevVariant && prevVariant.id !== activeVariant.id) {
      setVariants(prev => prev.map(v =>
        v.id === prevVariant.id
          ? {
              ...v,
              messages: chat.messages,
              mobileScreenshots: screenshots.mobileScreenshots,
              desktopScreenshots: screenshots.desktopScreenshots
            }
          : v
      ))
    }

    // Load data from new active variant
    const variantData = variants.find(v => v.id === activeVariant.id)
    if (variantData) {
      chat.setMessages(variantData.messages || [])
      screenshots.setScreenshots(variantData.mobileScreenshots || [], variantData.desktopScreenshots || [])
    }

    prevVariantRef.current = activeVariant
  }, [activeVariant?.id])

  // Auto-scroll chat
  useEffect(() => {
    const el = chat.chatMessagesRef.current
    if (!el) return
    const scroll = () => { el.scrollTop = el.scrollHeight }
    scroll()
    const t = setTimeout(scroll, 300)
    return () => clearTimeout(t)
  }, [chat.messages, testGen.currentQ, testGen.generating, currentView])

  // Auto re-analyze when screenshots change (skip on project load)
  useEffect(() => {
    // Skip auto-reanalyze when loading a project
    if (isLoadingProject.current) {
      isLoadingProject.current = false
      return
    }
    if (!testGen.allTestCases.length || testGen.generating || !testGen.analysisContext) return
    if (screenshots.totalCount === 0) return

    clearTimeout(testGen.reanalyzeTimer.current)
    testGen.reanalyzeTimer.current = setTimeout(async () => {
      const allScreenshots = screenshots.getAllScreenshots()
      testGen.setGenerating(true)
      chat.addMessage('assistant', 'Screenshots changed — re-analyzing your app flow...')

      const analysis = await testGen.runAnalysis(allScreenshots, chat.getUserContext(), chat.addMessage)
      await testGen.runGeneration(analysis, testGen.collectedAnswers, chat.addMessage)
    }, 1500)

    return () => clearTimeout(testGen.reanalyzeTimer.current)
  }, [screenshots.mobileScreenshots, screenshots.desktopScreenshots])

  // Auto-save
  useEffect(() => {
    if (currentView !== 'workspace' && currentView !== 'suite' && currentView !== 'runner') return
    if (!projectName) return

    clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(async () => {
      try {
        await exportProjectJSON(getProjectState())
      } catch (err) {
        if (import.meta.env.DEV) console.warn('Auto-save failed:', err)
      }
    }, 2000)

    return () => clearTimeout(autoSaveTimer.current)
  }, [
    chat.messages, screenshots.mobileScreenshots, screenshots.desktopScreenshots,
    testGen.collectedAnswers, testGen.analysisContext, testGen.allTestCases,
    runHistory, appName, testGen.pendingQuestions, testGen.currentQ, reusableModules
  ])

  // ── Handlers ──

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const handleConnect = () => {
    emulator.handleConnect()
    if (appName) {
      chat.addMessage('assistant', `Device connected: iPhone 14 Pro\n\nResuming testing for ${appName}.`)
    } else {
      chat.addMessage('assistant', 'Device connected: iPhone 14 Pro\n\nWhat is the name of the app you want to test?')
      setWaitingForAppName(true)
    }
  }

  const handleDisconnect = () => {
    emulator.handleDisconnect()
    setWaitingForAppName(false)
    chat.addMessage('assistant', 'Device disconnected. Connect a device to continue testing.')
  }

  const sendMessage = () => {
    if (!chat.input.trim()) return
    const text = chat.input.trim()
    chat.addMessage('user', text)
    chat.setInput('')

    if (waitingForAppName) {
      setAppName(text)
      setWaitingForAppName(false)
      chat.addMessage('assistant', `Got it — testing ${text}. Starting analysis...`)
      setTimeout(() => startGeneration(text), 500)
    }
  }

  const startGeneration = async (overrideAppName) => {
    const name = overrideAppName || appName

    testGen.setGenerating(true)
    emulator.setShowEmulator(true)
    emulator.setEmulatorImg(null)
    chat.addMessage('assistant', `Starting ${name}...`)
    await new Promise((r) => setTimeout(r, 1000))
    chat.addMessage('assistant', `${name} started successfully.`)

    await new Promise((r) => setTimeout(r, 600))
    chat.addMessage('assistant', 'Performing automated exploration — navigating through screens, tapping elements, and mapping the flow...')

    // Auto-capture screenshots
    await new Promise((r) => setTimeout(r, 500))
    chat.addMessage('assistant', 'Taking screenshots of each screen...')

    const captured = []
    for (let i = 0; i < APP_SCREENS.length; i++) {
      const screen = APP_SCREENS[i]
      emulator.setEmulatorImg(screen.url)
      await new Promise((r) => setTimeout(r, 700))
      captured.push(screen)
      screenshots.setMobileScreenshots([...captured])
      await new Promise((r) => setTimeout(r, 300))
    }

    await new Promise((r) => setTimeout(r, 400))
    chat.addMessage('assistant', `${APP_SCREENS.length} screens captured. Analyzing the flow...`)

    // Analyze
    const screenshotData = captured.map((s) => ({ ...s, device: 'mobile' }))
    const analysis = await analyzeScreenshots(screenshotData, chat.getUserContext())
    testGen.setAnalysisContext(analysis)

    chat.addMessage('assistant', 'Thinking...')
    await new Promise((r) => setTimeout(r, 800))
    chat.addMessage('assistant', analysis.summary)

    // Generate questions
    const questions = generateQuestions(analysis)
    testGen.setGenerating(false)

    if (questions.length > 0) {
      testGen.setPendingQuestions(questions.slice(1))
      testGen.setCurrentQ(questions[0])
      testGen.setCollectedAnswers([])
      testGen.setCurrentSelections([])
    } else {
      await testGen.runGeneration(analysis, [], chat.addMessage)
    }
  }

  const handleSubmitAnswer = () => {
    const result = testGen.submitAnswer(chat.addMessage)
    if (result?.done) {
      testGen.runGeneration(testGen.analysisContext, result.answers, chat.addMessage)
    }
  }

  const handleSkipQuestion = () => {
    const result = testGen.skipQuestion(chat.addMessage)
    if (result?.done) {
      testGen.runGeneration(testGen.analysisContext, testGen.collectedAnswers, chat.addMessage)
    }
  }

  const handleEditAnswer = (msgIndex) => {
    const truncateAt = testGen.editAnswer(msgIndex, chat.messages)
    if (truncateAt !== null) {
      chat.removeMessagesAfter(truncateAt)
    }
  }

  const reAnalyze = async () => {
    testGen.setGenerating(true)
    chat.addMessage('assistant', 'Re-analyzing your app for changes...')

    const captured = []
    for (let i = 0; i < APP_SCREENS.length; i++) {
      const screen = APP_SCREENS[i]
      emulator.setEmulatorImg(screen.url)
      await new Promise((r) => setTimeout(r, 400))
      captured.push(screen)
      screenshots.setMobileScreenshots([...captured])
    }

    await new Promise((r) => setTimeout(r, 500))
    chat.addMessage('assistant', 'Taking screenshots... done.')

    const screenshotData = captured.map((s) => ({ ...s, device: 'mobile' }))
    const analysis = await analyzeScreenshots(screenshotData, chat.getUserContext())
    testGen.setAnalysisContext(analysis)

    chat.addMessage('assistant', 'Some changes in UI have been detected.')
    await new Promise((r) => setTimeout(r, 600))
    chat.addMessage('assistant', analysis.summary)

    const questions = generateQuestions(analysis)
    testGen.setGenerating(false)

    if (questions.length > 0) {
      testGen.setPendingQuestions(questions.slice(1))
      testGen.setCurrentQ(questions[0])
      testGen.setCollectedAnswers([])
      testGen.setCurrentSelections([])
    } else {
      await testGen.runGeneration(analysis, testGen.collectedAnswers, chat.addMessage)
    }
  }

  // ── Project state ──

  const getProjectState = () => {
    // Sync current variant data before saving
    const updatedVariants = variants.map(v =>
      v.id === activeVariant?.id
        ? {
            ...v,
            messages: chat.messages,
            mobileScreenshots: screenshots.mobileScreenshots,
            desktopScreenshots: screenshots.desktopScreenshots
          }
        : v
    )

    return {
      name: projectName,
      appName,
      variants: updatedVariants,
      activeVariantId: activeVariant?.id,
      crossVariantFlows,
      collectedAnswers: testGen.collectedAnswers,
      analysisContext: testGen.analysisContext,
      allTestCases: testGen.allTestCases,
      runHistory,
      pendingQuestions: testGen.pendingQuestions,
      currentQ: testGen.currentQ,
      reusableModules,
    }
  }

  const loadProjectState = (data) => {
    isLoadingProject.current = true
    setProjectName(data.name || 'Imported Project')
    setAppName(data.appName || '')

    // Load variants
    setVariants(data.variants || [])
    const activeVar = data.variants?.find(v => v.id === data.activeVariantId) || data.variants?.[0]
    if (activeVar) {
      setActiveVariant(activeVar)
      prevVariantRef.current = activeVar
      chat.setMessages(activeVar.messages || [])
      screenshots.setScreenshots(activeVar.mobileScreenshots || [], activeVar.desktopScreenshots || [])
    }

    setCrossVariantFlows(data.crossVariantFlows || [])
    testGen.setState(data)
    setRunHistory(data.runHistory || {})
    setReusableModules(data.reusableModules || [])
    chat.setInput('')
    setCurrentView('workspace')
  }

  const handleCreateProject = (name) => {
    setProjectName(name)
    setAppName('')

    // Reset to default variant
    const defaultVariant = {
      id: 'default',
      name: 'Main App',
      icon: '📱',
      owner: '',
      description: '',
      screens: [],
      testCases: [],
      messages: [],
      mobileScreenshots: [],
      desktopScreenshots: []
    }
    setVariants([defaultVariant])
    setActiveVariant(defaultVariant)
    prevVariantRef.current = defaultVariant
    setCrossVariantFlows([])

    chat.clearMessages()
    screenshots.clearScreenshots()
    testGen.clearGeneration()
    testGen.setAllTestCases([])
    setRunHistory({})
    setReusableModules([])
    chat.setInput('')
    setCurrentView('workspace')
  }

  const handleRunComplete = (testCaseId, result) => {
    setRunHistory((prev) => ({
      ...prev,
      [testCaseId]: [...(prev[testCaseId] || []), { ...result, timestamp: Date.now() }],
    }))
  }

  const handleClearChat = () => {
    chat.clearMessages()
    testGen.clearGeneration()
    setShowClearPrompt(false)
  }

  // ── Module handlers ──

  const handleSaveModule = (module) => {
    setReusableModules((prev) => {
      const existing = prev.findIndex((m) => m.id === module.id)
      if (existing >= 0) {
        return prev.map((m, i) => (i === existing ? module : m))
      }
      return [...prev, module]
    })
    showToast('Module saved')
  }

  const handleDeleteModule = (moduleId) => {
    setReusableModules((prev) => prev.filter((m) => m.id !== moduleId))
    showToast('Module deleted')
  }

  // ── Variant Management ──

  const handleSaveVariant = (variant) => {
    setVariants((prev) => {
      const existing = prev.findIndex((v) => v.id === variant.id)
      if (existing >= 0) {
        // Update existing - preserve messages/screenshots
        return prev.map((v, i) => (i === existing ? { ...v, ...variant } : v))
      }
      // New variant - initialize with empty arrays
      const newVariant = {
        ...variant,
        messages: [],
        mobileScreenshots: [],
        desktopScreenshots: [],
        screens: [],
        testCases: []
      }
      return [...prev, newVariant]
    })
    if (!activeVariant) setActiveVariant(variant)
    setShowVariantEditor(false)
    setEditingVariant(null)
    showToast(editingVariant ? 'Variant updated' : 'Variant created')
  }

  const handleDeleteVariant = (variantId) => {
    if (variants.length <= 1) {
      showToast('Cannot delete the only variant')
      return
    }
    setVariants((prev) => prev.filter((v) => v.id !== variantId))
    if (activeVariant?.id === variantId) {
      setActiveVariant(variants.find((v) => v.id !== variantId))
    }
    setShowVariantEditor(false)
    setEditingVariant(null)
    showToast('Variant deleted')
  }

  const handleCreateFlow = (flow) => {
    setCrossVariantFlows((prev) => [...prev, flow])
    showToast('Flow created')
  }

  const handleEditFlow = (flow) => {
    setCrossVariantFlows((prev) => prev.map((f) => (f.id === flow.id ? flow : f)))
    showToast('Flow updated')
  }

  const handleDeleteFlow = (flowId) => {
    setCrossVariantFlows((prev) => prev.filter((f) => f.id !== flowId))
    showToast('Flow deleted')
  }

  const handleRunFlow = (flow) => {
    setSelectedFlow(flow)
    setShowCrossFlows(false)
    setCurrentView('flowCanvas')
  }

  const handleSaveFlow = (updatedFlow) => {
    setCrossVariantFlows((prev) => prev.map((f) => (f.id === updatedFlow.id ? updatedFlow : f)))
    showToast('Flow saved')
  }

  // ── Render ──

  if (currentView === 'projects') {
    return <ProjectScreen onCreateProject={handleCreateProject} onLoadProject={loadProjectState} />
  }

  if (currentView === 'analytics') {
    return (
      <AnalyticsDashboard
        projectName={projectName || 'Jade Analytics'}
        onBack={() => setCurrentView('workspace')}
      />
    )
  }

  if (currentView === 'flowCanvas' && selectedFlow) {
    return (
      <FlowCanvas
        flow={selectedFlow}
        variants={variants}
        onBack={() => { setSelectedFlow(null); setCurrentView('workspace') }}
        onSave={handleSaveFlow}
      />
    )
  }

  if (currentView === 'suite' && testGen.allTestCases.length > 0) {
    return (
      <TestSuiteView
        testCases={testGen.allTestCases}
        runHistory={runHistory}
        projectName={projectName}
        onRunTest={(tc) => { setRunQueue([]); setSelectedTestCase(tc); setPreviousView('suite'); setCurrentView('runner') }}
        onRunAll={() => { setRunQueue(testGen.allTestCases.slice(1)); setSelectedTestCase(testGen.allTestCases[0]); setPreviousView('suite'); setCurrentView('runner') }}
        onBack={() => setCurrentView('workspace')}
      />
    )
  }

  if (currentView === 'runner' && selectedTestCase) {
    return (
      <TestRunner
        testCase={selectedTestCase}
        projectName={projectName}
        screenshots={screenshots.getAllScreenshots()}
        reusableModules={reusableModules}
        onSaveModule={handleSaveModule}
        onDeleteModule={handleDeleteModule}
        onBack={() => { setRunQueue([]); setSelectedTestCase(null); setCurrentView(previousView || 'workspace') }}
        onRunComplete={(result) => {
          handleRunComplete(selectedTestCase.id, result)
          if (runQueue.length > 0) {
            setSelectedTestCase(runQueue[0])
            setRunQueue((prev) => prev.slice(1))
          }
        }}
        onUpdateSteps={(newSteps) => {
          const updated = { ...selectedTestCase, steps: newSteps }
          setSelectedTestCase(updated)
          testGen.setAllTestCases((prev) => prev.map((tc) => (tc.id === updated.id ? updated : tc)))
          chat.updateMessagesWithTestCases(updated.id, updated)
        }}
      />
    )
  }

  return (
    <div className="app">
      <div className="chat-panel">
        <div className="chat-header">
          <div className="header-left">
            <button className="back-btn" onClick={() => setCurrentView('projects')}><img src={backIcon} alt="Back" /></button>
            <span>{projectName}</span>
          </div>
          <div className="header-actions">
            {chat.messages.length > 0 && (
              <button className="clear-chat-btn" onClick={() => setShowClearPrompt(true)}>Clear</button>
            )}
            {emulator.deviceConnected ? (
              <button className="device-conn-btn connected" onClick={handleDisconnect}>
                <span className="device-status-dot online"></span>
                iPhone 14 Pro
              </button>
            ) : (
              <button className="device-conn-btn" onClick={handleConnect}>
                <span className="device-status-dot"></span>
                Connect Device
              </button>
            )}
            {emulator.deviceConnected && (
              <button className="device-preview-btn" onClick={() => emulator.setShowEmulator(!emulator.showEmulator)}>
                {emulator.showEmulator ? 'Hide Device' : 'Device Preview'}
              </button>
            )}
            {appName && emulator.deviceConnected && !testGen.generating && (
              <button className="reanalyze-btn" onClick={reAnalyze}>
                {testGen.allTestCases.length > 0 ? 'Re-Analyze' : 'Analyze'}
              </button>
            )}
            {testGen.allTestCases.length > 0 && !testGen.generating && (
              <button className="view-suite-header-btn" onClick={() => setCurrentView('suite')}>
                View Suite
              </button>
            )}
            <button className="analytics-btn" onClick={() => setCurrentView('analytics')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 20V10M12 20V4M6 20v-6"/>
              </svg>
              Analytics
            </button>
            {testGen.generating && (
              <button className="generate-btn" disabled>Analyzing...</button>
            )}
            {bellNotification && (
              <div className="bell-wrapper">
                <button className="bell-btn" onClick={() => setShowBellPopup(!showBellPopup)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  <span className="bell-dot"></span>
                </button>
                {showBellPopup && (
                  <div className="bell-popup">
                    <p>{bellNotification}</p>
                    <button onClick={() => { setBellNotification(null); setShowBellPopup(false) }}>Dismiss</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {variants.length > 0 && (
          <VariantTabs
            variants={variants}
            activeVariant={activeVariant || variants[0]}
            onSelectVariant={setActiveVariant}
            onAddVariant={() => { setEditingVariant(null); setShowVariantEditor(true) }}
            onEditVariant={(v) => { setEditingVariant(v); setShowVariantEditor(true) }}
            onManageFlows={() => setShowCrossFlows(true)}
          />
        )}

        <div className="chat-messages" ref={chat.chatMessagesRef}>
          {chat.messages.length === 0 && !testGen.isAsking && (
            <div className="empty-state">
              <div className="empty-icon">&#128269;</div>
              {appName ? (
                <>
                  <p>Welcome back — testing {appName}</p>
                  <span>{testGen.allTestCases.length > 0
                    ? `${testGen.allTestCases.length} test cases from last session. Click Resume Testing or Re-Analyze to continue.`
                    : 'Click Analyze above to start generating test cases.'
                  }</span>
                </>
              ) : (
                <>
                  <p>Connect your device to get started</p>
                  <span>Click Connect Device above to pair your phone, then tell us which app to test</span>
                </>
              )}
            </div>
          )}

          {chat.messages.map((msg, i) => (
            <div key={i} className={`msg-wrapper ${msg.role}`}>
              <span className="msg-avatar">{msg.role === 'user' ? 'Y' : 'J'}</span>
              <div className="msg-content">
                <div className={`msg ${msg.role}`}>
                  {msg.testCases ? (
                    <CollapsibleTestCases
                      testCases={msg.testCases}
                      projectName={projectName}
                      onExportCSV={exportTestCasesCSV}
                      onExportPDF={exportTestCasesPDF}
                      onViewSuite={(tcs) => { testGen.setAllTestCases(tcs); setCurrentView('suite') }}
                      onSelectTestCase={(tc) => { setSelectedTestCase(tc); setPreviousView('workspace'); setCurrentView('runner') }}
                    />
                  ) : msg.questionData && msg.answerSelections ? (
                    <div className="answered-options">
                      {msg.questionData.options.map((opt) => (
                        <span key={opt} className={`answered-option ${msg.answerSelections.includes(opt) ? 'chosen' : ''}`}>{opt}</span>
                      ))}
                    </div>
                  ) : msg.role === 'assistant' && isLongMessage(msg.text) ? (
                    <SmartSummary text={msg.text} />
                  ) : (
                    <p>{msg.text}</p>
                  )}
                </div>
                {msg.questionData && !testGen.generating && (
                  <button className="edit-answer-btn" onClick={() => handleEditAnswer(i)}>Edit</button>
                )}
              </div>
            </div>
          ))}

          {testGen.isAsking && !testGen.generating && (
            <QuestionCard
              question={testGen.currentQ}
              selections={testGen.currentSelections}
              onToggle={testGen.toggleSelection}
              onSkip={handleSkipQuestion}
              onSubmit={handleSubmitAnswer}
            />
          )}

          {testGen.generating && (
            <div className="msg-wrapper assistant">
              <span className="msg-avatar">J</span>
              <div className="msg assistant">
                <div className="typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="chat-input-row">
          <textarea
            value={chat.input}
            onChange={(e) => chat.setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
            placeholder="Add testing context or notes... (Shift+Enter for new line)"
            rows={1}
          />
          <button onClick={sendMessage}>Add Context</button>
        </div>
      </div>

      <div className="screenshots-panel">
        {emulator.devicePinned ? (
          <PinnedEmulator
            emulatorImg={emulator.emulatorImg}
            screenshots={screenshots.mobileScreenshots}
            onUnpin={emulator.unpinFromSidebar}
            onSelectScreen={emulator.setEmulatorImg}
          />
        ) : (
          <ScreenshotsList
            screenshots={screenshots.mobileScreenshots}
            onSelect={(s) => { screenshots.setPreviewImg(s); emulator.setEmulatorImg(s.url) }}
          />
        )}
      </div>

      {emulator.showEmulator && !emulator.devicePinned && (
        <FloatingEmulator
          show={true}
          position={emulator.emulatorPos}
          emulatorImg={emulator.emulatorImg}
          onDragStart={emulator.onEmulatorDragStart}
          onPin={emulator.pinToSidebar}
          onClose={() => emulator.setShowEmulator(false)}
        />
      )}

      {screenshots.previewImg && (
        <div className="preview-overlay" onClick={() => screenshots.setPreviewImg(null)}>
          <div className="preview-content" onClick={(e) => e.stopPropagation()}>
            <button className="preview-close" onClick={() => screenshots.setPreviewImg(null)}>×</button>
            <img src={screenshots.previewImg.url} alt={screenshots.previewImg.name} />
            <p>{screenshots.previewImg.label || screenshots.previewImg.name}</p>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}

      {showClearPrompt && (
        <div className="preview-overlay" onClick={() => setShowClearPrompt(false)}>
          <div className="save-prompt" onClick={(e) => e.stopPropagation()}>
            <h3>Clear all messages?</h3>
            <p>This will remove all messages and generated test cases from this session.</p>
            <div className="save-prompt-actions">
              <button className="save-prompt-cancel" onClick={() => setShowClearPrompt(false)}>Cancel</button>
              <button className="save-prompt-discard" onClick={handleClearChat}>Clear</button>
            </div>
          </div>
        </div>
      )}

      {showVariantEditor && (
        <VariantEditor
          variant={editingVariant}
          onSave={handleSaveVariant}
          onDelete={handleDeleteVariant}
          onClose={() => { setShowVariantEditor(false); setEditingVariant(null) }}
        />
      )}

      {showCrossFlows && (
        <CrossVariantFlows
          flows={crossVariantFlows}
          variants={variants}
          onCreateFlow={handleCreateFlow}
          onEditFlow={handleEditFlow}
          onDeleteFlow={handleDeleteFlow}
          onRunFlow={handleRunFlow}
          onClose={() => setShowCrossFlows(false)}
        />
      )}
    </div>
  )
}

export default App
