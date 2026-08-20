//------------------------------------------------------------------------------//
//                  IMPORT LIBRARIES                                            //
//------------------------------------------------------------------------------//
import "dotenv/config";
import express, { response } from "express";
// import cors                  from "cors"; //Needs to be used in case front and back end are on different machines
import Database from 'better-sqlite3';
import PDFDocument from 'pdfkit';
import path from "path";
import { fileURLToPath } from "url";

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
const insertIntoGlucose = db.prepare('INSERT INTO glucose (measured_at, type, glucose, notes) VALUES (?,?,?,?)');

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

app.post("/insert", async (request, response,) => {

    const table = request.query.type;

    try {

        switch (table) {
            case "bloodpressure":

                const newBP = insertIntoBloodPressure.run(request.body.measured_at,
                    request.body.systolic,
                    request.body.diastolic,
                    request.body.pulses,
                    request.body.notes

                );
                response.status(200).json({ success: 'Added BP measurement' });
                break;
            case "glucose":

                const newGL = insertIntoGlucose.run(request.body.measured_at,
                    request.body.type,
                    request.body.glucose,
                    request.body.notes
                );
                response.status(200).json({ success: 'Added GL measurement' });
                break;
        }

    } catch (err) {
        console.error(err);
        response.status(500).json({ error: 'Failed to insert measurement' });
    }
});

function getMeasurements(type, start, end, limit) {
    let table;

    if (type === 'bloodpressure') {
        table = 'blood_pressure';
    } else if (type === 'glucose') {
        table = 'glucose';
    } else {
        throw new Error('Invalid measurement type');
    }

    let sql = `SELECT * FROM ${table}`;

    const conditions = [];
    const params = [];

    if (start) {
        conditions.push('measured_at >= ?');
        params.push(start);
    }

    if (end) {
        conditions.push('measured_at <= ?');
        params.push(end);
    }

    if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY measured_at DESC';

    if (limit) {
        sql += ' LIMIT ?';
        params.push(Number(limit));
    }

    return db.prepare(sql).all(...params);
};

app.get("/measurements", async (request, response,) => {

    const { type, start, end, limit } = request.query;

    try {
        const results = getMeasurements(type, start, end, limit);

        response.json(results);

    } catch (err) {
        console.error(err);

        response.status(500).json({
            error: 'Failed to read data'
        });
    }

});

