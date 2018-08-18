var express = require('express');
//var cookieSession = require('cookie-session');
var socket = require('socket.io');
var authRoutes = require('./routes/auth-routes');
var passportSetup = require('./config/passport-setup');
var mongoose = require('mongoose');
var passport = require('passport');
var keys = require('./config/keys');
var botSetup = require('./config/bot-setup');
var MeetingTable = require('./models/meeting-table-model');
var User = require('./models/user-model');

var session = require("express-session")({
    secret: "my-secret",
    resave: true,
    saveUninitialized: true
});
var sharedsession = require("express-socket.io-session");

//var RedisStore = require('connect-redis')(session);
//var passportSocketIo = require("passport.socketio");

var app = express();

var dates = [];
var timePeriods = [];

app.set('view engine', 'ejs');

app.use('/assets', express.static('assets'));

/*
app.use(cookieSession({
    maxAge: 24 * 60 * 60 * 1000,
    keys: [keys.session.cookieKey]
}));
*/

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

function saveQueryResults(query, callback) {
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
          dates = result.parameters.fields.date.listValue.values;
          timePeriods = result.parameters.fields['time-period'].listValue.values;
          //console.log(timePeriods);
          callback();
        } else {
          //console.log(`  No intent matched.`);
        }
      })
      .catch(err => {
        console.error('ERROR:', err);
      });
}

app.get('/chatroom', (req, res) => {
    //console.log(req);
    if (req.isAuthenticated()) {
        console.log(req.user);
        MeetingTable.findOne({tableNum: 1}).then((record) => {
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

    // Handle chat event
    socket.on('chat', function(data){
        //io.sockets.emit('chat', data);
        //console.log(socket.handshake.session.passport.user);
        var message = data.message;
        //var thisUser = socket.handshake.session.passport.user;
        MeetingTable.findOne({tableNum: 1}).then((record) => {
            if (!record) {
                var table = [];
                var week1 = [];
                var week2 = [];
                var week3 = [];
                var week4 = [];
                initTable(table);
                initWeek(week1);
                initWeek(week2);
                initWeek(week3);
                initWeek(week4);
                var users = [];
                users.push(data.handle);
                var messages = [];
                messages.push({
                    user: data.handle,
                    content: message,
                    timeSent: (new Date())
                });
                new MeetingTable({
                    tableNum: 1,
                    week1: week1,
                    week2: week2,
                    week3: week3,
                    week4: week4,
                    monthView: table,
                    users: users,
                    messages: messages
                }).save().then((newMT) => {
                    console.log('new MT created');
                });
            } else {
                record.messages.push({
                    user: data.handle,
                    content: message,
                    timeSent: (new Date())
                });
                record.save();
            }
        });
        if (message.substring(0, 5) == '#bot ') {
            saveQueryResults(message.substring(5), function() {
                updateMeetingTable(data);
            });
        } else {
            io.sockets.emit('chat', {
                message: data.message,
                handle: data.handle,
                table: []
            });
        }

    });

    socket.on('typing', function(data) {
        socket.broadcast.emit('typing', data);
    });

});

function changeTableValues(monthView, week1, week2, week3, week4, data) {
    var availDate = new Date(dates[0].stringValue); //go through all dates
    var availTimeStart = new Date(timePeriods[0].structValue.fields.startTime.stringValue).getHours();
    var availTimeEnd = new Date(timePeriods[0].structValue.fields.endTime.stringValue).getHours();
    for (var i = 0; i < 28; i++) {
        if (equalDates(new Date(monthView[i].date), availDate)) {
            monthView[i].available.push(data.handle); //check if table[i] contains data.handle already
            var weekArr = getWeek(i, week1, week2, week3, week4);
            for (var j = availTimeStart; j < availTimeEnd; j++) {
                weekArr[(i % 7)][j].push(data.handle); //check if it contains data.handle already
            }
            //console.log(weekArr);
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

function updateMeetingTable(data) {
    MeetingTable.findOne({tableNum: 1}).then((currentTable) => {
        console.log('found table');
        if (!currentTable.users || !contains(currentTable.users, data.handle)) {
            console.log('adding handle to users');
            currentTable.users.push(data.handle);
        }
        changeTableValues(currentTable.monthView, currentTable.week1, currentTable.week2, currentTable.week3, currentTable.week4, data);
        var dateToMeet = getBestDay(currentTable.monthView);
        console.log(dateToMeet);
        console.log(currentTable.monthView);
        io.sockets.emit('chat', {
            message: data.message,
            handle: data.handle,
            table: currentTable.monthView,
            week1: currentTable.week1,
            week2: currentTable.week2,
            week3: currentTable.week3,
            week4: currentTable.week4,
            numUsers: currentTable.users.length,
            dateToMeet: dateToMeet
        });
        currentTable.save();
    });
}

function getBestTime(table) {
    var max = table[0].available.length;
    var date = table[0].date;
    for (var i = 0; i < table.length; i++) {
        if (table[i].available.length > max) {
            max = table[i].available.length;
            date = table[i].date;
        }
    }
    return date;
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
            hours.push([]);
        }
        weekArr.push(hours);
    }
}

function initTable(table) {
    var today = new Date();
    var sunDate = new Date();
    var ctr = 0;
    while (sunDate.getDay() != 0) {
        var sunDate = new Date();
        sunDate.setDate(today.getDate() - ctr);
        ctr += 1;
    }
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
