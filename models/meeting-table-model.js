const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const dateSchema = new Schema({
    date: String,
    available: [String]
});

const messageSchema = new Schema({
    content: String,
    timeSent: String,
    user: String
});

const tmpSchema = new Schema({
    user: String
})

const meetingTableSchema = new Schema({
    tableNum: Number,
    week1: [[[[tmpSchema]]]],
    week2: [[[[tmpSchema]]]],
    week3: [[[[tmpSchema]]]],
    week4: [[[[tmpSchema]]]],
    monthView: [dateSchema],
    users: [String],
    messages: [messageSchema]
});

const MeetingTable = mongoose.model('meetingtable', meetingTableSchema);

module.exports = MeetingTable;
