//------------------------------------------------------------------------------//
//                  IMPORT LIBRARIES                                            //
//------------------------------------------------------------------------------//
import "dotenv/config";
import express, { response } from "express";
import cors                  from "cors";
import Database              from 'better-sqlite3';

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

// Listen for Requests
app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});