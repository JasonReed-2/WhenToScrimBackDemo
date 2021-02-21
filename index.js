const {Room, User} = require('./components')
var http = require('http').createServer();
const options = {
    cors: true,
    origins:['https://whentoscrimdemo.herokuapp.com/57799']
    //origins:['http://localhost:3000']
}

const PORT = process.env.PORT || 8080;
var io = require('socket.io')(http, options);

http.listen(PORT, () => {
    console.log(`listening on *:${PORT}`)
})

const daysOfWeekArray = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday"
]

const randomIDGenerator = (rooms) => {
    while (true) {
        let number = Math.floor(Math.random() * 1000000)
        if (!(number in rooms)) return number
    }
}

var rooms = {}

io.on('connection', (socket) => {

    let currUserName
    let currRoomId

    socket.on('updateCalendar', (calendar) => {
        if (currRoomId === undefined) return
        const currentRoom = rooms[currRoomId]
        const currentUser = currentRoom.users[currUserName]
        if (currentUser !== undefined) currentUser.calendar = calendar
        currentRoom.updateSharedCal()
        io.to('' + currRoomId).emit('calendarUpdate', currentRoom.sharedCalendar)
    })

    socket.on('newUser', (userName) => {
        if (currRoomId === undefined) return
        const currentRoom = rooms[currRoomId]
        if (!(userName in currentRoom.users)) {
            currentRoom.users[userName] = new User(userName, currentRoom)
            io.to('' + currRoomId).emit('usersUpdate', Object.keys(currentRoom.users).length)
        }
        currUserName = userName
        socket.emit('updatePersonalCal', currentRoom.users[currUserName].calendar)
        socket.emit('updateUsername', currUserName)
    })

    socket.on('newRoom', (roomName, start, end, jump) => {
        let startInt = parseInt(start)
        let endInt = parseInt(end)
        let jumpInt = parseInt(jump)
        let randomID = randomIDGenerator(rooms)
        rooms[randomID] = new Room(roomName, startInt, endInt, jumpInt, randomID)
        socket.emit('retrieveID', randomID)
    })

    socket.on('joinRoom', (roomId) => {
        currRoomId = roomId
        socket.join('' + currRoomId)
        rooms[currRoomId].updateSharedCal()
        currUserName = undefined
        io.to('' + currRoomId).emit('calendarUpdate', rooms[currRoomId].sharedCalendar)
        io.to('' + currRoomId).emit('usersUpdate', Object.keys(rooms[currRoomId].users).length)
        socket.emit('updatePersonalCal', rooms[currRoomId].createBlankCalendar())
        socket.emit('updateRoom', rooms[currRoomId].roomName)
        socket.emit('calendarParametersUpdate', rooms[currRoomId].start, rooms[currRoomId].end, rooms[currRoomId].jump)
    })

    socket.on('clear', () => {
        rooms = {}
    })
})