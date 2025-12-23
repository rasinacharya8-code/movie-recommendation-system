
from urllib.request import urlopen, Request
import ssl

# Ignore SSL errors
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "https://upload.wikimedia.org/wikipedia/en/d/d7/RRR_Poster.jpg"
try:
    req = Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urlopen(req, context=ctx) as response:
        print(f"URL is OK: {response.getcode()}")
except Exception as e:
    print(f"URL failed: {e}")
