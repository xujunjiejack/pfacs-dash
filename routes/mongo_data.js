let express = require("express")
let router = express.Router()
let {getMongodb, getChangeStream} = require("./mongo_connection")
let io = require("socket.io")(8080)
let Chance = require('chance')
let chance = new Chance()

// Define two new namespace for the student status
const studentStatusNS = io.of('/studentstatus')
const classOverviewNS = io.of('/classoverview')

class SocketManager{
    
    constructor(){

        // socket router will have router object with properties, which tracks all of the sockets
        // {interval: IntervalObject, sockets:socketNumber[], students: string[], roomId: string}
        this.socketsRouterForStudentStatus = []

        // {interval: IntervalObject, sockets:socketNumber[], sessionId: string, roomId: string}
        this.socketsRouterForClassOverview = []
        this.ioSockets = [] 

        this.sendMessage = (message) => {
            console.log("logging")
            if (this.sockets.length !== 0){
                this.sockets[this.sockets.length-1].emit("message", message)
            }
        }

        this.addIOSockets = (socket) => {
            this.ioSockets.push(socket)
        }

        this.sendIOMessage = (message) => {
            for (let s in this.ioSockets){
                s.emit("hi", message)
            }            
        }

        this.removeIOSocket = (socket) => {
            this.ioSockets = this.ioSockets.filter(s => s.id !== socket.id)
        }

        this.sendStudentStatusData = (message) => {
            studentStatusNS.emit("live status update", message)
        }
        
        this.sendStudentStatusDataWithSocket = (message, socket) => {
            socket.emit("live status update", message)
        }
        
    }
}

var socketManager = new SocketManager()

// Add default io connection method
io.on("connection", socket => {
    socketManager.addIOSockets(socket)
    socket.on("disconnect", () =>{ 
        socketManager.removeIOSocket(socket)
    })
    }
)

// Event listener for class overview
classOverviewNS.on("connection", socket => {
    socket.on("disconnect", () =>{
        // I need to do the same as stop listening, or do I? There exists weird things going on there.
    })
    
    // the socket will hit this point to start live data
    socket.on("listen to class overview", (data)=>{
        console.log("**********class overview************")
        console.log(data)

        const sessionId= data.sessionId
        
        // First, let's see whether the channel request the same students information already in the routers
        // Potential bug: two classes with the same data. 
        // const result= socketManager.socketsRouterForStudentStatus.find( r => 
        //         whetherTwoArraySame(r.students, studentlist))
        const result = socketManager.socketsRouterForClassOverview.find(r => {
            r.sessionId === sessionId
        })    
        
        if (result === undefined){
            // create a new interval
            // add the new interval into the router as a new route
            // Actually a hidden bug is what if there are two sessions with the same students. Probably teacher id? 
            let roomId = chance.string({length: 5})
            socket.join(roomId)

            // The algorithm connected to the mongodb will need to be placed here, with an updated stuff. 
            /****
             * The student data returned needs to be in the form of { "student name":0, "student name":1, "student name":2 }
             * 0 means in-progress, 1 means stuck, 2 means disconnect
             * Use studentStatusNS.to(roomId).emit("live status update", studentData) to send the information.
             */
            console.log("class overview loggin")
            const msgInterval = setInterval( () => {
                const overviewData = {bar: [2,2,2], line: [2,2,2], heatmap: [2,2,2]}                
                /* get student status from mongo */
                // studentlist.forEach(x => {
                //     studentData[x] = chance.weighted([0,1,2], [3,1,1])
                // })

                classOverviewNS.to(roomId).emit("live class overview update", overviewData)
            }, 5000)
            
            // Send message
            const object = {interval: msgInterval, sessionId, sockets:[socket], roomId} 
            socketManager.socketsRouterForClassOverview.push(object)

        } else {
            // add the socket in the specific socket route
            // if the socket already there
            // Oh, I can just add everything into the room
            let roomId = result.roomId
            if (!result.sockets.some( s => s.id === socket.id)){
                result.sockets.push(socket)
                socket.join(roomId)
            }
        }
    })


// the socket will hit this point to stop listening to class overview
    socket.on("stop listening class overview", (data)=>{
        // find the route in which socket exists
        console.log("socket id: " + socket)

        // find the router which contains this specific socket
        let result = socketManager.socketsRouterForClassOverview.find(
            socketRoute => {
                for (const s of socketRoute.sockets) {
                    if (s.id === socket.id) return true
                }
                return false
            }
        )
        
        if (result !== undefined){
            // if the socket doesn't exist. Leave the room, and get rid of the socket
            socket.leave(result.roomId)
            const newSockets = result.sockets.filter(s => s.id !== socket.id)
            result.sockets = newSockets

            // clean the listeners if no one keeps listening.
            if (result.sockets.length === 0){
                clearInterval(result.interval)
                socketManager.socketsRouterForClassOverview = socketManager.socketsRouterForClassOverview.filter(s => s.roomId !== result.roomId)
            }
        }
        console.log("router number: ")
        console.log(socketManager.socketsRouterForClassOverview)
    })
})


