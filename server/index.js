import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*';

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ['GET', 'POST']
  }
});

// In-memory state
const polls = new Map(); // pollId -> { teacherSocketId, students: Map<socketId,{name,id}>, currentQuestion, pastQuestions }
const waitingStudents = new Map(); // socketId -> { name }
let activePollId = null; // single active poll to attach students quickly

function createPoll() {
  const id = uuidv4().slice(0, 6);
  polls.set(id, {
    id,
    teacherSocketId: null,
    students: new Map(),
    currentQuestion: null,
    pastQuestions: []
  });
  return polls.get(id);
}

// REST minimal endpoints
app.get('/health', (_, res) => res.json({ ok: true }));
app.post('/api/polls', (req, res) => {
  const poll = createPoll();
  res.json({ pollId: poll.id });
});

// Socket helpers
function canAskNewQuestion(poll) {
  if (!poll.currentQuestion) return true;
  const everyoneAnswered = poll.currentQuestion.totalAnswers >= poll.students.size && poll.students.size > 0;
  const finished = poll.currentQuestion.status !== 'active';
  return everyoneAnswered || finished;
}

function endQuestion(ioNamespace, poll, reason = 'ended') {
  if (!poll.currentQuestion) return;
  poll.currentQuestion.status = 'finished';
  clearTimeout(poll.currentQuestion._timerRef);
  const result = {
    questionId: poll.currentQuestion.id,
    text: poll.currentQuestion.text,
    options: poll.currentQuestion.options.map(({ id, text, count }) => ({ id, text, count })),
    totalAnswers: poll.currentQuestion.totalAnswers,
    durationSec: poll.currentQuestion.durationSec
  };
  poll.pastQuestions.unshift({ ...result, finishedAt: Date.now(), reason });
  ioNamespace.to(poll.id).emit('questionFinished', result);
  poll.currentQuestion = null;
}

function getLatestActivePoll() {
  // Map preserves insertion order; take the last poll that has a teacher
  let latest = null;
  for (const p of polls.values()) {
    if (p.teacherSocketId) latest = p;
  }
  return latest;
}

function findPollByStudentSocket(socketId) {
  for (const p of polls.values()) {
    if (p.students.has(socketId)) return p;
  }
  return null;
}

