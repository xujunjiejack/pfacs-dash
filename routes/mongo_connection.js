let MongoClient = require("mongodb").MongoClient

let express = require("express")
let router = express.Router()
console.log("hiiiiii")

let mongodb = null

MongoClient.connect("mongodb://localhost:27017").then( client=>{
    // mongodb = client.db("pfacs")
    mongodb = client.db("test")
    // mongodb.collection("stuff").find().toArray().then(console.log)
    }
)

let getMongodb = () => mongodb

exports.getMongodb = getMongodb
