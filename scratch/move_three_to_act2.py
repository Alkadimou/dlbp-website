import urllib.request
import json
import ssl

ssl._create_default_https_context = ssl._create_unverified_context

guests_ids = [
    "3Wl1XYe98rLdPTpp0jLE", # NICOLLE MAGI
    "mJQGSLBmXytGdQSekwe7", # BENEDETTA ROGGI
    "w7dpPf7Y8IytQMntm5iU"  # ANGELICA DEL TORO
]

target_event = "aWkZBrokSXViMQUVaa8n" # Act II

def move_guests():
    try:
        for doc_id in guests_ids:
            patch_url = f"https://firestore.googleapis.com/v1/projects/dlbp-website/databases/(default)/documents/registrations/{doc_id}?updateMask.fieldPaths=eventId"
            payload = {
                "fields": {
                    "eventId": { "stringValue": target_event }
                }
            }
            
            req = urllib.request.Request(
                patch_url,
                data=json.dumps(payload).encode('utf-8'),
                headers={'Content-Type': 'application/json'},
                method='PATCH'
            )
            
            with urllib.request.urlopen(req) as response:
                res_data = json.loads(response.read().decode())
                name = res_data.get('fields', {}).get('name', {}).get('stringValue', '')
                print(f"Successfully moved {name} (ID: {doc_id}) to Act II")
    except Exception as e:
        print("Error moving guests:", e)

if __name__ == "__main__":
    move_guests()
