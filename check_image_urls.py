
import os
import django
import sys
import threading
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError
import time

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import Movie

def check_url(url):
    if not url:
        return False, "Empty URL"
    try:
        req = Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urlopen(req, timeout=5) as response:
            return True, response.getcode()
    except HTTPError as e:
        return False, e.code
    except URLError as e:
        return False, str(e.reason)
    except Exception as e:
        return False, str(e)

def check_movies():
    movies = Movie.objects.all()
    print(f"Checking {movies.count()} movies...")
    
    broken_movies = []
    
    for movie in movies:
        print(f"Checking: {movie.title}...", end='', flush=True)
        is_valid, status = check_url(movie.poster_url)
        
        if is_valid:
            print(f" OK ({status})")
        else:
            print(f" FAIL ({status}) - {movie.poster_url}")
            broken_movies.append({
                'title': movie.title,
                'url': movie.poster_url,
                'error': status
            })
            
    print("\n--- Summary ---")
    print(f"Total Broken: {len(broken_movies)}")
    for m in broken_movies:
        print(f"{m['title']}: {m['error']} ({m['url']})")

if __name__ == "__main__":
    check_movies()
