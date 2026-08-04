const modals = {
    BP: "bloodpressure",
    GL: "glucose",
};

const { max_systolic, max_diastolic, max_pulses, max_glucose } = window.APP_CONFIG;

let modalOpen;

const openNewBP = document.getElementById("pressureBTN");
const openNewGL = document.getElementById("glucoseBTN");
const BPaddNewBTN = document.getElementById("BPaddNew");
const GLaddNewBTN = document.getElementById("GLaddNew");
const spanBP = document.getElementsByClassName("closeBP")[0];
const spanGL = document.getElementsByClassName("closeGL")[0];

const modalBpOverlay = document.getElementById("modal-bp");
const modalGlOverlay = document.getElementById("modal-gl");

function showModalWindow(modalWindow){

    const today = new Date();
    const isoDate = today.toISOString().split('T')[0];
    const localTime = today.toLocaleTimeString('el-GR', {hour12: false });

    const newBPDate = document.getElementById("newBPDate");
    const newBPTime = document.getElementById("newBPTime");
    const newGLDate = document.getElementById("newGLDate");
    const newGLTime = document.getElementById("newGLTime"); 
    
    initializereadings();
    
    if (modalWindow == modals.BP){
        modalBpOverlay.style.display = 'flex'; 
        //Set Date and Time values
        newBPDate.value = isoDate;
        newBPTime.value = localTime;
    }
    if (modalWindow == modals.GL){
         modalGlOverlay.style.display = 'flex';
         //Set Date and Time values
         newGLDate.value = isoDate;
         newGLTime.value = localTime;
    }
    modalOpen = modalWindow;
    document.body.style.overflow = "hidden" //disable background scrolling
};

function initializereadings(){
    const systolicReading = document.getElementById("systolic");
    systolicReading.value = "";
    systolicReading.style.borderColor = '';
    systolicReading.style.color = '';
    const diastolicReading = document.getElementById("diastolic");
    diastolicReading.value = "";
    diastolicReading.style.borderColor = '';
    diastolicReading.style.color = '';    
    const pulsesReading = document.getElementById("pulses");
    pulsesReading.value = ""; 
    pulsesReading.style.borderColor = '';
    pulsesReading.style.color = '';
    const notesBP = document.getElementById("notesBP");
    notesBP.value = "";  
    
    const glucoseReading = document.getElementById("glucose");
    glucoseReading.value = "";
    glucoseReading.style.borderColor = '';
    glucoseReading.style.color = '';
    const notesGL = document.getElementById("notesGL");
    notesGL.value = "";  
};

function closeModalWindow(modalWindow, msg){
    if (modalWindow == modals.BP){
        modalBpOverlay.style.display = 'none';
    }
    if (modalWindow == modals.GL){
        modalGlOverlay.style.display = 'none';
    }
    document.body.style.overflow = "auto";  // Re-enable scrolling
    
    if(msg){
        document.getElementById("statusTXT").innerHTML = msg;
        setTimeout(function(){
            document.getElementById("statusTXT").style.opacity = '0';
        }, 3000);        
    }
};

openNewBP.addEventListener("click", () => showModalWindow(modals.BP));
openNewGL.addEventListener("click", () => showModalWindow(modals.GL));
BPaddNewBTN.addEventListener("click", () => addNewMeasurement(modals.BP));
GLaddNewBTN.addEventListener("click", () => addNewMeasurement(modals.GL));


//Add New Measurement to Database
function addNewMeasurement(modal){
    const statusText = document.getElementById("statusTXT");
    
    const validationsOK = validate_input(modal);
    
    if(validationsOK){
        

        //close window and display message
        statusText.innerHTML = '';
        statusText.style.opacity = '1';
        closeModalWindow(modal, "Η μέτρηση προστέθηκε επιτυχώς");
    }
};

function validate_input(modal){
    if(modal == modals.BP){
        let wrongValueFound = false;

        const systolicReading = document.getElementById("systolic");
        const oldBorderColor = document.getElementById("systolic").style.borderColor;
        if(systolicReading.value.length == 0 || systolicReading.value == ""){
            systolicReading.style.borderColor = "red";
            wrongValueFound = true;
        }else{
            console.log(systolicReading.value);
            if(systolicReading.value > max_systolic){
                systolicReading.style.color = "red";
                wrongValueFound = true;
            }else{
                systolicReading.style.borderColor = '';
                systolicReading.style.color = '';
            }
        }
        const diastolicReading = document.getElementById("diastolic");
        if(diastolicReading.value.length == 0 || diastolicReading.value == ""){
            diastolicReading.style.borderColor = "red";
            wrongValueFound = true;
        }else{
            diastolicReading.style.borderColor = '';
        }
        const pulsesReading = document.getElementById("pulses");
        if(pulsesReading.value.length == 0 || pulsesReading.value == ""){
            pulsesReading.style.borderColor = "red";
            wrongValueFound = true;
        }else{
            pulsesReading.style.borderColor = '';
        }
        return !wrongValueFound;        
    }
    if(modal == modals.GL){
        const glucoseReading = document.getElementById("glucose");
        if(glucoseReading.value.length == 0 || glucoseReading.value == ""){
            glucoseReading.style.borderColor = "red";
            return false;
        }else{
            glucoseReading.style.borderColor = '';
            return true;
        }
    }
};

