require("dotenv").config();
const MongoClient = require("mongodb").MongoClient

let database;

const initDB = (callback) => {
    if(database){
        console.log("database already connected")
        callback(null, database)
    }
    MongoClient.connect(process.env.MONGODB_URL)
    .then((client)=>{
        database = client;
        console.log("database succesfully initialized")
        callback(null, database)
    })
    .catch((err)=>{
        callback(err)
    })
}

const getDB = () => {
    if(!database){
        console.log("database not connected succesfully")
    }
    else{
        return database;
    }
}

module.exports = {initDB, getDB}