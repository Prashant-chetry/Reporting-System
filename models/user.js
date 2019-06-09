const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const url = 'mongodb://127.0.0.1:27017/Reporting';
const {LocalStorage} = require('node-localstorage');
mongoose.connect(url,{useNewUrlParser: true, useCreateIndex: true});

var userSchema = new mongoose.Schema({
    email:{
        type: String,
        required: true,
        unique: true,
        trim: true,
        validate:{
            validator(value){
                if(!validator.isEmail(value)) throw new Error('Email not Valid');
            }
        }
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
        trim: true
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    tokens:[{
        token: {
            type: String,
            required: true
        }
    }]
});

/*===============================
    Creating link between Collection 
    using virtual
================================*/
userSchema.virtual('postMade', {
    ref: 'Posts',
    localField: '_id',
    foreignField: 'owner'
});

userSchema.virtual('userinfo', {
    ref: 'UserInfo',
    localField: '_id',
    foreignField: 'ownerinfo'
});

/*=============================
Token Authentication middlware
===============================
*/
var localStorage = new LocalStorage('./scratch');
const auth = async function(req, res, next){
    try {
        const token =  localStorage.getItem('Authorization');//req.session.Authorization;//  //taking token from the header
        console.log(token);
        const decode = jwt.verify(token, 'reporting_Application'); //decoding the token
        // console.log(decode);

        //finding the user using token
        const user = await User.findOne({_id: decode._id, 'tokens.token': token});

        if(!user){
          return new Error('User not Found');
        }
        req.user = user; //hooking user to request.user

        next();//for running the next middleware
    } catch (error) {
        console.log(error);
    }
}

/*====================================
    For Hiding the data(Password and token)
======================================*/
/*
*the toJSON methods runs when ever the JSON is converted 
to string(i.e when user is send using res.send())
*/
userSchema.methods.toJSON = function(){ 
    var user = this;
    var userObject = user.toObject();   //user object of mongoose

    delete userObject.password; //hides password
    delete userObject.tokens;   //hides token
    return userObject;  //returns the user object of mongoose
}


/*=============================================================
    For Finding the user using Email and for verifying Password
===============================================================*/

userSchema.statics.findByCredentials = async function(email, password){
  var user = await User.findOne({email: email});

  if(!user){    //When user is not found
    throw new Error('Unable to Login user');
  }
  //
  const isMatch = bcryptjs.compare(password, user.password);

  //checks if the password is correct or not
  if(!isMatch){
      throw new Error('Unable to Login password');
  }
  //When Everythings goes good
  //console.log(user);
  return user;
}


/*==========================
    Generates and Saves Token
============================*/
userSchema.methods.generateAuthToken = function(){
    var user = this;
    var token = jwt.sign({_id: user._id.toString()}, 'reporting_Application', {expiresIn: '24 hours'});
    console.log('Token generated');
    //saving the token
    user.tokens.push({token: token});
     user.save().then(()=>{
         console.log('token Saved');
     });
    
    localStorage.setItem('Authorization', token);  // token is saved in localStroage
    return token;
}

/*=====================================
    Middleware for Hashing the password 
=======================================*/

//These runs before the user is saved
userSchema.pre('save', async function(next){
    var user = this;
    user.password = await bcryptjs.hash(user.password, 8); //for hashing the password
    
    //for loading the next module
    next();
});


//User model
var User = mongoose.model('User', userSchema);

module.exports = {
    User,
    auth
};