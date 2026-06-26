from django.core.management.base import BaseCommand
from api.models import Movie
import firebase_admin
from firebase_admin import credentials, firestore
import os
import sys

class Command(BaseCommand):
    help = 'Syncs all local movies to Firestore'

    def handle(self, *args, **options):
        # Helper for safe printing
        def safe_print(msg):
            try:
                os.write(1, (msg + '\n').encode('utf-8'))
            except:
                pass

        # 1. Initialize Firebase
        cred_path = os.path.join(os.getcwd(), 'serviceAccountKey.json')
        if not os.path.exists(cred_path):
            safe_print('serviceAccountKey.json not found! Cannot sync.')
            return

        if not firebase_admin._apps:
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        
        db = firestore.client()
        
        # 2. Fetch all movies
        movies = Movie.objects.all()
        total = movies.count()
        safe_print(f"Found {total} movies in local database. Starting sync...")

        batch = db.batch()
        count = 0
        
        for movie in movies:
            doc_ref = db.collection('movies').document(str(movie.id))
            
            data = {
                'title': movie.title,
                'description': movie.description,
                'release_year': movie.release_year,
                'duration': movie.duration,
                'poster_url': movie.poster_url,
                'watch_url': movie.watch_url,
                'cast': movie.cast,
                'genres': [g.name for g in movie.genres.all()]
            }
            
            batch.set(doc_ref, data, merge=True)
            count += 1

            # Commit every 400 items
            if count % 400 == 0:
                batch.commit()
                safe_print(f'Synced {count}/{total} movies...')
                batch = db.batch()

        # Commit remaining
        if count % 400 != 0:
            batch.commit()

        safe_print(f'Successfully synced all {total} movies to Firestore!')
