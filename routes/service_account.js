let express = require('express');
let router = express.Router();

let credential = require('./test-pfacs-document.json');
let google = require('googleapis')

router.post('/access', (req, res, next)=>{
    // config a JWT auth client

    let jwtClient = new google.google.auth.JWT(
        credential.client_email,
        null,
        credential.private_key,
        ["https://www.googleapis.com/auth/classroom.courses",
            "https://www.googleapis.com/auth/classroom.rosters",
            "https://www.googleapis.com/auth/classroom.profile.emails"
        ]
    )

    jwtClient.authorize().then(console.log)
        .catch(console.log);

    res.json("success")
});

module.exports = router;