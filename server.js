/**
 * Configuration and router for app 
 */

require('dotenv').config()


const express = require('express'),
    app = express(),
    patterns = require('./api/patterns')
    // teams = require('./api/teams'),
    // users = require('./api/users'),
    // helmet = require('helmet');
    
var bodyParser = require('body-parser')
const PORT = process.env.PORT || 8080;
const PROD = process.env.NODE_ENV === "production" || false;


if (PROD){
  // using helmet when env is in production
  app.use(helmet());
  console.log("Added helmet headers");
}

app.set('view engine', 'ejs');

// index page
app.get('/', function(req, res) {
  res.render('index');
});
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))
// parse application/json
app.use(bodyParser.json())
app.use(express.urlencoded({ extended: true }));


// Serve files
app.use('/data', express.static('data'))
app.use('/res', express.static('res'))

app.use("/patterns", patterns)
// .use('/matches', matches)
// .use('/users', users)
.use('/index', (req, res, next) => {
  res.status(200).json({status:"ok"});
})
.use((req, res, next) => {
  res.status(404).json({status:"error", msg:"Page cannot be found!"});
});

app.listen(PORT);
console.log(`Staring app on ${PORT}`);
