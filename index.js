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

const determineYDim = (start, end, jump) => {
    let count = 0;
    for (var i = start; i <= end; i+=jump) {
        count++
    }
    return count;
}

const randomIDGenerator = (rooms) => {
    while (true) {
        let number = Math.floor(Math.random() * 1000000)
        if (!(number in rooms)) return number
    }
}

const createBlankCalendarByParams = (start, end, jump, daysOfWeekArray) => {
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

const createBlankCalendarByRoom = (roomId) => {
    return createBlankCalendarByParams(rooms[roomId].start, rooms[roomId].end, rooms[roomId].jump, rooms[roomId].daysOfWeekArray)
}

var rooms = {}

const updateSharedCal = (roomId) => {
    rooms[roomId].sharedCalendar = createBlankCalendarByRoom(roomId)
    const users = rooms[roomId].users
    for (const user in users) {
        let currCal = users[user].calendar
        for (var j = 0; j < currCal.length; j++) {
            for (var k = 0; k < currCal[j].length; k++) {
                rooms[roomId].sharedCalendar[j][k] += currCal[j][k]
            }
        }
    }
}

io.on('connection', (socket) => {

    let currUserName
    let currRoomId

    socket.on('updateCalendar', (calendar) => {
        if (currRoomId === undefined) return
        const room = rooms[currRoomId]
        const user = room.users[currUserName]
        if (user !== undefined) {
            user.calendar = calendar
        }
        updateSharedCal(currRoomId)
        io.to('' + currRoomId).emit('calendarUpdate', room.sharedCalendar)
    })

    socket.on('newUser', (userName) => {
        if (currRoomId === undefined) return
        const currentRoom = rooms[currRoomId]
        if (!(userName in currentRoom.users)) {
            currentRoom.users[userName] = {
                name: userName,
                calendar: createBlankCalendarByRoom(currRoomId)
            }
            io.to('' + currRoomId).emit('usersUpdate', Object.keys(rooms[currRoomId].users).length)
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
        rooms[randomID] = {
            id: randomID,
            roomName: roomName,
            users: {},
            sharedCalendar: createBlankCalendarByParams(startInt, endInt, jumpInt, daysOfWeekArray),
            start: startInt,
            end: endInt,
            jump: jumpInt,
            daysOfWeekArray: [
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
                "Sunday"
            ]
        }
        socket.emit('retrieveID', randomID)
    })

    socket.on('joinRoom', (roomId) => {
        currRoomId = roomId
        socket.join('' + currRoomId)
        updateSharedCal(currRoomId)
        currUserName = undefined
        io.to('' + currRoomId).emit('calendarUpdate', rooms[currRoomId].sharedCalendar)
        io.to('' + currRoomId).emit('usersUpdate', Object.keys(rooms[currRoomId].users).length)
        socket.emit('updatePersonalCal', createBlankCalendarByRoom(currRoomId))
        socket.emit('updateRoom', rooms[currRoomId].roomName)
        socket.emit('calendarParametersUpdate', rooms[currRoomId].start, rooms[currRoomId].end, rooms[currRoomId].jump)
    })

    socket.on('clear', () => {
        rooms = {}
    })
})