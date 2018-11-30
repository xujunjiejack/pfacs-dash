import React, { Component } from 'react';
import logo from './logo.svg';
import { instanceOf } from 'prop-types';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import axios from 'axios'
import { GoogleLogin } from 'react-google-login';
import firebase from 'firebase/app';
import 'firebase/auth'
import ResearcherDashboard from './researcher_dashboard'
import 'semantic-ui-css/semantic.min.css';
import {Container} from 'semantic-ui-react'
import {withCookies, Cookies} from 'react-cookie'
let config = require("./config");

class App extends Component {
    static propTypes = {
        cookies: instanceOf(Cookies).isRequired
    };

    state = {user: null, firebase_credential: null, email: "", password: "", message: "", firebase_login: false, firebase_token_id: "", data: {}
        , course_list: null, failure: false, latest: "", userList: {}}

    componentDidMount() {
        // load in firebase with token and email address
        // Populate state with email, firebase_credential, firebase_login
        firebase.initializeApp(config);
        const { cookies } = this.props;
        let tokenId = cookies.get('tokenId');
        let userEmail = cookies.get('email');

        if (userEmail) {this.setState({email: userEmail})}
        if (tokenId) {
            this.state.firebase_token_id = tokenId;
            this.firebaseLogin(tokenId);
            this.state.firebase_login = true;

            // console.log("Mounting" + tokenId);

        }


    }

    print_firebase_logs = () =>{

        console.log("Clicking read data button");

        axios.post("/admin_test/latest", {idToken: this.state.firebase_token_id}).then(
            res =>{
                if ( res.data.error !== undefined ){
                    console.log(res.data.error)
                }else{
                    this.setState({userList: res.data.userList})
                }
            }
        ).catch(console.log)

        
    };

    erase_data = () =>{
        this.setState({data: null})
    }

    get_student_emails = (c) =>{
        axios.post('/users/read_specific_course', {access_token: this.state.googleClassroomToken, course_id: c.id,
            course_name: c.name})
            .then(res => {
                console.log(res)
            }).catch( e => {console.log(e)})
    };


    create_course_button = (course_list) => {
        if (course_list === null){
            return (<div/>)
        }
        return course_list.map(c => {
                return (<button type="button" className="btn btn-secondary"
                onClick={() => this.get_student_emails(c)}> {c.name} </button>)
            }
        )
    };

    access_through_service_account = ()=>{
        axios.post("/service_account/access").then(console.log)
            .catch(console.log)
    }


    googleResponse = (response) =>{
        console.log(response)

        this.setState(
            {
                googleClassroomToken: response.accessToken
            }
        )
        this.get_student_emails({id:"18289786937"})
        axios.post('/users/googlelogin', {access_token:this.state.googleClassroomToken})
            .then(res =>{
                console.log("Google login success" + res);
                if (res.data.code === 0){
                    this.setState({message: "google classroom log in success", course_list: res.data.course_list});
                    console.log(res.data.course_list)

                }
                else{
                    this.setState({message: "failure"})
                }
            })
            .catch(e => console.log(e))
    }

    firebaseLogin = (tokenId) =>{
        const {cookies} = this.props
        let credential = firebase.auth.GoogleAuthProvider.credential(tokenId);
        console.log("hello");
        try {
            firebase.auth().signInAndRetrieveDataWithCredential(credential)
                .then(credential => {
                    console.log("getting credential")
                    // set up uid
                    this.setState({firebase_credential:credential});
                    axios.post('/admin_test/set_claim', {idToken: firebase.auth().currentUser.getIdToken()})
                        .then(res=>{
                            console.log("setting claim response")
                            if (res.data.status === "success"){
                                firebase.auth().currentUser.getIdTokenResult(true)
                                    .then(token => {

                                        cookies.set('tokenId', tokenId);
                                        this.setState({firebase_token_id: token.token});
                                        axios.post("admin_test/set_researcher_token", {
                                            idToken: token.token, email: firebase.auth().currentUser.email} )
                                    });

                                this.setState({failure: false})

                            }else{
                                this.setState({failure: true})

                                console.log(res.data.status)
                            }
                        })
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
                });
        }catch (e) {
            console.log(e)
        }
    }

