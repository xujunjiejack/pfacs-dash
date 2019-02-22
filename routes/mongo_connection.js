let MongoClient = require("mongodb").MongoClient

let express = require("express")
let router = express.Router()
console.log("hiiiiii")

MongoClient.connect("mongodb://localhost:27017").then( client=>{
    const db = client.db("playgroud")
    db.collection("stuff").find().toArray().then(console.log)
}
)


