const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const messageSchema = new Schema({
    content: String,
    timeSent: String
});

const userSchema = new Schema({
    username: String,
    googleId: String,
    messages: [messageSchema]
});

const User = mongoose.model('user', userSchema);

module.exports = User;
