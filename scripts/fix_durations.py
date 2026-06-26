import os
import django
import sys

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import Movie

def safe_print(msg):
    try:
        os.write(1, (msg + '\n').encode('utf-8'))
    except:
        pass

def fix_durations():
    zero_movies = Movie.objects.filter(duration=0)
    count = zero_movies.count()
    
    if count == 0:
        safe_print("No movies with 0 duration found.")
        return

    safe_print(f"Found {count} movies with 0 duration. Fixing...")
    
    for m in zero_movies:
        m.duration = 120 # Default to 2 hours
        m.save()
        safe_print(f"Fixed '{m.title}' (ID: {m.id}) -> Set duration to 120 min")

    safe_print("All fixed!")

if __name__ == '__main__':
    fix_durations()
