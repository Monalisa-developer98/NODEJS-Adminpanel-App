const mysql = require('mysql')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const crypto = require('crypto');
require('dotenv').config()
const fileUpload = require('express-fileupload');

// MySQL Connection
const dB = mysql.createConnection({
    host: process.env.DB_HOSTNAME,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
})

var session;

dB.connect((error) => {
    if (error) {
        console.log(error)
    }
    else {
        console.log("MYSQL Connected!")
    }
})

/// route to create sub admin
exports.register = (req, res) => {
    const { email, tcode, licnum, fname, lname, password, apiurl } = req.body;
    let selectedValue = req.body.dropdown;
    let status = 1;
    if (selectedValue === 'Activate'){
        status = 1;
    }else if (selectedValue === 'Deactivate'){
        status = 0;
    }
    const logouploadedFile = req.files.logofile;
    const backgrounduploadFile = req.files.bkimgfile;
    function randNum() {
        const pin = Math.floor(100 + Math.random() * 900);
        return pin.toString();
    }
    let randno = randNum();
    // Upload path 
    let logoimgFile = randno + logouploadedFile.name;
    const logouploadPath = global.__basedir + "/uploads/logo/" + logoimgFile;

    let backgroundimgFile = randno + backgrounduploadFile.name;
    const bkuploadPath = global.__basedir + "/uploads/backgroundimage/" + backgroundimgFile;

    logouploadedFile.mv(logouploadPath, function (err) { 
        if (err) { 
            console.log(err); 
            res.send("Failed !!"); 
        }
    });

    backgrounduploadFile.mv(bkuploadPath, function (err) { 
        if (err) { 
            console.log(err); 
            res.send("Failed !!"); 
        }
    });

    if (!email || !fname || !tcode || !lname || !password ) {
        return res.status(400).render('register', {
            message: '*Please fill all the fields'
        })
    }

    dB.query('SELECT email FROM users WHERE email = ?', [email], async (error, results) => {
        if (error) {
            console.log(error);
        }
        if (results.length > 0) {
            return res.render('register', {
                message: 'Email is already exist.'
            })

        }

        let hashedPassword = await bcrypt.hash(password, 8);
        console.log(hashedPassword);

        dB.query('INSERT INTO users SET ?', { name: fname, code:tcode, no_of_license:licnum, email: email, password: hashedPassword, type: 2, logo: logoimgFile, background_image: backgroundimgFile, api_url:apiurl, is_active:status }, (error, results) => {
            if (error) {
                console.log(error);
            } else {

                dB.query('SELECT id FROM users WHERE email = ?', [email], async (err, ress) => {
                    if (ress.length != 0) {
                        dB.query('INSERT INTO user_details SET ?', { user_id: ress[0].id, first_name: fname, last_name: lname }, (error, results) => {
                            if (error) {
                                console.log(error);
                            } else {
                                console.log(results);
                                return res.render('subadmin-list', {
                                    message: 'Sub Admin Added'
                                });
                            }
                        });

                    } else {
                        return res.render('subadmin-list', {
                            message: 'Sub Admin not Added'
                        });

                    }
                });

                res.redirect('/auth/admindashboard');

            }
        });
    })
}

exports.login = (req, res) => {   
    if (req.session && req.session.user) {
        if (req.session.user.type == 2) {
            return res.redirect('/subadmindashboard');
        } else if (req.session.user.type == 1) {
            return res.redirect('/auth/admindashboard');
        }
    } 

    const { email, password } = req.body;
    if (!email|| !password) {
        return res.status(400).render('login', {
            message: 'Please provide email and password!'
        })
    }

    dB.query('SELECT * FROM users WHERE email = ? AND is_active = ?', [email, 1], async (error, results) => {

        // Check if the result set is empty
    if (results.length === 0) {
        return res.status(400).render('login')
      }

       if (!(await bcrypt.compare(password, results[0].password))) {
            res.status(401).render('login', {
                message: 'Email or Password is incorrect!'
            })
        }
        else {
            // Store user details in the session
            req.session.user = { id: results[0].id, name: results[0].name, email:results[0].email, type:results[0].type, license:results[0].no_of_license};
            const dbUsermail = results[0].email;
            const token = jwt.sign({ dbUsermail }, process.env.JWTSECRETKEY);
            const userType = results[0].type;
                if (userType == 2) {
                    return res.redirect('/subadmindashboard');
                } else {
                    res.status(200).redirect("/auth/admindashboard");
                }            
        }       
    });
    
}

