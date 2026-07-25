import urllib.request
import json
import urllib.parse

list_url = "https://firestore.googleapis.com/v1/projects/dlbp-website/databases/(default)/documents/registrations?pageSize=1000"

def migrate():
    try:
        # Fetch all registrations
        with urllib.request.urlopen(list_url) as response:
            data = json.loads(response.read().decode())
            
        if 'documents' not in data:
            print("No documents found in registrations collection.")
            return
            
        docs = data['documents']
        print(f"Found {len(docs)} documents. Checking for lowercase names...")
        
        updated_count = 0
        for doc in docs:
            doc_name_path = doc['name'] # full path e.g. projects/dlbp-website/databases/(default)/documents/registrations/xxxx
            fields = doc.get('fields', {})
            
            if 'name' not in fields or 'stringValue' not in fields['name']:
                continue
                
            original_name = fields['name']['stringValue']
            uppercase_name = original_name.upper().strip()
            
            if original_name != uppercase_name:
                print(f"Migrating: '{original_name}' -> '{uppercase_name}'")
                
                # Update this document
                patch_url = f"https://firestore.googleapis.com/v1/{doc_name_path}?updateMask.fieldPaths=name"
                payload = {
                    "fields": {
                        "name": { "stringValue": uppercase_name }
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
                    
                updated_count += 1
                
        print(f"Migration completed. Total updated: {updated_count}")
        
    except Exception as e:
        print("Migration error:", e)

if __name__ == "__main__":
    migrate()
