let express = require('express');
let router = express.Router();

let admin = require('firebase-admin');

// let serviceAccount = require('../bin/test-pfacs-document')
let researcherList = require("./researcher_list");

let serviceAccount = {}

let researcherMap = {}

// admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount),
//     databaseURL: "https://test-pfacs.firebaseio.com"
// })

let latest = "";

let users = {};
let usersWithActions = {};
let printLogs = 0;

const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');

// Connection URL
const url = 'mongodb://localhost:27017';

// Database Name
const dbName = 'pfacs';

// Create a new MongoClient
const client = new MongoClient(url);
var db = null;
var allActions = null;
var playerInfo = null;

function checkMakeCollection (collName, db) {
    db.collection(collName, {strict:true}, function(err, col3) {
      assert.ok(err != null);
      // Create the collection
      db.createCollection(collName, function(err, result) {
        // Retry to get the collection, should work as it's now created
        db.collection(collName, {strict:true}, function(err, col3) {
          assert.equal(null, err);
        });
      });
    });
}

client.connect('mongodb://localhost:27017/', function(err, client) {
    if (err) {
        console.error(err);
    }
    db = client.db(dbname);
    //collections which exist are per user info :playerInfo
    //and action logs: allActions
    // db.collectionNames(playerInfo, function(err, names) {
    //     console.log('Exists: ', names.length > 0);
    // });

    // checkMakeCollection("playerInfo", db);
    // checkMakeCollection("allActions", db);
    allActions = db.collection('allActions');
    playerInfo = db.collection('playerInfo');

})



function makingExtraInfo (extraInfo, action, thislog) {
    if (action["currentScreen"] == "trendsScreen") {
        extraInfo["trendsScreen"] += 1;
    }
    else if (action["currentScreen"] == "dataCollect") {
        extraInfo["dataCollects"] += 1;   
    }
    else if (action["currentScreen"] == "insightsScreen") {
        extraInfo["insightsScreen"] += 1;   
    }
    

    if (action["actionValue"] == "clickedButton: ReleaseFinishedSongButton"){
        extraInfo["songReleases"] += 1;   
    }
    else if (action["actionValue"] == "clickedButton: SignArtistButton") {
        extraInfo["signedBands"] += 1;   
    }
    else if (action["actionValue"] == "clickedButton: Line") {
        extraInfo["lineChartSeen"] += 1;
    }
    else if (action["actionValue"] == "clickedButton: Heatmap") {
        extraInfo["heatmapSeen"] += 1;
    }
    else if (action["actionValue"] == "clickedButton: Bar") {
        extraInfo["barChartSeen"] += 1;
    }
    
    if (thislog["upTimeSeconds"] < extraInfo["sessionTime"]) {
        extraInfo["totalPlayTime"] += extraInfo["sessionTime"];
        extraInfo["sessionTime"] = thislog["upTimeSeconds"];
        extraInfo["sessions"] += 1; 
    }
    else {
        extraInfo["sessionTime"] = thislog["upTimeSeconds"];
    }

    extraInfo["logCount"] += 1;

    return extraInfo;
}

function addUserLog (latest, key) {
    let email = "";
    let latestEpoch = 0;
    let latestRealTime = "";
    let latestAction = "";
    let actionList= [];
    let currentCash = 0;
    let currentTurn = "";
    let currentScreen = "";
    let extraInfo = {
        "trendsScreen": 0,
        "songReleases": 0,
        "signedBands": 0,
        "dataCollects": 0,
        // "signedArtists": 0,
        "lineChartSeen": 0,
        "insightsScreen": 0,
        "barChartSeen": 0,
        "heatmapSeen": 0,
        
        "logCount": 0,
        "sessions": 0,
        "totalPlayTime": 0,
        "sessionTime": 0
    };
    let sessionTime = 0;
    // let logKeys = Object.keys(latest["logs"]);
    let logKeys = Object.keys(latest);

    for (let l in logKeys) {
        let action = {};
        // let thislog = latest["logs"][logKeys[l]];
        let thislog = latest[logKeys[l]];
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
            if (thislog["signedBandInfo"] != undefined){
                extraInfo["signedBands"] = thislog["signedBandInfo"]["numSignedBands"];
            }
        }
        action = {
            "currentScreen": thislog["currentScreen"],
            "currentCash": thislog["currentScreen"],
            "currentTurn": thislog["currentTurn"],
            "epoch": thislog["epochTime"],
            "actionValue": thislog["triggerAction"] + ": " + thislog["actionValue"],
            "eventId": logKeys[l]
        };
        
        extraInfo = makingExtraInfo(extraInfo, action, thislog);

        // if (thislog["triggerAction"] == "clickedButton" && thislog["actionValue"] == "Line") {
        //     extraInfo["lineChartSeen"] += 1;
        // }

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
        "extraInfoObj": extraInfo,
        "extraInfo": JSON.stringify(extraInfo, null, 4),
        "latestAction": latestAction,
        "actionList": actionList
    };
    // console.log(extraInfo);
    // usersWithActions[email] = {
    //     "userid": key, 
    //     "extraInfo": JSON.stringify(extraInfo, null, 4),
    //     "currentScreen": currentScreen, 
    //     "currentCash": currentCash,
    //     "currentTurn": currentTurn,
    //     "lastActionTime": latestEpoch,
    //     "lastTime": latestRealTime,
    //     "latestAction": latestAction,
    //     "actionList": actionList
    // };

}


