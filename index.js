var express = require('express');
var socket = require('socket.io');
var authRoutes = require('./routes/auth-routes');
var passportSetup = require('./config/passport-setup');
var mongoose = require('mongoose');
var passport = require('passport');
var keys = require('./config/keys');
var botSetup = require('./config/bot-setup');
var Group = require('./models/group-model');
var User = require('./models/user-model');

var session = require("express-session")({
    secret: "my-secret",
    resave: true,
    saveUninitialized: true
});
var sharedsession = require("express-socket.io-session");

var app = express();

var dates = [];
var timePeriods = [];
var botResponse = '';
var timePeriods2 = [];
var minStartOrEnd;
var intent;

var thisRoom;

app.set('view engine', 'ejs');

app.use('/assets', express.static('assets'));

app.use(session);

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect('mongodb://localhost/confer', function() {
    console.log('connected to mongodb');
});

app.use('/auth', authRoutes);

app.get('/', (req, res) => {
    res.render('home');
});

function saveQueryResults(query, data, callback) {
    var sessionClient = botSetup.sessionClient;
    const request = {
      session: botSetup.sessionPath,
      queryInput: {
        text: {
          text: query,
          languageCode: botSetup.languageCode,
        },
      },
    };
    sessionClient
      .detectIntent(request)
      .then(responses => {
        //console.log('Detected intent');
        const result = responses[0].queryResult;
        //console.log(result.parameters.fields.date.listValue.values);
        //console.log(result.parameters.fields['time-period'].listValue.values);
        //console.log(`  Query: ${result.queryText}`);
        //console.log(`  Response: ${result.fulfillmentText}`);
        if (result.intent) {
          //console.log(`  Intent: ${result.intent.displayName}`);
          intent = result.intent.displayName;
          if (result.intent.displayName == 'availability (time periods)') {
              dates = result.parameters.fields.date.listValue.values;
              timePeriods = result.parameters.fields['time-period'].listValue.values;
              botResponse = result.fulfillmentText;
              callback();
          } else if (result.intent.displayName == 'availability (prepositions)') {
              dates = result.parameters.fields.date.listValue.values;
              var times = result.parameters.fields.time.listValue.values;
              var preps = result.parameters.fields.Preposition.listValue.values;
              getTimePeriod(times[0].stringValue, preps[0].stringValue); //do this for all times/dates
              botResponse = result.fulfillmentText;
              callback();
          } else {
              botResponse = result.fulfillmentText;
              io.sockets.in(data.room).emit('chat', {
                  message: data.message,
                  handle: data.handle,
                  table: [],
                  botResponse: botResponse
              });
          }
        } else {
          //console.log(`  No intent matched.`);
        }
      })
      .catch(err => {
        console.error('ERROR:', err);
      });
}

function getTimePeriod(time, preposition) {
    if (preposition == 'at') {
        var startTime = new Date(time);
        var endTime = new Date(time);
        endTime.setHours(startTime.getHours()+1); //check that this doesn't go over
        timePeriods2.push({
            startTime: startTime.getHours(),
            endTime: endTime.getHours()
        });
        minStartOrEnd = startTime.getMinutes();
    } else if (preposition == 'before') {
        var endTime = new Date(time);
        timePeriods2.push({
            startTime: 0,
            endTime: endTime.getHours()
        });
        minStartOrEnd = endTime.getMinutes();
    } else if (preposition == 'after') {
        var startTime = new Date(time);
        timePeriods2.push({
            startTime: startTime.getHours(),
            endTime: 24
        });
        minStartOrEnd = startTime.getMinutes();
    } else {
        console.log('bad preposition: ' + preposition);
    }
}

app.get('/chatroom', (req, res) => {
    //console.log(req);
    if (req.isAuthenticated()) {
        console.log(req.user);
        //TODO change this to get the room for the user
        Group.findOne({tableNum: 1}).then((record) => {
            if (record) {
                res.render('chatroom', {username: req.user.username, id: req.user.id, messages: record.messages});
            } else {
                res.render('chatroom', {username: req.user.username, id: req.user.id, messages: []});
            }
        });
    } else {
        res.redirect('/');
    }
});