// route to create user

function generatePIN() {
    // Generate a random 4-digit PIN
    const pin = Math.floor(1000 + Math.random() * 9000);
    return pin.toString();
}

exports.createUser = (req, res) => {

    const id = req.session.user.id;              //110; 
    const { email, fname, lname, phnum, empId } = req.body;
    const pin = generatePIN();

    dB.query('SELECT phone FROM user_details WHERE phone = ?', [phnum], async (error, results) => {
        if (error) {
            console.log(error);
        }
        if (results.length > 0) {
            return res.render('index', {
                message: 'This Phone Number is already exist.'
            })
        }

    dB.query('SELECT no_of_license FROM users WHERE users.id = ?', [id], async (error, results) =>{
        if (error) {
            console.log(error);
        } 
        const maxUsers = results[0].no_of_license;

        dB.query('SELECT COUNT(*) AS userCount FROM user_details WHERE tenant_id = ?', [id], async (error, data) =>{
            if (error) {
                console.error('Error:', error);
                res.status(500).json({ success: false, message: 'Internal Server Error' });
            } else {
                const userCount = data[0].userCount;
                if (userCount >= maxUsers) {
                    // return res.json({ success: false, message: 'Maximum number of users reached. Cannot create more users.' });
                    return res.render('index', {
                        message: 'Maximum number of users reached.'
                    })
                }

                dB.query('INSERT INTO users SET ?', { name: fname, email: email, type: 3}, (error, results) => {
                    if (error) {
                        console.log(error);
                    } else {
        
                        dB.query('SELECT id FROM users WHERE email = ?', [email], async (err, ress) => {
                            console.log(ress);
                            if (ress.length != 0) {
                                dB.query('INSERT INTO user_details SET ?', { user_id: ress[0].id, tenant_id:ress[0].id, first_name: fname, last_name: lname, phone: phnum, pin: pin, emp_id:empId }, (error, results) => {
                                    if (error) {
                                        console.log(error);
                                    } else {
                                        console.log(results);
                                        return res.render('index', {
                                            message: 'User Added'
                                        });
                                    }
                                });
        
                            } else {
                                return res.render('index', {
                                    message: 'User not Added'
                                });
        
                            }
                        });
        
                        return res.render('index', {
                            message: 'User Created'
                        });
        
                    }
                })

            }
        });
 
    }); 
    });   
}

