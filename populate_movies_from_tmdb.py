"""
Script to populate database with comprehensive movie collection from TMDB API
This will add hundreds of popular movies from different regions and genres
"""

import os
import django
import requests
from datetime import datetime

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import Movie, Genre

# TMDB API Configuration
TMDB_API_KEY = 'YOUR_TMDB_API_KEY'  # You need to get this from https://www.themoviedb.org/settings/api
TMDB_BASE_URL = 'https://api.themoviedb.org/3'
TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500'

# Regions to fetch movies from
REGIONS = ['US', 'IN', 'KR', 'CN', 'GB', 'JP', 'FR', 'ES', 'IT', 'DE']

def fetch_popular_movies(region='US', pages=5):
    """Fetch popular movies from TMDB for a specific region"""
    movies = []
    
    for page in range(1, pages + 1):
        url = f'{TMDB_BASE_URL}/movie/popular'
        params = {
            'api_key': TMDB_API_KEY,
            'language': 'en-US',
            'page': page,
            'region': region
        }
        
        try:
            response = requests.get(url, params=params)
            if response.status_code == 200:
                data = response.json()
                movies.extend(data.get('results', []))
                print(f'  Fetched page {page} for {region}')
            else:
                print(f'  Error fetching page {page} for {region}: {response.status_code}')
        except Exception as e:
            print(f'  Exception: {e}')
    
    return movies

def get_movie_details(movie_id):
    """Get detailed information about a movie including cast"""
    url = f'{TMDB_BASE_URL}/movie/{movie_id}'
    params = {
        'api_key': TMDB_API_KEY,
        'append_to_response': 'credits'
    }
    
    try:
        response = requests.get(url, params=params)
        if response.status_code == 200:
            return response.json()
    except Exception as e:
        print(f'Error fetching details for movie {movie_id}: {e}')
    
    return None

def add_movies_to_database():
    """Fetch and add movies from TMDB to database"""
    
    if TMDB_API_KEY == 'YOUR_TMDB_API_KEY':
        print('❌ ERROR: Please set your TMDB API key in the script!')
        print('Get your API key from: https://www.themoviedb.org/settings/api')
        return
    
    print('🎬 Starting to fetch movies from TMDB...\n')
    
    all_movies = []
    
    # Fetch movies from different regions
    for region in REGIONS:
        print(f'Fetching movies from {region}...')
        movies = fetch_popular_movies(region, pages=3)  # 3 pages = ~60 movies per region
        all_movies.extend(movies)
        print(f'  Total fetched: {len(movies)}\n')
    
    # Remove duplicates based on TMDB ID
    unique_movies = {movie['id']: movie for movie in all_movies}.values()
    print(f'Total unique movies fetched: {len(unique_movies)}\n')
    
    added = 0
    skipped = 0
    
    for movie_data in unique_movies:
        try:
            # Check if movie already exists
            if Movie.objects.filter(tmdb_id=movie_data['id']).exists():
                skipped += 1
                continue
            
            # Get detailed information
            details = get_movie_details(movie_data['id'])
            if not details:
                continue
            
            # Parse release date
            release_date = None
            if details.get('release_date'):
                try:
                    release_date = datetime.strptime(details['release_date'], '%Y-%m-%d').date()
                except:
                    pass
            
            # Get cast (top 5 actors)
            cast_list = []
            if 'credits' in details and 'cast' in details['credits']:
                cast_list = [actor['name'] for actor in details['credits']['cast'][:5]]
            cast_str = ', '.join(cast_list)
            
            # Get poster URL
            poster_url = None
            if details.get('poster_path'):
                poster_url = f'{TMDB_IMAGE_BASE}{details["poster_path"]}'
            
            # Create movie
            movie = Movie.objects.create(
                tmdb_id=details['id'],
                title=details['title'],
                description=details.get('overview', 'No description available.'),
                cast=cast_str,
                release_date=release_date,
                poster_url=poster_url
            )
            
            # Add genres
            for genre_data in details.get('genres', []):
                genre, _ = Genre.objects.get_or_create(name=genre_data['name'])
                movie.genres.add(genre)
            
            print(f'✓ Added: {movie.title} ({details.get("release_date", "N/A")[:4]})')
            added += 1
            
        except Exception as e:
            print(f'✗ Error adding movie: {e}')
    
    print(f'\n✅ Successfully added {added} movies')
    print(f'⊘ Skipped {skipped} existing movies')
    print(f'📊 Total movies in database: {Movie.objects.count()}')

if __name__ == '__main__':
    add_movies_to_database()