var server = app.listen(3000, function() {
    console.log('listening on port 3000');
});

var io = socket(server);

io.use(sharedsession(session));

io.on('connection', (socket) => {

    console.log('made socket connection', socket.id);

    // once a client has connected, we expect to get a ping from them saying what room they want to join
    socket.on('room', function(room) {
        console.log('joining room: ' + room);
        socket.join(room);
        socket.room = room;
    });
    //https://gist.github.com/crtr0/2896891
    //https://gist.github.com/kylewelsby/2b49d2db31d45b939479
    //https://www.tutorialspoint.com/socket.io/socket.io_rooms.htm
    //https://socket.io/docs/rooms-and-namespaces/#Rooms

    // Handle chat event
    socket.on('chat', function(data){
        //io.sockets.emit('chat', data);
        //console.log(socket.handshake.session.passport.user);
        //var thisUser = socket.handshake.session.passport.user;
        Group.findOne({roomName: data.room}).then((record) => {
            if (!record) {
                initMT(data);
            } else {
                record.messages.push({
                    user: data.handle,
                    content: data.message,
                    timeSent: (new Date())
                });
                record.save();
            }
        });
        if (data.message.substring(0, 5) == '#bot ') {
            saveQueryResults(data.message.substring(5), data, function() {
                updateGroup(data);
            });
        } else {
            io.sockets.in(data.room).emit('chat', {
                message: data.message,
                handle: data.handle,
                table: []
            });
        }
    });

    socket.on('typing', function(data) {
        socket.broadcast.to(data.room).emit('typing', data.handle);
    });

});

function initWeeks(week1, week2, week3, week4) {
    initWeek(week1);
    initWeek(week2);
    initWeek(week3);
    initWeek(week4);
}

function initMT(data) {
    var table = [], week1 = [], week2 = [], week3 = [], week4 = [];
    initTable(table);
    initWeeks(week1, week2, week3, week4);
    var users = [];
    users.push(data.handle);
    var messages = [];
    messages.push({
        user: data.handle,
        content: data.message,
        timeSent: (new Date())
    });
    new Group({
        tableNum: 1,
        week1: week1,
        week2: week2,
        week3: week3,
        week4: week4,
        monthView: table,
        users: users,
        messages: messages,
        roomName: data.room
    }).save().then((newMT) => {
        console.log('new MT created');
    });
}

