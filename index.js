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

const start = 300;
const end = 600;
const jump = 15;

const determineYDim = (start, end, jump) => {
    let count = 0;
    for (var i = start; i <= end; i+=jump) {
        count++
    }
    return count;
}

const findPlayerIndex = (roomIdx, name) => {
    for (var i = 0; i < rooms[roomIdx].users.length; i++) {
        if (rooms[roomIdx].users[i].name === name) {
            return i
        }
    }
    return -1
}

const findRoomIndex = (room) => {
    for (var i = 0; i < rooms.length; i++) {
        if (rooms[i].roomName === room) {
            return i
        }
    }
    return -1
}

const createBlankCalendar = (start, end, jump) => {
    let ret = []
    const yDim = determineYDim(start, end, jump)
    for (var i = 0; i < daysOfWeekArray.length; i++) {
        ret.push([])
        for (var j = 0; j < yDim; j++) {
            ret[i].push(0)
            ret[i][j] = 0
        }
    }
    return ret;
}

var rooms = []

const updateSharedCal = (roomIdx) => {
    rooms[roomIdx].sharedCalendar = createBlankCalendar(start, end, jump)
    const users = rooms[roomIdx].users
    for (var i = 0; i < users.length; i++) {
        let currCal = users[i].calendar
        for (var j = 0; j < currCal.length; j++) {
            for (var k = 0; k < currCal[j].length; k++) {
                rooms[roomIdx].sharedCalendar[j][k] += currCal[j][k]
            }
        }
    }
}

io.on('connection', (socket) => {
    console.log("new connection!")

    let currUserIdx
    let currRoomIdx

    socket.on('updateCalendar', (calendar) => {
        if (currRoomIdx === undefined) return
        console.log("New Update!")
        const room = rooms[currRoomIdx]
        const user = room.users[currUserIdx]
        if (user !== undefined) {
            user.calendar = calendar
        }
        updateSharedCal(currRoomIdx)
        io.to('' + currRoomIdx).emit('calendarUpdate', rooms[currRoomIdx].sharedCalendar)
    })

    socket.on('newUser', (userName) => {
        console.log(currRoomIdx)
        if (currRoomIdx === undefined) return
        let userIdx = findPlayerIndex(currRoomIdx, userName)
        if(userIdx === -1) {
            console.log("Creating new user!")
            rooms[currRoomIdx].users.push({
                name: userName,
                calendar: createBlankCalendar(start, end, jump)
            })
            userIdx = findPlayerIndex(currRoomIdx, userName)
            console.log(rooms[currRoomIdx].users.length)
            io.to('' + currRoomIdx).emit('usersUpdate', rooms[currRoomIdx].users.length)
        }
        currUserIdx = userIdx
        socket.emit('updatePersonalCal', rooms[currRoomIdx].users[userIdx].calendar)
        socket.emit('updateUsername', userName)
        let usersList = []
        for (let i = 0; i < rooms[currRoomIdx].users.length; i++) {
            usersList.push(rooms[currRoomIdx].users[i].name)
        }
        io.to('' + currRoomIdx).emit('updateUsersList', usersList)
    })

    socket.on('newRoom', (roomName) => {
        console.log("New Room!")
        let roomIdx = findRoomIndex(roomName)
        if(findRoomIndex(roomName) === -1) {
            console.log("Creating a New Room!")
            rooms.push({
                roomName: roomName,
                users: [],
                sharedCalendar: createBlankCalendar(start, end, jump)
            })
            roomIdx = findRoomIndex(roomName)
            console.log("Room idx: " + roomIdx)
        }
        currRoomIdx = roomIdx
        socket.join('' + currRoomIdx)

        updateSharedCal(currRoomIdx)
        currUserIdx = undefined

        io.to('' + currRoomIdx).emit('calendarUpdate', rooms[currRoomIdx].sharedCalendar)
        io.to('' + currRoomIdx).emit('usersUpdate', rooms[currRoomIdx].users.length)
        socket.emit('updatePersonalCal', createBlankCalendar(start, end, jump))
        socket.emit('updateRoom', roomName)
        socket.emit('updateUsername', '')
        const roomNames = rooms.map((item) => {
            return item.roomName
        })
        let usersList = []
        for (let i = 0; i < rooms[currRoomIdx].users.length; i++) {
            usersList.push(rooms[currRoomIdx].users[i].name)
        }
        io.emit('updateAvailableRooms', (roomNames))
        socket.emit('updateUsersList', (usersList))
    })

    socket.on('clear', () => {
        rooms = []
    })
    const roomNames = rooms.map((item) => {
        return item.roomName
    })
    io.emit('updateAvailableRooms', (roomNames))
})