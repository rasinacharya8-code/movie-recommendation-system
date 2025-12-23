"""
Script to add international movies to the database
Includes: Indian (Bollywood), Korean, Chinese, and UK movies
"""

import os
import django
from datetime import date

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import Movie, Genre

# International movies with details
INTERNATIONAL_MOVIES = [
    # Indian Movies (Bollywood)
    {
        'title': '3 Idiots',
        'description': 'Two friends embark on a quest for a lost buddy. On this journey, they encounter a long-forgotten bet, a wedding they must crash, and a funeral that goes impossibly out of control.',
        'release_date': date(2009, 12, 25),
        'poster_url': 'https://image.tmdb.org/t/p/w500/66A9MqXOyVFCssoloscw79z8U0Y.jpg',
        'cast': 'Aamir Khan, R. Madhavan, Sharman Joshi, Kareena Kapoor',
        'genres': ['Comedy', 'Drama'],
        'country': 'India'
    },
    {
        'title': 'Dangal',
        'description': 'Former wrestler Mahavir Singh Phogat and his two wrestler daughters struggle towards glory at the Commonwealth Games in the face of societal oppression.',
        'release_date': date(2016, 12, 23),
        'poster_url': 'https://image.tmdb.org/t/p/w500/lTKJDHWxJTP7l7L0jNGFZ8YfHZb.jpg',
        'cast': 'Aamir Khan, Fatima Sana Shaikh, Sanya Malhotra',
        'genres': ['Action', 'Drama'],
        'country': 'India'
    },
    {
        'title': 'Baahubali: The Beginning',
        'description': 'In ancient India, an adventurous and daring man becomes involved in a decades-old feud between two warring peoples.',
        'release_date': date(2015, 7, 10),
        'poster_url': 'https://image.tmdb.org/t/p/w500/9BBN8Y5aKInNQyoUMzj0Gy6IXNj.jpg',
        'cast': 'Prabhas, Rana Daggubati, Anushka Shetty',
        'genres': ['Action', 'Adventure', 'Fantasy'],
        'country': 'India'
    },
    {
        'title': 'PK',
        'description': 'An alien on Earth loses the only device he can use to communicate with his spaceship. His innocent nature and child-like questions force the country to evaluate the impact of religion on its people.',
        'release_date': date(2014, 12, 19),
        'poster_url': 'https://image.tmdb.org/t/p/w500/9wXWFhqxXvB1m7dqXJHKQdLCPPx.jpg',
        'cast': 'Aamir Khan, Anushka Sharma, Sushant Singh Rajput',
        'genres': ['Comedy', 'Drama', 'Science Fiction'],
        'country': 'India'
    },
    
    # Korean Movies
    {
        'title': 'Parasite',
        'description': 'All unemployed, Ki-taek and his family take peculiar interest in the wealthy and glamorous Parks, as they ingratiate themselves into their lives and get entangled in an unexpected incident.',
        'release_date': date(2019, 5, 30),
        'poster_url': 'https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
        'cast': 'Song Kang-ho, Lee Sun-kyun, Cho Yeo-jeong',
        'genres': ['Comedy', 'Thriller', 'Drama'],
        'country': 'South Korea'
    },
    {
        'title': 'Train to Busan',
        'description': 'Martial law is declared when a mysterious viral outbreak pushes Korea into a state of emergency. Those on an express train to Busan must fight for their own survival.',
        'release_date': date(2016, 7, 20),
        'poster_url': 'https://image.tmdb.org/t/p/w500/wZiF79hbhLK1U2Merely7wAqOvOB.jpg',
        'cast': 'Gong Yoo, Jung Yu-mi, Ma Dong-seok',
        'genres': ['Action', 'Horror', 'Thriller'],
        'country': 'South Korea'
    },
    {
        'title': 'Oldboy',
        'description': 'With no clue how he came to be imprisoned, drugged and tortured for 15 years, a desperate businessman seeks revenge on his captors.',
        'release_date': date(2003, 11, 21),
        'poster_url': 'https://image.tmdb.org/t/p/w500/pWDtjs568ZfOTMbURQBYuT4Qxka.jpg',
        'cast': 'Choi Min-sik, Yoo Ji-tae, Kang Hye-jung',
        'genres': ['Action', 'Drama', 'Mystery', 'Thriller'],
        'country': 'South Korea'
    },
    {
        'title': 'The Handmaiden',
        'description': 'A woman is hired as a handmaiden to a Japanese heiress, but secretly she is involved in a plot to defraud her.',
        'release_date': date(2016, 6, 1),
        'poster_url': 'https://image.tmdb.org/t/p/w500/dLlH4aNHdnmf62umnInL8xPlPzw.jpg',
        'cast': 'Kim Min-hee, Kim Tae-ri, Ha Jung-woo',
        'genres': ['Drama', 'Romance', 'Thriller'],
        'country': 'South Korea'
    },
    
    # Chinese Movies
    {
        'title': 'Crouching Tiger, Hidden Dragon',
        'description': 'A young Chinese warrior steals a sword from a famed swordsman and then escapes into a world of romantic adventure with a mysterious man in the frontier of the nation.',
        'release_date': date(2000, 7, 6),
        'poster_url': 'https://image.tmdb.org/t/p/w500/iNDVBFNz4XyYzM9Lwip6atSTFqe.jpg',
        'cast': 'Chow Yun-fat, Michelle Yeoh, Zhang Ziyi',
        'genres': ['Adventure', 'Drama', 'Action', 'Romance'],
        'country': 'China'
    },
    {
        'title': 'Hero',
        'description': 'One man defeated three assassins who sought to murder the most powerful warlord in pre-unified China.',
        'release_date': date(2002, 12, 14),
        'poster_url': 'https://image.tmdb.org/t/p/w500/6YodTa7dNp7qEjdECjhQ8u0WGIS.jpg',
        'cast': 'Jet Li, Tony Leung Chiu-wai, Maggie Cheung',
        'genres': ['Action', 'Adventure', 'Drama'],
        'country': 'China'
    },
    {
        'title': 'Farewell My Concubine',
        'description': 'Two boys meet at an opera training school in Peking in 1924. Their resulting friendship will span nearly 70 years and will endure some of the most troublesome times in China\'s history.',
        'release_date': date(1993, 1, 1),
        'poster_url': 'https://image.tmdb.org/t/p/w500/jKx3hPmIbNdJKLhx7qNYkJmfbqT.jpg',
        'cast': 'Leslie Cheung, Zhang Fengyi, Gong Li',
        'genres': ['Drama', 'Romance'],
        'country': 'China'
    },
    {
        'title': 'The Wandering Earth',
        'description': 'The sun is dying out. The earth will soon be engulfed by the inflating sun. To save the human civilization, scientists draw up an escape plan that will bring the whole human race from danger.',
        'release_date': date(2019, 2, 5),
        'poster_url': 'https://image.tmdb.org/t/p/w500/sAtoMqDVhNDQBc3QJL3RF6hlBs.jpg',
        'cast': 'Wu Jing, Qu Chuxiao, Li Guangjie',
        'genres': ['Science Fiction', 'Action', 'Drama'],
        'country': 'China'
    },
    
    # UK Movies
    {
        'title': 'Slumdog Millionaire',
        'description': 'A Mumbai teenager reflects on his life after being accused of cheating on the Indian version of "Who Wants to be a Millionaire?".',
        'release_date': date(2008, 11, 12),
        'poster_url': 'https://image.tmdb.org/t/p/w500/ojQxNGKWlHOofBS9qPfcN7iZFc7.jpg',
        'cast': 'Dev Patel, Freida Pinto, Anil Kapoor',
        'genres': ['Drama', 'Romance'],
        'country': 'UK'
    },
    {
        'title': 'Trainspotting',
        'description': 'Heroin addict Mark Renton stumbles through bad ideas and sobriety attempts with his unreliable friends.',
        'release_date': date(1996, 2, 23),
        'poster_url': 'https://image.tmdb.org/t/p/w500/nA8ypRLn2Ar6wDxqJJCiPJcKFbM.jpg',
        'cast': 'Ewan McGregor, Ewen Bremner, Jonny Lee Miller',
        'genres': ['Drama', 'Crime'],
        'country': 'UK'
    },
    {
        'title': '28 Days Later',
        'description': 'Four weeks after a mysterious, incurable virus spreads throughout the UK, a handful of survivors try to find sanctuary.',
        'release_date': date(2002, 11, 1),
        'poster_url': 'https://image.tmdb.org/t/p/w500/cRmD6egvLFkFhWwfVF4H8ZauTrJ.jpg',
        'cast': 'Cillian Murphy, Naomie Harris, Brendan Gleeson',
        'genres': ['Horror', 'Thriller', 'Science Fiction'],
        'country': 'UK'
    },
    {
        'title': 'Shaun of the Dead',
        'description': 'A man\'s uneventful life is disrupted by the zombie apocalypse.',
        'release_date': date(2004, 4, 9),
        'poster_url': 'https://image.tmdb.org/t/p/w500/uJwJLdcJQwjeHvJLjmfNvLEKKKO.jpg',
        'cast': 'Simon Pegg, Nick Frost, Kate Ashfield',
        'genres': ['Horror', 'Comedy'],
        'country': 'UK'
    },
]

def add_international_movies():
    print('Adding international movies to database...\n')
    
    added = 0
    skipped = 0
    
    for movie_data in INTERNATIONAL_MOVIES:
        # Check if movie already exists
        if Movie.objects.filter(title=movie_data['title']).exists():
            print(f'⊘ Skipped: {movie_data["title"]} (already exists)')
            skipped += 1
            continue
        
        # Get or create genres
        genre_names = movie_data.pop('genres')
        country = movie_data.pop('country')
        
        # Create movie
        movie = Movie.objects.create(**movie_data)
        
        # Add genres
        for genre_name in genre_names:
            genre, _ = Genre.objects.get_or_create(name=genre_name)
            movie.genres.add(genre)
        
        print(f'✓ Added: {movie.title} ({country})')
        added += 1
    
    print(f'\n✓ Successfully added {added} movies')
    print(f'⊘ Skipped {skipped} existing movies')
    print(f'\nTotal movies in database: {Movie.objects.count()}')

if __name__ == '__main__':
    add_international_movies()
