class Room {
    constructor(roomName, start, end, jump, roomId) {
        this.roomName = roomName
        this.start = start
        this.end = end
        this.jump = jump
        this.users = {}
        this.roomId = roomId
        this.daysOfWeekArray = [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday"
        ]
        this.sharedCalendar = this.createBlankCalendar()
    }

    determineYDim() {
        let count = 0;
        for (var i = this.start; i <= this.end; i+=this.jump) {
            count++
        }
        return count;
    }

    createBlankCalendar() {
        let ret = []
        const yDim = this.determineYDim()
        for (var i = 0; i < this.daysOfWeekArray.length; i++) {
            ret.push([])
            for (var j = 0; j < yDim; j++) {
                ret[i].push(0)
                ret[i][j] = 0
            }
        }
        return ret;
    }

    updateSharedCal() {
        this.sharedCalendar = this.createBlankCalendar()
        for (const user in this.users) {
            let currCal = this.users[user].calendar
            for (var j = 0; j < currCal.length; j++) {
                for (var k = 0; k < currCal[j].length; k++) {
                    this.sharedCalendar[j][k] += currCal[j][k]
                }
            }
        }
    }
}

class User {
    constructor(name, room) {
        this.name = name
        this.room = room
        this.calendar = room.createBlankCalendar()
    }
}

module.exports = {Room, User}