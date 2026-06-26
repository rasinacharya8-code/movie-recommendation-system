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

def check_durations():
    total = Movie.objects.count()
    missing = Movie.objects.filter(duration__isnull=True).count()
    zero = Movie.objects.filter(duration=0).count()
    
    safe_print(f"Total Movies: {total}")
    safe_print(f"Movies with NULL duration: {missing}")
    safe_print(f"Movies with 0 duration: {zero}")

    if missing > 0 or zero > 0:
        safe_print("\nExamples of movies with issues:")
        bad_movies = Movie.objects.filter(duration__isnull=True) | Movie.objects.filter(duration=0)
        for m in bad_movies[:5]:
            safe_print(f"ID: {m.id}, Duration: {m.duration}") 
            # Skipping title printing to avoid any complexity

if __name__ == '__main__':
    check_durations()