function changeTableValues(monthView, week1, week2, week3, week4, data) {
    console.log(intent);
    console.log(timePeriods[0]);
    if (intent == 'availability (time periods)') {
        var availDate = new Date(dates[0].stringValue); //go through all dates
        var availTimeStart = new Date(timePeriods[0].structValue.fields.startTime.stringValue).getHours();
        var availTimeEnd = new Date(timePeriods[0].structValue.fields.endTime.stringValue).getHours();
        var availMinStart = new Date(timePeriods[0].structValue.fields.startTime.stringValue).getMinutes();
        var availMinEnd = new Date(timePeriods[0].structValue.fields.endTime.stringValue).getMinutes();
        var startQuarter =  Math.floor(availMinStart / 15);
        var endQuarter = Math.ceil(availMinEnd / 15);
        var lastHour = false;
    } else if (intent == 'availability (prepositions)'){
        var availDate = new Date(dates[0].stringValue); //go through all dates
        var availTimeStart = timePeriods2[0].startTime;
        var availTimeEnd = timePeriods2[0].endTime;
        var availMinStart = minStartOrEnd;
        var availMinEnd = minStartOrEnd;
        var startQuarter =  Math.floor(availMinStart / 15);
        var endQuarter = Math.ceil(availMinEnd / 15);
        var lastHour = (availMinEnd == 24);
    }
    populateSlots(availDate, availTimeStart, availTimeEnd, availMinStart, availMinEnd, startQuarter, endQuarter, lastHour);
    function populateSlots(availDate, availTimeStart, availTimeEnd, availMinStart, availMinEnd, startQuarter, endQuarter, lastHour) {
        for (var i = 0; i < 28; i++) {
            if (equalDates(new Date(monthView[i].date), availDate)) {
                monthView[i].available.push(data.handle); //check if table[i] contains data.handle already
                var weekArr = getWeek(i, week1, week2, week3, week4);
                if (availTimeStart == availTimeEnd && startQuarter < endQuarter) {
                    for (var k = startQuarter; k < endQuarter; k++) {
                        weekArr[(i % 7)][availTimeStart][k].push({user: data.handle});
                    }
                } else {
                    for (var k = startQuarter; k < 4; k++) {
                        weekArr[(i % 7)][availTimeStart][k].push({user: data.handle}); //first hour
                    }
                    for (var k = 0; k < endQuarter; k++) {
                        weekArr[(i % 7)][availTimeEnd][k].push({user: data.handle}); //last hour
                    }
                    for (var j = availTimeStart + 1; j < availTimeEnd; j++) { //rest of hours
                        for (var k = 0; k < 4; k++) {
                            weekArr[(i % 7)][j][k].push({user: data.handle}); //check if it contains data.handle already
                        }
                    }
                    if (lastHour) {
                        for (var k = 0; k < 4; k++) {
                            weekArr[(i % 7)][23][k].push({user: data.handle}); //check if it contains data.handle already
                        }
                    }
                }
                //console.log(weekArr);
            }
        }
    }
}

function contains(users, handle) {
    for (var i = 0; i < users.length; i++) {
        if (users[i] == handle) {
            return true;
        }
    }
    return false;
}

function updateGroup(data) {
    Group.findOne({roomName: data.room}).then((currentTable) => {
        console.log('found table');
        if (!currentTable.users || !contains(currentTable.users, data.handle)) {
            console.log('adding handle to users');
            currentTable.users.push(data.handle);
        }
        changeTableValues(currentTable.monthView, currentTable.week1, currentTable.week2, currentTable.week3, currentTable.week4, data);
        var bestTimes = getBestTimes(currentTable.week1, currentTable.week2, currentTable.week3, currentTable.week4);
        var datesTimes = getDatesTimes(bestTimes);
        var bestPeriods = getBestPeriods(datesTimes);
        io.sockets.in(data.room).emit('chat', {
            message: data.message,
            handle: data.handle,
            table: currentTable.monthView,
            week1: currentTable.week1,
            week2: currentTable.week2,
            week3: currentTable.week3,
            week4: currentTable.week4,
            numUsers: currentTable.users.length,
            datesTimes: datesTimes,
            botResponse: botResponse,
            bestPeriods: bestPeriods
        });
        currentTable.save();
    });
}

function getDatesTimes(bestTimes) {
    var result = [];
    for (var i = 0; i < bestTimes.length; i++) {
        var date = getDateFromIndices(bestTimes[i].weekNum, bestTimes[i].indexInWeek);
        var day = date.getDay();
        var month = date.getMonth();
        var date = date.getDate();
        result.push({
            day: day,
            month: month,
            date: date,
            hour: bestTimes[i].indexInDay,
            quarter: bestTimes[i].indexInHour
        });
    }
    //console.log(result);
    return result;
}

function getBestPeriods(datesTimes) {
    var result = [];
    var i = 0;
    console.log(datesTimes);
    var endTimes = [];
    while (i < datesTimes.length) {
        var j = i;
        while (j + 1 < datesTimes.length && consecutive(datesTimes[j], datesTimes[j + 1])) {
            j++;
        }
        console.log('start of period: ');
        console.log(datesTimes[i].hour);
        console.log(datesTimes[i].quarter);
        console.log('end of period: ');
        console.log(datesTimes[j].hour);
        console.log(datesTimes[j].quarter);
        result.push({
            start: datesTimes[i],
            end: getNextInterval(datesTimes[j])
        });
        i = j + 1;
    }
    console.log(result);
    return result;
}

