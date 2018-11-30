let express = require('express');
let router = express.Router();

let admin = require('firebase-admin');

let serviceAccount = require('./test-pfacs-document')
let researcherList = require("./researcher_list");

let researcherMap = {}

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://test-pfacs.firebaseio.com"
})


let latest = "";

let users = {};
let usersWithActions = {};
let printLogs = 0;

function addUserLog (latest, key) {
    let email = "";
    let latestEpoch = 0;
    let latestRealTime = "";
    let latestAction = "";
    let actionList= [];
    let currentCash = 0;
    let currentTurn = "";
    let currentScreen = "";
    let logKeys = Object.keys(latest["logs"]);

    for (let l in logKeys) {
        let action = {};
        let thislog = latest["logs"][logKeys[l]];
        email = thislog.userEmail;
        if (printLogs == 0){
            console.log(thislog);
            printLogs = 1;
        }
        // console.log(thislog.epoch);
        if (thislog["epochTime"] > latestEpoch) {
            // console.log("updatingcash");
            currentCash = thislog["currentCash"];
            currentTurn = thislog["currentTurn"];
            currentScreen = thislog["currentScreen"];
            latestEpoch = thislog["epochTime"];
            latestRealTime = thislog["realTimeUTC"];
            latestAction = thislog["triggerAction"] + ": " + thislog["actionValue"];
        }
        action = {
            "currentScreen": thislog["currentScreen"],
            "currentCash": thislog["currentScreen"],
            "currentTurn": thislog["currentTurn"],
            "epoch": thislog["epochTime"],
            "actionValue": thislog["triggerAction"] + ": " + thislog["actionValue"]
        };
        actionList.push(action);
    }
    console.log(email);
    users[email] = {
        "userid": key, 
        "currentScreen": currentScreen, 
        "currentCash": currentCash,
        "currentTurn": currentTurn,
        "lastActionTime": latestEpoch,
        "lastTime": latestRealTime,
        "latestAction": latestAction
    };
    usersWithActions[email] = {
        "userid": key, 
        "currentScreen": currentScreen, 
        "currentCash": currentCash,
        "currentTurn": currentTurn,
        "lastActionTime": latestEpoch,
        "lastTime": latestRealTime,
        "latestAction": latestAction,
        "actionList": actionList
    };

}

admin.auth().app
    .database()
    .ref(`/users/`)
    // .orderByChild('userEmail')
    // .equalTo('visheshkay@gmail.com')
    .on("child_added",(snapshot) =>{

    // Put your algorithm here
    console.log("reading dataaaa")

    latest = snapshot.val();
    // console.log(snapshot.key);
    
    addUserLog(latest, snapshot.key);


});

//currently this returns all logs the user playing
//add an epoch timestamp, or some other filter to only get the recent ones
//and only append to existing userlog, not remake the whole thing
admin.auth().app.database().ref(`/users/`).on("child_changed",(snapshot) =>{
    l = snapshot.val();
    log = Object.keys(l["logs"]);
    // console.log(log);
    addUserLog(l, snapshot.key);
    // console.log(log["triggerAction"]);

});

// setInterval(()=>{console.log(latest)},1000)
// Add a
router.post("/set_claim", (req, res, next) => {

    // Get the ID token passed.
    const idToken = req.body.idToken;
    // Verify the ID token and decode its payload.

    console.log(idToken)
    try {
        admin.auth().verifyIdToken(idToken.i).then((claims) => {
            console.log("get claim")
            // Verify user is eligible for additional privileges.
            console.log(claims)
            console.log(researcherList)
            try {
                if (typeof claims.email !== 'undefined' &&
                    typeof claims.email_verified !== 'undefined' &&
                    claims.email_verified &&
                    researcherList.includes(claims.email)) {
                    // Add custom claims for additional privileges.
                    admin.auth().setCustomUserClaims(claims.sub, {
                        researcher: true
                    }).then(() => {
                        // Tell client to refresh token on user.
                        console.log("setting claim correctly");
                        res.json({
                            status: 'success'
                        })
                    });
                } else {
                    // Return nothing.
                    console.log("setting claim not correctly");
                    res.json({status: 'ineligible'})
                }
            } catch (e) {
                console.log(e)
            }
        }).catch(console.log);
    } catch (e) {
        console.log(e)
    }
})


router.post("/set_researcher_token", (req, res, next)=>{
    let token = req.body.idToken;
    let email = req.body.email;

    if (researcherList.includes(email)){
        researcherMap[email] = token;
        res.json({code: 0})
    }
    else{
        res.json({code: 1})
    }
});

router.post("/latest", (req, res, next) => {

    let idToken = req.body["idToken"];
    console.log(JSON.stringify(researcherMap))
    console.log(idToken)
    // If userEmail doesn't exist in researcher list, saying they can't get data now

    if (!Object.values(researcherMap).includes(idToken)){
        res.json({latest: {}, userList: {}, error:"User not exist"})
        return
    }

    // change your latest here.
    if (latest === ""){res.json( {latest: latest, userList: users});return}

    let logs = latest.logs;
    let keys = Object.keys(logs).slice(0,3);
    let ret = {};
    keys.forEach( k => ret[k] = logs[k]);

    res.json({latest: ret, userList: users});
});


module.exports = router;