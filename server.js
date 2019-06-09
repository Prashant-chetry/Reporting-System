//Modules
const express = require('express');
//require('dotenv').config();
const exphbs = require('express-handlebars');
const path = require('path');
const methodOverride = require('method-override');
const bodyParser = require('body-parser');
const { User } = require('./models/user');    //destructuring
const { auth } = require('./models/user');    //destructuring
const Poster = require('./models/posts');
const UserInfo = require('./models/userinfo');
const flash = require('connect-flash');                             
const session = require('express-session');
var cookieParser = require('cookie-parser');
const sgMail = require('@sendgrid/mail');
const multer = require('multer'); //for local-Storages
const cloudinary = require('cloudinary').v2; //for cloud-Storage

var app = express();

//for converting string to json used in req and res
app.use(bodyParser.json());

//for parsing url to req and res
const urlencodedParser = bodyParser.urlencoded({ extended: true }) 

//for loading static file (i.e css and js for the hbs or html)
app.use(express.static(__dirname + '/public'));

// Express-handlebars middleware
app.engine('handlebars', exphbs({ defaultLayout: 'main' }));
app.set('view engine', 'handlebars');

// Method override middleware
app.use(methodOverride('_method'));


app.use(cookieParser('secret'));
// Session middleware
app.use(session({cookie: { maxAge: 60000 }}));

app.use(flash());

