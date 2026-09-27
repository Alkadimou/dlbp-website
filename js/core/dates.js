// Converte in Date le date lette da Firestore, qualunque sia il formato salvato:
// Timestamp di Firestore, oggetto {seconds, nanoseconds}, numero (millisecondi), stringa ISO o Date.
// Se il valore manca o non è una data valida restituisce `fallback`.
export function toDate(value, fallback = null) {
    if (value === null || value === undefined || value === "") return fallback;
    let date;
    if (value instanceof Date) {
        date = value;
    } else if (typeof value.toDate === "function") {
        date = value.toDate();
    } else if (typeof value === "object" && typeof value.seconds === "number") {
        date = new Date(value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1e6));
    } else if (typeof value === "number" || typeof value === "string") {
        date = new Date(value);
    } else {
        return fallback;
    }
    return isNaN(date.getTime()) ? fallback : date;
}

// Come toDate, ma restituisce i millisecondi (0 se la data manca o non è valida): comodo per ordinare.
export function toMillis(value) {
    const date = toDate(value);
    return date ? date.getTime() : 0;
}