exports.users = (req, res) => {
    dB.query('SELECT * FROM users JOIN user_details ON users.id = user_details.user_id WHERE type=3; ', (error, results, fields) => {
        if (error) {
            console.error('Error fetching users:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
        res.render('user-list', { users: results });
    });
}

// exports.userslist = (req, res) => {
//     dB.query('SELECT * FROM users JOIN user_details ON users.id = user_details.user_id WHERE type=3; ', (error, results, fields) => {
//         if (error) {
//             console.error('Error fetching users:', error);
//             return res.status(500).json({ error: 'Internal server error' });
//         }
//         res.render('authUser-list', { users: results });
//     });
// }


exports.admindashboard = (req, res) => {
    // console.log(req.session.user);
    dB.query('SELECT * FROM users WHERE type=2', (error, results, fields) => {
        if (error) {
            console.error('Error fetching users:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
        res.render('subadmin-list', { subadmin: results });
    });
}

exports.viewsubadmins = (req, res) => {
    dB.query('SELECT id,name,email FROM users WHERE type=2', (error, results, fields) => {
        if (error) {
            console.error('Error fetching users:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
        res.render('viewSubadmins', { subadmin: results });
    });
}

//route to delete a sub admin
exports.delete = (req, res) => {

    const userId = req.params.userId;
        dB.query('DELETE users, user_details FROM users JOIN user_details ON users.id = user_details.user_id WHERE users.id = ?', [userId] ,(error, results) => {
            if (error) {
                console.log(error);
            } 
            res.redirect('/auth/admindashboard'); // Redirect to the user list after deletion
        });
}

// route for user edit
exports.edituser = (req,res) => {
    const userId = req.params.userId;
    dB.query('SELECT * FROM `users` JOIN user_details ON users.id = user_details.user_id WHERE users.id = ?', [userId], async (error, results) => {
        if (error) {
            console.log(error);
        }
        res.render('edituser', { edit: results[0], id: results[0].user_id });
    })
}

// route for user update
exports.userupdate = (req, res) => {

    const id = req.params.id;
    const { ufname, ulname, uemail, uphnum, empId } = req.body;
    if(!ufname|| !ulname || !uemail || !uphnum){
        return res.status(400).render('edituser', {
            message: '*Please fill all the fields', id:id
        })
    }

        dB.query('UPDATE users INNER JOIN user_details ON users.id = user_details.user_id SET users.name = ?, user_details.first_name = ?,user_details.last_name = ?, users.email = ?, user_details.phone = ?, user_details.emp_id = ? WHERE users.id = ?; ', [ufname,ufname,ulname,uemail,uphnum,empId,id] , (error, results, fields) => {
            if (error) {
                console.log(error);
            }
            res.redirect('/auth/users');
        });
  
}

// route for user delete
exports.userdelete = (req, res) => {

    const uId = req.params.uId;
    dB.query('DELETE users, user_details FROM users JOIN user_details ON users.id = user_details.user_id WHERE users.id = ?', [uId] ,(error, results) => {
        if (error) {
            console.log(error);
        } 
        dB.query('DELETE users, user_details FROM users LEFT JOIN user_details ON users.id = user_details.user_id WHERE users.id = ?', [uId] ,(error, results) => {
            if (error) {
                console.log(error);
            } 
            res.redirect('/auth/users'); 
        });
    });
        
}

// route to edit Sub Admin user
exports.edit = (req, res) => {
    const userId = req.params.userId;
    dB.query('SELECT * FROM `users` INNER JOIN user_details ON users.id = user_details.user_id WHERE users.id = ?', [userId], async (error, results) => {
        if (error) {
            console.log(error);
        }

        res.render('updateUser', { edit: results[0], id: results[0].user_id, logoimage: results[0].logo, backimg: results[0].background_image}); //, 
    })
}

// route to update Sub Admin
exports.updateUser = (req, res) => {

    let id = req.params.id;
    const { upname, ulname, email, tcode, licnum, apiurl } = req.body;

    let selectedValue = req.body.dropdown;
    let status = 1;
    if (selectedValue === 'Activate'){
        status = 1;
    }else if (selectedValue === 'Deactivate'){
        status = 0;
    }

    let uplogouploadedFile = req.files.uplogofile;
    let upbackgrounduploadFile = req.files.upbkimgfile;
    
    function randNum() {
        const pin = Math.floor(100 + Math.random() * 900);
        return pin.toString();
    }
    let randno = randNum();
    // Upload path 
    let uplogoimgFile = randno + uplogouploadedFile.name;
    const uplogouploadPath = global.__basedir + "/uploads/logo/" + uplogoimgFile;

    let upbackgroundimgFile = randno + upbackgrounduploadFile.name;
    const upbkuploadPath = global.__basedir + "/uploads/backgroundimage/" + upbackgroundimgFile;

    uplogouploadedFile.mv(uplogouploadPath, function (err) { 
        if (err) { 
            console.log(err); 
            res.send("Failed !!"); 
        }
    });

    upbackgrounduploadFile.mv(upbkuploadPath, function (err) { 
        if (err) { 
            console.log(err); 
            res.send("Failed !!"); 
        }
    });

    dB.query('UPDATE users SET name = ?, code = ?, no_of_license = ?, email = ?, logo = ?, background_image = ?, api_url = ?, is_active = ? WHERE id = ?', [upname, tcode, licnum, email, uplogoimgFile, upbackgroundimgFile, apiurl, status, id], async (error, results) => {
        if (error) {
            console.log(error);
        }
        dB.query('UPDATE user_details SET first_name = ?, last_name = ? WHERE user_id = ?', [upname, ulname, id], async (error, results) => {
            if (error) {
                console.log(error);
                return res.status(500).json({ error: 'Internal server error' });
            }
            res.redirect('/auth/admindashboard');
        }) 
    })
  
}

// route to edit Sub Admin Password
exports.editpassword = (req, res) => {
    const userId = req.params.userId;
    dB.query('SELECT * FROM `users` WHERE users.id = ?', [userId], async (error, results) => {
        if (error) {
            console.log(error);
        }
        let id = results[0].id;
        res.render('editPassword', { id:id });
    })
}

async function hashPassword(uppassword) {
    const saltRounds = 10;
    try {
        const hash = await bcrypt.hash(uppassword, saltRounds);
        return hash;
    } catch (error) {
        throw error;
    }
}

// route to update Sub Admin Password
exports.updatepassword = async (req, res) => {

    const id = req.params.id;
    const { nwpass, cnwpass } = req.body;
    if (!nwpass || !cnwpass) {
        return res.status(400).render('editPassword', {
            message: '*Please fill Password fields.', id:id
        })
    }
    if (nwpass != cnwpass) {
        return res.status(400).render('editPassword', {
            message: '*New Password did not match with Confirm Password.', id:id
        })
    }
    const hashedPassword = await hashPassword(nwpass);

    dB.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id], (error, results) => {
        if (error) {
            console.log(error);
            return res.status(500).json({ error: 'Internal server error' });
        } else {
            res.redirect('/auth/admindashboard');
        }
    });
}

// Route to logout
exports.logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        }
        res.redirect('/login');
    });
}


