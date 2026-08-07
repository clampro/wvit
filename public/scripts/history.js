//Globals
const modals = {
    BP: "bloodpressure",
    GL: "glucose",
};

//Initialize Page
function init(){
    const params = new URLSearchParams(window.location.search);
    const type   = params.get("type");

    document.title = type == modals.BP ? "Ιστορικό Πίεσης" : "Ιστορικό Ζαχάρου";

    fetch_measurements(type);
};

async function fetch_measurements(type) {
    
};