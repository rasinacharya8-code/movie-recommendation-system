
import os
import sys
import django

# Setup Django
sys.path.append(r'r:\movie recommendation system')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import Movie, Rating, WatchHistory

def main():
    movies = Movie.objects.all()
    count = movies.count()
    print(f"--- SYSTEM HEALTH CHECK ---")
    print(f"Total Movies in Database: {count}")

    # 1. Poster Check
    missing_posters = movies.filter(poster_url__isnull=True).count() + movies.filter(poster_url='').count()
    print(f"Movies missing posters: {missing_posters}")

    # 2. Duration Check
    missing_duration = movies.filter(duration__isnull=True).count() + movies.filter(duration=0).count()
    print(f"Movies missing duration: {missing_duration}")

    # 3. Watch Link Check
    missing_watch = movies.filter(watch_url__isnull=True).count() + movies.filter(watch_url='').count()
    print(f"Movies missing watch links: {missing_watch}")

    # 4. Verified Logic Check
    # Check if we have any verified ratings
    verified_ratings = Rating.objects.filter(is_verified=True).count()
    total_ratings = Rating.objects.count()
    print(f"Total Ratings: {total_ratings} (Verified: {verified_ratings})")

    if missing_posters == 0 and missing_duration == 0 and missing_watch == 0:
        print("\n✅ ALL VERIFICATION SYSTEMS ACTIVE AND 100% POPULATED.")
        print("🚀 SYSTEM IS READY TO RUN.")
    else:
        print("\n⚠️ SYSTEM INCOMPLETE. PLEASE RUN POPULATION SCRIPTS.")

if __name__ == "__main__":
    main()
