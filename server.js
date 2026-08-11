//------------------------------------------------------------------------------//
//                  IMPORT LIBRARIES                                            //
//------------------------------------------------------------------------------//
import "dotenv/config";
import express, { response } from "express";
// import cors                  from "cors"; //Needs to be used in case front and back end are on different machines
import Database              from 'better-sqlite3';
import path                  from "path";
import { fileURLToPath }     from "url";

//------------------------------------------------------------------------------//
//                  CREATE THE DATABASE IF IT DOES NOT EXIST                    //
//------------------------------------------------------------------------------//
// Create a connection to the database
const db = new Database(process.env.DATABASE_LOCATION);
db.pragma('journal_mode = WAL');

//Create the Blood Pressure Table
db.exec(`
  CREATE TABLE IF NOT EXISTS blood_pressure (
    id INTEGER PRIMARY KEY,
    measured_at TEXT NOT NULL,
    systolic INTEGER NOT NULL,
    diastolic INTEGER NOT NULL,
    pulses INTEGER NOT NULL,
    notes TEXT
  )
`);

//Create the Glucose Table
db.exec(`
  CREATE TABLE IF NOT EXISTS glucose (
    id INTEGER PRIMARY KEY,
    measured_at TEXT NOT NULL,
    type TEXT NOT NULL,
    glucose INTEGER NOT NULL,
    notes TEXT
  )  
`);

//------------------------------------------------------------------------------//
//                  PREPARE DB QUERIES                                          //
//------------------------------------------------------------------------------//
const insertIntoBloodPressure = db.prepare('INSERT INTO blood_pressure (measured_at,systolic, diastolic, pulses, notes) VALUES (?,?,?,?,?)');
const insertIntoGlucose       = db.prepare('INSERT INTO glucose (measured_at, type, glucose, notes) VALUES (?,?,?,?)');

//------------------------------------------------------------------------------//
//                  SETUP APP & ENDOINTS                                        //
//------------------------------------------------------------------------------//
const app = express();

// app.use(cors());                  //Needs to be used in case front and back end are on different machines
app.use(express.json());  

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "public")));

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

        const newBP = insertIntoBloodPressure.run( request.body.measured_at,
                                                   request.body.systolic,
                                                   request.body.diastolic,
                                                   request.body.pulses,
                                                   request.body.notes

        );
        response.status(200).json({success: 'Added BP measurement'});
        break;
      case "glucose":
        
        const newGL = insertIntoGlucose.run( request.body.measured_at, 
                                             request.body.type,
                                             request.body.glucose,
                                             request.body.notes                                             
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

  const { type, start, end, limit } = request.query;

  let results;
  
  const table = type == 'bloodpressure' ? "blood_pressure" : "glucose";
  let sql = `
              SELECT * FROM ${table}
            `

  const conditions = [];
  const params = [];
  
  if (start){
    conditions.push("measured_at >= ?");
    params.push(start);
  }

  if (end){
    conditions.push("measured_at <= ?");
    params.push(end);
  }

  if (conditions.length > 0){
    sql += "WHERE " + conditions.join(" AND ");
  }

  sql += " ORDER BY measured_at DESC";

  if (limit){
    sql += " LIMIT ?";
    params.push(Number(limit));
  }
  
  const statement = db.prepare(sql);

  try{
    const results = statement.all(...params);
    //Send back results as JSON
    response.json(results);

  }catch(err){
    console.error(err);
    response.status(500).json({ error: 'Failed to read data'});
  }

});


app.delete("/delete/:type/:id", (request, response, ) => {

  const type = request.params.type;
  const id = parseInt(request.params.id);
  
  const table = type == 'bloodpressure' ? "blood_pressure" : "glucose";  
  
  try{
    const sql = db.prepare(`DELETE FROM ${table} WHERE id = ?`);
    const result = sql.run(id);

    if (result.changes === 0) {
      return response.status(404).json({ error: 'Data not found' });
    }    
    response.sendStatus(204);
  }catch (err){
    console.error(err);
    response.status(500).json({ error: 'Failed to delete data'});
  }

});

// Listen for Requests
app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});