function startUserListener(userId) {
    if (runningListeners.indexOf(userId) == -1){
        runningListeners.push(userId);
        admin.auth().app.database().ref("/users/" + userId + "/logs").on("child_added",(snapshot) =>{ 
            l = snapshot.val();
            newLog(snapshot, userId);
        });
    }

    
}


function addUser(snap) {
    snapval = snap.val();
    userObj = {snapval["userEmail"]: snap.key};
    //add a teacher array to this userObj
    //post this to a userLink thingie in the database
}

admin.auth().app
    .database()
    .ref(`/users/`)
    .limitToLast(1)
    .on("child_added",(snapshot) =>{
        console.log("reading dataaaa")
        startUserListener(snapshot.key);
        addUser(snapshot);
});

/*
each user has the following:
    cash
    turn
    last move
    playsession start
    total time played
    list of signedArtists
    list of insights
    list of songs
    graphtypes used
    storage/data management upgrades
    
*/
function newLog(snapshot, userId) {
    thislog = snapshot.val();
    key = snapshot.key;
    //remove useremail and post thislog to mongo
    
    //if it's a signed band, 



}

runningListeners = [];

//currently this returns all logs the user playing
//add an epoch timestamp, or some other filter to only get the recent ones
//and only append to existing userlog, not remake the whole thing

// usersOfInterest = ["50NI0CWLNfa9308WhwLUCpj6Bok2", "as7shPBwZgP3AVdivW9FJI2tvks1", "4px4iAGrXnVVhuKHmiwTxZ3LrsJ2", "L9U2ruG2GEehOQm7QfHZ38lPPrC2", "rh5bYODfSidJIOL29rhlUSU3rN12", "5TarubDZuqdzP6g8CyS1pSGnjCg2", "otBi93MndUbe9HoFpku8OxWa9BG3", "cXr9iszewDZINcZKP0LrvMEwwb02", "3nXHOjd21IUCHPp4ThpEEmRJWvu2", "3mAWZBjZarQARa0qcucMHnTagJ22", "yUhLSMFPKcgWdGOXlJOdIOe5RBG3", "t8ghiZUemDf0a7xB5vulSCLCrHh2", "ZA2vdxQ5ktawvhJCWrk1X0RYTpS2", "sneNl34qKCdybUEmUgi7sKqqSlp2", "8XCYd15GyAWL4CTTqi1aZqqIbld2", "SSnGvYkY6TeoO2JGGa0dA5b8Fwk2", "oRKUlfkSoeXJ1OyEA0bJ0ek79d22", "o1aFY2nwJpT4V6mLPKBp6RBpO603", "trIhAZFFAIYMGDGTrF65b9pyBal2", "6ii4h2K9M2QPeWHPGrCqu5VHs0n2", "RPljyXZCFMeXeDErvK2bZzYM6fs1", "fMB737g5ICRi8SgNLZpJnD1NEbH3", "ovL8xL5mWVeAewYEE5KJValCFc13", "2zDmaB8GyKUO59ptShUJEY23Fm13", "7h51jYtYMWgLpTey8Yvtin147xR2", "d0LoIBCLC2Mzo0dR1V3xzInzhW72"];
// usersOfInterest = [];
// usersOfInterest = ["d0LoIBCLC2Mzo0dR1V3xzInzhW72"];

// for (u in usersOfInterest) {
    // console.log(usersOfInterest[u]);
    /*
    admin.auth().app.database().ref("/users/" + usersOfInterest[u] + "/logs").on("child_added",(snapshot) =>{ 
        l = snapshot.val();
        // log = Object.keys(l["logs"]);
        // console.log(Object.keys(l)); 
        if (Object.keys(l).includes("userEmail")) {
            newLog(snapshot, usersOfInterest[u]);
        }
        else {
            addUserLog(l, usersOfInterest[u]);
        }
        // newLog(l, usersOfInterest[u]);
    });*/
    // startUserListener(usersOfInterest[u]);
// }

admin.auth().app.database().ref(`/users/`).orderByChild("epoch").on("child_changed",(snapshot) =>{
//     l = snapshot.val();
//     log = Object.keys(l["logs"]);
//     // console.log(log);
//     addUserLog(l, snapshot.key);
//     // console.log(log["triggerAction"]);
    startUserListener(snapshot.key);
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