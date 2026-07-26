import urllib.request
import json
from datetime import datetime

list_url = "https://firestore.googleapis.com/v1/projects/dlbp-website/databases/(default)/documents/registrations?pageSize=1000"
write_url = "https://firestore.googleapis.com/v1/projects/dlbp-website/databases/(default)/documents/registrations"

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

# Helper to check string similarity (Levenshtein distance ratio)
def similarity(s1, s2):
    s1, s2 = s1.lower(), s2.lower()
    if s1 == s2:
        return 1.0
    # Simple character intersection over max length as approximation
    common = set(s1) & set(s2)
    return len(common) / max(len(s1), len(s2))

# Helper to match names flexibly
def match_name(name1, name2):
    # Split into words and compare sets
    w1 = set(name1.lower().split())
    w2 = set(name2.lower().split())
    
    if w1 == w2:
        return True
        
    # If sets have the same length and words are very similar
    if len(w1) == len(w2):
        matches = 0
        for word1 in w1:
            for word2 in w2:
                if similarity(word1, word2) > 0.8:
                    matches += 1
                    break
        if matches == len(w1):
            return True
            
    return False

def run_migration():
    try:
        # 1. Fetch existing registrations
        print("Fetching existing registrations...")
        with urllib.request.urlopen(list_url) as response:
            data = json.loads(response.read().decode())
            
        existing_docs = data.get('documents', [])
        print(f"Loaded {len(existing_docs)} existing registrations.")
        
        # 2. Process guests list
        target_timestamp = "2026-07-01T12:00:00Z"
        target_event = "act_1"
        
        updated_count = 0
        created_count = 0
        
        for raw_name in raw_guests:
            # Clean name
            clean_name = raw_name.replace("(x)", "").strip()
            uppercase_name = clean_name.upper()
            
            # Search for existing registration
            found_doc = None
            for doc in existing_docs:
                fields = doc.get('fields', {})
                if 'name' in fields and 'stringValue' in fields['name']:
                    db_name = fields['name']['stringValue']
                    if match_name(clean_name, db_name):
                        found_doc = doc
                        break
            
            if found_doc:
                # Update existing document
                doc_path = found_doc['name']
                print(f"Updating existing guest: '{clean_name}' (ID: {doc_path.split('/')[-1]})")
                
                # We need to update eventId and timestamp
                patch_url = f"https://firestore.googleapis.com/v1/{doc_path}?updateMask.fieldPaths=eventId&updateMask.fieldPaths=timestamp&updateMask.fieldPaths=name"
                payload = {
                    "fields": {
                        "name": { "stringValue": uppercase_name }, # normalize to current spelling
                        "eventId": { "stringValue": target_event },
                        "timestamp": { "timestampValue": target_timestamp }
                    }
                }
                
                req = urllib.request.Request(
                    patch_url,
                    data=json.dumps(payload).encode('utf-8'),
                    headers={'Content-Type': 'application/json'},
                    method='PATCH'
                )
                
                with urllib.request.urlopen(req) as res:
                    json.loads(res.read().decode())
                    
                updated_count += 1
            else:
                # Create new document
                print(f"Creating new guest: '{clean_name}'")
                payload = {
                    "fields": {
                        "name": { "stringValue": uppercase_name },
                        "email": { "stringValue": "" },
                        "eventId": { "stringValue": target_event },
                        "invited_by": { "stringValue": "admin" },
                        "checked_in": { "booleanValue": False },
                        "status": { "stringValue": "approved" },
                        "email_sent": { "booleanValue": True },
                        "privacy_consent": { "booleanValue": True },
                        "timestamp": { "timestampValue": target_timestamp }
                    }
                }
                
                req = urllib.request.Request(
                    write_url,
                    data=json.dumps(payload).encode('utf-8'),
                    headers={'Content-Type': 'application/json'},
                    method='POST'
                )
                
                with urllib.request.urlopen(req) as res:
                    json.loads(res.read().decode())
                    
                created_count += 1
                
        print(f"Done! Updated: {updated_count}, Created: {created_count}")
        
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    run_migration()