//Global variables
app.use(function (req, res, next) {
    res.locals.sucess_msg = req.flash('sucess_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.user = req.user;
    next();
});
/*======================================
    Set-up and Configuration
========================================*/
//Cloudinary Configuration
cloudinary.config({
    //cloud_name: process.env.CLOUDINARY_cloud_name,
    cloud_name: '',
    // api_key: process.env.CLOUDINARY_api_key,
    api_key: '',
    // api_secret: process.env.CLOUDINARY_apiSecret
    api_secret: ''
  })


//function for sending email

var sendGridkey = '';

sgMail.setApiKey(sendGridkey);

const sendWelcomeEmail = (email)=>{
    sgMail.send({
        to: email,
        from: 'y98@gmail.com',
        subject: 'Welcome',
        text: `Hello ${email}. Thankyou for joining with us.`
    });
    console.log(`Email send to ${email}.`);
}

/*=======================================
            Routes
========================================= */
//Home page rendering 
app.get('/', (req, res) => {
    res.render('index', {title: 'Welcome To Reporting app'});
});

// About page rendering
app.get('/about', (req, res) => {
    res.render('about', {title: 'About Page'});
});

// Contact page rendering
app.get('/contact', (req, res) => {
    res.render('contact', {title: 'Contact Page'});
});

// Register form
app.get('/signup', (req, res) => {
    res.render('users/signup', {title: 'Sign up page'});
});

// Register form post
app.post('/signup', urlencodedParser, async (req, res) => {
    let errors = [];

    if (req.body.password != req.body.password2) {
        errors.push({ text: 'Passwords dont match' });
    }
    if (req.body.password.length < 6) {
        errors.push({text: 'Password should be atleast 6 characters'});
    }
    if (errors.length > 0) {
        res.render('users/signup', {
            errors: errors,
            email: req.body.email,
            password: req.body.password,
            password2: req.body.password2
        });
        console.log(errors[0]);
        console.log(errors[1]);
    }
    else{
        var newUser = new User({
            email: req.body.email,
            password: req.body.password,
            date: req.body.date
        });
    //creating a new user
    try {
        if(req.body.adminCode === 'secretcode123') {
            newUser.isAdmin = true;
            console.log('Admin registered');
        }
        await newUser.save();
        res.render('users/login');
        //newUser.generateAuthToken();    //generates token and save token
        //res.send(newUser);
    } catch (error) {
        console.log(error);
    }
}});


//Login form Get
app.get('/login', (req, res) => {
    res.render('users/login', {title: 'Login page'});
});

app.post('/login', urlencodedParser, async (req, res) => {
    try {
        var user = await User.findByCredentials(req.body.email, req.body.password); //finding the user by email and password
        var token = user.generateAuthToken();   //generating token
        //res.send({user: user, token: token});
        //res.send(user);
        //req.session.Authorization = token; //storing token in the session
        console.log(req.body.email);
        sendWelcomeEmail(req.body.email);

        //Setting a global variable if user is admin
        if(user.isAdmin === true){
            console.log('Admin joined the chat');
            req.flash('sucess_msg', 'Hello Admin ! ');
            res.redirect('/feedAdmin');
        }
        else{
        req.flash('sucess_msg', 'Hello user, You are logged in');
        // console.log(res.locals);
        res.redirect('/feed');
        }
    } catch (e) {
        console.log(e);
    }
});

// Logout User
app.get('/logout', auth, (req, res) => {
    if (req.session) {
        // delete session object
        req.session.destroy(function(err) {
          if(err) {
            return next(err);
          } else {
            //req.flash('success_msg', 'You are logged out');
             return res.redirect('/');
             //res.send('OK');
          }
  });
}
});

//Feed GET request
app.get('/feed', auth, (req, res) => {
    Poster.find({}).then(posts => {

        //console.log(res.locals);
        res.render('posts/index', {
            posts: posts
        });
    }) 
    
    //authorization required for '/feed'
    //res.send(req.user); //sending user info
});

// Feed for admin
app.get('/feedAdmin', auth, (req, res) => {
    Poster.find({}).then(posts => {
        res.render('posts/indexAdmin', {
            posts: posts
        });
    }) 
});

// Post search
app.post('/findPost', urlencodedParser, auth, (req, res) => {
    console.log('This is ' + req.body.pin);

    Poster.find({pincode : req.body.pin})
    .then(posts => {
        res.render('posts/index', {
            posts: posts
    });
})
});

app.post('/findBypriority', urlencodedParser, auth, (req, res)=> {
    console.log('This is ' + req.body.pin);

    Poster.find({priority : req.body.priority})
    .then(posts => {
        res.render('posts/index', {
            posts: posts
    });
})
});

app.post('/sortingPost', urlencodedParser, auth, (req, res)=> {

    if(req.body.sorting === 'LastAdded'){
        Poster.find({}, null, {sort: {date: -1}})
        .then(posts => {
            res.render('posts/index', {
                posts: posts
        });
    })
    }
    else if(req.body.sorting === 'old'){
        Poster.find({}, null, {sort: {date: 1}})
        .then(posts => {
            res.render('posts/index', {
                posts: posts
        });
    })
    }

});

// Find user by user
app.post('/findUser', auth, (req, res)=> {
    UserInfo.find({firstName : req.body.firstName})
    .then(users => {
        res.render('users/', {
            users: users
        });
    })
});
// Find user by admin

app.post('/userSearchAdmin', auth, urlencodedParser, (req, res)=> {
    console.log(req.body.firstname);
    UserInfo.find({firstName : req.body.firstname})
    .then(users => {
        res.render('users/showUserAdmin', {
            users: users
        });
    }
    )
});

// Delete user by admin 
app.delete('/users/:id', auth, (req, res)=> {
    
    UserInfo.remove({_id: req.params.id})
    .then( () => {
        req.flash('success_msg', 'User deleted deleted');
        res.redirect('/feedAdmin');
    })
    }
);

//
app.get('/postUpdate', auth, (req, res) => {
    res.render('posts/postUpdate');
});


var storage = multer.diskStorage({
    limits : {
        fileSize : 5000000
    },
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
      },
    fileFilter(req, file, cb) {
        if(!file.originalname.match(/\.(jpeg|jpg|png)$/)) {
            return cb(new Error('Please upload a image file'));
        }
        cb(undefined, true);
    },
    filename: (req, file, cb) => {
        console.log(file);
        cb(null, file.originalname + '-' + Date.now());
      }
 });
var upload = multer({storage: storage});

//Post request Feed-form 
app.post('/feed_form', upload.single('pic'), urlencodedParser , auth, async (req, res)=>{
    console.log(req.body);
    console.log(req.file);


    //config for cloud-Storage
    const path = req.file.path;
    const uniqueFilenameOfPosts = new Date().toISOString();

    var resultUrl = await cloudinary.uploader.upload(path, {public_id: `posts/${uniqueFilenameOfPosts}`}, (error, result)=>{
        if(error){
            console.log(error);
        }else{
            console.log('Posts File uploaded to cloudinary............');
        }
    });
    var newPost = new Poster({
    state: req.body.state,
    pincode: req.body.pincode,
    city_village: req.body.city_village,
    district: req.body.district,
    contentType: req.file.mimetype,
    description: req.body.description,
    imageUrlInDisk: path,                       //pic: req.file.buffer,
    imageUrlInCloud: resultUrl.secure_url,
    priority : req.body.priority,
    owner: req.user._id});
   // await newPost.populate('owner').execPopulate();

    await newPost.save();
    //res.send(newPost);
    req.flash('sucess_msg', 'Hi there people');
    res.redirect('/feed');
});

