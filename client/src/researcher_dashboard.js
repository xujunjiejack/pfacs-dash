import React, { Component } from 'react';
import {Dropdown, Container, Table, Pagination, Button} from 'semantic-ui-react'
import beautify from 'json-beautify'
import _ from "lodash"
import {XYPlot, LineSeries, MarkSeries, XAxis, YAxis} from 'react-vis'

class ResearcherDashboard extends Component{

    constructor(props){
        super(props);
        this.state = {selectIndex: -1,
            dataShown: {}, options: [], selectedValue: "",
            currentPageNumber: 1, itemNumberInAPage: 10}
    }

    parseLogsToTables = (logs) =>{

        let values = _.values(logs);
        if (values.length === 0){
            return (
                <div></div>
            )
        }

        let logsNums = _.keys(logs)
        let headers = _.keys(_.values(logs)[0])

        return (
        <Table cell>
            <Table.Header>
                <Table.Row>
                    <Table.HeaderCell> Log Number </Table.HeaderCell>
                    { _.map( headers, h => { return ( <Table.HeaderCell> {h} </Table.HeaderCell> ) }   ) }
                </Table.Row>
            </Table.Header>
            <Table.Body>

                {  _.map( logsNums, n => {

                        let log = logs[n]

                        return(

                            <Table.Row>
                                <Table.Cell> {n} </Table.Cell>
                                { _.map( headers, h=>{
                                        return (<Table.Cell > {log[h]} </Table.Cell>)
                                    }
                                ) }
                            </Table.Row>
                        )
                    }
                    )
                }

            </Table.Body>


        </Table>
        )
    }

    createOptions = (data) =>{
        let options = []

        for (let k in data ){
            let newOpt = {};
            newOpt["text"] = k;
            newOpt["value"] = k;
            options.push(newOpt)
        }

        this.setState({options: options})
    }

    evaluateIncomingUserList = (userList) =>{
        if (Object.keys(userList).length === 0 ){
            this.setState({dataShown: {}})
        }
    }

    componentDidUpdate(prevProps){

        if (this.props.data !== prevProps.data){
            console.log("updating props: "  + this.props.data);
            this.evaluateIncomingUserList(this.props.data);
            this.createOptions(this.props.data)
        }
    }

    handleChange = (e, { value }) => {
        // filter data
        let d = {};
        d[value] = this.props.data[value];

        this.setState({selectedValue:value, dataShown: d})
    };

    parseLogsToCharts = (logs) =>{

        // Here is what I think I should do
        // First, get the epoch time and
        let values = _.values(logs);
        if (values.length === 0){
            return (
                <div></div>
            )
        }

        // For us, log number is not important
        // What important is currentScreen and epochTime
        // Use a plot chat
        // X is epoche time
        // Y is currentScreen


        let logsNums = _.keys(logs)
        let headers = _.keys(_.values(logs)[0])

        let data = values.map( l => { return {x: l["epochTime"], y:l["currentScreen"] }} )
        let uniqueItems = Array.from(new Set(values.map( l => l["currentScreen"])))

        let uniqueItemsMap = {}

        uniqueItems.forEach((d,i) => {uniqueItemsMap[d] = i})

        data = data.map( (d,i)=>
        {

            return {x:d.x, y: uniqueItemsMap[d.y]}}

        ).slice(0,100);


        console.log(data)

        // console.log(data)
        return (
            // yType={"ordinal"} yDomain={uniqueItems} yRange={Array(10).map((d, i) => i)}
            <XYPlot height={1000} width={1000}>
                <MarkSeries  data = {data}/>
                {/*<XAxis/>*/}
                <YAxis/>
            </XYPlot>
        )
    }