// Event listener for student status
studentStatusNS.on("connection", socket => {
    socket.on("disconnect", () =>{
        // I need to do the same as stop listening, or do I? There exists weird things going on there.
    })
    
    // the socket will hit this point to start live data
    socket.on("listen to live data", (data)=>{
        // console.log("************************")
        // console.log(data)

        const studentlist = data.students
        
        // First, let's see whether the channel request the same students information already in the routers
        // Potential bug: two classes with the same data. 
        const result= socketManager.socketsRouterForStudentStatus.find( r => 
                whetherTwoArraySame(r.students, studentlist))
            
        if (result === undefined){
            // create a new interval
            // add the new interval into the router as a new route
            // Actually a hidden bug is what if there are two sessions with the same students. Probably teacher id? 
            let roomId = chance.string({length: 5})
            socket.join(roomId)

            // The algorithm connected to the mongodb will need to be placed here, with an updated stuff. 
            /****
             * The student data returned needs to be in the form of { "student name":0, "student name":1, "student name":2 }
             * 0 means in-progress, 1 means stuck, 2 means disconnect
             * Use studentStatusNS.to(roomId).emit("live status update", studentData) to send the information.
             */

            // mongodb.server 
            const msgInterval = setInterval( () => {
                // console.log(studentlist)
                const studentData = {}

                /* get student status from mongo */
                studentlist.forEach(x => {
                    studentData[x] = chance.weighted([0,1,2], [3,1,1])
                })

                studentStatusNS.to(roomId).emit("live status update", studentData)
            }, 5000)
            
            // Send message
            const object = {interval: msgInterval, students: studentlist, sockets:[socket], roomId} 
            socketManager.socketsRouterForStudentStatus.push(object)

        } else {
            // add the socket in the specific socket route
            // if the socket already there
            // Oh, I can just add everything into the room
            let roomId = result.roomId
            if (!result.sockets.some( s => s.id === socket.id)){
                result.sockets.push(socket)
                socket.join(roomId)
            }
        }
    })


    // the socket will hit this point to stop listening to student status 
    socket.on("stop listening student status", (data)=>{
        // find the route in which socket exists
        console.log("socket id: " + socket)

        // find the router which contains this specific socket
        let result = socketManager.socketsRouterForStudentStatus.find(
            socketRoute => {
                for (const s of socketRoute.sockets) {
                    if (s.id === socket.id) return true
                }
                return false
            }
        )
        
        if (result !== undefined){
            // if the socket doesn't exist. Leave the room, and get rid of the socket
            socket.leave(result.roomId)
            const newSockets = result.sockets.filter(s => s.id !== socket.id)
            result.sockets = newSockets

            // clean the listeners if no one keeps listening.
            if (result.sockets.length === 0){
                clearInterval(result.interval)
                socketManager.socketsRouterForStudentStatus = socketManager.socketsRouterForStudentStatus.filter(s => s.roomId !== result.roomId)
            }
        }
        console.log("router number: ")
        console.log(socketManager.socketsRouterForStudentStatus)
    })
})



