// npm i bcryptjs cookie-parser dotenv ejs express hbs jsonwebtoken mysql

const express = require('express');
const app = express();
const dotenv = require('dotenv');
const fileUpload = require('express-fileupload');
const crypto = require('crypto');
dotenv.config();
const cookieParser = require('cookie-parser');
const session = require('express-session');
var hbs = require('handlebars');
let port = process.env.Port || 3700;
global.__basedir = __dirname;


// Static files
app.use(express.static('assets'))
app.use(express.static(__dirname + '/uploads'));
// app.use(express.static('/uploads'));
app.use('/css', express.static(__dirname + 'assets/css'))
app.use('/js', express.static(__dirname + 'assets/js'))
app.use('/images', express.static(__dirname + 'assets/images'))

app.set('view engine', 'hbs')
app.use(fileUpload());
// Encoded
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
// cookie parser middleware
app.use(cookieParser());

//session middleware
app.use(session({
  secret: 'thisismysecrctekey',
  resave: false,
  saveUninitialized: true,
}));

// Define Routes
app.use('/', require('./routes/pages'));
app.use('/auth', require('./routes/auth'));

app.listen(port, (err) => {
  if (err) throw err;
  console.log('Server is running on port' + port);
})
