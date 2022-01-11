/**
import * as FilePond from 'filepond';
 */
const {body} = require('express-validator')
var mysql = require('mysql');

var dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_DATABASE
};
  
const formidable = require('formidable');
const express = require('express'),
      router = express.Router();
// query to get all matches with results
const patternsQuery = `SELECT * from pattern`

var db;
function handleDisconnect() {
  db = mysql.createConnection(dbConfig);  // Recreate the connection, since the old one cannot be reused.
  global.db = db;
  db.connect( function onConnect(err) {   // The server is either down
      if (err) {                                  // or restarting (takes a while sometimes).
          console.log('error when connecting to db:', err);
          setTimeout(handleDisconnect, 10000);    // We introduce a delay before attempting to reconnect,
      }else{
          console.log('Connected to database');
      }                                       // to avoid a hot loop, and to allow our node script to
  });                                             // process asynchronous requests in the meantime.
                                                  // If you're also serving http, display a 503 error.
  db.on('error', function onError(err) {
      if (err.code == 'PROTOCOL_CONNECTION_LOST') {   // Connection to the MySQL server is usually
          db.destroy();
          console.log('db error', err);
          handleDisconnect();                         // lost due to either server restart, or a
      } else if (err.code == 'ER_TABLEACCESS_DENIED_ERROR') {
          console.log("MYSQL : Unauthorized action")
          console.log(err.code)
      } else {                                        // connnection idle timeout (the wait_timeout
          throw err;                                  // server variable configures this)
      }
  });
}

try {
  handleDisconnect();
} catch (error) {
  console.log(error);
}

// Return a table with a list of all the patterns
router.get("/all", (req, res) => {
    console.log("Connected!");
    db.query(patternsQuery, function (err, result) {
      if (err) {
        throw err
      }else{
        console.log("Result: " + JSON.stringify(result));
        // res.json(result);
        res.render("partials/patterns_table", {
          pattern_list: result
        })
      }
    });
});

// Return the DB table in json format
router.get("/all_json", (req, res) => {

  // console.log("all_json!");
  db.query(patternsQuery, function (err, result) {
    if (err) throw err;
    // console.log("All_Json : result: " + result);
    // res.json(result);
    res.json(result)
    })
});

router.get("/add", (req, res) => {
  res.render("add")
});

// Edit pattern
router.get("/edit", (req, res) => {
  console.log("Edit" + JSON.stringify(req.query))
  let query = req.query
  if (query != undefined && query != "" && query.id != undefined && query.id != ''){
    let singleResultQuery = patternsQuery + ` WHERE id=${query.id}`
    db.query(singleResultQuery, function (err, result) {
      if (err) throw err;
      console.log("Result: " + JSON.stringify(result[0]));
      res.render("edit", {
        pattern: result[0]
      })
    });
  }else{
    res.status(501)
  }
});

router.post("/edit", (req,res) => {

  var data = req.body
  var query = `UPDATE pattern SET name=${db.escape(data.name)},
                                  number=${db.escape(data.number)},
                                  size="${db.escape(data.size)}",
                                  company=${db.escape(data.company)},
                                  fabric=${db.escape(data.fabric)},
                                  fabric_length=${parseFloat(data.fabric_length)},
                                  note=${db.escape(data.note)},
                                  type="${data.type}",
                                  size_category="${data.size_category}"
              WHERE id=${data.id}`

  console.log(query)

  db.query(query, (err, result)=>{
    if (err){
      res.status(500).send(err)
      console.log(err)
      console.log(result)
    }
    else{
      add_files(data.id, data);
      res.sendStatus(200)
    }
  })
  

})

router.get("/single", (req, res) => {
  let query = req.query
  if (query != undefined && query != "" && query.id != undefined && query.id != ''){
    let singleResultQuery = patternsQuery + ` WHERE id=${query.id}`
    db.query(singleResultQuery, function (err, result) {
      if (err) throw err;
      console.log("Result: " + JSON.stringify(result[0]));
      res.json(result[0])
    });
  }else{
    res.status(501)
  }
});


// Remove from database
router.get("/remove", (req, res) => {
  db.query(patternsQuery, function (err, result) {
    if (err) throw err;
    console.log("Result: " + result);
    // res.json(result);
    res.render("remove", {
      pattern_list: result
    })
  });
});

// List all files in the data folder
router.get("/files", (req, res) => {
  const patternFiles = './data/';
  const fs = require('fs');
  var glob = require('glob');
  // options is optional
  glob("./data/**/*.*",function (er, files) {
    // files is an array of filenames.
    // If the `nonull` option is set, and nothing
    // was found, then files is ["**/*.js"]
    // er is an error object or null.
    fileArr = {}
    files.forEach((file)=>{
      var path = file.split("/data/")[1]
      var id = path.split("/")[0]
      var filename = file.split(`/data/${id}/`)[1]

      if (fileArr[id] != undefined){

      }else{
        fileArr[id] = []
      }

      // Exclude the thumbnail
      if (filename != "thumb.png"){
        fileArr[id].push(filename)
      }

    });
    res.json(fileArr)
  })
});

// Remove from database
router.get("/remove", (req, res) => {
  db.query(patternsQuery, function (err, result) {
    if (err) throw err;
    console.log("Result: " + result);
    // res.json(result);
    res.render("remove", {
      pattern_list: result
    })
  });
});

router.post("/remove", (req, res) => {
  if (req.body.type == 'undefined'){
    req.body.type = ""
  }else{
    console.log(req.body)

    if ( req.body.pattern != undefined && req.body.pattern != ''){
      var pattern  = req.body.pattern
      let query = ""
      var patternArray = []
      if (Array.isArray(pattern) && pattern.length > 1){
        
        for (var  i=0; i<pattern.length; i++){
          patternArray.push(pattern[i])
        }
    
      }else{
        patternArray.push(pattern)
      }

      query = `DELETE FROM pattern WHERE id IN (${patternArray});`

      db.query(query, (err,result)=>{
        if (err){
          // res.status(501).send()
          throw err
        } 
        else{
          console.log(result)
          res.send(result)
        }
      })
    }
  }
});

