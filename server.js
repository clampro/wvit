//------------------------------------------------------------------------------//
//                  IMPORT LIBRARIES                                            //
//------------------------------------------------------------------------------//
import "dotenv/config";
import express, { response } from "express";
import cors                  from "cors";
import Database              from 'better-sqlite3';

//------------------------------------------------------------------------------//
//                  CREATE THE DATABASE IF IT DOES NOT EXIST                    //
//------------------------------------------------------------------------------//
// Create a connection to the database
console.log(process.env.DATABASE_LOCATION);
const db = new Database(process.env.DATABASE_LOCATION);
db.pragma('journal_mode = WAL');

//Create the Blood Pressure Table
db.exec(`
  CREATE TABLE IF NOT EXISTS blood_pressure(
    id INTEGER PRIMARY KEY NOT NULL AUTOINCREMENT,
    systolic INTEGER NOT NULL,
    diastolic INTEGER NOT NULL,
    pulses INTEGER NOT NULL,
    measured_at TEXT NOT NULL
  )
`);

//Create the Glucose Table
db.exec(`
  CREATE TABLE IF NOT EXISTS glucose(
    id INTEGER PRIMARY KEY NOT NULL AUTOINCREMENT,
    glucose INTEGER NOT NULL,
    measured_at TEXT NOT NULL
  )  
`);

//------------------------------------------------------------------------------//
//                  PREPARE DB QUERIES                                          //
//------------------------------------------------------------------------------//
const insertIntoBloodPressure = db.prepare('INSERT INTO blood_pressure (systolic, diastolic, pulses, measured_at) VALUES (?,?,?,?,)');
const insertIntoGlucose       = db.prepare('INSERT INTO glucose (glucose, measured_at) VALUES (?,?,)');

//------------------------------------------------------------------------------//
//                  SETUP APP & ENDOINTS                                        //
//------------------------------------------------------------------------------//
const app = express();

app.use(cors());                  //Needs to change to be more secure
app.use(express.json());  
app.use(express.static("public"));

app.get('/config.js', (req, res) => {
    res.type('application/javascript');
    res.send(`
               window.APP_CONFIG = {
               max_systolic: ${process.env.MAX_SYSTOLIC},
               max_diastolic: ${process.env.MAX_DIASTOLIC},
               max_pulses: ${process.env.MAX_PULSES},
               max_glucose: ${process.env.MAX_GLUCOSE}
               };
             `);
 });

app.post("/insert", async(request, response,)=>{
  const table = request.query.type;

  try{

    switch(table){
      case "bloodpressure":

        const newBP = insertIntoBloodPressure.run( request.body.systolic,
                                                   request.body.diastolic,
                                                   request.body.pulses,
                                                   request.body.measured_at

        );
        response.status(200).json({success: 'Added BP measurement'});
        break;
      case "glucose":
        
        const newGL = insertIntoGlucose.run( request.body.glucose,
                                             request.body.measured_at
        );
        response.status(200).json({success: 'Added GL measurement'});
        break;
    }

  }catch(err){
    console.error(err);
    response.status(500).json({ error: 'Failed to insert measurement'});
  }
}); 

app.get("/measurements", async(request, response,)=>{

  const limit = request.query.limit ? parseInt(request.query.limit) : null;
  const table = request.query.type;

  let results;

  const sqlBP = limit
    ? 'SELECT * FROM blood_pressure ORDER BY measured_at DESC LIMIT ?'
    : 'SELECT * FROM blood_pressure ORDER BY measured_at DESC';

  const sqlGL = limit
    ? 'SELECT * FROM glucose ORDER BY measured_at DESC LIMIT ?'
    : 'SELECT * FROM glucose ORDER BY measured_at DESC';    

  try{
    switch(table){
      case "bloodpressure":
        
        const statementBP = db.prepare(sqlBP);
        results = limit ? statementBP.all(limit) : statementBP.all();
        break;
      case "glucose":

        const statementGL = db.prepare(sqlGL);
        results = limit ? statementGL.all(limit) : statementGL.all();
        break;
    }
    //Send back results as JSON
    response.json(results);

  }catch(err){
    console.error(err);
    response.status(500).json({ error: 'Failed to read data'});
  }

});

// Listen for Requests
app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});