const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const rooms = {}; // Room storage

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('request-room-list', () => {
        socket.emit('room-list', Object.keys(rooms));
    });

    socket.on('create-room', (roomName) => {
        if (!rooms[roomName]) {
            rooms[roomName] = { players: [], board: Array(9).fill(null), turn: null };
            socket.join(roomName);
            rooms[roomName].players.push(socket.id);
            console.log(`Room created: ${roomName}`);
            io.emit('room-list', Object.keys(rooms));
            socket.emit('room-created', roomName);
            socket.emit('message', `Room '${roomName}' created. Waiting for opponent...`);
        } else {
            socket.emit('message', 'Room already exists. Try a different name.');
        }
    });

    socket.on('join-room', (roomName) => {
        if (rooms[roomName] && rooms[roomName].players.length < 2) {
            socket.join(roomName);
            rooms[roomName].players.push(socket.id);
            console.log(`User joined room: ${roomName}`);
            io.to(roomName).emit('player-joined', roomName);
            startGame(roomName);
            socket.emit('message', `Joined room '${roomName}'.`);
        } else {
            socket.emit('message', 'Room full or does not exist.');
        }
    });

    socket.on('make-move', (index) => {
        const roomName = getRoomOfSocket(socket);
        if (roomName) {
            const room = rooms[roomName];
            const playerIndex = room.players.indexOf(socket.id);

            // Validate turn and move
            if (playerIndex === (room.turn === 'X' ? 0 : 1) && room.board[index] === null) {
                room.board[index] = room.turn;
                room.turn = room.turn === 'X' ? 'O' : 'X'; // Toggle turn

                io.to(roomName).emit('update-game', {
                    board: room.board,
                    turn: room.turn,
                });

                // Check for win or draw
                const winner = checkWinner(room.board);
                if (winner) {
                    io.to(roomName).emit('game-over', { winner });
                    resetRoom(roomName);
                } else if (room.board.every(cell => cell !== null)) {
                    io.to(roomName).emit('game-over', { winner: 'Draw' });
                    resetRoom(roomName);
                }
            }
        }
    });

    socket.on('chat-message', (msg) => {
        const roomName = getRoomOfSocket(socket);
        if (roomName) {
            io.to(roomName).emit('message', msg);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
        for (const roomName in rooms) {
            const room = rooms[roomName];
            room.players = room.players.filter(id => id !== socket.id);
            if (room.players.length === 0) {
                delete rooms[roomName];
            }
        }
        io.emit('room-list', Object.keys(rooms));
    });

    function startGame(roomName) {
        const room = rooms[roomName];
        if (room.players.length === 2) {
            room.turn = 'X';
            io.to(room.players[0]).emit('init', {
                symbol: 'X',
                startingTurn: true
            });
            io.to(room.players[1]).emit('init', {
                symbol: 'O',
                startingTurn: false
            });
            io.to(roomName).emit('message', 'Game started! Player X goes first.');
        }
    }

    function getRoomOfSocket(socket) {
        for (const roomName in rooms) {
            if (rooms[roomName].players.includes(socket.id)) {
                return roomName;
            }
        }
        return null;
    }

    function checkWinner(board) {
        const winningCombinations = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
            [0, 4, 8], [2, 4, 6],           // Diagonals
        ];

        for (const [a, b, c] of winningCombinations) {
            if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                return board[a]; // Return 'X' or 'O'
            }
        }
        return null;
    }

    function resetRoom(roomName) {
        if (rooms[roomName]) {
            rooms[roomName].board = Array(9).fill(null);
            rooms[roomName].turn = null;
        }
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
