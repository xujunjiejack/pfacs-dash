import { MongoClient } from "mongodb";
import { node } from "prop-types";
import * as _ from "lodash";

/*
{ _id: '-LQ_SwzchYiRQJkKLE9e',
  CMSLogVersion: '1.08',
  actionValue: 'Line',
  currentCash: 250000,
  currentFans: 20000,
  currentScreen: 'insightsScreen',
  currentTurn: 31,
  epochTime: 1541448124,
  gameSeed: 0,
  isLogVerbose: false,
  lastChangedDate: '11/4/2018',
  playerUniqueID: '375354e5ff4789f01bdfa9f16d5bd0e6',
  realTimeUTC: '11/05/2018 20:02:04',
  recordingsInProgress: 0,
  triggerAction: 'toggleSetActive',
  upTimeSeconds: 62.6575,
  userEmail: 'crjjrc@gmail.com' }
*/

// interface ILog{
//     epochTime: number;
//     userEmail: string;

// }

async function main(){
    let client = await MongoClient.connect("mongodb://localhost:27017")
    let db = client.db("pfacs")
    // let data = await db.collection("allActionscopy").group({playerUniqueID: 1}, {},{heatmap:0, bar:0, line:0}, (curr:any, result:any)=>{
    //     if (curr.actionValue === "Line") result.line +=1;
    //     if (curr.actionValue === "Bar") result.bar +=1;
    //     if (curr.actionValue === "Heatmap") result.heatmap +=1;
    
    // }, ()=>{},false)

    let data = await db.collection("allActions").aggregate(
        [
            {
                $match: {
                    actionValue: "Bar"  
                  }
            },
            {
                $group:{
                    _id: "$playerUniqueID", count:{$sum: 1}
                }
            }

        ]

    ).toArray()
    console.log(data)


    // I need to seperate data into 3 parts. Often, not often, not at all
    // console.log(groupData)
    
    
}

main()

