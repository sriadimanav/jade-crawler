import { useState, useRef } from 'react'
import { analyzeScreenshots, generateQuestions, generateTestCases } from '../ai'

export function useTestGeneration() {
  const [generating, setGenerating] = useState(false)
  const [pendingQuestions, setPendingQuestions] = useState([])
  const [currentQ, setCurrentQ] = useState(null)
  const [currentSelections, setCurrentSelections] = useState([])
  const [collectedAnswers, setCollectedAnswers] = useState([])
  const [analysisContext, setAnalysisContext] = useState(null)
  const [allTestCases, setAllTestCases] = useState([])

  const reanalyzeTimer = useRef(null)

  const isAsking = currentQ !== null

  const toggleSelection = (option) => {
    if (currentQ?.multi) {
      setCurrentSelections((prev) =>
        prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]
      )
    } else {
      setCurrentSelections([option])
    }
  }

  const submitAnswer = (addMessage) => {
    if (currentSelections.length === 0) return

    const answerText = currentSelections.join(', ')
    addMessage('assistant', currentQ.question, { answeredQuestion: true })
    addMessage('user', answerText, { questionData: currentQ, answerSelections: currentSelections })

    const newAnswers = [...collectedAnswers, { questionId: currentQ.id, answer: currentSelections }]
    setCollectedAnswers(newAnswers)
    setCurrentSelections([])

    if (pendingQuestions.length > 0) {
      setCurrentQ(pendingQuestions[0])
      setPendingQuestions(pendingQuestions.slice(1))
      return { done: false, answers: newAnswers }
    } else {
      setCurrentQ(null)
      return { done: true, answers: newAnswers }
    }
  }

  const skipQuestion = (addMessage) => {
    addMessage('assistant', currentQ.question, { answeredQuestion: true })
    addMessage('user', 'Skipped', { questionData: currentQ, answerSelections: [] })
    setCurrentSelections([])

    if (pendingQuestions.length > 0) {
      setCurrentQ(pendingQuestions[0])
      setPendingQuestions(pendingQuestions.slice(1))
      return { done: false }
    } else {
      setCurrentQ(null)
      return { done: true }
    }
  }

  const editAnswer = (msgIndex, messages) => {
    const msg = messages[msgIndex]
    if (!msg?.questionData) return null

    // Re-open this question with previous selections
    setCurrentQ(msg.questionData)
    setCurrentSelections(msg.answerSelections || [])

    // Collect questions from later answers to put back in pending
    const laterAnswers = messages.slice(msgIndex + 1).filter((m) => m.questionData)
    const laterQuestions = laterAnswers.map((m) => m.questionData)
    setPendingQuestions(laterQuestions)

    // Rebuild collectedAnswers: keep only answers before this one
    const answeredBefore = messages.slice(0, msgIndex).filter((m) => m.questionData)
    setCollectedAnswers(
      answeredBefore.map((m) => ({ questionId: m.questionData.id, answer: m.answerSelections || [] }))
    )

    return msgIndex // Return index so caller can truncate messages
  }

  const runAnalysis = async (screenshots, userContext, addMessage) => {
    const analysis = await analyzeScreenshots(screenshots, userContext)
    setAnalysisContext(analysis)
    addMessage('assistant', analysis.summary)
    return analysis
  }

  const startQuestions = (analysis) => {
    const questions = generateQuestions(analysis)
    if (questions.length > 0) {
      setPendingQuestions(questions.slice(1))
      setCurrentQ(questions[0])
      setCollectedAnswers([])
      setCurrentSelections([])
      return true
    }
    return false
  }

  const runGeneration = async (analysis, answers, addMessage) => {
    setGenerating(true)
    addMessage('assistant', 'Generating test cases based on your inputs...')

    const testCases = await generateTestCases(analysis, answers)

    addMessage('assistant', null, { testCases })
    setAllTestCases(testCases)
    setGenerating(false)

    return testCases
  }

  const clearGeneration = () => {
    setCurrentQ(null)
    setPendingQuestions([])
    setCollectedAnswers([])
    setAnalysisContext(null)
    setCurrentSelections([])
  }

  const setState = (data) => {
    setCollectedAnswers(data.collectedAnswers || [])
    setAnalysisContext(data.analysisContext || null)
    setAllTestCases(data.allTestCases || [])
    setCurrentQ(data.currentQ || null)
    setPendingQuestions(data.pendingQuestions || [])
    setCurrentSelections([])
    setGenerating(false)
  }

  return {
    generating,
    setGenerating,
    pendingQuestions,
    setPendingQuestions,
    currentQ,
    setCurrentQ,
    currentSelections,
    setCurrentSelections,
    collectedAnswers,
    setCollectedAnswers,
    analysisContext,
    setAnalysisContext,
    allTestCases,
    setAllTestCases,
    reanalyzeTimer,
    isAsking,
    toggleSelection,
    submitAnswer,
    skipQuestion,
    editAnswer,
    runAnalysis,
    startQuestions,
    runGeneration,
    clearGeneration,
    setState,
  }
}
