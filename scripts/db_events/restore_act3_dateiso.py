import urllib.request
import json
import ssl

ssl._create_default_https_context = ssl._create_unverified_context

doc_id = "tmlWorrf0nDVEbM7R6ya"
patch_url = f"https://firestore.googleapis.com/v1/projects/dlbp-website/databases/(default)/documents/events/{doc_id}?updateMask.fieldPaths=dateIso"

payload = {
    "fields": {
        "dateIso": { "stringValue": "2026-07-26" }
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
        print("Restored original dateIso for Act III:")
        print("  dateIso:", fields.get('dateIso', {}).get('stringValue'))
except Exception as e:
    print("Error restoring dateIso:", e)