    createRowsBasedOnPage = ( userArray, headers, pageNumber, itemNumberInAPage) =>{
        // default page number is 1
        let lowerBoundary = (pageNumber-1) * itemNumberInAPage;
        let upperBoundary = Math.min(pageNumber * itemNumberInAPage, userArray.length);
        let rows = []
        for (let i = lowerBoundary; i< upperBoundary; i++){
            let userDict = userArray[i];
            let userInfo = Object.values(userDict)[0];
            let email = Object.keys(userDict)[0];
            //console.log(userArray);
            rows.push(
                <Table.Row key={email} >
                <Table.Cell> {email} </Table.Cell>
                { headers.map(h=>{
                        return (<Table.Cell key={`${email}_${h}` } > {userInfo[h]} </Table.Cell>)
                    }
                ) }
            </Table.Row>
            )
        }
        return rows

    }

    parseUserListToTable = (userList, itemNumberInAPage) => {
        // userList = {"": {currentCash: "", currentScreen:"", lastActionTime : "", lastTime:"", userid:""},
        //     "":"", "":"", "":"", "":""};
        if (userList === null || userList === undefined){
            return (<div></div>)
        }

        let userEmails = Object.keys(userList)
        if (userEmails.length === 0){
            return ( <div></div>)
        }
        console.log(userEmails)
        let item = userList[userEmails[0]]
        let displayHeaders = ["currentScreen", "currentCash", "lastTime", "latestAction", "userid", "currentTurn"]
        let headers = Object.keys(item)
        headers = displayHeaders

        let userArray = []
        for (let email in userList  ){
            let dic = {}
            dic[email]= userList[email]
            userArray.push (dic)
            //console.log(dic);
        }
        //console.log(userArray);
        userArray.sort(function (a,b) {
            //console.log(a[Object.keys(a)[0]]["lastActionTime"])
            return b[Object.keys(b)[0]]["lastActionTime"] - a[Object.keys(a)[0]]["lastActionTime"]
        });

        let maxPageNumber = Math.ceil(userArray.length / itemNumberInAPage) ;

        // Show 10 results a page
        return (
            <Table celled>
                <Table.Header >
                    <Table.Row>
                        <Table.HeaderCell> email </Table.HeaderCell>
                        { headers.map( h => {return ( <Table.HeaderCell key={h}> {h} </Table.HeaderCell> ) }) }
                    </Table.Row>
                </Table.Header>

                <Table.Body>
                    {
                        this.createRowsBasedOnPage(userArray, headers, this.state.currentPageNumber, itemNumberInAPage)
                    }

                </Table.Body>

                <Table.Footer>
                    <Table.Row>
                        <Table.HeaderCell colSpan={headers.length + 1} >
                            <Pagination defaultActivePage={1} totalPages={maxPageNumber}
                                        onPageChange={ (e, data) =>{
                                            console.log("page to " + data.activePage)
                                            this.setState({currentPageNumber: data.activePage})
                                        }}/>
                        </Table.HeaderCell>
                    </Table.Row>
                </Table.Footer>
            </Table>
        )

    }


    render(){
        if (this.state.selectedValue === ""){
            this.state.dataShown = this.props.data;
        }


        return (


            <div>
                <Dropdown placeholder= "Select a student data"  selection options={this.state.options} onChange={this.handleChange}/>

                <Button color={"green"} onClick={() => this.setState({dataShown: this.props.data,selectedValue: "", selectIndex: -1 })}> Show all </Button>

                {/*Add the table for user list*/}
                {this.parseUserListToTable(this.state.dataShown, this.state.itemNumberInAPage)}


                {/*{*/}
                    {/*this.state.selectedValue === ""?*/}
                        {/*this.parseLogsToTables({}) :*/}

                        {/*this.parseLogsToTables( this.props.data[this.state.selectedValue].logs )}*/}

                {/*<Dropdown placeholder= "Select a student data"  selection options={this.state.options} onChange={this.handleChange}/>*/}
                {/*{*/}
                    {/*this.state.selectedValue === ""?*/}
                        {/*this.parseLogsToCharts({}) :*/}

                        {/*this.parseLogsToCharts(this.props.data[this.state.selectedValue].logs)}*/}
            </div>
        )

    }
}
export default ResearcherDashboard;