//Posting user Info
app.post('/userinfo', upload.single('avatar'),urlencodedParser, auth, async (req, res)=>{
    //console.log(req.body);
    // if(!req.file){
    //     res.send("File not uploaded");
    //     return; 
    // }
    console.log(req.file);
    console.log(req.file.path);
    //console.log('filename: '+ req.file.filename);

    //config for cloud-storage
    const path = req.file.path;
    const uniqueFilenameOfProfile = new Date().toISOString();

    var resultUrl = await cloudinary.uploader.upload(path, {public_id: `user-avatar/${uniqueFilenameOfProfile}`},(error, result)=>{
        if(error){
            console.log(error);
        }else{
            console.log('Profile File uploaded to Cloudinary.......');
            //console.log(result);
            return result;
        }
    });
    console.log(resultUrl);
    var newUserInfo = new UserInfo({
        firstName: req.body.firstName,
        surName: req.body.surName,
        dateOfbirth: req.body.dateOfbirth,
        address: req.body.address,
        city: req.body.city,
        state: req.body.state,
        zipCode: parseInt(req.body.zipCode),
        mobileNo: req.body.mobileNo,
        avatar: req.file.buffer,
        imageUrlInDisk: path,
        imageUrlInCloud: resultUrl.secure_url,
        ownerinfo: req.user._id});

    await newUserInfo.save();
    // res.send(newUserInfo);
    res.redirect('/users/userinfo');
});

// Post delete by admin
app.delete('/posts/:id', auth, (req, res)=> {
    
    Poster.remove({_id: req.params.id})
    .then( () => {
        req.flash('success_msg', 'Post deleted');
        res.redirect('/feedAdmin');
    })
    }
);

// Delete user posts by themselves

// app.delete('/posts/:id', auth, (req, res)=> {
//     Poster.remove({_id: req.params.id})
//     .then( () => {
//         req.flash('success_msg', 'Post deleted');
//         res.redirect('/feed');
//     })
// });

// Edit user posts by themselves

app.get('/postUpdate/:id', auth, (req, res) => {
    Poster.findOne({
      _id: req.params.id
    })
    .then(posts => {
      if(posts.owner != req.user.id){
        req.flash('error_msg', 'Not Authorized, not your post');
        res.redirect('/feed');
      } else {
        res.render('posts/postUpdate', {
          posts:posts
        });
      }
      
    });
  });

//Getting user-profile infomation form
app.get('/userinfoform', urlencodedParser,auth, async (req, res)=>{
    res.render('posts/userInfoForm');
    // var user = req.user;
    // await user.populate('userinfo').execPopulate();
    // console.log(user.userinfo);
});


//Getting User profile
app.get('/userprofileinfo',urlencodedParser, auth, async(req, res)=>{
    var user = req.user;
    
    /*we need to populate the user model with userinfo model 
        inorder for use to select the required user-avatar*/
    await user.populate('userinfo').execPopulate();

    var userinfo = user.userinfo; //these gives us an array of userinfo of the user
    console.log(userinfo[0]);
    console.log(userinfo[0].imageUrlInCloud);

    //setting the content-type to image instead to application/json
    // res.set('Content-Type', 'image/jpg');
    // res.send(userinfo[0].avatar); //sending the image as a response

    res.render('users/userinfo', {
        firstName: userinfo[0].firstName,
        surName: userinfo[0].surName,
        avatar: userinfo[0].imageUrlInCloud,
        address: userinfo[0].address,
        mobileNo: userinfo[0].mobileNo,
        zipCode: userinfo[0].zipcode,
        DoB: userinfo[0].dateOfbirth,
        city: userinfo[0].city,
        state: userinfo[0].state
    });
});
app.get('*', (req, res)=>{
    res.send('<h1>404 Page not found</h1>');
});
app.listen(8000, () => {
    console.log('Server Connected and Running.....');
});

