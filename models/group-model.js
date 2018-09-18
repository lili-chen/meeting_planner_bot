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

const groupSchema = new Schema({
    tableNum: Number,
    week1: [[[[tmpSchema]]]],
    week2: [[[[tmpSchema]]]],
    week3: [[[[tmpSchema]]]],
    week4: [[[[tmpSchema]]]],
    monthView: [dateSchema],
    users: [String],
    messages: [messageSchema],
    roomName: String
});

const Group = mongoose.model('group', groupSchema);

module.exports = Group;
