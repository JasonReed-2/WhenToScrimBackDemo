var http = require('http').createServer();
const options = {
    cors: true,
    origins:["http://127.0.0.1:8080"]
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

const findPlayerIndex = (name) => {
    for (var i = 0; i < users.length; i++) {
        if (users[i].name === name) {
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

var sharedCalendar = createBlankCalendar(start, end, jump)

var users = []

const updateSharedCal = () => {
    sharedCalendar = createBlankCalendar(start, end, jump)
    for (var i = 0; i < users.length; i++) {
        let currCal = users[i].calendar
        for (var j = 0; j < currCal.length; j++) {
            for (var k = 0; k < currCal[j].length; k++) {
                sharedCalendar[j][k] += currCal[j][k]
            }
        }
    }
}

io.on('connection', (socket) => {
    console.log("new connection!")

    let currUser

    socket.on('updateCalendar', (calendar) => {
        console.log("New Update!")
        const user = users[findPlayerIndex(currUser)]
        if (user !== undefined) {
            user.calendar = calendar
        }
        updateSharedCal()
        io.emit('calendarUpdate', sharedCalendar)
    })

    socket.on('newUser', (userName) => {
        if(findPlayerIndex(userName) === -1) {
            users.push({
                name: userName,
                calendar: createBlankCalendar(start, end, jump)
            })
            io.emit('usersUpdate', users.length)
        }
        currUser = userName
        socket.emit('updatePersonalCal', users[findPlayerIndex(userName)].calendar)
    })

    io.emit('usersUpdate', users.length)
})