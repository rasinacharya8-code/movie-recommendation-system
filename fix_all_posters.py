"""
Script to fix missing movie poster URLs
Updates all movies with broken or missing posters
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import Movie

# Comprehensive poster URL mapping (Using Wikipedia/Stable Sources)
POSTER_URLS = {
    # South Indian / Regional (Wikipedia/Stable Sources)
    'vikram': 'https://upload.wikimedia.org/wikipedia/en/9/93/Vikram_2022_poster.jpg',
    'baahubali 2': 'https://upload.wikimedia.org/wikipedia/en/f/f9/Baahubali_the_Conclusion.jpg',
    'baahubali': 'https://upload.wikimedia.org/wikipedia/en/5/5f/Baahubali_The_Beginning_poster.jpg',
    'rrr': 'https://upload.wikimedia.org/wikipedia/en/d/d7/RRR_Poster.jpg',
    'kgf': 'https://upload.wikimedia.org/wikipedia/en/d/d0/K.G.F_Chapter_2.jpg',
    'kantara': 'https://upload.wikimedia.org/wikipedia/en/8/84/Kantara_poster.jpeg',
    'pushpa': 'https://upload.wikimedia.org/wikipedia/en/7/75/Pushpa_The_Rise.jpg',
    'drishyam 2': 'https://upload.wikimedia.org/wikipedia/en/d/dc/Drishyam_2_Malayalam.jpg',
    'drishyam': 'https://upload.wikimedia.org/wikipedia/en/8/87/Drishyam_Poster.jpg',
    '777 charlie': 'https://upload.wikimedia.org/wikipedia/en/c/c5/777_Charlie_poster.jpg',
    'ponniyin selvan': 'https://upload.wikimedia.org/wikipedia/en/c/c3/Ponniyin_Selvan_I_poster.jpg',
    'sita ramam': 'https://upload.wikimedia.org/wikipedia/en/0/00/Sita_Ramam_poster.jpg',
    'enthiran': 'https://upload.wikimedia.org/wikipedia/en/0/07/Enthiran_poster.jpg',
    'robot': 'https://upload.wikimedia.org/wikipedia/en/0/07/Enthiran_poster.jpg',
    '2.0': 'https://upload.wikimedia.org/wikipedia/en/c/cf/2.0_film_poster.jpg',
    'eega': 'https://upload.wikimedia.org/wikipedia/en/5/58/Eega_poster.jpg',
    'arjun reddy': 'https://upload.wikimedia.org/wikipedia/en/4/46/Arjun_Reddy.jpg',
    'premam': 'https://upload.wikimedia.org/wikipedia/en/3/32/Premam_film_poster.jpg',
    'bangalore days': 'https://upload.wikimedia.org/wikipedia/en/7/73/Bangalore_Days.jpg',
    'great indian kitchen': 'https://upload.wikimedia.org/wikipedia/en/4/41/The_Great_Indian_Kitchen_poster.jpg',
    'kirik party': 'https://m.media-amazon.com/images/M/MV5BNWRmZGNmOWUtYzY4ZC00YjBjLWI1ZmItOTMwYTgxNGRjYTU3XkEyXkFqcGdeQXVyMjQwNmU2NTI@._V1_FMjpg_UX1000_.jpg',
    'ulidavaru kandanthe': 'https://image.tmdb.org/t/p/w500/mR70Fv9Pq5B9lZ0S9tL8K1X0l.jpg',
    'jai bhim': 'https://upload.wikimedia.org/wikipedia/en/2/26/Jai_Bhim_film_poster.jpg',
    'karnan': 'https://upload.wikimedia.org/wikipedia/en/e/e3/Karnan_2021_poster.jpg',
    'minnal murali': 'https://upload.wikimedia.org/wikipedia/en/3/3d/Minnal_Murali_poster.jpeg',
    'thallumaala': 'https://upload.wikimedia.org/wikipedia/en/e/e4/Thallumaala_poster.jpg',
    'lucifer': 'https://upload.wikimedia.org/wikipedia/en/3/3f/Lucifer_film_poster.jpg',
    'bheeshma parvam': 'https://upload.wikimedia.org/wikipedia/en/6/6f/Bheeshma_Parvam.jpg',
    
    # International / Chinese / UK
    'crouching tiger': 'https://upload.wikimedia.org/wikipedia/en/9/97/Crouching_Tiger_Hidden_Dragon.jpg',
    'hero': 'https://upload.wikimedia.org/wikipedia/en/0/08/Hero_poster.jpg',
    'farewell my concubine': 'https://upload.wikimedia.org/wikipedia/en/c/c0/Farewell_My_Concubine_%28film%29.jpg',
    'wandering earth': 'https://upload.wikimedia.org/wikipedia/en/6/62/The_Wandering_Earth_film_poster.jpg',
    'slumdog millionaire': 'https://upload.wikimedia.org/wikipedia/en/2/23/Slumdog_Millionaire_Poster.jpg',
    'trainspotting': 'https://upload.wikimedia.org/wikipedia/en/7/71/Trainspotting_ver2.jpg',
    '28 days later': 'https://upload.wikimedia.org/wikipedia/en/e/e4/28_days_later.jpg',
    'shaun of the dead': 'https://upload.wikimedia.org/wikipedia/en/e/ec/Shaun-of-the-dead.jpg',
    'parasite': 'https://upload.wikimedia.org/wikipedia/en/5/53/Parasite_%282019_film%29.png',
    'train to busan': 'https://upload.wikimedia.org/wikipedia/en/9/95/Train_to_Busan.jpg',
    'oldboy': 'https://upload.wikimedia.org/wikipedia/en/b/bb/Oldboy_2003_poster.jpg',
    'handmaiden': 'https://upload.wikimedia.org/wikipedia/en/a/a2/The_Handmaiden.jpg',
    'spirited away': 'https://upload.wikimedia.org/wikipedia/en/d/db/Spirited_Away_Japanese_poster.png',
    
    # Bollywood
    '3 idiots': 'https://upload.wikimedia.org/wikipedia/en/d/df/3_idiots_poster.jpg',
    'dangal': 'https://upload.wikimedia.org/wikipedia/en/9/99/Dangal_Poster.jpg',
    'pk': 'https://upload.wikimedia.org/wikipedia/en/b/b5/PK_poster.jpg',
    'lagaan': 'https://upload.wikimedia.org/wikipedia/en/b/b6/Lagaan.jpg',
    'swades': 'https://upload.wikimedia.org/wikipedia/en/8/85/Swades_poster.jpg',
}

def fix_all_posters():
    print('Checking and fixing movie posters...\n')
    
    movies = Movie.objects.all()
    updated = 0
    already_ok = 0
    no_match = 0
    
    for movie in movies:
        movie_title_lower = movie.title.lower()
        needs_update = False
        new_url = None
        
        # 1. Check strict key match first for known fix
        for key, url in POSTER_URLS.items():
            if key in movie_title_lower:
                new_url = url
                # Use verify logic: if existing URL is different, it might be broken, so update it.
                # Or if it's the SAME, we are good.
                if movie.poster_url != url:
                    needs_update = True
                break
        
        # 2. If no matching fix found, verify existing URL minimal validity
        if not new_url:
            if not movie.poster_url or 'placeholder' in movie.poster_url.lower() or not movie.poster_url.startswith('http'):
                needs_update = True
        
        if needs_update and new_url:
            print(f'➜ Fixing: {movie.title}...')
            movie.poster_url = new_url
            movie.save()
            print(f'   ✓ DONE')
            updated += 1
        elif needs_update:
             print(f'✗ MISSING/BROKEN: {movie.title} (No manual fix available)')
             no_match += 1
        else:
            already_ok += 1
    
    print(f'\n📊 Summary:')
    print(f'✓ Fixed: {updated} movies')
    print(f'✓ Already OK/Skipped: {already_ok} movies')
    print(f'✗ Still Broken: {no_match} movies')
    print(f'📈 Total movies: {movies.count()}')

if __name__ == '__main__':
    fix_all_posters()