router.get("/fabric_type", (req, res) => {
  let query = "SELECT * FROM fabric_type ORDER BY name"
  db.query(query, function (err, result) {
    if (err) throw err;
    console.log("Result: " + result);
    // res.json(result);
    res.json(result);
  });
});

router.get("/pattern_type", (req, res) => {
  let query = "SELECT * FROM pattern_type  ORDER BY name"
  db.query(query, function (err, result) {
    if (err) throw err;
    console.log("Result: " + result);
    // res.json(result);
    res.json(result);
  });
});

router.get("/size_category", (req, res) => {
  let query = "SELECT * FROM size_category ORDER BY name"
  db.query(query, function (err, result) {
    if (err) throw err;
    console.log("Result: " + result);
    // res.json(result);
    res.json(result);
  });
});

router.post("/debug", (req, res) => {
  console.log("Body:")
  console.log(req.body)
  console.log("Query:")
  console.log(req.query)
  res.send("ok")
})

router.get("/debug", (req, res) => {
  console.log("Body:")
  console.log(req.body)
  console.log("Query:")
  console.log(req.query)
  res.send("ok")
})

router.post("/add", (req, res) => {
                    
// router.post("/add",body('name').escape(),
//                   body('note').escape(),
//                   body('company').escape(),
//                   body('number').escape(),
//                   body('size').escape(), (req, res) => {
                    
  console.log(req.body)

  if (req.body.type == 'undefined'){
    req.body.type = ""
  }
  
  var query = "INSERT INTO pattern (`name`, `number`, `size`, `company`, `fabric`, `fabric_length`, `note`, `type`, `size_category`)" +
              `VALUES ( ${db.escape(req.body.name)},  ${db.escape(req.body.number)}, ${db.escape(req.body.size)}, ${db.escape(req.body.company)}, ${db.escape(req.body.fabric)},
                      ${parseFloat(req.body.fabric_length)},${db.escape(req.body.note)},"${req.body.type}", "${req.body.size_category}")`

  console.log(`Add pattern SQL query : ${query}`);
  
  try {
    db.query(query, function (err, result) {
      if (err){
        res.status(501).send("FAILED\n" + JSON.stringify(req.body) + "\nError : " + result)
        console.log(err)
        console.log(result)
      }
      else{
        // Query is accepted, save the files on disk
        try{
          add_files(result.insertId, req.body);
          add_thumbnail(result.insertId, req.body);
          console.log(`Entry added : ${result.insertId} - ${req.body.name}`)
          res.send("Entry accepted")
        }catch(error){
          res.status(501).send("Entry failed")
        }
      }
    });
    
  } catch (error) {
    res.sendStatus(501)
  }
});
  
  // File uploader
  router.post("/upload", function(req, res){
    console.log("BEGIN /upload");
    const form = formidable({ multiples: false });
    
    form.parse(req, (err, fields, files) => {
      if (err) {
        res.writeHead(err.httpCode || 400, { 'Content-Type': 'text/plain' });
      res.end(String(err));
      return;
    }
    console.log('files:', files);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(files, null, 2));
  });
})


function add_files(id, body){

    // Query is accepted, save the files on disk
    const fs = require('fs');
    // let fileData = fs.readFileSync(req.body.files);
    // let thumbnail = fs.readFileSync(req.body.filepond);
    let basepath = `${__dirname}/../../data/${id}`
    console.log("Add files id: " + id)
    try {
      fs.mkdirSync(basepath, {recursive:true} )
      fs.mkdirSync(basepath + "/files")
      fs.mkdirSync(basepath + "/thumb")
    } catch (error) {
      
    }
    
    if(body.files != '' && body.files != undefined){
      
      if (Array.isArray(body.files) && body.files.length > 1){
        console.log(req.body.files)
        body.files.forEach((file)=>{
          var f = JSON.parse(file).files
          var newfilename = `${basepath}/files/${f.originalFilename}`
          fs.copyFile(f.filepath, newfilename,(err)=>{
            if(err) throw err
            else{
              fs.unlink(f.filepath, (err)=>{
                if(err) throw err;
                console.log(f.filepath + 'was deleted');
              })
              // Store the files info into the DB
              // let q = "INSERT INTO pattern_files ('pattern_id', 'filename')";
            };
          });
        });
      }else{
        var f2 = JSON.parse(body.files).files
        fs.copyFile(f2.filepath, `${basepath}/files/${f2.originalFilename}`,(err)=>{
          if(err) throw err;
          fs.unlink(f2.filepath, (err)=>{
            if(err) throw err;
            console.log(f2.filepath + 'was deleted');
          })
        });
      }
    }
}

function add_thumbnail(id, body){
  // Query is accepted, save the files on disk
  const fs = require('fs');
  // let fileData = fs.readFileSync(req.body.files);
  // let thumbnail = fs.readFileSync(req.body.filepond);
  let basepath = `${__dirname}/../../data/${id}`
  // Thumbnail will have 1 file max
  if (body.filepond_thumb != undefined && body.filepond_thumb != ''){
    var fth = JSON.parse(body.filepond_thumb).filepond_thumb
    fs.copyFile(fth.filepath, `${basepath}/thumb.png`, (err)=>{
      if(err) throw err;
      fs.unlink(fth.filepath, (err)=>{
        if(err) throw err;
        console.log(fth.filepath + 'was deleted');
      })
    });
  }
}
module.exports = router;
