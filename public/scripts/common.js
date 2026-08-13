 const tooltip = document.getElementById("noteTooltip");
 document.addEventListener("click", e => {
    const button = e.target.closest(".note-button");

    if (!button) {
        tooltip.style.display = "none";
        return;
    }

    tooltip.textContent = button.dataset.note;

    const rect = button.getBoundingClientRect();

    tooltip.style.left = `${rect.left - 240 + window.scrollX}px`;
    tooltip.style.top = `${rect.bottom + window.scrollY + 5}px`;
    tooltip.style.display = "block";
});

function getLocalDate(offset){
    const today = new Date();

    if(offset){
        today.setDate(today.getDate() + offset);
    }

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
};

