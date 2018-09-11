// Make connection
var socket = io.connect('http://localhost:3000');

var colors = ['FFFFF', 'CCE5FF', '99CCFF', '66B2FF', '3399FF'];
var room;

// Query DOM
var message = document.getElementById('message'),
      handle = document.getElementById('handle'),
      btn = document.getElementById('send'),
      output = document.getElementById('output');
      feedback = document.getElementById('feedback');

// Emit events
btn.addEventListener('click', function(){
  socket.emit('chat', {
      message: message.value,
      handle: handle.value,
      room: room
  });
  message.value = "";
});

message.addEventListener("keyup", function(event) {
     event.preventDefault();
     if (event.keyCode === 13) {
         btn.click();
     }
 }); //https://www.w3schools.com/howto/howto_js_trigger_button_enter.asp

message.addEventListener('keypress', function() {
    socket.emit('typing', handle.value);
});

// Listen for events
socket.on('chat', function(data){
    feedback.innerHTML = '';
    if (handle.value == data.handle) {
        output.innerHTML += '<div class="alert alert-primary" role="alert" style="float: right; width: 50rem; margin-top: 20px;"><p style="text-align: right;"><strong>' + data.handle + ': </strong>' + data.message + '</p></div>';
    } else {
        output.innerHTML += '<div class="alert alert-secondary" role="alert" style="float: left; width: 50rem; margin-top: 20px;"><p><strong>' + data.handle + ': </strong>' + data.message + '</p></div>';
    }
    if (data.table.length != 0) {
        //output.innerHTML += '<div class="alert alert-secondary" role="alert" style="float: left; width: 50rem; margin-top: 20px;"><p><strong>Bot: </strong>' + data.botResponse + displayBestTimes(data) + '</p></div>';
        output.innerHTML += '<div class="alert alert-secondary" role="alert" style="float: left; width: 50rem; margin-top: 20px;"><p><strong>Bot: </strong>' + data.botResponse + displayBestPeriods(data) + '</p></div>';
        updatedTable.innerHTML = '<table>' + getStr(data.table, true, data.numUsers) + '</table>';
        updatedTable.innerHTML += '<div id="t1" style="display: none;"><table>' + getStr2(data.week1, data.numUsers) + '</table></div>';
        updatedTable.innerHTML += '<div id="t2" style="display: none;"><table>' + getStr2(data.week2, data.numUsers) + '</table></div>';
        updatedTable.innerHTML += '<div id="t3" style="display: none;"><table>' + getStr2(data.week3, data.numUsers) + '</table></div>';
        updatedTable.innerHTML += '<div id="t4" style="display: none;"><table>' + getStr2(data.week4, data.numUsers) + '</table></div>';
        listenForWeekButtonClicks();
    } else if (data.botResponse) {
        output.innerHTML += '<div class="alert alert-secondary" role="alert" style="float: left; width: 50rem; margin-top: 20px;"><p><strong>Bot: </strong>' + data.botResponse + '</p></div>';
    }
});

function displayBestTimes(data) {
    var str = '';
    var datesTimes = data.datesTimes;
    var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var quarters = [':00', ':15', ':30', ':45'];
    for (var i = 0; i < datesTimes.length; i++) {
        str += '<li>' + days[datesTimes[i].day] + ' ';
        str += months[datesTimes[i].month] + ' ';
        str += datesTimes[i].date + ' ';
        str += datesTimes[i].hour;
        str += quarters[datesTimes[i].quarter] + '</li>';
    }
    return str;
}

function displayBestPeriods(data) {
    var str = '';
    var bestPeriods = data.bestPeriods;
    var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var quarters = [':00', ':15', ':30', ':45'];
    for (var i = 0; i < bestPeriods.length; i++) {
        str += '<li>' + days[bestPeriods[i].start.day] + ' ';
        str += months[bestPeriods[i].start.month] + ' ';
        str += bestPeriods[i].start.date + ' ';
        str += bestPeriods[i].start.hour;
        str += quarters[bestPeriods[i].start.quarter] + ' to ';
        str += bestPeriods[i].end.hour;
        str += quarters[bestPeriods[i].end.quarter] + '</li>';
    }
    return str;
}


