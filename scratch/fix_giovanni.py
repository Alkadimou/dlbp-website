import urllib.request
import json

list_url = "https://firestore.googleapis.com/v1/projects/dlbp-website/databases/(default)/documents/registrations?pageSize=500"

def fix_name():
    try:
        # Fetch all registrations
        with urllib.request.urlopen(list_url) as response:
            data = json.loads(response.read().decode())
            
        if 'documents' not in data:
            print("No documents found.")
            return
            
        docs = data['documents']
        found = False
        
        for doc in docs:
            doc_name_path = doc['name']
            fields = doc.get('fields', {})
            
            if 'name' not in fields or 'stringValue' not in fields['name']:
                continue
                
            current_name = fields['name']['stringValue']
            
            if current_name == "GIOVVANNI MANELLA":
                print(f"Found match: {current_name} at {doc_name_path}. Updating...")
                
                patch_url = f"https://firestore.googleapis.com/v1/{doc_name_path}?updateMask.fieldPaths=name"
                payload = {
                    "fields": {
                        "name": { "stringValue": "GIOVANNI MANELLA" }
                    }
                }
                
                req = urllib.request.Request(
                    patch_url,
                    data=json.dumps(payload).encode('utf-8'),
                    headers={'Content-Type': 'application/json'},
                    method='PATCH'
                )
                
                with urllib.request.urlopen(req) as patch_res:
                    res_data = json.loads(patch_res.read().decode())
                    print("Successfully updated to: GIOVANNI MANELLA")
                    
                found = True
                break
                
        if not found:
            print("GIOVVANNI MANELLA was not found in the database.")
            
    except Exception as e:
        print("Error during update:", e)

if __name__ == "__main__":
    fix_name()
