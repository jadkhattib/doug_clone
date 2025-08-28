import { useState, useEffect, useRef } from 'react'
import { Mic, ArrowUp } from 'lucide-react'
import { chatAPI } from '../services/api'
import toast from 'react-hot-toast'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const ChatInterface = () => {
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingContent])

  // Typewriter effect for streaming content
  const typewriterEffect = (text: string, callback: (content: string) => void) => {
    let i = 0
    const timer = setInterval(() => {
      if (i < text.length) {
        callback(text.slice(0, i + 1))
        i++
      } else {
        clearInterval(timer)
      }
    }, 8) // Adjust speed (lower = faster)
    return timer
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message.trim(),
      timestamp: new Date(),
    }

    const nextMessages = [...messages, userMessage]
    setMessages(prev => [...prev, userMessage])
    setMessage('')
    setIsLoading(true)

    try {
      const payload = nextMessages.map(m => ({ role: m.role, content: m.content }))
      const response = await chatAPI.sendMessage(payload, 'default')

      const responseText = (response as any).message ?? (response as any).response ?? ''
      
      // Create assistant message placeholder
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      }

      // Add empty assistant message first
      setMessages(prev => [...prev, assistantMessage])
      
      // Start typewriter effect
      setStreamingContent('')
      typewriterEffect(responseText, (content) => {
        setStreamingContent(content)
      })

      // After typewriter effect completes, update the actual message
      setTimeout(() => {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === assistantMessage.id 
              ? { ...msg, content: responseText }
              : msg
          )
        )
        setStreamingContent('')
      }, responseText.length * 30 + 100) // Wait for typewriter to complete

    } catch (error) {
      console.error('Chat error:', error)
      toast.error('Failed to send message. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="w-full max-w-[768px] mx-auto mt-6">
      {/* Removed signup notice */}

      {/* Messages Display */}
      {messages.length > 0 && (
        <div className="bg-card border border-border rounded-3xl p-4 shadow-sm mb-3 max-h-[400px] overflow-y-auto">
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    msg.role === 'user'
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className={`text-base ${
                    msg.role === 'user' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {msg.role === 'assistant' && msg.content === '' && streamingContent 
                      ? streamingContent 
                      : msg.content}
                  </p>
                  <p className={`text-sm mt-1 ${
                    msg.role === 'user' ? 'text-white/70' : 'text-gray-500'
                  }`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg px-3 py-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* Chat Input */}
      <div className="bg-card border border-border rounded-3xl p-3 shadow-sm">
        <form onSubmit={handleSubmit}>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent border-0 focus:ring-0 focus-visible:ring-0 focus:outline-none focus-visible:outline-none placeholder:text-zinc-600 text-base text-foreground"
              placeholder="Ask Doug anything..."
              disabled={isLoading}
            />
            
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={!message.trim() || isLoading}
                className="bg-black text-white rounded-lg px-3 py-1.5 flex items-center gap-1.5 text-sm font-medium hover:bg-black/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowUp size={16} />
                <span>Send</span>
              </button>
              <button
                type="button"
                className="bg-black text-white rounded-lg px-4 py-1.5 flex items-center gap-1.5 text-sm font-medium hover:bg-black/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                disabled={isLoading}
              >
                <Mic size={16} />
                <span>Voice</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2 mt-3 justify-center">
        <button
          onClick={() => setMessage("Tell me about yourself")}
          className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
          disabled={isLoading}
        >
          Ask about me
        </button>
        <button
          onClick={() => setMessage("What insights do you have?")}
          className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
          disabled={isLoading}
        >
          Learn from insights
        </button>
        <button
          onClick={() => setMessage("Help me solve a problem")}
          className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
          disabled={isLoading}
        >
          Jam on a problem
        </button>
      </div>
    </div>
  )
}

export default ChatInterface