function listenForWeekButtonClicks() {
    document.getElementById('w1').addEventListener('click', function(){
      document.getElementById('t1').style.display = "block";
      document.getElementById('t2').style.display = "none";
      document.getElementById('t3').style.display = "none";
      document.getElementById('t4').style.display = "none";
    });
    document.getElementById('w2').addEventListener('click', function(){
      document.getElementById('t2').style.display = "block";
      document.getElementById('t1').style.display = "none";
      document.getElementById('t3').style.display = "none";
      document.getElementById('t4').style.display = "none";
    });
    document.getElementById('w3').addEventListener('click', function(){
      document.getElementById('t3').style.display = "block";
      document.getElementById('t1').style.display = "none";
      document.getElementById('t2').style.display = "none";
      document.getElementById('t4').style.display = "none";
    });
    document.getElementById('w4').addEventListener('click', function(){
      document.getElementById('t4').style.display = "block";
      document.getElementById('t1').style.display = "none";
      document.getElementById('t2').style.display = "none";
      document.getElementById('t3').style.display = "none";
    });
}

function getStr(table, weekButtons, numUsers) {
    //var str = '<tr><th>S</th><th>M</th><th>T</th><th>W</th><th>R</th><th>F</th><th>S</th></tr><tr>';
    if (weekButtons) {
        var str = '<tr><th></th><th>Sun</th><th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th><th>Sat</th></tr>';
    } else {
        var str = '<tr><th>Sun</th><th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th><th>Sat</th></tr>';
    }
    for (var i = 0; i < table.length; i++) {
        if (weekButtons && (i % 7 == 0)) {
            str += '</tr><tr><td><button id="w' + (i / 7 + 1) +'" class="btn btn-primary btn-sm rounded-0">Week ' + (i / 7 + 1) + '</td></button>';
        } else if (i % 7 == 0) {
            str += '</tr><tr>';
        }
        str += '<td><h6 style="text-align:right; font-weight: lighter; padding: 0.5rem 0.5rem 1rem 2rem;">' + ((new Date(table[i].date)).getDate()) + '</h6>';
        var ctr = 0;
        for (var j = 0; j < table[i].available.length; j++) {
            ctr += 1;
        }
        if (ctr > 0) {
            ctr = Math.floor(ctr / numUsers * 4);
        }
        str += '<button style="background-color: #' + colors[ctr] + '!important;" type="button" class="btn btn-primary rounded-0"></button>';
        str += '</td>';
    }
    return str + '</tr>';
}

function getStr2(week, numUsers) {
    var str = '<tr><th></th><th>Sun</th><th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th><th>Sat</th></tr>';
    var quarters = [':00', ':15', ':30', ':45'];
    for (var i = 0; i < 24; i++) {
        for (var k = 0; k < 4; k++) {
            str += '<td>' + i + quarters[k] + '</td><td>';
            for (var j = 0; j < 7; j++) {
                var day = week[j];
                var ctr = 0;
                for (var l = 0; l < day[i][k].length; l++) {
                    ctr += 1;
                }
                if (ctr > 0) {
                    ctr = Math.floor(ctr / numUsers * 4);
                }
                str += '<button style="background-color: #' + colors[ctr] + '!important;" type="button" class="btn btn-primary rounded-0"></button>';
                str += '</td><td>';
            }
            str += '</td>';
            str += '</tr><tr>';
        }
    }
    return str + '</tr>';
}

socket.on('typing', function(data) {
    feedback.innerHTML = '<p><em>' + data + ' is typing a message...</em></p>';
});

//var room = "inputFromUser"; //get this from user
socket.on('connect', function() {
    room = prompt("What room would you like to join?", "Some Default Room");
    console.log(room);
   // Connected, let's sign-up for to receive messages for this room
   socket.emit('room', room);
});
