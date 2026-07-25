import urllib.request
import json

url = "https://firestore.googleapis.com/v1/projects/dlbp-website/databases/(default)/documents/registrations"

raw_guests = [
    "Ector Albarafo", "Giovanni Mannelli", "Emanuele Mangano", "Lorenzo Orefice", "Maikol Fiacchini",
    "Bryan Pajarillo", "Reda Amali", "Diego Mazzara", "Lorenzo Gatti", "Anita Tavanti",
    "Filippo Giudizio", "Andrei Raicu", "Jose Eduardo", "Matteo Balsamo", "Matteo Antonini",
    "Kennet Kabalag", "Marco Cecci", "Lucrezia Capacci", "Michele Terziani", "Francesco Renzoni",
    "Allen Reanu", "Lorenzo Cinotti", "Hamza Khadimou", "Andrea De Carli", "Damiano Grazzini",
    "Michelangelo de Santis", "Lucia Heca", "Kyle Reano", "Matteo Bernardini", "Linda Boschi",
    "Annachiara Frontani (x)", "Lorenzo Scartoni", "Marita Gunteishvili", "Melissa Gironi",
    "Cristian Sorrentino", "Raffaele Margarit", "Emanuele Vallone", "Tommaso Borri", "Sofia Nocentini",
    "Marco Monticini", "Alessio Felli", "Mirco Conti", "Greta Moretti", "Luigi Vicidomini",
    "Christian Buoncompagni", "Riccardo Spadini", "Giovanni Padelli", "David Mazzoli", "Gabriele Rossi",
    "Giorgia mari", "Emanuele Rotaru", "Natan Caglia", "Flavio Ferruzzi", "Jacopo Gaccino",
    "Cristian Rega", "Lucia Mastrolorito", "Joele Cioni", "Eelin Roshni", "Artur Ben",
    "Noriel Cortez", "Rayan Alam", "Ciro Fortunato"
]

event_id = "act_1"
target_timestamp = "2026-07-01T12:00:00Z"

def add_guest(name):
    clean_name = name.replace("(x)", "").strip()
    payload = {
        "fields": {
            "name": { "stringValue": clean_name.upper() },
            "email": { "stringValue": "" },
            "eventId": { "stringValue": event_id },
            "invited_by": { "stringValue": "admin" },
            "checked_in": { "booleanValue": False },
            "status": { "stringValue": "approved" },
            "email_sent": { "booleanValue": True },
            "privacy_consent": { "booleanValue": True },
            "timestamp": { "timestampValue": target_timestamp }
        }
    }
    
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode())
            doc_id = res_data['name'].split('/')[-1]
            print(f"Successfully added guest for act_1: {clean_name} (ID: {doc_id})")
    except Exception as e:
        print(f"Error adding {clean_name}:", e)

if __name__ == "__main__":
    for g in raw_guests:
        add_guest(g)
