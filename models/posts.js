const mongoose = require('mongoose');
const validator = require('validator');

const url = 'mongodb://127.0.0.1:27017/Reporting';
mongoose.connect(url, {useNewUrlParser: true, useCreateIndex: true});

var postSchema = new mongoose.Schema({
    description: {
        type: String,
        required: true
    },
    city_village: {
        type: String,
        required: true,
    },
    district: {
        type: String,
        required: true
    },
    state: {
        type: String,
        required: true
    },
    pincode: {
        type: Number,
        required: true
    },
    // pic : {
    //     type : Buffer
    // },
    imageUrlInDisk: {
        type: String,
        required: true
    },
    imageUrlInCloud: {
        type: String,
        required: true
    },
    priority : {
        type : String
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    dateOfCreateion: {
        type: Date,
        default: Date.now
      }
});

var Poster = mongoose.model('Posts', postSchema);

module.exports = Poster;