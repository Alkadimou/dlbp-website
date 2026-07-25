import urllib.request
import json

list_url = "https://firestore.googleapis.com/v1/projects/dlbp-website/databases/(default)/documents/registrations?pageSize=1000"

try:
    with urllib.request.urlopen(list_url) as response:
        data = json.loads(response.read().decode())
        
    if 'documents' in data:
        for doc in data['documents']:
            doc_id = doc['name'].split('/')[-1]
            create_time = doc.get('createTime')
            update_time = doc.get('updateTime')
            fields = doc.get('fields', {})
            name = fields.get('name', {}).get('stringValue', 'Unnamed')
            event_id = fields.get('eventId', {}).get('stringValue', 'No event')
            timestamp = fields.get('timestamp', {}).get('timestampValue', 'No timestamp')
            print(f"ID: {doc_id} | Name: {name} | Event: {event_id} | Created: {create_time} | Updated: {update_time} | Timestamp: {timestamp}")
except Exception as e:
    print("Error:", e)
