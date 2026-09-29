// Su telefono il sito non si ingrandisce: Safari su iPhone ignora user-scalable=no nel meta viewport,
// quindi qui si blocca anche il pizzico (gesture*, due dita). Il doppio tocco lo blocca touch-action in css/styles.css.
// Lo scorrimento resta normale; il rimbalzo oltre i bordi lo toglie overscroll-behavior in css/styles.css.

const stop = (e) => e.preventDefault();
['gesturestart', 'gesturechange', 'gestureend'].forEach((type) => {
    document.addEventListener(type, stop, { passive: false });
});

document.addEventListener('touchmove', (e) => {
    if (e.touches.length > 1) e.preventDefault();
}, { passive: false });
