import urllib.request
import json
from datetime import datetime

url = "https://firestore.googleapis.com/v1/projects/dlbp-website/databases/(default)/documents/registrations"
event_id = "aWkZBrokSXViMQUVaa8n"
guests = ["MATTEO ANTININI", "JAMES BRIVIDO"]

def add_guest(name):
    payload = {
        "fields": {
            "name": { "stringValue": name.upper() },
            "email": { "stringValue": "" },
            "eventId": { "stringValue": event_id },
            "invited_by": { "stringValue": "admin" },
            "checked_in": { "booleanValue": False },
            "status": { "stringValue": "approved" },
            "email_sent": { "booleanValue": True },
            "privacy_consent": { "booleanValue": True },
            "timestamp": { "timestampValue": datetime.utcnow().isoformat() + "Z" }
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
            print(f"Successfully added: {name} (ID: {doc_id})")
    except Exception as e:
        print(f"Error adding {name}:", e)

if __name__ == "__main__":
    for g in guests:
        add_guest(g)
