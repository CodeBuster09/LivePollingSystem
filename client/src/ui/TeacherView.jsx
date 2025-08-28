import React, { useEffect, useMemo, useState } from 'react'
import { io } from 'socket.io-client'

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000'

export function TeacherView({ onBack }) {
  const [socket, setSocket] = useState(null)
  const [pollId, setPollId] = useState('')
  const [students, setStudents] = useState([])
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [pastQuestions, setPastQuestions] = useState([])
  const [questionText, setQuestionText] = useState('')
  const [options, setOptions] = useState([
    { id: 1, text: '', isCorrect: true },
    { id: 2, text: '', isCorrect: false }
  ])
  const [duration, setDuration] = useState(60)
  const [results, setResults] = useState(null)
  const [chat, setChat] = useState([])
  const [msg, setMsg] = useState('')

  const [isChatOpen, setIsChatOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("chat") // "chat" or "students"

  useEffect(() => {
    const s = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 500,
      withCredentials: false
    })
    setSocket(s)
    s.on('connect', () => {
      s.emit('teacher:init', { pollId: null })
    })
    s.on('teacher:ready', (payload) => {
      setPollId(payload.pollId)
      setStudents(payload.students)
      setCurrentQuestion(payload.currentQuestion)
      setPastQuestions(payload.pastQuestions)
    })
    s.on('roster:update', setStudents)
    s.on('questionAsked', (q) => {
      setCurrentQuestion(q)
      setResults(null)
    })
    s.on('results:update', setResults)
    s.on('questionFinished', (r) => {
      setResults({
        questionId: r.questionId,
        options: r.options,
        totalAnswers: r.totalAnswers,
        studentsTotal: students.length
      })
      setCurrentQuestion(null)
      setPastQuestions((p) => [r, ...p])
    })
    s.on('chat:message', (m) => setChat((c) => [...c, m]))
    return () => s.disconnect()
  }, [])

  const canAsk = useMemo(() =>
    !currentQuestion && questionText.trim() && options.some(o => o.text.trim()),
    [currentQuestion, questionText, options]
  )

  const askQuestion = () => {
    if (!socket || !canAsk) return
    socket.emit('teacher:askQuestion', {
      pollId,
      text: questionText,
      options: options.filter(o => o.text.trim()).map(o => o.text),
      durationSec: duration
    })
    setQuestionText('')
    setOptions([
      { id: 1, text: '', isCorrect: true },
      { id: 2, text: '', isCorrect: false }
    ])
  }

  const removeStudent = (id) =>
    socket && socket.emit('teacher:removeStudent', { pollId, studentId: id })

  const sendMsg = () => {
    if (!msg.trim()) return
    socket.emit('chat:send', { pollId, from: 'Teacher', message: msg, role: 'teacher' })
    setMsg('')
  }

  const updateOption = (id, field, value) => {
    setOptions(options.map(o => o.id === id ? { ...o, [field]: value } : o))
  }

  const addOption = () => {
    const newId = Math.max(...options.map(o => o.id)) + 1
    setOptions([...options, { id: newId, text: '', isCorrect: false }])
  }

  const removeOption = (id) => {
    if (options.length > 2) {
      setOptions(options.filter(o => o.id !== id))
    }
  }

  return (
    <div style={{
      fontFamily: 'Inter, system-ui, Arial',
      minHeight: '100vh',
      backgroundColor: '#F2F2F2',
      padding: '32px'
    }}>
      {/* Header */}
      <div style={{
        maxWidth: "800px",
        margin: "0 auto",
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '40px'
      }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "16px" }}>
          <div style={{
            background: "linear-gradient(135deg, #7565D9, #4D0ACD)",
            borderRadius: '12px',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{
              width: '16px',
              height: '16px',
              backgroundColor: 'white',
              borderRadius: '2px',
              transform: 'rotate(45deg)',
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '8px',
                height: '8px',
                backgroundColor: '#7765DA',
                borderRadius: '1px'
              }}></div>
            </div>
            <span style={{ color: 'white', fontWeight: '600', fontSize: '14px' }}>
              Intervue Poll
            </span>
          </div>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#373737', margin: '0 0 8px 0' }}>
              Let's Get Started
            </h1>
            <p style={{ fontSize: '16px', color: '#6E6E6E', margin: '0' }}>
              you'll have the ability to create and manage polls, ask questions, and monitor your students' responses in real-time.
            </p>
          </div>
        </div>

        <button
          onClick={onBack}
          style={{
            backgroundColor: 'white',
            border: '2px solid #E0E0E0',
            borderRadius: '8px',
            padding: '12px 24px',
            color: '#6E6E6E',
            fontWeight: '600',
            cursor: 'pointer'
          }}>
          ← Back
        </button>
      </div>

      {/* Main Content (ONLY Question/Results now) */}
      <div style={{
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)'
        }}>
          {/* Question input */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <label style={{ fontSize: '18px', fontWeight: '700', color: '#373737' }}>
                Enter your question
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                style={{
                  padding: '8px 16px',
                  border: '2px solid #E0E0E0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: 'black',
                  backgroundColor: '#F2F2F2'
                }}>
                <option value={30}>30 seconds</option>
                <option value={60}>60 seconds</option>
                <option value={120}>2 minutes</option>
                <option value={300}>5 minutes</option>
              </select>
            </div>
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Enter your question here..."
              maxLength={100}
              style={{
                width: '95%',
                minHeight: '120px',
                padding: '16px',
                border: '2px solid #E0E0E0',
                borderRadius: '12px',
                fontSize: '16px',
                resize: 'none'
              }}
            />
          </div>
           {/* Header Row */}
<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
  <span style={{ fontWeight: '600', fontSize: '16px', color: '#333' }}>Edit Options</span>
  <span style={{ fontWeight: '600', fontSize: '16px', color: '#333' }}>Is it Correct?</span>
</div>

{/* Options */}
{options.map((option, index) => (
  <div key={option.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
    {/* Left: Option Input */}
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{
        width: '32px',
        height: '32px',
         background: "linear-gradient(135deg, #7565D9, #4D0ACD)",
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: '600',
        fontSize: '14px'
      }}>
        {index + 1}
      </div>
      <input
        type="text"
        value={option.text}
        onChange={(e) => updateOption(option.id, 'text', e.target.value)}
        placeholder={`Option ${index + 1}`}
        style={{
          flex: 1,
          padding: '12px 16px',
          border: '2px solid #E0E0E0',
          borderRadius: '8px'
        }}
      />
    </div>

    {/* Right: Yes/No */}
    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
      <label>
        <input
          type="radio"
          name={`correct-${option.id}`}
          checked={option.isCorrect === true}
          onChange={() => updateOption(option.id, 'isCorrect', true)}
        /> Yes
      </label>
      <label>
        <input
          type="radio"
          name={`correct-${option.id}`}
          checked={option.isCorrect === false}
          onChange={() => updateOption(option.id, 'isCorrect', false)}
        /> No
      </label>
    </div>
  </div>
))}

{/* Add Option Button */}
<button onClick={addOption} style={{
  backgroundColor: 'white',
  color: '#7765DA',
  border: '2px solid #7765DA',
  borderRadius: '8px',
  padding: '12px 20px',
  fontWeight: '600'
}}>
  + Add Option
</button>


          {/* Results */}
          <div style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#373737' }}>Live Results</h3>
            {results ? results.options.map((o, idx) => {
              const pct = results.totalAnswers > 0 ? Math.round((o.count / results.totalAnswers) * 100) : 0
              return (
                <div key={o.id} style={{ marginTop: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span>{String.fromCharCode(65 + idx)}. {o.text}</span>
                    <span>{pct}%</span>
                  </div>
                  <div style={{ height: 16, background: '#EEE', borderRadius: 8 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: '#7765DA' }} />
                  </div>
                </div>
              )
            }) : (
              <div style={{ color: '#6E6E6E', fontSize: 14 }}>No results yet.</div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Ask Question + Chat */}
      <div style={{ position: 'fixed', bottom: '32px', right: '32px', display: 'flex', gap: '12px' }}>
        <button
          onClick={askQuestion}
          disabled={!canAsk}
          style={{
            background: canAsk ? 'linear-gradient(90deg, #7765DA, #4F0DCE)' : '#E0E0E0',
            color: canAsk ? 'white' : '#9E9E9E',
            border: 'none',
            borderRadius: '12px',
            padding: '16px 24px',
            fontWeight: '600'
          }}>
          Ask Question
        </button>

        {/* Chat Toggle */}
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          style={{
            backgroundColor: '#fff',
            border: '2px solid #7765DA',
            borderRadius: '50%',
            width: '50px', height: '50px',
            fontSize: '20px', cursor: 'pointer'
          }}>💬</button>
      </div>

      {/* Floating Chat Window */}
      {isChatOpen && (
        <div style={{
          position: 'fixed',
          bottom: '100px',
          right: '32px',
          width: '320px',
          height: '400px',
          backgroundColor: 'white',
          border: '2px solid #E0E0E0',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #E0E0E0' }}>
            <button
              onClick={() => setActiveTab("chat")}
              style={{
                flex: 1, padding: '10px',
                backgroundColor: activeTab === "chat" ? '#F5F5FF' : 'white',
                border: 'none', cursor: 'pointer',
                fontWeight: activeTab === "chat" ? '600' : '400',
                color: '#7765DA'
              }}>Chat</button>
            <button
              onClick={() => setActiveTab("students")}
              style={{
                flex: 1, padding: '10px',
                backgroundColor: activeTab === "students" ? '#F5F5FF' : 'white',
                border: 'none', cursor: 'pointer',
                fontWeight: activeTab === "students" ? '600' : '400',
                color: '#7765DA'
              }}>Students</button>
          </div>

          {/* Content */}
          {activeTab === "chat" ? (
            <>
              <div style={{ flex: 1, padding: '10px', overflowY: 'auto' }}>
                {chat.length === 0 ? <p style={{ textAlign: 'center', color: '#888' }}>No messages</p> :
                  chat.map((m, i) => (
                    <div key={i} style={{ marginBottom: 8 }}>
                      <strong>{m.role === 'teacher' ? "Teacher" : m.from}: </strong>{m.message}
                    </div>
                  ))}
              </div>
              <div style={{ display: 'flex', padding: 8, borderTop: '1px solid #EEE', gap: 6 }}>
                <input
                  type="text"
                  value={msg}
                  onChange={(e) => setMsg(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && sendMsg()}
                  placeholder="Type..."
                  style={{ flex: 1, padding: '6px 10px', border: '1px solid #DDD', borderRadius: 6 }}
                />
                <button onClick={sendMsg} style={{
                  background: '#7765DA', color: 'white', border: 'none',
                  borderRadius: 6, padding: '6px 12px'
                }}>Send</button>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
              {students.map((s) => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F0F0F0' }}>
                  <span>{s.name}</span>
                  <button onClick={() => removeStudent(s.id)} style={{ fontSize: 12, color: '#FF6B6B', border: 'none', background: 'none', cursor: 'pointer' }}>Kick Out</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
