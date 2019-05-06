let express = require('express');
let router = express.Router();

const {google} = require('googleapis');
let firebase = require('firebase');

const {OAuth2Client} = require('google-auth-library');
// let configuration = require("../bin/configuration");

// let CLIENT_ID =configuration.client_ID
// const client = new OAuth2Client(CLIENT_ID);

// let config = configuration.firebase_config;
// firebase.initializeApp(config);
let credential_uid = "";

let MongoClient = require("mongodb").MongoClient
console.log("hiiiiii")

let db = undefined;

MongoClient.connect("mongodb://localhost:27017").then(client=>{
    db = client.db("playground")
}
)

async function verify(token) {
    const ticket = await client.verifyIdToken({
        idToken: token,
        audience: CLIENT_ID,  // Specify the CLIENT_ID of the app that accesses the backend
        // Or, if multiple clients access the backend:
        //[CLIENT_ID_1, CLIENT_ID_2, CLIENT_ID_3]
    });
    const payload = ticket.getPayload();
    const userid = payload['sub'];
    // If request specified a G Suite domain:
    //const domain = payload['hd'];
}

function get_google_class (access_token, res1){
    console.log("hello");
    let OAuth2 = google.auth.OAuth2;
    let auth = new OAuth2();
    auth.setCredentials({access_token: access_token});
    let classroom = google.classroom({version: 'v1', auth});

    classroom.courses.list({
        pageSize: 10,
    }, (err, res) => {
        if (err) return console.error('The API returned an error: ' + err);
        const courses = res.data.courses;
        if (courses && courses.length) {
            console.log('Courses:');
            courses.forEach((course) => {
                console.log(`${course.name} (${course.id})`);
            });

            res1.json({code: 0, course_list: courses })
        } else {
            console.log('No courses found.');
            res1.json({code:1})
        }
    });
}

router.get('/mongodata', (req, res, next)=>{
    if (db === undefined){
        res.json(500, "db not connected")
        return
    }
    console.log("mongodata")
    let data = db.collection("stuff").find().toArray().then(
        data => res.json(data)
    )
    }
)

router.post('/googlelogin',  (req, res, next)=>{
    // Account_info
    // {username:"", password:""}
    console.log("google log in");
    let account_info = req.body;
    let access_token = account_info.access_token;
    get_google_class(access_token, res);
    console.log("getting google classes");
});


function get_specific_course (access_token, course_id, res1){
    console.log("getting specific course");
    let OAuth2 = google.auth.OAuth2;
    let auth = new OAuth2();
    auth.setCredentials({access_token: access_token});
    let classroom = google.classroom({version: 'v1', auth});

    classroom.courses.students.list({
        courseId: ''+ course_id,
    }, (err, res) => {
        if (err) return console.error('The API returned an error: ' + err);
        res.data.students.forEach( s => {
            console.log(s.profile.emailAddress);
            console.log(s.profile.name.fullName);
        });

        res1.json(res.data)
        // if (courses && courses.length) {
        //     console.log('Courses:');
        //     courses.forEach((course) => {
        //         console.log(`${course.name} (${course.id})`);
        //     });
        //
        //     res1.json({code: 0, course_list: courses })
        // } else {
        //     console.log('No courses found.');
        //     res1.json({code:1})
        // }
    });
}

router.post('/read_specific_course',  (req, res, next)=>{
    console.log("get specific course");
    let access_token = req.body.access_token;
    get_specific_course(access_token, req.body.course_id, res)
});

function firebase_signin(access_token, res){
    let credential = firebase.auth.GoogleAuthProvider.credential(access_token);
    console.log(credential);

    try {
        firebase.auth().signInAndRetrieveDataWithCredential(credential)
            .then(credential => {
                console.log(credential.user.uid)
                // set up uid
                credential_uid = credential.user.uid;

                res.json({code:0})
            })
            .catch(function(error) {
                // Handle Errors here.
                let errorCode = error.code;
                let errorMessage = error.message;
                // The email of the user's account used.
                let email = error.email;
                // The firebase.auth.AuthCredential type that was used.
                let credential = error.credential;

                // ...
                console.log("error: " + error);
                res.json({code:1})

            });
    }catch (e) {
        console.log(e)
    }



}

/* GET users listing. */
router.get('/', function(req, res, next) {
    // Comment out this line:
    //res.send('respond with a resource');

    // And insert something like this instead:
    res.json([{
        id: 1,
        username: "samsepi0l"
    }, {
        id: 2,
        username: "D0loresH4ze"
    }]);
});

router.post('/read_all_data', (req, res, next) =>{
    console.log("read all data");
    let access_token = req.body.access_token
    verify(access_token)
        .then(()=>{
                console.log("accessing data")
                // let ref = firebase.database().ref(`/users/${credential_uid}`).limitToLast(10);
                let ref = firebase.database().ref(`/users/`).limitToLast(10);
                ref.on("value", snapshot =>{
                        console.log(snapshot);
                        res.json({code: 0, data: snapshot.val()})
                    },
                    error => {
                        console.log("there is an error: " + error)
                        res.json({code:1})
                    }

                )
            }
        )
        .catch(e => {
            console.log(e);
            res.json({code:1})
        })

});

router.post('/firebase_login',  (req, res, next)=>{
    // Account_info
    // {username:"", password:""}
    console.log("firebase log in");
    let account_info = req.body;
    let access_token = account_info.access_token;
    firebase_signin(access_token, res);

    console.log("access_token"  + access_token);
    console.log("firebase login success");
    // await oauth2Client.getAccessToken();
});



module.exports = router;