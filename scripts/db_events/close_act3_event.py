import urllib.request
import json
import ssl

ssl._create_default_https_context = ssl._create_unverified_context

doc_id = "tmlWorrf0nDVEbM7R6ya"
patch_url = f"https://firestore.googleapis.com/v1/projects/dlbp-website/databases/(default)/documents/events/{doc_id}?updateMask.fieldPaths=isActive&updateMask.fieldPaths=isOpen"

payload = {
    "fields": {
        "isActive": { "booleanValue": False },
        "isOpen": { "booleanValue": False }
    }
}

req = urllib.request.Request(
    patch_url,
    data=json.dumps(payload).encode('utf-8'),
    headers={'Content-Type': 'application/json'},
    method='PATCH'
)

try:
    with urllib.request.urlopen(req) as response:
        res_data = json.loads(response.read().decode())
        fields = res_data.get('fields', {})
        name = fields.get('name', {}).get('stringValue', '')
        is_active = fields.get('isActive', {}).get('booleanValue', None)
        is_open = fields.get('isOpen', {}).get('booleanValue', None)
        print(f"Successfully updated event {name} ({doc_id}):")
        print(f"  isActive: {is_active}")
        print(f"  isOpen: {is_open}")
except Exception as e:
    print("Error updating event:", e)
