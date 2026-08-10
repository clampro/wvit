//Globals
const modals = {
    BP: "bloodpressure",
    GL: "glucose",
};

let historyType;

const refreshBTN = document.getElementById("histRefresh");
const homeBTN    = document.getElementById("home");

refreshBTN.addEventListener("click", () => refresh_measurements(historyType));
homeBTN.addEventListener("click", ()=>return_home());

document.addEventListener("click", e =>{
    const button = e.target.closest(".trash-button");

    if(button){

        const confirmation = confirm("Να διαγραφεί η μέτρηση;");
        if(confirmation){
            deleteItem(button.dataset.id);
            refresh_measurements(historyType);
        }
    }
});

async function deleteItem(id){
    const deleteURL = `/delete/${historyType}/${id}`;
    const response = await fetch(deleteURL, {
        method: "DELETE"
    });
};

//Initialize Page
function init(){
    const params = new URLSearchParams(window.location.search);
    const type   = params.get("type");

    document.title = type == modals.BP ? "Ιστορικό Πίεσης" : "Ιστορικό Ζαχάρου";

    //Initialize Dates
    const start = document.getElementById("startDate");
    start.value = getLocalDate(-30);

    const end = document.getElementById("endDate");
    end.value = getLocalDate();   

    //Set Header Title
    const headerTitle = document.getElementById("histHDTitle");
    headerTitle.innerHTML = type == modals.BP ? `Ιστορικό Πίεσης` : `Ιστορικό Ζαχάρου`;

    fetch_measurements(type, start.value, end.value);

    historyType = type;
};

function refresh_measurements(type){

    const start_date = document.getElementById("startDate");
    const end_date   = document.getElementById("endDate");

    fetch_measurements(type, start_date.value, end_date.value);
}

async function fetch_measurements(type, start, end) {

    start += ' 00:00:00';
    end   += ' 23:59:59';

    const measurementsURL = `/measurements?type=${type}&start=${start}&end=${end}`;

    const results = await fetch(measurementsURL);
    const measurements = await results.json();

    render_history_results(type, measurements);
};

function render_history_results(type, measurements){

    switch(type){
        case modals.BP:
            render_historyBP(measurements);
            break;
        case modals.GL:
            render_historyGL(measurements);
            break;
    }
};

function render_historyBP(measurements){

    const tableDiv = document.getElementById("history-table");

    tableDiv.innerHTML = "";

    const table = document.createElement("table");
    const thead = document.createElement("thead");

    thead.innerHTML = `
                        <tr>
                            <th>Ημερομηνία</th>
                            <th>Ώρα</th>
                            <th>Μεγάλη</th>
                            <th>Μικρή</th>
                            <th>Παλμοί</th>
                            <th class="noteshd"><img src="assets/notes.png" alt="Notes Exist" width="16"></th>
                            <th class="trashhd"><img src="assets/trash.png" alt="Delete Record" width="16"></th>
                        </tr>
                      `;
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    for (let i=0;i<measurements.length; i++){
        let measurement = measurements[i];

        const notesExist = measurement.notes.length > 0 ? true : false;
        
        let bpDate = measurement.measured_at.split(" ");
        const tr = document.createElement("tr");

        const tddtp = document.createElement("td");
        tddtp.innerHTML = bpDate[0];
        tr.appendChild(tddtp);


        const tdtmp = document.createElement("td");
        tdtmp.innerHTML = bpDate[1];
        tr.appendChild(tdtmp);

        const tds = document.createElement("td");
        tds.innerHTML = measurement.systolic;
        tr.appendChild(tds);

        const tdd = document.createElement("td");
        tdd.innerHTML = measurement.diastolic;
        tr.appendChild(tdd);

        const tdp = document.createElement("td");
        tdp.innerHTML = measurement.pulses;
        tr.appendChild(tdp);

        const tdnp = document.createElement("td");
        tdnp.className = "notes";
        if(notesExist){
            const button = document.createElement("button");
            button.className = "note-button";
            button.dataset.note = measurement.notes;

            const img = document.createElement("img");
            img.src = "assets/notes-green.png";
            img.alt = "Notes Exist";
            img.width = "16";
            img.id = `notes-${measurement.id}`;
            button.appendChild(img);
            tdnp.appendChild(button);
        }
        tr.appendChild(tdnp);

        const trash = document.createElement("td");
        trash.className = "trash";

        const trashBTN = document.createElement("button");
        trashBTN.className = "trash-button";
        trashBTN.id = `trash-${measurement.id}`;
        trashBTN.dataset.id = measurement.id;

        const trImg = document.createElement("img");
        trImg.src = "assets/trash-green.png";
        trImg.alt = "Delete Record";
        trImg.width = "16";
        trImg.id = `trash-${measurement.id}`;

        trashBTN.appendChild(trImg);
        trash.appendChild(trashBTN);
        tr.appendChild(trash);           

        tbody.appendChild(tr);        
    }

    table.appendChild(tbody);

    tableDiv.appendChild(table);
};

function render_historyGL(measurements){
    
    const tableDiv = document.getElementById("history-table");
    const table = document.createElement("table");
    const thead = document.createElement("thead");

    tableDiv.innerHTML = "";

    thead.innerHTML = `
                        <tr>
                            <th>Ημερομηνία</th>
                            <th>Ώρα</th>
                            <th>Τύπος</th>
                            <th>Γλυκόζη  (mg/dL)</th>
                            <th class="noteshd"><img src="assets/notes.png" alt="Notes Exist" width="16"></th>
                            <th class="trashhd"><img src="assets/trash.png" alt="Delete Record" width="16"></th>
                        </tr>
                      `;
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    for (let i=0;i<measurements.length; i++){
        let measurement = measurements[i];

        const notesExist = measurement.notes.length > 0 ? true : false;

        let bpDate = measurement.measured_at.split(" ");

        const tr = document.createElement("tr");

        const tddtp = document.createElement("td");
        tddtp.innerHTML = bpDate[0];
        tr.appendChild(tddtp);

        const tdtmp = document.createElement("td");
        tdtmp.innerHTML = bpDate[1];
        tr.appendChild(tdtmp);

        const tdtg = document.createElement("td");
        tdtg.innerHTML = measurement.type;
        tr.appendChild(tdtg);

        const tdg = document.createElement("td");
        tdg.innerHTML = measurement.glucose;
        tr.appendChild(tdg);        

        const tdng = document.createElement("td");
        tdng.className = "notes";
        if(notesExist){
            const button = document.createElement("button");
            button.className = "note-button";
            button.dataset.note = measurement.notes;

            const img = document.createElement("img");
            img.src = "assets/notes-green.png";
            img.alt = "Notes Exist";
            img.width = "16";
            img.id = `notes-${measurement.id}`;
            button.appendChild(img);
            tdng.appendChild(button);
        }
        tr.appendChild(tdng); 
        
        const trash = document.createElement("td");
        trash.className = "trash";

        const trashBTN = document.createElement("button");
        trashBTN.className = "trash-button";
        trashBTN.dataset.id = measurement.id;

        const trImg = document.createElement("img");
        trImg.src = "assets/trash-green.png";
        trImg.alt = "Delete Record";
        trImg.width = "16";
        trImg.id = `trash-${measurement.id}`;
        

        trashBTN.appendChild(trImg);
        trash.appendChild(trashBTN);
        tr.appendChild(trash);
        
        tbody.appendChild(tr); 
    }    

    table.appendChild(tbody);

    tableDiv.appendChild(table);    
};

function return_home(){
    window.location.href="../index.html";
};
