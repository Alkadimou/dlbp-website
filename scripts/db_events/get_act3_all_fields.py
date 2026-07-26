import urllib.request
import json
import ssl

ssl._create_default_https_context = ssl._create_unverified_context

url = "https://firestore.googleapis.com/v1/projects/dlbp-website/databases/(default)/documents/events/tmlWorrf0nDVEbM7R6ya"

try:
    with urllib.request.urlopen(url) as response:
        res_data = json.loads(response.read().decode())
        fields = res_data.get('fields', {})
        for k, v in fields.items():
            print(f"{k}: {v}")
except Exception as e:
    print("Error:", e)
