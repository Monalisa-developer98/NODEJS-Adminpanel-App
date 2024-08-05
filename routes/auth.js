const express = require('express');
const authController = require('../controllers/auth');
const router = express.Router();

// Routers  
router.post('/login', authController.login)
router.post('/register', authController.register)
router.post('/createUser', authController.createUser)
router.get('/users', authController.users)
router.get('/admindashboard', authController.admindashboard)
router.get('/delete/:userId', authController.delete)
router.get('/edit/:userId', authController.edit)
router.post('/updateUser/:id', authController.updateUser)
router.get('/editpassword/:userId', authController.editpassword)
router.post('/updatepassword/:id', authController.updatepassword)
router.get('/logout', authController.logout)
router.get('/viewsubadmins', authController.viewsubadmins)
// router.get('/userslist', authController.userslist)
router.get('/edituser/:userId', authController.edituser)
router.post('/userupdate/:id', authController.userupdate)
router.get('/userdelete/:uId', authController.userdelete)

// ----------- admin settings ------------------------
router.get('/adminedit', authController.adminedit)
router.post('/adminupdate', authController.adminupdate)

router.get('/subadminedit', authController.subadminedit)
router.post('/subadminupdate', authController.subadminupdate)

router.get('/activate/:id', authController.activate)
router.get('/deactivate/:id', authController.deactivate)


module.exports = router;