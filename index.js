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

const findPlayerIndex = (roomIdx, name) => {
    for (var i = 0; i < rooms[roomIdx].users.length; i++) {
        if (rooms[roomIdx].users[i].name === name) {
            return i
        }
    }
    return -1
}

const findRoomIndex = (roomID) => {
    for (var i = 0; i < rooms.length; i++) {
        if (rooms[i].id == roomID) {
            return i
        }
    }
    return -1
}

const randomIDGenerator = (rooms) => {
    while (true) {
        let number = Math.floor(Math.random() * 1000000)
        let duplicate = false
        for (let i = 0; i < rooms.length; i++) {
            if (rooms[i].id === number) {
                duplicate = true;
                break;
            }
        }
        if (duplicate === false) {
            return number;
        }
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

const createBlankCalendarByRoom = (roomIdx) => {
    return createBlankCalendarByParams(rooms[roomIdx].start, rooms[roomIdx].end, rooms[roomIdx].jump, rooms[roomIdx].daysOfWeekArray)
}

var rooms = []

const updateSharedCal = (roomIdx) => {
    rooms[roomIdx].sharedCalendar = createBlankCalendarByRoom(roomIdx)
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

    let currUserIdx
    let currRoomIdx

    socket.on('updateCalendar', (calendar) => {
        if (currRoomIdx === undefined) return
        const room = rooms[currRoomIdx]
        const user = room.users[currUserIdx]
        if (user !== undefined) {
            user.calendar = calendar
        }
        updateSharedCal(currRoomIdx)
        io.to('' + currRoomIdx).emit('calendarUpdate', room.sharedCalendar)
    })

    socket.on('newUser', (userName) => {
        if (currRoomIdx === undefined) return
        let userIdx = findPlayerIndex(currRoomIdx, userName)
        if(userIdx === -1) {
            rooms[currRoomIdx].users.push({
                name: userName,
                calendar: createBlankCalendarByRoom(currRoomIdx)
            })
            userIdx = findPlayerIndex(currRoomIdx, userName)
            io.to('' + currRoomIdx).emit('usersUpdate', rooms[currRoomIdx].users.length)
        }
        currUserIdx = userIdx
        socket.emit('updatePersonalCal', rooms[currRoomIdx].users[userIdx].calendar)
        socket.emit('updateUsername', userName)
    })

    socket.on('newRoom', (roomName, start, end, jump) => {
        let startInt = parseInt(start)
        let endInt = parseInt(end)
        let jumpInt = parseInt(jump)
        let randomID = randomIDGenerator(rooms)
        rooms.push({
            id: randomID,
            roomName: roomName,
            users: [],
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
        })
        socket.emit('retrieveID', randomID)
    })

    socket.on('joinRoom', (roomId) => {
        let roomIdx = findRoomIndex(roomId)
        if (roomIdx !== -1) {
            currRoomIdx = roomIdx
            socket.join('' + currRoomIdx)
            updateSharedCal(currRoomIdx)
            currUserIdx = undefined
            io.to('' + currRoomIdx).emit('calendarUpdate', rooms[currRoomIdx].sharedCalendar)
            io.to('' + currRoomIdx).emit('usersUpdate', rooms[currRoomIdx].users.length)
            socket.emit('updatePersonalCal', createBlankCalendarByRoom(currRoomIdx))
            socket.emit('updateRoom', rooms[currRoomIdx].roomName)
            socket.emit('calendarParametersUpdate', rooms[currRoomIdx].start, rooms[currRoomIdx].end, rooms[currRoomIdx].jump)
        }
    })

    socket.on('clear', () => {
        rooms = []
    })
})