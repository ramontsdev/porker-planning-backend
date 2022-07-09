import 'dotenv/config'
import express from 'express'
import http from 'http'
import { Server, Socket } from 'socket.io'

enum SocketEvents {
  connect = 'connection',
  disconnect = 'disconnect',
  createRoom = 'Create_Room',
  joinRoom = 'Join_Room',
  sentRoom = 'Sent_Room',
  allUsers = 'All_Users',
  me = 'Me',
  toVote = 'To_Vote',
  showVotes = 'Show_Votes',
  changeVisibilityVotes = 'Change_Visibility_Votes'
}

const app = express()
const server = http.createServer(app)

const socketIo = new Server(server)

type User = {
  socketId: string,
  name: string,
  isAdmin: boolean,
  roomCode: string | null
  vote: number
}

let users: User[] = []

function findUserById(socketId: string) {
  return users.find(user => user.socketId === socketId)
}

socketIo.on(SocketEvents.connect, (socket: Socket) => {
  /* socket.on('User_Connected', (username: string) => {
    console.log(`${username} está conectado!`)
  }) */

  socket.on(SocketEvents.disconnect, () => {
    const user = findUserById(socket.id)

    if (!user) {
      return // console.log(`Socket: ${socket.id} se desconectou!`)
    }

    if (!user.roomCode) {
      return // console.log(`Socket: ${socket.id} se desconectou!`)
    }

    const filteredUsers = users.filter(userFiltered => userFiltered.socketId !== socket.id)
    users = filteredUsers

    socketIo.to(user.roomCode).emit('All_Users', users)
  })

  socket.on(SocketEvents.createRoom, (userData: User) => {
    let number = ''
    for (let i = 0; i < 3; i++) {
      number = number + Math.floor(Math.random() * 10)
    }

    const roomNumber = number;

    const user: User = {
      socketId: socket.id,
      name: userData.name,
      isAdmin: userData.isAdmin,
      roomCode: roomNumber,
      vote: 0
    }

    users.push(user)

    socket.join(roomNumber)
    socket.emit(SocketEvents.sentRoom, roomNumber)
    socket.emit(SocketEvents.me, user)
    socketIo.to(roomNumber).emit(SocketEvents.allUsers, users)
  })

  socket.on(SocketEvents.joinRoom, (userData: User) => {
    const user: User = {
      socketId: socket.id,
      name: userData.name,
      isAdmin: userData.isAdmin,
      roomCode: userData.roomCode,
      vote: 0
    }

    users.push(user)

    socket.join(user.roomCode!)
    socket.emit(SocketEvents.sentRoom, user.roomCode)
    socket.emit(SocketEvents.me, user)
    socketIo.to(user.roomCode!).emit(SocketEvents.allUsers, users)
  })

  socket.on(SocketEvents.toVote, (vote: number) => {
    const userFound = findUserById(socket.id)

    if (!userFound || !userFound.roomCode) return

    const filteredUsers = users.map(user => {
      if (user.socketId === socket.id) {
        user.vote = vote
        return user
      }

      return user
    })

    users = filteredUsers

    socketIo.to(userFound.roomCode).emit('Who_Voted', userFound)
    socketIo.to(userFound.roomCode).emit(SocketEvents.allUsers, users)
  })

  socket.on('Try_Change_Vote', () => {
    const userFound = findUserById(socket.id)

    if (!userFound || !userFound.roomCode) return

    socketIo.to(userFound.roomCode).emit('Who_Try_Change_Voted', userFound)
  })

  socket.on(SocketEvents.showVotes, (isVisible: boolean) => {
    const userFound = findUserById(socket.id)

    if (!userFound || !userFound.roomCode) return

    socketIo.to(userFound.roomCode).emit(SocketEvents.changeVisibilityVotes, !isVisible)
  })

  socket.on('Reset_Votes', () => {

    const userFound = findUserById(socket.id)

    const resetUsers = users.map((user) => {
      user.vote = 0
      return user
    })

    if (!userFound || !userFound.roomCode) return

    socketIo.to(userFound.roomCode).emit(SocketEvents.allUsers, resetUsers)
  })
})

const PORT = process.env.PORT || 3001

server.listen(PORT, () => console.log(`Server started at port ${PORT}`))
