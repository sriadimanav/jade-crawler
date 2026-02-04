import { useState, useRef } from 'react'

export function useChat() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const chatMessagesRef = useRef(null)

  // Note: Auto-scroll is handled in App.jsx with more dependencies

  const addMessage = (role, text, extras = {}) => {
    setMessages((prev) => [...prev, { role, text, ...extras }])
  }

  const clearMessages = () => {
    setMessages([])
  }

  const getUserContext = () =>
    messages.filter((m) => m.role === 'user').map((m) => m.text).join('\n')

  const removeMessagesAfter = (index) => {
    setMessages((prev) => prev.slice(0, index))
  }

  const updateMessagesWithTestCases = (testCaseId, updatedTestCase) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.testCases
          ? { ...msg, testCases: msg.testCases.map((tc) => (tc.id === testCaseId ? updatedTestCase : tc)) }
          : msg
      )
    )
  }

  return {
    messages,
    setMessages,
    input,
    setInput,
    chatMessagesRef,
    addMessage,
    clearMessages,
    getUserContext,
    removeMessagesAfter,
    updateMessagesWithTestCases,
  }
}
