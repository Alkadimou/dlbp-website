import urllib.request
import json
import ssl

ssl._create_default_https_context = ssl._create_unverified_context

list_url = "https://firestore.googleapis.com/v1/projects/dlbp-website/databases/(default)/documents/registrations?pageSize=1000"

try:
    with urllib.request.urlopen(list_url) as response:
        data = json.loads(response.read().decode())
        
    if 'documents' in data:
        print("Checking registrations on 18/07 for act_1:")
        count = 0
        for doc in data['documents']:
            doc_id = doc['name'].split('/')[-1]
            fields = doc.get('fields', {})
            name = fields.get('name', {}).get('stringValue', '')
            event_id = fields.get('eventId', {}).get('stringValue', '')
            create_time = doc.get('createTime', '')
            
            # Check if eventId is act_1 and create_time starts with 2026-07-18
            if event_id == "act_1" and create_time.startswith("2026-07-18"):
                print(f"ID: {doc_id} | Name: {name} | Event: {event_id} | Created: {create_time}")
                count += 1
        print(f"Total found: {count}")
except Exception as e:
    print("Error:", e)