    firebaseResponse = (response) =>{

        // this.setState({firebase_token_id: response.accessToken});
        this.setState({firebase_token_id: response.tokenId, user: response, email: response.profileObj.email});
        const {cookies} = this.props;
        cookies.set('tokenId', response.tokenId);
        cookies.set('email', response.profileObj.email);

        axios.post("admin_test/set_researcher_token", { idToken: response.tokenId, email: response.profileObj.email} )

        // set cookie here
        // set token and email address.
        // I can add expire time
        this.firebaseLogin(response.tokenId)

        //
        // axios.post('/users/firebase_login', {access_token:this.state.firebase_token_id})
        //     .then(res =>{
        //         console.log(res)
        //
        //         if (res.data.code === 0){
        //             this.setState({message: "firebase log in success", firebase_login: true})
        //             }
        //         else{
        //             this.setState({message: "failure"})
        //         }
        //
        //
        //     })
        //     .catch(e => console.log(e));
        // // axios.get('/users')
        //     .then((res) => console.log(res));
        // console.log(this.state.firebase_token_id)
        // axios.get("https://classroom.googleapis.com/v1/courses", {headers:
        //         {"Application": "Bearer " + this.state.firebase_token_id}})
        //     .then(e=> console.log(e))

    }

    handleEmailChange = (e) => {
        this.setState({email: e.target.value})
    };

    handlePasswordChange = (e) =>{
        this.setState({password: e.target.value})
    }


    handleSubmit = (e)=>{
        e.preventDefault()
    }

    logout = (e) =>{
        const {cookies} = this.props;
        firebase.auth().signOut().then( () => {
            this.setState({email: "", firebase_token_id: "", firebase_login: false, userList: {}} )
            cookies.remove("tokenId")
            cookies.remove('email')
        } )
    }

    render() {
        return (
            <div className="App">

                        <GoogleLogin
                    clientId="908046556011-80kbve0btf4nnn1o4vd010a0ag59tfj5.apps.googleusercontent.com"
                    scope="https://www.googleapis.com/auth/firebase"
                    onSuccess={this.firebaseResponse}
                    onFailure={this.firebaseResponse}
                >  Firebase Login </GoogleLogin>

                    {/*<GoogleLogin*/}
                    {/*clientId="908046556011-80kbve0btf4nnn1o4vd010a0ag59tfj5.apps.googleusercontent.com"*/}
                    {/*// scope="https://www.googleapis.com/auth/classroom.courses.readonly"*/}
                    {/*scope = "https://www.googleapis.com/auth/classroom.courses*/}
                    {/*https://www.googleapis.com/auth/classroom.rosters https://www.googleapis.com/auth/classroom.profile.emails"*/}
                    {/*onSuccess={this.googleResponse}*/}
                    {/*onFailure={this.googleResponse}*/}
                    {/*>  Google classroom Login </GoogleLogin>*/}

                {/*<button type="button" className="btn btn-primary" onClick={this.access_through_service_account}> Service account login</button>*/}

                <button type="button" className="btn btn-warning" onClick={this.logout}> Log out</button>
                    {  this.state.message !== "" ? <div className="alert alert-primary" role="alert"> {this.state.message } </div>  : <div/> }
                    {this.create_course_button(this.state.course_list)}
                <button type="button" className="btn btn-primary" onClick={this.print_firebase_logs}> Read data </button>

                {/*<button type="button" className="btn btn-secondary" onClick={this.erase_data}> Erase data </button>*/}


                <Container  text> {
                    this.state.email === "" ?
                    "No log in right now" :
                    `Current user: ${this.state.email}`
                }  </Container>

                { this.state.failure ? <Container text> This account cannot be verified as a researcher account, please try again</Container> : <div></div> }

                <div className="alert alert-primary" role="alert">
                {
                    Object.keys(this.state.userList).length === 0 ? "No data" : "data received"
                }
                </div>
                <ResearcherDashboard data={this.state.userList}/>

                {/*{*/}
                    {/*this.state.userList === "" ?*/}
                        {/*<div> No latest data </div>*/}
                        {/*:*/}
                        {/*<div> {JSON.stringify(this.state.userList)} </div>*/}
                {/*}*/}
            </div>

    );
    }
}

export default withCookies(App);
