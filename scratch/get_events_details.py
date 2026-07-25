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
                print(f"Doc ID: {doc_id}")
                for k, v in fields.items():
                    print(f"  {k}: {v}")
                print("-" * 40)
        else:
            print("No documents found")
except Exception as e:
    print("Error:", e)