//Close modas when clicking X
spanBP.addEventListener("click", ()=> closeModalWindow(modalOpen, ""));
spanGL.addEventListener("click", ()=> closeModalWindow(modalOpen, ""));

//Close modals when clicking on overlay
modalBpOverlay.addEventListener('click', (event)=>{
    if (event.target === modalBpOverlay){
        closeModalWindow(modals.BP,"");
    }
});

modalGlOverlay.addEventListener('click', (event)=>{
    if (event.target === modalGlOverlay){
        closeModalWindow(modals.GL,"");
     }
});


//Close modals on ESC key
 document.addEventListener("keydown", function(event){
     if (event.keyCode == 27){ //escape key pressed
        closeModalWindow(modalOpen,"");
     }
 });

 function init(){
    const statusText = document.getElementById("statusTXT");
    statusText.style.opacity = '0';
    statusText.innerHTML = "Συνέχισε την καλή δουλειά!"
 };

 async function fetch_latest_measurements(){
    
    const latestBPUrl = `/measurements?limit=3&type=bloodpressure`;
    const latestGLUrl = `/measurements?limit=3&type=glucose`;

    const responseBP = await fetch(latestBPUrl);
    const latestBP = await responseBP.json();

    const responseGL = await fetch(latestGLUrl);
    const latestGL = await responseGL.json();

    render_latest_tables(latestBP, latestGL);
 };

 function render_latest_tables(measurementsBP, measurementsGL){ 

    const bpTable = document.getElementById("lbpTable");
    const glTable = document.getElementById("lglTable");

    bpTable.innerHTML = "";

    for(let i=0;i<measurementsBP.length;i++){
        let measurement = measurementsBP[i];

        let bpDate = measurement.measured_at.split(" ");

        const tr = document.createElement("tr");
        const tds = document.createElement("td");
        tds.innerHTML = measurement.systolic;
        tr.appendChild(tds);

        const tdd = document.createElement("td");
        tdd.innerHTML = measurement.diastolic;
        tr.appendChild(tdd);

        const tdp = document.createElement("td");
        tdp.innerHTML = measurement.pulses;
        tr.appendChild(tdp);

        const tddtp = document.createElement("td");
        tddtp.innerHTML = bpDate[0];
        tr.appendChild(tddtp);

        const tdtmp = document.createElement("td");
        tdtmp.innerHTML = bpDate[1];
        tr.appendChild(tdtmp);
    }
    
    if(measurementsBP.length < 3){
      for(let i=0;i<3- measurementsBP.length;i++){
            const tr = document.createElement("tr");
            const tds = document.createElement("td");
            tds.innerHTML = "-";
            tr.appendChild(tds);

            const tdd = document.createElement("td");
            tdd.innerHTML = "-";
            tr.appendChild(tdd);

            const tdp = document.createElement("td");
            tdp.innerHTML = "-";
            tr.appendChild(tdp);

            const tddtp = document.createElement("td");
            tddtp.innerHTML = "-";
            tr.appendChild(tddtp);

            const tdtmp = document.createElement("td");
            tdtmp.innerHTML = "-";
            tr.appendChild(tdtmp);
        }  
    }  

    for(let i=0;i<measurementsGL.length;i++){
        let measurement = measurementsGL[i];

        let bpDate = measurement.measured_at.split(" ");

        const tr = document.createElement("tr");
        const tdg = document.createElement("td");
        tdg.innerHTML = measurement.glucose;
        tr.appendChild(tdg);

        const tddtp = document.createElement("td");
        tddtp.innerHTML = bpDate[0];
        tr.appendChild(tddtp);

        const tdtmp = document.createElement("td");
        tdtmp.innerHTML = bpDate[1];
        tr.appendChild(tdtmp);
    }
    
    if(measurementsBP.length < 3){
      for(let i=0;i<3- measurementsGL.length;i++){
            const tr = document.createElement("tr");
            const tdg = document.createElement("td");
            tdg.innerHTML = "-";
            tr.appendChild(tdg);

            const tddtp = document.createElement("td");
            tddtp.innerHTML = "-";
            tr.appendChild(tddtp);

            const tdtmp = document.createElement("td");
            tdtmp.innerHTML = "-";
            tr.appendChild(tdtmp);
        }  
    }      

 };