function whetherTwoArraySame(arr1, arr2){
    if (arr1.length !== arr2.length){
        return false
    }

    for (let i = 0; i< arr1.length; i ++ ){
        if (arr1[i] !== arr2[i]){
            return false
        }
    }
    return true
}

// By calling this router, the backend will constantly send a message to the front end as long 
// anything changes in the database
router.get('/start', (req,res,next) => {
    
    const changeStream = getMongodb().collection("allActions").watch();

    changeStream.on("change", next =>{
        console.log(next)
        let data = next.fullDocument
        socketManager.sendIOMessage(JSON.stringify(data))    
    })
    res.json({ok:1})

})

router.get('/', (req, res, next) => {
    console.log(getMongodb().collection("allActions"))
    getMongodb().collection("allActions").find({$and: [{"playerUniqueID": "87e3546b9697e9ada5072e41e848df4c"}, {"actionValue": "Bar"}]}).count()
        .then(count => {
            console.log(count)
            main.sendMessage(JSON.stringify({num:count}))
            res.json({number: count})
        })
    // .find({playerUniqueID:"d86ef0daf47c1ae33732edab1b668e6d"}, (error, result) => 
    //     {
    //         console.log(result)
    //         result.toArray().then(x => {
    //             res.json({number: x})
    //         })
    //     }
    // )
});

const ids =
    ['13ce07d5ff27233b9f0cf0679bd9e263',
    '87e3546b9697e9ada5072e41e848df4c',
    'a5dfd57d39fd5e0d9c14b52326ad7b48',
    'f62145c8e128b26aa94e1862c4ffabd5',
    '756da1ef2c77026a62d7e9d375be60b6',
    'a94aadfd36df99a8d73b048c4e173fc1',
    '0f3ec3bfb511b58fa88f4765c24bb95e',
    'c1a8e806fe3c9b40348bcde067592b15',
    'b0c1c3d52a5352d653c7f982660d7c20',
    '1b3937e0aef6b9b01c56eceeffa013ef'
    ]

router.get('/graphusage', (req, res, next) => {
    // go with match and then group
    let query = getMongodb().collection("allActions").aggregate([
        {$match:  { "playerUniqueID": {$in: ids} }},
        {$group: 
            { _id: "$playerUniqueID", 
              barCount: {$sum: 
                           {
                                $cond: [
                                    {$eq: [ "$actionValue", "Bar" ]}, 1, 0
                                ]
                           } 
                        }, 

              heatmapCount: {$sum: 
                {
                     $cond: [
                         {$eq: [ "$actionValue", "Heatmap" ]}, 1, 0
                     ]
                } 
             }, 
              linechartCount: {$sum: 
                {
                     $cond: [
                         {$eq: [ "$actionValue", "Line" ]}, 1, 0
                     ]
                } 
             }}
            }

    ]).toArray().then( data =>{
        res.json(data);            
    } )
});

router.get('/activein10minutes', (req, res, next) => {
    // getMongodb().collection("allActions").find({playerUniqueID:{$in: ids}}).toArray().then (dataArray => {

    // })

    // go with match and then group
    let query = getMongodb().collection("allActions").aggregate([
        {$match:  { "playerUniqueID": {$in: ids} }},
        {$sort: { epochTime: -1 }},
        {$group: 
            { _id: "$playerUniqueID"
                ,epochTimeLatest: { $first: "$epochTime"}
        }
        }
    ]).toArray().then( data =>{
        res.json(data.map(d => {
            let timeSince = new Date().getTime() - (d.epochTimeLatest*1000)
            if (timeSince <= 600){
                return {[d._id]:true}
            }
            return {[d._id]:false}
        }))
    } )
});


