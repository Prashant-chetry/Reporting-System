const mongoose = require('mongoose');
const validator = require('validator');
const { User }  = require('./user');
const url = 'mongodb://127.0.0.1:27017/Reporting';
mongoose.connect(url, {useCreateIndex: true, useNewUrlParser: true});

var userInfoSchema = new mongoose.Schema({
    firstName: {
        type: String,
        trim: true,
        required: true
    },
    surName: {
        type: String,
        trim: true,
        required: true
    },
    dateOfBirth:{
        type: Date,
        trim: true,
        default: Date.now
    },
    address: {
        type: String,
        trim: true,
        required: true
    },
    city: {
        type: String,
        trim: true,
        required: true
    },
    state: {
        type: String,
        trim: true,
        required: true
    },
    zipCode: {
        type: Number,
        required: true
    },
    mobileNo:{
        type: String,
        trim: true,
        validate(value){
            if(!validator.isMobilePhone(value, 'en-IN')) throw new Error('Mobile not valid');
        },
        unique: true,
        required: true
    },
    imageUrlInDisk: {
        type: String,
        required: true
    },
    imageUrlInCloud: {
        type: String,
        required: true
    },
    // avatar : {
    //     type : Buffer
    // },
    ownerinfo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}); 

var UserInfo = mongoose.model('UserInfo', userInfoSchema);

module.exports = UserInfo;