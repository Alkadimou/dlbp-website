import urllib.request
import json
from datetime import datetime, timezone

list_url = "https://firestore.googleapis.com/v1/projects/dlbp-website/databases/(default)/documents/registrations?pageSize=1000"

def undo():
    try:
        # 1. Fetch all registrations
        print("Fetching registrations...")
        with urllib.request.urlopen(list_url) as response:
            data = json.loads(response.read().decode())
            
        if 'documents' not in data:
            print("No documents found.")
            return
            
        docs = data['documents']
        
        # Threshold time for newly created guests in the last action (July 19, 2026 at 09:03:00 UTC)
        threshold_time = datetime(2026, 7, 19, 9, 3, 0, tzinfo=timezone.utc)
        
        # Separation date for previous events (July 4, 2026)
        act1_cutoff = datetime(2026, 7, 4, 0, 0, 0, tzinfo=timezone.utc)
        
        deleted_count = 0
        restored_count = 0
        
        for doc in docs:
            doc_path = doc['name']
            doc_id = doc_path.split('/')[-1]
            create_time_str = doc.get('createTime')
            
            # Parse createTime
            create_time = datetime.fromisoformat(create_time_str.replace("Z", "+00:00"))
            
            if create_time >= threshold_time:
                # This guest was CREATED in the last action -> DELETE IT
                print(f"Deleting created guest: ID: {doc_id} | Created: {create_time_str}")
                
                delete_url = f"https://firestore.googleapis.com/v1/{doc_path}"
                req = urllib.request.Request(delete_url, method='DELETE')
                with urllib.request.urlopen(req) as res:
                    pass
                deleted_count += 1
                
            else:
                # This guest existed before -> Check if it was modified
                fields = doc.get('fields', {})
                event_id = fields.get('eventId', {}).get('stringValue', '')
                timestamp_val = fields.get('timestamp', {}).get('timestampValue', '')
                
                # Modified guests in the last action had timestamp set to "2026-07-01T12:00:00Z"
                if timestamp_val == "2026-07-01T12:00:00Z" and event_id == "act_1":
                    # We need to restore it
                    original_event = "act_1" if create_time < act1_cutoff else "aWkZBrokSXViMQUVaa8n"
                    original_timestamp = create_time_str
                    
                    print(f"Restoring modified guest ID: {doc_id} -> Event: {original_event} | Timestamp: {original_timestamp}")
                    
                    patch_url = f"https://firestore.googleapis.com/v1/{doc_path}?updateMask.fieldPaths=eventId&updateMask.fieldPaths=timestamp"
                    payload = {
                        "fields": {
                            "eventId": { "stringValue": original_event },
                            "timestamp": { "timestampValue": original_timestamp }
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
                        
                    restored_count += 1
                    
        print(f"Undo completed! Deleted: {deleted_count}, Restored: {restored_count}")
        
    except Exception as e:
        print("Error during undo:", e)

if __name__ == "__main__":
    undo()
