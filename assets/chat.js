// Make connection
var socket = io.connect('http://localhost:3000');

var colors = ['FFFFF', 'CCE5FF', '99CCFF', '66B2FF', '3399FF'];

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
      handle: handle.value
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
        console.log(data.table);
        //console.log('<table>' + getStr(data.table) + '</table>');
        output.innerHTML += '<div class="alert alert-secondary" role="alert" style="float: left; width: 50rem; margin-top: 20px;"><p><strong>Bot:</strong> Check the updated table for everyone\'s availability. The earliest day when most people are free is: ' + data.dateToMeet + '</p></div>';
        //output.innerHTML += '<table>' + getStr(data.table, false, data.numUsers) + '</table>';
        updatedTable.innerHTML = '<table>' + getStr(data.table, true, data.numUsers) + '</table>';
        updatedTable.innerHTML += '<div id="t1" style="display: none;"><table>' + getStr2(data.week1) + '</table></div>';
        updatedTable.innerHTML += '<div id="t2" style="display: none;"><table>' + getStr2(data.week2) + '</table></div>';
        updatedTable.innerHTML += '<div id="t3" style="display: none;"><table>' + getStr2(data.week3) + '</table></div>';
        updatedTable.innerHTML += '<div id="t4" style="display: none;"><table>' + getStr2(data.week4) + '</table></div>';
        listenForWeekButtonClicks();
    }
});

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
            console.log(ctr);
        }
        str += '<button style="background-color: #' + colors[ctr] + '!important;" type="button" class="btn btn-primary rounded-0"></button>';
        str += '</td>';
    }
    return str + '</tr>';
}

function getStr2(week) {
    var str = '<tr><th></th><th>Sun</th><th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th><th>Sat</th></tr>';
    for (var i = 0; i < 24; i++) {
        str += '<td>' + i + ':00</td><td>';
        for (var j = 0; j < 7; j++) {
            var day = week[j];
            if (day[i].length == 0) {
                str += '<button type="button" class="btn btn-primary rounded-0"></button>';
            }
            var ctr = 0;
            for (var k = 0; k < day[i].length; k++) {
                ctr += 1;
            }
            str += '<button style="background-color: #' + colors[ctr] + '!important;" type="button" class="btn btn-primary rounded-0"></button>';
            str += '</td><td>';
        }
        str += '</td>';
        str += '</tr><tr>'
    }
    return str + '</tr>';
}

socket.on('typing', function(data) {
    feedback.innerHTML = '<p><em>' + data + ' is typing a message...</em></p>';
});
