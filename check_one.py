
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError

url = "https://image.tmdb.org/t/p/w500/9BBN8Y5aKInNQyoUMzj0Gy6IXNj.jpg"
try:
    req = Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urlopen(req) as response:
        print(f"URL is OK: {response.getcode()}")
except Exception as e:
    print(f"URL failed: {e}")
