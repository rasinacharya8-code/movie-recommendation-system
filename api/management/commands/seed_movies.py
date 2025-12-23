from django.core.management.base import BaseCommand
from api.models import Movie, Genre
import requests
from django.conf import settings

class Command(BaseCommand):
    help = 'Seeds database with real movies from TMDB'

    def handle(self, *args, **kwargs):
        # Using the key provided by user
        API_KEY = '798ae7de540b25e908c68ea2ca408347'
        headers = {
            "accept": "application/json",
            "Authorization": f"Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI3OThhZTdkZTU0MGIyNWU5MDhjNjhlYTJjYTQwODM0NyIsIm5iZiI6MTc2MzEzMTEzMy41OTcsInN1YiI6IjY5MTczZWZkYjgzYWRmMjI4ZWFjMmIzYyIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.h7oLTTe5UHaaXPZHZSMtQs_c5fa8DBQq8b0gN2gVIPw"
        }
        
        # 1. Fetch Genres
        url = f"https://api.themoviedb.org/3/genre/movie/list?language=en-US"
        # Using simple API Key param as fallback if Bearer fails, but Bearer is preferred
        # requests.get(url, headers=headers)
        
        response = requests.get(f"https://api.themoviedb.org/3/genre/movie/list?api_key={API_KEY}&language=en-US")
        if response.status_code != 200:
            self.stdout.write(self.style.ERROR(f"Failed to fetch genres: {response.text}"))
            return

        genres_map = {}
        for g in response.json()['genres']:
            genre_obj, _ = Genre.objects.get_or_create(name=g['name'])
            genres_map[g['id']] = genre_obj
            self.stdout.write(f"Genre: {g['name']}")

        # 2. Fetch Popular Movies (Pages 1-5)
        for page in range(1, 6):
            self.stdout.write(f"Fetching Page {page}...")
            r = requests.get(f"https://api.themoviedb.org/3/movie/popular?api_key={API_KEY}&language=en-US&page={page}")
            if r.status_code == 200:
                results = r.json()['results']
                for m_data in results:
                    poster_path = m_data.get('poster_path')
                    if not poster_path:
                        continue
                        
                    full_poster_url = f"https://image.tmdb.org/t/p/w500{poster_path}"
                    
                    # Fetch Credits (Cast)
                    cast_str = ""
                    credits_res = requests.get(f"https://api.themoviedb.org/3/movie/{m_data['id']}/credits?api_key={API_KEY}")
                    if credits_res.status_code == 200:
                        cast_list = [c['name'] for c in credits_res.json().get('cast', [])[:5]]
                        cast_str = ", ".join(cast_list)

                    movie, created = Movie.objects.update_or_create(
                        tmdb_id=m_data['id'],
                        defaults={
                            'title': m_data['title'],
                            'description': m_data['overview'],
                            'release_date': m_data['release_date'] if m_data.get('release_date') else None,
                            'poster_url': full_poster_url,
                            'cast': cast_str
                        }
                    )
                    
                    # Set genres
                    if created or True: # Always update genres
                        m_genres = [genres_map[gid] for gid in m_data['genre_ids'] if gid in genres_map]
                        movie.genres.set(m_genres)
                        movie.save()
                        
                    if created:
                         self.stdout.write(self.style.SUCCESS(f"Added: {movie.title}"))

        self.stdout.write(self.style.SUCCESS('Successfully seeded movies from TMDB'))
