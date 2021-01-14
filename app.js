require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");

const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require("passport-facebook");
const findOrCreate = require('mongoose-findorcreate'); // dont forget to require after installing this package


const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
	secret: "This is our little secret.",
	resave: false,
	saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true });

const userSchema = new mongoose.Schema({
	email: String,
	password: String,
	googleId: String,  // add googleId field to add a googleId field on the mongoDB database
	facebookId: String
});

userSchema.plugin(passportLocalMongoose); // this code should be placed after creating the schema and before the model
userSchema.plugin(findOrCreate);  // add this package as a plugin of your schema

const User = mongoose.model("User", userSchema);



passport.use(User.createStrategy());  // still include this one

passport.serializeUser(function(user, done) {  // update the serialize and deserialize
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",  // make sure that it has the port 3000 after localhost
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"  // google plus is sunsetting
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.APP_ID,
    clientSecret: process.env.APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get("/", function (req, res) {
    res.render("home");
});

app.get("/login", function (req, res) {
    res.render("login");
});

app.get("/register", function (req, res) {
    res.render("register");
});

app.get("/secrets", function(req, res){
	if(req.isAuthenticated()){
		res.render("secrets");
	}else{
		res.redirect("/register");
	}
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect to "/secrets".
    res.redirect('/secrets');
  });

app.get('/auth/facebook',
  passport.authenticate('facebook'));

app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect to "/secrets".
    res.redirect('/secrets');
  });

app.post("/register", function(req, res){
	User.register({username: req.body.username}, req.body.password, function(err, user){
		if(err){
			console.log(err);
			res.redirect("/register");
		}else{
			passport.authenticate("local")(req, res, function(){
				res.redirect("/secrets");
			});
						
		}

	});
});

app.post("/login", function(req, res){

	const user = new User ({
		username: req.body.username,
		password: req.body.password
	});

	req.login(user, function(err){
		if(err){
			console.log(err);
		}else{

			passport.authenticate("local");
			res.redirect("/secrets");

		}
	});
});


app.get("/logout", function(req, res){
	req.logout();
	res.redirect("/");
});

app.listen(3000, function () {
    console.log("Server started on port 3000");
});//jshint esversion:6
