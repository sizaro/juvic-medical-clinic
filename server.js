require("dotenv").config()
const express = require("express")
const app = express()
const mongoDB = require("./database/mongoDB")
const route = require("./routes")
const path = require("path")

const port = process.env.port || 7000
app.set("view engine", "ejs")
app.use(express.static(path.join(__dirname, "public")))
app.use("/", route)
mongoDB.initDB((err)=>{
    if(err){
        console.log(`error connecting the database error is ${err}`)
    }
    else{
        app.listen(port, console.log(`app listening at portal ${port}`))
    }
})

