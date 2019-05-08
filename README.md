# PFACS Backend with mongodata

## Setting up and running the backend

First type in <br>
**npm install**  

to install all the dependency.  
To run the react back-end then, type in   
**npm start**

The default port this server running on is **3001**. The front-end react app will use proxy to transfer the web service request to port 3000 to port 3001

## Be aware
This backend is only intended to be a playground for a specific file called mongo_data.js. Other routers won't work because I deleted the credential requirement. Since the mongo_data will call access to some data in mongo, to unleash the full power of mongo_data, run a mongo instance, with flag `--replSet rs0`, this will be useful for listening to the data change. 

## mongo_data.js 
This file contains couple ways to show how to work with front-end and backend 
* First, it contains a socket manager. The socket manager manages the socket for IO for the live data update. 
* Second, couple web service API is used to test how to send data from the mongo_data to the front-end through web service. 

May 8 <br>
JJ 