io.on('connection', (socket) => {
  // Join a poll room either as teacher or student
  socket.on('teacher:init', ({ pollId }) => {
    let poll = pollId && polls.get(pollId);
    if (!poll) {
      poll = createPoll();
    }
    poll.teacherSocketId = socket.id;
    activePollId = poll.id;
    socket.join(poll.id);
    socket.emit('teacher:ready', {
      pollId: poll.id,
      students: Array.from(poll.students.values()),
      currentQuestion: poll.currentQuestion ? {
        id: poll.currentQuestion.id,
        text: poll.currentQuestion.text,
        options: poll.currentQuestion.options.map(({ id, text, count }) => ({ id, text, count })),
        askedAt: poll.currentQuestion.askedAt,
        durationSec: poll.currentQuestion.durationSec,
        totalAnswers: poll.currentQuestion.totalAnswers,
        status: poll.currentQuestion.status
      } : null,
      pastQuestions: poll.pastQuestions
    });

    // Attach any waiting students to this newly active poll
    if (waitingStudents.size > 0) {
      for (const [sid, data] of waitingStudents.entries()) {
        const studentSocket = io.sockets.sockets.get(sid);
        if (!studentSocket) {
          waitingStudents.delete(sid);
          continue;
        }
        const student = { id: sid, name: String(data.name || '').trim().slice(0, 40) };
        poll.students.set(sid, student);
        studentSocket.join(poll.id);
        // notify student and roster
        io.to(poll.id).emit('roster:update', Array.from(poll.students.values()));
        studentSocket.emit('student:ready', {
          currentQuestion: poll.currentQuestion ? {
            id: poll.currentQuestion.id,
            text: poll.currentQuestion.text,
            options: poll.currentQuestion.options.map(({ id, text, count }) => ({ id, text, count })),
            askedAt: poll.currentQuestion.askedAt,
            durationSec: poll.currentQuestion.durationSec,
            totalAnswers: poll.currentQuestion.totalAnswers,
            status: poll.currentQuestion.status
          } : null,
          pastQuestions: poll.pastQuestions
        });
        waitingStudents.delete(sid);
      }
    }
  });

  socket.on('student:init', ({ pollId, name }) => {
    let poll = null;
    if (pollId && polls.get(pollId)) {
      poll = polls.get(pollId);
    } else if (activePollId && polls.get(activePollId)) {
      poll = polls.get(activePollId);
    } else {
      poll = getLatestActivePoll();
    }
    const studentName = String(name || '').trim().slice(0, 40);
    if (!poll) {
      // queue student until a teacher initializes a poll
      waitingStudents.set(socket.id, { name: studentName });
      socket.emit('student:waiting');
      return;
    }
    const student = { id: socket.id, name: studentName };
    poll.students.set(socket.id, student);
    socket.join(poll.id);
    io.to(poll.id).emit('roster:update', Array.from(poll.students.values()));
    socket.emit('student:ready', {
      currentQuestion: poll.currentQuestion ? {
        id: poll.currentQuestion.id,
        text: poll.currentQuestion.text,
        options: poll.currentQuestion.options.map(({ id, text, count }) => ({ id, text, count })),
        askedAt: poll.currentQuestion.askedAt,
        durationSec: poll.currentQuestion.durationSec,
        totalAnswers: poll.currentQuestion.totalAnswers,
        status: poll.currentQuestion.status
      } : null,
      pastQuestions: poll.pastQuestions
    });
  });

  socket.on('teacher:askQuestion', ({ pollId, text, options, durationSec }) => {
    const poll = polls.get(pollId);
    if (!poll) return socket.emit('errorMessage', 'Poll not found');
    if (poll.teacherSocketId !== socket.id) return socket.emit('errorMessage', 'Not authorized');
    if (!canAskNewQuestion(poll)) return socket.emit('errorMessage', 'Wait until previous question finishes');

    const questionId = uuidv4();
    const normalizedOptions = (options && options.length ? options : ['A', 'B', 'C', 'D']).map((t) => ({
      id: uuidv4(),
      text: String(t).slice(0, 80),
      count: 0
    }));
    const duration = Number(durationSec) > 0 ? Math.min(Number(durationSec), 300) : 60;
    const question = {
      id: questionId,
      text: String(text || 'Question').slice(0, 140),
      options: normalizedOptions,
      askedAt: Date.now(),
      durationSec: duration,
      totalAnswers: 0,
      status: 'active',
      answeredBy: new Set(),
      _timerRef: null
    };
    poll.currentQuestion = question;
    // Start countdown timer
    question._timerRef = setTimeout(() => {
      endQuestion(io, poll, 'timeout');
    }, duration * 1000);

    io.to(poll.id).emit('questionAsked', {
      id: question.id,
      text: question.text,
      options: question.options.map(({ id, text }) => ({ id, text })),
      askedAt: question.askedAt,
      durationSec: question.durationSec
    });
  });

  socket.on('student:submit', ({ pollId, questionId, optionId }) => {
    const poll = pollId ? polls.get(pollId) : findPollByStudentSocket(socket.id);
    if (!poll || !poll.currentQuestion) return;
    const q = poll.currentQuestion;
    if (q.id !== questionId || q.status !== 'active') return;
    if (q.answeredBy.has(socket.id)) return; // only once per student

    const option = q.options.find((o) => o.id === optionId);
    if (!option) return;
    option.count += 1;
    q.totalAnswers += 1;
    q.answeredBy.add(socket.id);

    // Emit incremental results for teacher
    io.to(poll.id).emit('results:update', {
      questionId: q.id,
      options: q.options.map(({ id, text, count }) => ({ id, text, count })),
      totalAnswers: q.totalAnswers,
      studentsTotal: poll.students.size
    });

    if (q.totalAnswers >= poll.students.size && poll.students.size > 0) {
      endQuestion(io, poll, 'all_answered');
    }
  });

  socket.on('teacher:endQuestion', ({ pollId }) => {
    const poll = polls.get(pollId);
    if (!poll) return;
    if (poll.teacherSocketId !== socket.id) return;
    endQuestion(io, poll, 'teacher_end');
  });

  socket.on('teacher:removeStudent', ({ pollId, studentId }) => {
    const poll = polls.get(pollId);
    if (!poll) return;
    if (poll.teacherSocketId !== socket.id) return;
    if (poll.students.has(studentId)) {
      const s = io.sockets.sockets.get(studentId);
     
      // 🔥 Tell the student they were kicked
    if (s) {
      s.emit('student:kicked');
      s.leave(poll.id);
      // optional: also close their socket if you really want
      // s.disconnect(true);
    }

      poll.students.delete(studentId);
      io.to(poll.id).emit('roster:update', Array.from(poll.students.values()));
    }
  });

  socket.on('chat:send', ({ pollId, from, message, role }) => {
    const poll = pollId ? polls.get(pollId) : findPollByStudentSocket(socket.id);
    if (!poll) return;
    const payload = {
      id: uuidv4(),
      at: Date.now(),
      from: String(from || '').slice(0, 40),
      role: role === 'teacher' ? 'teacher' : 'student',
      message: String(message || '').slice(0, 280)
    };
    io.to(poll.id).emit('chat:message', payload);
  });

  socket.on('disconnect', () => {
    // Remove student from any poll
    for (const poll of polls.values()) {
      if (poll.students.has(socket.id)) {
        poll.students.delete(socket.id);
        io.to(poll.id).emit('roster:update', Array.from(poll.students.values()));
      }
      if (poll.teacherSocketId === socket.id) {
        poll.teacherSocketId = null;
        if (activePollId === poll.id) {
          activePollId = null;
        }
      }
    }
    if (waitingStudents.has(socket.id)) {
      waitingStudents.delete(socket.id);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

