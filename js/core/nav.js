// Menu "AREA RISERVATA" della barra di navigazione, presente in tutte le pagine.
export function initStaffMenu() {
    const staffBtn = document.getElementById('staff-btn');
    const staffDropdown = document.getElementById('staff-dropdown');

    if (staffBtn && staffDropdown) {
        staffBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            staffDropdown.classList.toggle('show');
        });

        document.addEventListener('click', () => {
            staffDropdown.classList.remove('show');
        });
    }
}
