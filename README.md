## Setting up and running the app: 

To run the server, open a terminal and then type in
**cd react-backend**   
and then run   
**npm install**  
And then  
**PORT=3001 node bin/www**  
The terminal should get blocked by the server

Then open another terminal. Type in  
**cd react-backend/client** 
Then type in  
**npm install**  
to install the dependency.  
To run the react front-end then, type in   
**npm start**  

Open your browser, and type in  
**localhost:3001**  
into the address bar. You should be able to see a UI.

## Configuration files
Both configuration files need to be placed under routes.
One is test-pfacs-d******.json and the other is configuration.js.
test-pfacs-d******.json will be used for service_account
Configuration.js will be used for firebase.

## How the UI works
In the current user interface, the buttons on the first line are for different kinds of login.  
 
Firebase login and Google classroom will ask you for your google account
If the connection is successful, then a line of message will show up.

For Google classroom, when you click the newly created button on the left 
of "Read Data", it will show the student email and name in the server terminal (
which you entered PORT=3001 node bin/www) 

For Firebase login, after you log in successfully, you can click the "Read Data"
button to read the data under that user's account in Firebase. If you want to
read different content, change the URL in line 166 in routes/users.js.

The button for ServiceAccount will not ask anything, and only print result to the server terminal



  



