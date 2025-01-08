const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["https://creative-mousse-d64585.netlify.app"],
    methods: ["GET", "POST"]
  }
});

let rooms = {};

// Serve frontend files
app.use(express.static(__dirname));

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('create-room', (roomName) => {
    if (!rooms[roomName]) {
      rooms[roomName] = {
        players: [socket.id],
        board: Array(9).fill(null),
        turn: 'X',
        timer: null
      };
      socket.join(roomName);
      io.to(socket.id).emit('room-waiting');
      updateRoomList();
    }
  });

  socket.on('join-room', (roomName) => {
    const room = rooms[roomName];
    if (room && room.players.length < 2) {
        room.players.push(socket.id);
        socket.join(roomName);
        console.log(`Player ${socket.id} joined room: ${roomName}`);

        io.to(room.players[0]).emit('init', { symbol: 'X', startingTurn: true });
        io.to(socket.id).emit('init', { symbol: 'O', startingTurn: false });

        io.to(roomName).emit('start-game', { board: room.board, turn: room.turn });
        startTimer(roomName);
    } else {
        io.to(socket.id).emit('room-full', { message: "Room is full or doesn't exist." });
    }
  });

  socket.on('request-room-list', () => {
    updateRoomList();
  });

  function updateRoomList() {
    const availableRooms = Object.keys(rooms).filter((room) => rooms[room].players.length < 2);
    io.emit('room-list', availableRooms);
  }

  socket.on('make-move', (index) => {
    const roomName = [...socket.rooms][1];
    const room = rooms[roomName];
    if (room && room.board[index] === null) {
      room.board[index] = room.turn;
      room.turn = room.turn === 'X' ? 'O' : 'X';

      io.to(roomName).emit('update-game', { board: room.board, turn: room.turn });
      clearTimeout(room.timer);
      startTimer(roomName);

      const winner = checkWinner(room.board);
      if (winner || !room.board.includes(null)) {
        io.to(roomName).emit('game-over', { winner: winner || 'Draw' });
        delete rooms[roomName];
        updateRoomList();
      }
    }
  });

  function startTimer(roomName) {
    const room = rooms[roomName];
    if (room.players.length === 2) {
      room.timer = setTimeout(() => {
        io.to(roomName).emit('game-over', { winner: 'Opponent' });
        delete rooms[roomName];
        updateRoomList();
      }, 60000); // 60 seconds timer
    }
  }

  socket.on('chat-message', (msg) => {
    const roomName = [...socket.rooms][1];
    io.to(roomName).emit('message', msg);
  });

  socket.on('disconnect', () => {
    for (const roomName in rooms) {
      const room = rooms[roomName];
      room.players = room.players.filter((id) => id !== socket.id);
      if (room.players.length === 0) {
        delete rooms[roomName];
      } else {
        io.to(roomName).emit('game-over', { winner: 'Opponent Disconnected' });
        delete rooms[roomName];
      }
    }
    updateRoomList();
    console.log('A user disconnected:', socket.id);
  });
});

server.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});

function checkWinner(board) {
  const winPatterns = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];

  for (const [a, b, c] of winPatterns) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}