function getNextInterval(interval) {
    var quarter;
    var hour;
    if (interval.quarter == 3) {
        quarter = 0;
        hour = interval.hour + 1;
    } else {
        quarter = interval.quarter + 1;
        hour = interval.hour;
    }
    return ({
        day: interval.day,
        month: interval.month,
        date: interval.date,
        hour: hour,
        quarter: quarter
    });
}

function consecutive(dt1, dt2) {
    if (dt1.date != dt2.date) return false;
    if (dt1.hour == dt2.hour && dt1.quarter + 1 == dt2.quarter) {
        console.log('same hour, one quarter apart');
        return true;
    } else if (dt1.hour + 1 == dt2.hour && dt1.quarter == 3 && dt2.quarter == 0) {
        return true;
    }
    return false;
}

function getDateFromIndices(weekNum, indexInWeek) {
    var sunDate = getSunDate();
    var currDate = new Date();
    currDate.setDate(sunDate.getDate() + (weekNum * 7 + indexInWeek));
    return currDate;
}

function getSunDate() {
    var today = new Date();
    var sunDate = new Date();
    var ctr = 0;
    while (sunDate.getDay() != 0) {
        var sunDate = new Date();
        sunDate.setDate(today.getDate() - ctr);
        ctr += 1;
    }
    return sunDate;
}

function getBestTimes(week1, week2, week3, week4) {
    var weeks = [week1, week2, week3, week4];
    var max = weeks[0][0][0][0].length;
    var weekNum = 0;
    var indexInWeek = 0;
    var indexInDay = 0;
    var indexInHour = 0;
    for (var k = 0; k < weeks.length; k++) {
        for (var i = 0; i < weeks[k].length; i++) {
            for (var j = 0; j < weeks[k][i].length; j++) {
                for (var l = 0; l < weeks[k][i][j].length; l++) {
                    if (weeks[k][i][j][l].length > max) {
                        console.log(weeks[k][i][j][l].length);
                        max = weeks[k][i][j][l].length;
                    }
                }
            }
        }
    }
    var bests = [];
    for (var k = 0; k < weeks.length; k++) {
        for (var i = 0; i < weeks[k].length; i++) {
            for (var j = 0; j < weeks[k][i].length; j++) {
                for (var l = 0; l < weeks[k][i][j].length; l++) {
                    if (weeks[k][i][j][l].length == max) {
                        bests.push({
                            weekNum: k,
                            indexInWeek: i,
                            indexInDay: j,
                            indexInHour: l
                        });
                    }
                }
            }
        }
    }
    return bests;
}

function getWeek(i, w1, w2, w3, w4) {
    if (i < 7) {
        return w1;
    } else if (i < 14) {
        return w2;
    } else if (i < 21) {
        return w3;
    } else {
        return w4;
    }
}

function initWeek(weekArr) {
    for (var i = 0; i < 7; i++) {
        var hours = [];
        for (var j = 0; j < 24; j++) {
            var fifteenMinIntervals = [];
            for (var k = 0; k < 4; k++) {
                fifteenMinIntervals.push([]);
            }
            hours.push(fifteenMinIntervals);
        }
        weekArr.push(hours);
    }
}

function initTable(table) {
    var sunDate = getSunDate();
    for (var i = 0; i < 28; i++) {
        var currDate = new Date();
        currDate.setDate(sunDate.getDate() + i);
        table.push({
            date: currDate,
            available: []
        });
    }
}

function equalDates(date1, date2) {
    return date1.getYear() == date2.getYear() && date1.getMonth() == date2.getMonth() && date1.getDate() == date2.getDate();
}