app.get('/measurements/pdf', (request, response) => {
    const { type, start, end } = request.query;

    if (type !== 'bloodpressure' && type !== 'glucose') {
        return response.status(400).json({
            error: 'Invalid measurement type'
        });
    }

    try {
        const results = getMeasurements(type, start, end);

        const doc = new PDFDocument({
            size: 'A4',
            margin: 40
        });

        response.setHeader('Content-Type', 'application/pdf');
        response.setHeader(
            'Content-Disposition',
            `attachment; filename="${type}-measurements.pdf"`
        );

        doc.pipe(response);

        // --------------------------------------------------
        // Font
        // --------------------------------------------------

        const fontPath = path.join(
            __dirname,
            'fonts',
            'dejavu-sans.book.ttf'
        );

        doc.font(fontPath);

        // --------------------------------------------------
        // Title
        // --------------------------------------------------

        let title =
            type === 'bloodpressure'
                ? 'Μετρήσεις Πίεσης'
                : 'Μετρήσεις Σακχάρου';

        if (process.env.ADDITIONAL_TITLE) {
            title += ` - ${process.env.ADDITIONAL_TITLE}`;
        }

        doc
            .fontSize(18)
            .text(title, {
                align: 'center'
            });

        doc.moveDown(0.5);

        // --------------------------------------------------
        // Date range
        // --------------------------------------------------

        const dateFrom = start ? start.split(' ')[0] : '';
        const dateTo = end ? end.split(' ')[0] : '';

        let dateRange = '';

        if (dateFrom && dateTo) {
            dateRange = `${dateFrom} - ${dateTo}`;
        } else if (dateFrom) {
            dateRange = `Από ${dateFrom}`;
        } else if (dateTo) {
            dateRange = `Μέχρι ${dateTo}`;
        }

        if (dateRange) {
            doc
                .fontSize(10)
                .fillColor('#555555')
                .text(dateRange, {
                    align: 'center'
                });
        }

        doc.moveDown(1);

        // Reset text color
        doc.fillColor('#000000');

        // --------------------------------------------------
        // Table configuration
        // --------------------------------------------------

        const pageWidth =
            doc.page.width -
            doc.page.margins.left -
            doc.page.margins.right;

        const headerHeight = 25;
        const minRowHeight = 25;

        // Space reserved at the bottom of every page
        // for the page number.
        const footerHeight = 30;

        const bottomLimit =
            doc.page.height -
            doc.page.margins.bottom -
            footerHeight;

        let columns;

        if (type === 'bloodpressure') {
            columns = [
                {
                    title: 'Ημερομηνία / Ώρα',
                    width: pageWidth * 0.25
                },
                {
                    title: 'Μεγάλη',
                    width: pageWidth * 0.15
                },
                {
                    title: 'Μικρή',
                    width: pageWidth * 0.15
                },
                {
                    title: 'Παλμοί',
                    width: pageWidth * 0.15
                },
                {
                    title: 'Σημειώσεις',
                    width: pageWidth * 0.30
                }
            ];
        } else {
            columns = [
                {
                    title: 'Ημερομηνία / Ώρα',
                    width: pageWidth * 0.30
                },
                {
                    title: 'Τύπος',
                    width: pageWidth * 0.20
                },
                {
                    title: 'Γλυκόζη',
                    width: pageWidth * 0.15
                },
                {
                    title: 'Σημειώσεις',
                    width: pageWidth * 0.35
                }
            ];
        }

        // --------------------------------------------------
        // Draw table header
        // --------------------------------------------------

        function drawHeader() {
            const y = doc.y;

            let x = doc.page.margins.left;

            // Header background
            doc
                .fillColor('#004E54')
                .rect(
                    x,
                    y,
                    pageWidth,
                    headerHeight
                )
                .fill();

            doc.fillColor('#ffffff');

            columns.forEach(column => {
                doc
                    .fontSize(9)
                    .text(
                        column.title,
                        x + 5,
                        y + 8,
                        {
                            width: column.width - 10,
                            align: 'center',
                            lineBreak: false
                        }
                    );

                x += column.width;
            });

            // Explicitly move cursor below header
            doc.y = y + headerHeight;

            doc.fillColor('#000000');
        }

        // --------------------------------------------------
        // Calculate row height
        // --------------------------------------------------

        function getRowHeight(values) {
            const cellPaddingX = 5;
            const cellPaddingY = 6;

            const heights = values.map((value, index) => {
                const column = columns[index];

                const text = String(value ?? '');

                doc.fontSize(8);

                const textHeight = doc.heightOfString(
                    text,
                    {
                        width: column.width - cellPaddingX * 2,
                        align: 'center',

                        // Only Notes should wrap.
                        lineBreak: index === values.length - 1
                    }
                );

                return Math.max(
                    minRowHeight,
                    textHeight + cellPaddingY * 2
                );
            });

            return Math.max(...heights);
        }

        // --------------------------------------------------
        // Draw row
        // --------------------------------------------------

        function drawRow(values, rowIndex, actualRowHeight) {
            const xStart = doc.page.margins.left;
            const y = doc.y;

            const cellPaddingX = 5;
            const cellPaddingY = 6;

            // Alternating row background
            if (rowIndex % 2 === 0) {
                //normal color
            }else{
                doc
                    .fillColor('#DDF6EE')
                    .rect(
                        xStart,
                        y,
                        pageWidth,
                        actualRowHeight
                    )
                    .fill();
            }

            doc.fillColor('#000000');

            let x = xStart;

            values.forEach((value, index) => {
                const column = columns[index];

                doc
                    .fontSize(8)
                    .text(
                        String(value ?? ''),
                        x + cellPaddingX,
                        y + cellPaddingY,
                        {
                            width: column.width - cellPaddingX * 2,
                            align: 'center',

                            // Only Notes wraps.
                            lineBreak: index === values.length - 1
                        }
                    );

                x += column.width;
            });

            // Row border
            doc
                .strokeColor('#cccccc')
                .rect(
                    xStart,
                    y,
                    pageWidth,
                    actualRowHeight
                )
                .stroke();

            // Explicitly move cursor below the row.
            doc.y = y + actualRowHeight;
        }

        // --------------------------------------------------
        // Header
        // --------------------------------------------------

        drawHeader();

        // --------------------------------------------------
        // Data
        // --------------------------------------------------

        results.forEach((row, index) => {
            const measuredAt = String(row.measured_at ?? '');

            const measuredParts = measuredAt.split(' ');

            const dateTime =
                measuredParts.length >= 2
                    ? `${measuredParts[0]} / ${measuredParts[1]}`
                    : measuredAt;

            const values =
                type === 'bloodpressure'
                    ? [
                        dateTime,
                        row.systolic,
                        row.diastolic,
                        row.pulses,
                        row.notes
                    ]
                    : [
                        dateTime,
                        row.type,
                        row.glucose,
                        row.notes
                    ];

            // Calculate the real height BEFORE drawing.
            const actualRowHeight = getRowHeight(values);

            // --------------------------------------------------
            // Page break
            // --------------------------------------------------

            if (doc.y + actualRowHeight > bottomLimit) {
                doc.addPage();

                // New page starts at the top margin.
                drawHeader();
            }

            // Draw the row using the already-calculated height.
            drawRow(
                values,
                index,
                actualRowHeight
            );
        });

        // --------------------------------------------------
        // No results
        // --------------------------------------------------

        if (results.length === 0) {
            doc
                .fontSize(11)
                .fillColor('#000000')
                .text(
                    'No measurements found for the selected period.',
                    {
                        align: 'center'
                    }
                );
        }

        // --------------------------------------------------
        // Page numbers
        // --------------------------------------------------

        // const range = doc.bufferedPageRange();

        // for (
        //     let i = range.start;
        //     i < range.start + range.count;
        //     i++
        // ) {
        //     doc.switchToPage(i);

        //     /*
        //      * Put the footer inside the bottom margin.
        //      *
        //      * The content area ends at:
        //      *
        //      *   page.height - bottomMargin
        //      *
        //      * The footer sits inside that reserved margin area.
        //      */
        //     const footerY =
        //         doc.page.height -
        //         doc.page.margins.bottom +
        //         5;

        //     doc
        //         .fontSize(8)
        //         .fillColor('#777777')
        //         .text(
        //             `Page ${i + 1} of ${range.count}`,
        //             doc.page.margins.left,
        //             footerY,
        //             {
        //                 width: pageWidth,
        //                 align: 'center',

        //                 // Prevent PDFKit from creating
        //                 // another page for the footer.
        //                 lineBreak: false
        //             }
        //         );
        // }

        // --------------------------------------------------
        // Finish PDF
        // --------------------------------------------------

        doc.end();

    } catch (err) {
        console.error(err);

        if (!response.headersSent) {
            response.status(500).json({
                error: 'Failed to generate PDF'
            });
        }
    }
});

app.delete("/delete/:type/:id", (request, response,) => {

    const type = request.params.type;
    const id = parseInt(request.params.id);

    const table = type == 'bloodpressure' ? "blood_pressure" : "glucose";

    try {
        const sql = db.prepare(`DELETE FROM ${table} WHERE id = ?`);
        const result = sql.run(id);

        if (result.changes === 0) {
            return response.status(404).json({ error: 'Data not found' });
        }
        response.sendStatus(204);
    } catch (err) {
        console.error(err);
        response.status(500).json({ error: 'Failed to delete data' });
    }

});

// Listen for Requests
app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
});