// ------------------ admin settings ------------------------------

// route to edit Admin Details to update
exports.adminedit = (req, res) => {
    dB.query('SELECT * FROM `users` WHERE users.id = ?', 1, async (error, results) => {
        if (error) {
            console.log(error);
        }
        res.render('updateAdmin', { edit: results[0] });
    })
}

exports.adminupdate = async (req, res) => {
    const { password, nwpassword } = req.body;
    if (!password || !nwpassword) {
        return res.status(400).render('updateAdmin', {
            message: '*Please enter New Password and Confirm Password'
        })
    }
    if (password != nwpassword) {
        return res.status(400).render('updateAdmin', {
            message: '*New Password did not match with Confirm Password.'
        })
    }

    const hashedPassword = await hashPassword(password);

    dB.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, 1], (error, results) => {
        if (error) {
            console.log(error);
            return res.status(500).json({ error: 'Internal server error' });
        } else {
            res.redirect('/auth/admindashboard');
        }
    });
}

// ------------------ sub admin settings ------------------------------

// route to edit Admin Details to update
exports.subadminedit = (req, res) => {
    const id = req.session.user.id; 
    dB.query('SELECT * FROM `users` WHERE users.id = ?', [id], async (error, results) => {
        if (error) {
            console.log(error);
        }
        res.render('updateSubadmin');
    })
}

exports.subadminupdate = async (req, res) => {
    const id = req.session.user.id;
    const { password, nwpassword } = req.body;
    if (!password || !nwpassword) {
        return res.status(400).render('updateSubadmin', {
            message: '*Please enter New Username and Password'
        })
    }
    if (password != nwpassword) {
        return res.status(400).render('updateSubadmin', {
            message: '*New Password did not match with Confirm Password.'
        })
    }

    const hashedPassword = await hashPassword(password);

    dB.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id], (error, results) => {
        if (error) {
            console.log(error);
            return res.status(500).json({ error: 'Internal server error' });
        } else {
            res.render('index');
        }
    });
}

// -------------------------------------------------------

exports.deactivate = async (req, res) =>{
    let id = req.params.id;
    dB.query('UPDATE users SET is_active = ? WHERE users.id = ?', [0, id], async (error, results) => {
        if (error) {
            console.log(error);
        }
        res.redirect('/auth/admindashboard');         
    })
}

exports.activate = async (req, res) =>{
    let id = req.params.id;
    dB.query('UPDATE users SET is_active = ? WHERE users.id = ?', [1, id], async (error, results) => {
        if (error) {
            console.log(error);
        }
        res.redirect('/auth/admindashboard');         
    })
}