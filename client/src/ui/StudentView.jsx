import React, { useEffect, useMemo, useState } from 'react'
import { io } from 'socket.io-client'

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000'

export function StudentView({ onBack }) {
  const [socket, setSocket] = useState(null)
  const [name, setName] = useState('')
  const [ready, setReady] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [selected, setSelected] = useState(null)
  const [results, setResults] = useState(null)
  const [pastQuestions, setPastQuestions] = useState([])
  const [timeLeft, setTimeLeft] = useState(0)
  const [chat, setChat] = useState([])
  const [msg, setMsg] = useState('')
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [lastQuestionText, setLastQuestionText] = useState('')
  const [chatOpen, setChatOpen] = useState(false)
  const [kicked, setKicked] = useState(false)

  useEffect(() => {
    const s = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 500,
      withCredentials: false
    })
    setSocket(s)
    s.on('connect_error', (err) => {
      console.error('Socket connect_error', err)
    })
    s.on('error', (err) => {
      console.error('Socket error', err)
    })
    s.on('student:ready', (payload) => {
      setCurrentQuestion(payload.currentQuestion)
      setPastQuestions(payload.pastQuestions)
    })
    s.on('questionAsked', (q) => {
      setCurrentQuestion(q)
      setSelected(null)
      setResults(null)
      setTimeLeft(q.durationSec)
      setHasSubmitted(false)
      setLastQuestionText(q.text || '')
    })
    s.on('results:update', (r) => setResults(r))
    s.on('questionFinished', (r) => {
      setResults({
        questionId: r.questionId,
        options: r.options,
        totalAnswers: r.totalAnswers,
      })
      setCurrentQuestion(null)
      setPastQuestions((p) => [r, ...p])
      setHasSubmitted(false)
      if (r.text) setLastQuestionText(r.text)
    })
    s.on('chat:message', (m) => setChat((c) => [...c, m]))
    
    s.on('student:kicked', () => {
    setKicked(true)
  })

    return () => s.disconnect()
  }, [])

  
  useEffect(() => {
    if (!currentQuestion) return
    setTimeLeft(currentQuestion.durationSec)
    const id = setInterval(() => {
      setTimeLeft((t) => Math.max(0, t - 1))
    }, 1000)
    return () => clearInterval(id)
  }, [currentQuestion?.id])

  const join = () => {
    if (!name.trim()) return
    socket.emit('student:init', { name: name.trim() })
    setReady(true)
  }

  const submit = () => {
    if (!currentQuestion || !selected) return
    socket.emit('student:submit', { questionId: currentQuestion.id, optionId: selected })
    setHasSubmitted(true)
  }

  const sendMsg = () => {
    if (!msg.trim()) return
    socket.emit('chat:send', { from: name, message: msg, role: 'student' })
    setMsg('')
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
   
  // 👇 kicked out UI
  if (kicked) {
    return (
      <div style={{
        fontFamily: 'Inter, system-ui, Arial',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        backgroundColor: '#fff',
        textAlign: 'center',
        padding: 20
      }}>
        <div style={{
          backgroundColor: '#7765DA',
          color: 'white',
          padding: '6px 14px',
          borderRadius: 12,
          fontWeight: 600,
          marginBottom: 24
        }}>
          ✨ Intervue Poll
        </div>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: '#1D1D1F', marginBottom: 12 }}>
          You’ve been Kicked out!
        </h2>
        <p style={{ fontSize: 16, color: '#6E6E6E' }}>
          Looks like the teacher has removed you from the poll system.<br />
          Please try again sometime.
        </p>
      </div>
    )
  }

  if (!ready) {
    return (
      <div style={{
        fontFamily: 'Inter, system-ui, Arial',
        minHeight: '100vh',
        backgroundColor: '#F2F2F2',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '40px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
          width: '100%',
          maxWidth: '520px',
          textAlign: 'center'
        }}>
          {/* Logo */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
             background: "linear-gradient(135deg, #7565D9, #4D0ACD)",
            color: 'white',
            padding: '6px 12px',
            borderRadius: '12px',
            marginBottom: '18px'
          }}>
            <span style={{ fontWeight: 600, fontSize: 12 }}>Intervue Poll</span>
          </div>

          <h1 style={{ fontSize: 32, fontWeight: 700, color: '#373737', margin: '0 0 8px 0' }}>Let’s Get Started</h1>
          <p style={{ fontSize: 14, color: '#6E6E6E', margin: '0 0 28px 0' }}>
            If you’re a student, you’ll be able to <strong>submit your answers</strong>, participate in live polls, and see how your responses compare with your classmates
          </p>

          {/* Name input only */}
          <div style={{ textAlign: 'left', marginBottom: 12, fontWeight: 600, color: '#373737' }}>Enter your Name</div>
          <input
            type="text"
            placeholder="Your full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              width: '95%',
              padding: '14px 16px',
              border: '2px solid #E0E0E0',
              borderRadius: 8,
              fontSize: 16,
              outline: 'none',
              marginBottom: 24
            }}
            onFocus={(e) => (e.target.style.borderColor = '#7765DA')}
            onBlur={(e) => (e.target.style.borderColor = '#E0E0E0')}
          />

          <button
            onClick={join}
            disabled={!name.trim()}
            style={{
              width: 200,
              background: name.trim() ? 'linear-gradient(90deg, #7765DA, #4F0DCE)' : '#E0E0E0',
              color: name.trim() ? 'white' : '#9E9E9E',
              border: 'none',
              borderRadius: 12,
              padding: '14px 20px',
              fontSize: 16,
              fontWeight: 600,
              cursor: name.trim() ? 'pointer' : 'not-allowed'
            }}
          >
            Continue
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      fontFamily: 'Inter, system-ui, Arial',
      minHeight: '100vh',
      backgroundColor: '#F2F2F2',
      padding: '32px'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: "linear-gradient(135deg, #7565D9, #4D0ACD)",
          color: 'white',
          padding: '6px 12px',
          borderRadius: 12
        }}>
          <span style={{ fontWeight: 600, fontSize: 12 }}>Intervue Poll</span>
        </div>
      </div>

      {/* Waiting state only when there is no current question and no results to show */}
      {!currentQuestion && !results && (
        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <div style={{
            width: 44,
            height: 44,
            margin: '0 auto 16px',
            border: '4px solid #E0E0E0',
            borderTop: '4px solid #7765DA',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <h2 style={{ color: '#373737' }}>Wait for the teacher to ask questions..</h2>
        </div>
      )}

      {/* Keyframes for spinner */}
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>

      {/* Current Question UI */}
      {currentQuestion && (
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          {/* Title row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1D1D1F' }}>Question 1</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#E53935' }}>
              <span role="img" aria-label="timer">⏱️</span>
              <span>{formatTime(timeLeft)}</span>
            </div>
          </div>

          {/* Question card */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: 10,
            border: '2px solid #7765DA',
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
          }}>
            {/* dark header bar with question */}
            <div style={{
              background: 'linear-gradient(90deg, #3B3B3B, #6E6E6E)',
              color: 'white',
              fontWeight: 700,
              fontSize: 14,
              padding: '12px 14px',
              borderTopLeftRadius: 8,
              borderTopRightRadius: 8
            }}>
              {currentQuestion.text}
            </div>

            {/* options */}
            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {currentQuestion.options.map((opt, idx) => {
                const isSelected = selected === opt.id
                return (
                  <div
                    key={opt.id}
                    onClick={() => setSelected(opt.id)}
                    style={{
                      padding: 14,
                      borderRadius: 8,
                      background: '#F6F6F6',
                      border: isSelected ? '2px solid #7765DA' : '2px solid transparent',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#373737', fontWeight: 600 }}>
                      <div style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        background: '#E9E9E9',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, color: '#5A5A5A', fontWeight: 700
                      }}>{idx + 1}</div>
                      <div>{opt.text}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {!hasSubmitted && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={submit} disabled={!selected} style={{
                marginTop: 18,
                minWidth: 160,
                background: selected ? 'linear-gradient(90deg, #7765DA, #4F0DCE)' : '#E0E0E0',
                color: selected ? 'white' : '#9E9E9E',
                border: 'none',
                borderRadius: 20,
                padding: '12px 20px',
                fontSize: 14,
                fontWeight: 700,
                cursor: selected ? 'pointer' : 'not-allowed'
              }}>Submit</button>
            </div>
          )}

        </div>
      )}

      {/* After question finished and results shown, display gentle wait message */}
     {/* Final Results (after timer ends or everyone answered) */}
{!currentQuestion && results && (
  <div style={{ maxWidth: 860, margin: '0 auto' }}>
    {/* Same card as question */}
    <div style={{
      backgroundColor: 'white',
      borderRadius: 10,
      border: '2px solid #7765DA',
      boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
    }}>
      {/* dark header bar with last question text */}
      <div style={{
        background: 'linear-gradient(90deg, #3B3B3B, #6E6E6E)',
        color: 'white',
        fontWeight: 700,
        fontSize: 14,
        padding: '12px 14px',
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8
      }}>
        {lastQuestionText}
      </div>

      {/* options with percentage bars */}
      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {results.options.map((o, idx) => {
          const pct = results.totalAnswers > 0 ? Math.round((o.count / results.totalAnswers) * 100) : 0
          return (
            <div key={o.id} style={{
              padding: 14,
              borderRadius: 8,
              background: '#F6F6F6',
              border: '2px solid transparent'
            }}>
              {/* option text + percentage */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#373737', fontSize: 14, fontWeight: 600 }}>
                <span>{String.fromCharCode(65 + idx)}. {o.text}</span>
                <span>{pct}%</span>
              </div>

              {/* progress bar */}
              <div style={{ height: 16, background: '#EEE', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: '#7765DA' }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>

    {/* Wait message */}
    <div style={{ textAlign: 'center', marginTop: 18, color: '#1D1D1F', fontWeight: 700 }}>
      Wait for the teacher to ask a new question..
    </div>
  </div>
)}


      {/* Floating Chat Button */}
      <button
        onClick={() => setChatOpen((v) => !v)}
        aria-label="Open chat"
        style={{
          position: 'fixed',
          right: 24,
          bottom: 24,
          width: 56,
          height: 56,
          borderRadius: 28,
          background: 'linear-gradient(90deg, #7765DA, #4F0DCE)',
          color: 'white',
          border: 'none',
          boxShadow: '0 8px 24px rgba(79,13,206,0.35)',
          cursor: 'pointer',
          fontSize: 22,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
        💬
      </button>

      {/* Chat Drawer */}
      {chatOpen && (
        <div style={{
          position: 'fixed',
          right: 24,
          bottom: 88,
          width: 340,
          background: 'white',
          border: '1px solid #EAEAEA',
          borderRadius: 12,
          boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
          overflow: 'hidden'
        }}>
          <div style={{
            background: '#F7F7F7',
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #EFEFEF'
          }}>
            <div style={{ fontWeight: 700, color: '#373737' }}>Chat</div>
            <button onClick={() => setChatOpen(false)} style={{ border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer', color: '#6E6E6E' }}>×</button>
          </div>
          <div style={{ height: 260, overflowY: 'auto', padding: 10, background: '#FAFAFA' }}>
            {chat.length === 0 ? (
              <div style={{ color: '#6E6E6E', fontSize: 13, textAlign: 'center', marginTop: 40 }}>No messages yet</div>
            ) : (
              chat.map((m) => (
                <div key={m.id} style={{ marginBottom: 8, background: m.role === 'teacher' ? '#F0F4FF' : '#FFFFFF', border: '1px solid #EFEFEF', borderRadius: 8, padding: '6px 10px' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: m.role === 'teacher' ? '#7765DA' : '#6E6E6E', marginBottom: 2 }}>
                    {m.role === 'teacher' ? 'Teacher' : (m.from || 'Student')}
                  </div>
                  <div style={{ fontSize: 14, color: '#373737' }}>{m.message}</div>
                </div>
              ))
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, padding: 10, background: 'white', borderTop: '1px solid #EFEFEF' }}>
            <input
              type="text"
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              placeholder="Type a message..."
              onKeyDown={(e) => { if (e.key === 'Enter') sendMsg() }}
              style={{ flex: 1, padding: '10px 12px', border: '2px solid #E0E0E0', borderRadius: 8, outline: 'none', fontSize: 14 }}
            />
            <button
              onClick={sendMsg}
              style={{ background: 'linear-gradient(90deg, #7765DA, #4F0DCE)', color: 'white', border: 'none', borderRadius: 8, padding: '10px 16px', fontWeight: 700, cursor: 'pointer' }}
            >
              Send
            </button>
        </div>
      </div>
      )}
    </div>
  )
}

