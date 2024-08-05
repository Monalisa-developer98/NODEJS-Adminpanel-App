const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const verifyToken =  (req, res, next) => { 
    const token = req.cookies.jwt 
    try {
      if (!token) { 
        return res.status(401).redirect("/login");
      }
      const decrypt = jwt.verify(token, process.env.JWTSECRETKEY);
      req.user = { 
        firstname: decrypt.username,
      }; 
    } catch (err) {
      return res.status(500).json(err.toString());
    }
};

var session;
// Routers  
router.get('/', (req,res) =>{ 
    
    verifyToken(req,res);
   
    res.render('index');
})

router.get('/login', (req,res) =>{
  if (req.session && req.session.user) {
    if (req.session.user.type == 2) {
      return res.redirect('/subadmindashboard');
    } else if (req.session.user.type == 1) {
        return res.redirect('/auth/admindashboard');
    }
} 
    res.render('login')
})


router.get('/register', (req,res) =>{
    res.render('register')
})

router.get('/subadmindashboard', (req,res) =>{
  res.render('subadmindashboard')
})


module.exports = router;