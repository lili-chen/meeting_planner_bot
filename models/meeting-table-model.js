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

const meetingTableSchema = new Schema({
    tableNum: Number,
    week1: [[[String]]],
    week2: [[[String]]],
    week3: [[[String]]],
    week4: [[[String]]],
    monthView: [dateSchema],
    users: [String],
    messages: [messageSchema]
});

const MeetingTable = mongoose.model('meetingtable', meetingTableSchema);

module.exports = MeetingTable;
