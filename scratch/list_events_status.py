import urllib.request
import json
import ssl

ssl._create_default_https_context = ssl._create_unverified_context

url = "https://firestore.googleapis.com/v1/projects/dlbp-website/databases/(default)/documents/events"

try:
    with urllib.request.urlopen(url) as response:
        data = json.loads(response.read().decode())
        if 'documents' in data:
            for doc in data['documents']:
                doc_id = doc['name'].split('/')[-1]
                fields = doc['fields']
                name = fields.get('name', {}).get('stringValue', '')
                is_active = fields.get('isActive', {}).get('booleanValue', None)
                is_open = fields.get('isOpen', {}).get('booleanValue', None)
                print(f"ID: {doc_id} | Name: {name} | isActive: {is_active} | isOpen: {is_open}")
except Exception as e:
    print("Error:", e)
