from django.core.management.base import BaseCommand
import requests
from api.models import Movie

class Command(BaseCommand):
    help = 'Update movie poster URLs from TMDB API'

    def handle(self, *args, **options):
        TMDB_API_KEY = 'YOUR_TMDB_API_KEY'  # Replace with actual key
        TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500'
        
        movies = Movie.objects.all()
        updated_count = 0
        
        for movie in movies:
            try:
                # Search for movie on TMDB
                search_url = f'https://api.themoviedb.org/3/search/movie?api_key={TMDB_API_KEY}&query={movie.title}'
                response = requests.get(search_url)
                
                if response.status_code == 200:
                    results = response.json().get('results', [])
                    if results:
                        poster_path = results[0].get('poster_path')
                        if poster_path:
                            movie.poster_url = f'{TMDB_IMAGE_BASE}{poster_path}'
                            movie.save()
                            updated_count += 1
                            self.stdout.write(f'Updated: {movie.title}')
                
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error updating {movie.title}: {str(e)}'))
        
        self.stdout.write(self.style.SUCCESS(f'Successfully updated {updated_count} movies'))
