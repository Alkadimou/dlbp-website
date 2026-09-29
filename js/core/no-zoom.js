// Su telefono il sito non si ingrandisce: Safari su iPhone ignora user-scalable=no nel meta viewport,
// quindi qui si blocca anche il pizzico (gesture*, due dita). Il doppio tocco lo blocca touch-action in css/styles.css.
// Niente listener su touchmove: renderebbe più lento ogni tocco e scorrimento della pagina.
// Lo scorrimento resta normale, compreso il rimbalzo ai bordi.

const stop = (e) => e.preventDefault();
['gesturestart', 'gesturechange', 'gestureend'].forEach((type) => {
    document.addEventListener(type, stop, { passive: false });
});
