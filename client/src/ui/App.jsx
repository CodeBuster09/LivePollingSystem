import React, { useMemo, useState } from 'react'
import { TeacherView } from './TeacherView'
import { StudentView } from './StudentView'

export function App() {
  const [selectedRole, setSelectedRole] = useState(null)
  const [role, setRole] = useState(null)
  const [pollId, setPollId] = useState('')

  const content = useMemo(() => {
    if (role === 'teacher') return <TeacherView onBack={() => setRole(null)} />
    if (role === 'student') return <StudentView onBack={() => setRole(null)} />
    return null
  }, [role])

  if (role) {
    return (
      <div style={{ fontFamily: 'Inter, system-ui, Arial', padding: 16 }}>
        {content}
      </div>
    )
  }

  return (
    <div style={{
      fontFamily: 'Inter, system-ui, Arial',
      minHeight: '100vh',
      backgroundColor: '#F2F2F2',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      {/* Header/Logo */}
      <div style={{
       background: "linear-gradient(135deg, #7565D9, #4D0ACD)",
        borderRadius: '12px',
        padding: '8px 16px',
        marginBottom: '40px',
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
        <span style={{
          color: 'white',
          fontWeight: '600',
          fontSize: '14px'
        }}>
          Intervue Poll
        </span>
      </div>

      {/* Main Title */}
      <h1 style={{
        fontSize: '32px',
        fontWeight: '700',
        color: '#373737',
        textAlign: 'center',
        margin: '0 0 16px 0',
        lineHeight: '1.2'
      }}>
        Welcome to the Live Polling System
      </h1>

      {/* Instructions */}
      <p style={{
        fontSize: '16px',
        color: '#6E6E6E',
        textAlign: 'center',
        margin: '0 0 48px 0',
        maxWidth: '500px',
        lineHeight: '1.5'
      }}>
        Please select the role that best describes you to begin using the live polling system.
      </p>

      {/* Role Selection Cards */}
      <div style={{
        display: 'flex',
        gap: '24px',
        marginBottom: '48px',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        {/* Student Card */}
        <div style={{
          width: '280px',
          padding: '24px',
          backgroundColor: 'white',
          borderRadius: '16px',
          border: '2px solid',
          borderImage: selectedRole === 'student' ? 'linear-gradient(90deg, #5767D0, #7765DA) 1' : 'none',
          borderColor: selectedRole === 'student' ? 'transparent' : '#F2F2F2',
          boxShadow: selectedRole === 'student' ? '0 4px 20px rgba(119, 101, 218, 0.1)' : '0 4px 20px rgba(0, 0, 0, 0.05)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          transform: selectedRole === 'student' ? 'scale(1.02)' : 'scale(1)'
        }}
        onClick={() => setSelectedRole('student')}>
          <h3 style={{
            fontSize: '20px',
            fontWeight: '700',
            color: '#373737',
            margin: '0 0 12px 0'
          }}>
            I'm a Student
          </h3>
          <p style={{
            fontSize: '14px',
            color: '#6E6E6E',
            margin: '0',
            lineHeight: '1.5'
          }}>
            Lorem Ipsum is simply dummy text of the printing and typesetting industry
          </p>
        </div>

        {/* Teacher Card */}
        <div style={{
          width: '280px',
          padding: '24px',
          backgroundColor: 'white',
          borderRadius: '16px',
          border: '2px solid',
          borderImage: selectedRole === 'teacher' ? 'linear-gradient(90deg, #5767D0, #7765DA) 1' : 'none',
          borderColor: selectedRole === 'teacher' ? 'transparent' : '#F2F2F2',
          boxShadow: selectedRole === 'teacher' ? '0 4px 20px rgba(119, 101, 218, 0.1)' : '0 4px 20px rgba(0, 0, 0, 0.05)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          transform: selectedRole === 'teacher' ? 'scale(1.02)' : 'scale(1)'
        }}
        onClick={() => setSelectedRole('teacher')}>
          <h3 style={{
            fontSize: '20px',
            fontWeight: '700',
            color: '#373737',
            margin: '0 0 12px 0'
          }}>
            I'm a Teacher
          </h3>
          <p style={{
            fontSize: '14px',
            color: '#6E6E6E',
            margin: '0',
            lineHeight: '1.5'
          }}>
            Submit answers and view live poll results in real-time.
          </p>
        </div>
      </div>

      {/* Continue Button */}
      <button 
        onClick={() => selectedRole && setRole(selectedRole)}
        disabled={!selectedRole}
        style={{
          backgroundColor: selectedRole ? 'linear-gradient(90deg, #8F64E1, #1D68BD)' : '#E0E0E0',
          background: selectedRole ? 'linear-gradient(90deg, #8F64E1, #1D68BD)' : '#E0E0E0',
          color: selectedRole ? 'white' : '#9E9E9E',
          border: 'none',
          borderRadius: '12px',
          padding: '16px 48px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: selectedRole ? 'pointer' : 'not-allowed',
          transition: 'all 0.2s ease',
          boxShadow: selectedRole ? '0 4px 20px rgba(119, 101, 218, 0.3)' : '0 4px 20px rgba(0, 0, 0, 0.1)'
        }}
        onMouseEnter={(e) => {
          if (selectedRole) {
            e.target.style.transform = 'translateY(-2px)'
            e.target.style.boxShadow = '0 6px 25px rgba(119, 101, 218, 0.4)'
          }
        }}
        onMouseLeave={(e) => {
          if (selectedRole) {
            e.target.style.transform = 'translateY(0)'
            e.target.style.boxShadow = '0 4px 20px rgba(119, 101, 218, 0.3)'
          }
        }}>
        Continue
      </button>
    </div>
  )
}