// use query 
// assume there might be 1000 released song 
// so the idea becomes, picking the position of all of the song if exists and then find the max in it.  
// so the query becomes, $max: [releasedSong0.chartPosition, releasedSong1.chartPosition, releasedSong2.chartPosition, releasedSong3.chartPosition, releasedSong4.chartPosition]  
// 
let maxPush = []
for (let i = 0; i< 1000; i++){
    maxPush.push(`$releasedSong${i}.chartPosition`)
}
 // {$group: 
        //     { _id: "$playerUniqueID"
        //         ,epochTimeLatest: { $last: "$epochTime"}
        // }}

function getTopSongRank(db){
    let latestPositionArray = [] 
    setInterval(()=> {console.log(latestPositionArray.length)}, 1000)
    for (let id of ids){
        db.collection("allActions").find({$and: [ {"playerUniqueID":id}, {"releasedSong0":{$exists: true}}, {"actionValue":"ContinueButton"}, {"isLogVerbose": true}]}).sort({"epochTime":-1}).limit(1).toArray().then(
            latestVerboseLog => {
                let songRanks = []
                let bestRank = 1000
                // console.log(latestVerboseLog)
                let entry = latestVerboseLog[0]
                for (let s in entry) {
                    // console.log(s)
                    if (s.includes("releasedSong")) {
                        let rank = entry[s]["chartPosition"]
                        songRanks.push(rank);
                        if (bestRank > rank) {
                        bestRank = rank;
                        }
                    }
                }

                latestPositionArray.push({ id, bestRank})
               
            }
        )
    }

    return latestPositionArray
} 

async function getTopSongRank2(db){
    let latestPositionArray = [] 

    for (let id of ids){
        
        let latestVerboseLog = await db.collection("allActions").find({$and: [ {"playerUniqueID":id}, {"releasedSong0":{$exists: true}}, {"actionValue":"ContinueButton"}, {"isLogVerbose": true}]}).sort({"epochTime":-1}).limit(1).toArray()
            let songRanks = []
            let bestRank = 1000
            // console.log(latestVerboseLog)
            let entry = latestVerboseLog[0]
            for (let s in entry) {
                // console.log(s)
                if (s.includes("releasedSong")) {
                    let rank = entry[s]["chartPosition"]
                    songRanks.push(rank);
                    if (bestRank > rank) {
                    bestRank = rank;
                    }
                }
            }

            latestPositionArray.push({id, bestRank})

    }

    return latestPositionArray
} 

router.get("/topsongrank", (req, res, next) =>{
    // getTopSongRank(getMongodb()).then( data =>{
    //     res.json(data)        
    // } )
    // res.json(getTopSongRank(getMongodb()))

    let query = getMongodb().collection("allActions").aggregate([
        {$match:  {"playerUniqueID": {$in: ids}}},
        {$match: {$and: [{"actionValue":"ContinueButton"}, {"isLogVerbose": true}]}},
        {$sort: {epochTime: -1}},
        {$project: {playerUniqueID:"$playerUniqueID", minPosition: {$min: maxPush}, epochTime: "$epochTime"}},
        {$group: 
                { _id: "$playerUniqueID", epochTimeLatest: { $last: "$epochTime"},}
        }
    ]).toArray().then( data =>{
        // res.json(data.map(d => {
        //     let timeSince = new Date().getTime() - (d.epochTimeLatest*1000)
        //     if (timeSince <= 600){
        //         return {[d._id]:true}
        //     }
        //     return {[d._id]:false}
        // }))
        res.json(data)
    } )
    // db.allActions.find({$and: [ {"playerUniqueID":<>}, {"actionValue":"ContinueButton"}, {"isLogVerbose": true}]}).sort({"epochTime":-1}).limit(1)
})

module.exports = router;
