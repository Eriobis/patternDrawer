/**
import * as FilePond from 'filepond';
 */

var mysql = require('mysql');

var db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_DATABASE
});

const formidable = require('formidable');
const { rawListeners } = require('process');

const express = require('express'),
      router = express.Router(),
      pool = require('../controllers/database'),
      { positionHidden } = require('../config'),
      moment = require('moment');

// query to get all matches with results
const patternsQuery = `SELECT * from pattern`

const timeFormat = 'YYYY-MM-DD HH:mm:ss';

router.get("/all", (req, res) => {

    console.log("Connected!");
    db.query(patternsQuery, function (err, result) {
      if (err) throw err;
      console.log("Result: " + result);
      // res.json(result);
      res.render("partials/patterns_table", {
        pattern_list: result
      })
    });
});

router.get("/all_json", (req, res) => {

  console.log("all_json!");
  db.query(patternsQuery, function (err, result) {
    if (err) throw err;
    console.log("All_Json : result: " + result);
    // res.json(result);
    res.json(result)
    })
});

router.get("/add", (req, res) => {
  res.render("add")
});

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
      fileArr[id].push(filename)
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
  console.log(req.body)
  res.send("ok")
})

router.post("/add", (req, res) => {
  console.log(req.body)

  if (req.body.type == 'undefined'){
    req.body.type = ""
  }

  var query = "INSERT INTO pattern (`name`, `number`, `size`, `company`, `fabric`, `fabric_length`, `note`, `type`, `size_category`)" +
              `VALUES ( '${req.body.name}',  '${req.body.number}', '${req.body.size}', '${req.body.company}', '${req.body.fabric}',
                      ${parseFloat(req.body.fabric_length)},'${req.body.note}','${req.body.type}', '${req.body.size_category}')`


      console.log("Connected!");
      db.query(query, function (err, result) {
        if (err){
          res.send("FAILED\n" + JSON.stringify(req.body))
          throw err
        }
        else{
          console.log("Result: " + result);
          // Query is accepted, save the files on disk
          const fs = require('fs');
          // let fileData = fs.readFileSync(req.body.files);
          // let thumbnail = fs.readFileSync(req.body.filepond);
          let basepath = `${__dirname}/../../data/${result.insertId}`
          fs.mkdirSync(basepath, {recursive:true} )
          fs.mkdirSync(basepath + "/files")
          fs.mkdirSync(basepath + "/thumb")

          if(req.body.files != '' && req.body.files != undefined){

            if (Array.isArray(req.body.files) && req.body.files.length > 1){
              console.log(req.body.files)
              req.body.files.forEach((file)=>{
                var f = JSON.parse(file).files
                fs.rename(f.filepath, `${basepath}/files/${f.originalFilename}`,(err)=>{
                  if(err) throw err
                  else{
                    // Store the files info into the DB
                    // let q = "INSERT INTO pattern_files ('pattern_id', 'filename')";
                  };
                });
              });
            }else{
              var f = JSON.parse(req.body.files).files
              fs.rename(f.filepath, `${basepath}/files/${f.originalFilename}`,(err)=>{
                if(err) throw err;
              });
            }
          }



          // Thumbnail will have 1 file max
          if (req.body.filepond_thumb != undefined && req.body.filepond_thumb != ''){
            var f = JSON.parse(req.body.filepond_thumb).filepond_thumb
            fs.rename(f.filepath, `${basepath}/thumb.png`, (err)=>{
              if(err) throw err;
            });
          }
          console.log(`Entry added : ${result.insertId} - ${req.body.name}`)
          res.send("Entry accepted")
        }
      });
});

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

module.exports = router;
