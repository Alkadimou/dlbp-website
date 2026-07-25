import urllib.request
import json

url = "https://firestore.googleapis.com/v1/projects/dlbp-website/databases/(default)/documents/events"
try:
    with urllib.request.urlopen(url) as response:
        data = json.loads(response.read().decode())
        if 'documents' in data:
            for doc in data['documents']:
                doc_id = doc['name'].split('/')[-1]
                fields = doc['fields']
                event_name = fields.get('name', {}).get('stringValue', 'Unnamed')
                event_date = fields.get('date', {}).get('stringValue', 'No date')
                event_date_iso = fields.get('dateIso', {}).get('stringValue', 'No ISO date')
                is_active = fields.get('isActive', {}).get('booleanValue', False)
                print(f"ID: {doc_id} | Name: {event_name} | Date: {event_date} | ISO: {event_date_iso} | Active: {is_active}")
        else:
            print("No documents found")
except Exception as e:
    print("Error:", e)
