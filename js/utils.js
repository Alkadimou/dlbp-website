// utils.js

function getOverlay() {
    let overlay = document.getElementById('custom-modal-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'custom-modal-overlay';
        overlay.className = 'custom-modal-overlay';
        
        const modal = document.createElement('div');
        modal.className = 'custom-modal';
        
        const text = document.createElement('p');
        text.id = 'custom-modal-text';
        
        const btnContainer = document.createElement('div');
        btnContainer.id = 'custom-modal-btn-container';
        btnContainer.style.display = 'flex';
        btnContainer.style.gap = '1rem';
        btnContainer.style.justifyContent = 'center';
        
        modal.appendChild(text);
        modal.appendChild(btnContainer);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    }
    return overlay;
}

export function showModal(message) {
    const overlay = getOverlay();
    document.getElementById('custom-modal-text').textContent = message;
    
    const btnContainer = document.getElementById('custom-modal-btn-container');
    btnContainer.innerHTML = ''; // Clear existing buttons
    
    const btn = document.createElement('button');
    btn.className = 'modal-close-btn';
    btn.textContent = 'OK';
    btn.onclick = () => {
        overlay.classList.remove('active');
        document.body.classList.remove('no-scroll');
    };
    btnContainer.appendChild(btn);
    
    requestAnimationFrame(() => {
        overlay.classList.add('active');
        document.body.classList.add('no-scroll');
    });
}

export function showConfirm(message) {
    return new Promise((resolve) => {
        const overlay = getOverlay();
        document.getElementById('custom-modal-text').textContent = message;
        
        const btnContainer = document.getElementById('custom-modal-btn-container');
        btnContainer.innerHTML = ''; // Clear existing buttons
        
        const btnCancel = document.createElement('button');
        btnCancel.className = 'modal-close-btn';
        btnCancel.style.background = 'transparent';
        btnCancel.style.border = '1px solid var(--border-color)';
        btnCancel.textContent = 'ANNULLA';
        btnCancel.onclick = () => {
            overlay.classList.remove('active');
            document.body.classList.remove('no-scroll');
            resolve(false);
        };
        
        const btnConfirm = document.createElement('button');
        btnConfirm.className = 'modal-close-btn';
        btnConfirm.textContent = 'CONFERMA';
        btnConfirm.onclick = () => {
            overlay.classList.remove('active');
            document.body.classList.remove('no-scroll');
            resolve(true);
        };
        
        btnContainer.appendChild(btnCancel);
        btnContainer.appendChild(btnConfirm);
        
        requestAnimationFrame(() => {
            overlay.classList.add('active');
            document.body.classList.add('no-scroll');
        });
    });
}
