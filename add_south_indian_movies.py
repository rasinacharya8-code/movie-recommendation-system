"""
Script to add South Indian movies to the database
Includes: Tamil, Telugu, Malayalam, and Kannada cinema
"""

import os
import django
from datetime import date

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import Movie, Genre

# South Indian movies
SOUTH_INDIAN_MOVIES = [
    # Tamil Movies
    {
        'title': 'Vikram',
        'description': 'Members of a black ops team must track and eliminate a gang of masked murderers.',
        'release_date': date(2022, 6, 3),
        'poster_url': 'https://image.tmdb.org/t/p/w500/nGkGWRzJBU9WBNt4YJUlS8nFPPl.jpg',
        'cast': 'Kamal Haasan, Vijay Sethupathi, Fahadh Faasil',
        'genres': ['Action', 'Thriller'],
        'country': 'India (Tamil)'
    },
    {
        'title': 'Enthiran (Robot)',
        'description': 'A scientist creates a robot that looks exactly like him. Problems arise when the robot falls in love with his creator\'s girlfriend.',
        'release_date': date(2010, 10, 1),
        'poster_url': 'https://image.tmdb.org/t/p/w500/6bRJZXS6NHPJvZw4g8eKMTMdMjy.jpg',
        'cast': 'Rajinikanth, Aishwarya Rai Bachchan',
        'genres': ['Science Fiction', 'Action', 'Thriller'],
        'country': 'India (Tamil)'
    },
    {
        'title': 'Jai Bhim',
        'description': 'A tribal woman and a righteous lawyer battle in court to unravel the mystery around the disappearance of her husband.',
        'release_date': date(2021, 11, 2),
        'poster_url': 'https://image.tmdb.org/t/p/w500/lSKGlobVs8VgdXDFVXCCBOPJhbz.jpg',
        'cast': 'Suriya, Lijomol Jose, Manikandan K.',
        'genres': ['Drama', 'Crime'],
        'country': 'India (Tamil)'
    },
    {
        'title': 'Karnan',
        'description': 'Karnan, a fearless village youth, must fight for the rights of the conservative people of his village, due to the torture given by a police officer.',
        'release_date': date(2021, 4, 9),
        'poster_url': 'https://image.tmdb.org/t/p/w500/jLGphd0MKMDeKVRGvFkXJqKFksL.jpg',
        'cast': 'Dhanush, Lal, Rajisha Vijayan',
        'genres': ['Action', 'Drama'],
        'country': 'India (Tamil)'
    },
    
    # Telugu Movies
    {
        'title': 'RRR',
        'description': 'A fictional story about two legendary revolutionaries and their journey away from home before they started fighting for their country in 1920s.',
        'release_date': date(2022, 3, 25),
        'poster_url': 'https://image.tmdb.org/t/p/w500/wE0I6efAW4cDDmZQWtwZMOW44EJ.jpg',
        'cast': 'N.T. Rama Rao Jr., Ram Charan, Ajay Devgn, Alia Bhatt',
        'genres': ['Action', 'Drama', 'Adventure'],
        'country': 'India (Telugu)'
    },
    {
        'title': 'Baahubali 2: The Conclusion',
        'description': 'When Shiva, the son of Bahubali, learns about his heritage, he begins to look for answers. His story is juxtaposed with past events that unfolded in the Mahishmati Kingdom.',
        'release_date': date(2017, 4, 28),
        'poster_url': 'https://image.tmdb.org/t/p/w500/v7lsmGNxN7eJSAXLLrMR7bJWFON.jpg',
        'cast': 'Prabhas, Rana Daggubati, Anushka Shetty, Tamannaah',
        'genres': ['Action', 'Adventure', 'Fantasy'],
        'country': 'India (Telugu)'
    },
    {
        'title': 'Eega (The Fly)',
        'description': 'A murdered man is reincarnated as a housefly and seeks to avenge his death.',
        'release_date': date(2012, 7, 6),
        'poster_url': 'https://image.tmdb.org/t/p/w500/jIlJHbdnGLlqILdOcPNZmKpZNs5.jpg',
        'cast': 'Nani, Samantha Ruth Prabhu, Sudeep',
        'genres': ['Action', 'Comedy', 'Fantasy'],
        'country': 'India (Telugu)'
    },
    {
        'title': 'Arjun Reddy',
        'description': 'A short-tempered house surgeon gets used to drugs and drinks when his girlfriend is forced to marry another person.',
        'release_date': date(2017, 8, 25),
        'poster_url': 'https://image.tmdb.org/t/p/w500/xUWaHGwiXMWP0qEiLbVdJQgKdmC.jpg',
        'cast': 'Vijay Deverakonda, Shalini Pandey',
        'genres': ['Drama', 'Romance'],
        'country': 'India (Telugu)'
    },
    
    # Malayalam Movies
    {
        'title': 'Drishyam',
        'description': 'A man goes to extreme lengths to save his family from punishment after the family commits an accidental crime.',
        'release_date': date(2013, 12, 19),
        'poster_url': 'https://image.tmdb.org/t/p/w500/n7BRJMkAqhEJLlLMQbqNYU3cDWC.jpg',
        'cast': 'Mohanlal, Meena, Asha Sharath',
        'genres': ['Crime', 'Drama', 'Thriller'],
        'country': 'India (Malayalam)'
    },
    {
        'title': 'Premam',
        'description': 'A young man has three opportunities to find love. Will the third time be the charm?',
        'release_date': date(2015, 5, 29),
        'poster_url': 'https://image.tmdb.org/t/p/w500/kj4ALuALHLhZJKTdMdLHQGKdLbN.jpg',
        'cast': 'Nivin Pauly, Sai Pallavi, Madonna Sebastian',
        'genres': ['Comedy', 'Drama', 'Romance'],
        'country': 'India (Malayalam)'
    },
    {
        'title': 'Bangalore Days',
        'description': 'Three cousins, each with their own issues, come together in Bangalore and learn to navigate through the ups and downs of life.',
        'release_date': date(2014, 5, 30),
        'poster_url': 'https://image.tmdb.org/t/p/w500/gMJngTNfaqETnHPSZRav5O7M4l.jpg',
        'cast': 'Dulquer Salmaan, Nivin Pauly, Nazriya Nazim',
        'genres': ['Comedy', 'Drama', 'Romance'],
        'country': 'India (Malayalam)'
    },
    {
        'title': 'The Great Indian Kitchen',
        'description': 'After marriage, a woman struggles to be the submissive wife that her husband and his family expect her to be.',
        'release_date': date(2021, 1, 15),
        'poster_url': 'https://image.tmdb.org/t/p/w500/6vGC6PFVFdMXvPdJiJKPCKKdqTt.jpg',
        'cast': 'Nimisha Sajayan, Suraj Venjaramoodu',
        'genres': ['Drama'],
        'country': 'India (Malayalam)'
    },
    
    # Kannada Movies
    {
        'title': 'KGF: Chapter 1',
        'description': 'In the 1970s, a fierce rebel rises against brutal oppression and becomes the symbol of hope to legions of downtrodden people.',
        'release_date': date(2018, 12, 21),
        'poster_url': 'https://image.tmdb.org/t/p/w500/sGO5yDJxwJWJPnJdlEqjp0lHCp5.jpg',
        'cast': 'Yash, Srinidhi Shetty, Ramachandra Raju',
        'genres': ['Action', 'Drama'],
        'country': 'India (Kannada)'
    },
    {
        'title': 'KGF: Chapter 2',
        'description': 'The blood-soaked land of Kolar Gold Fields has a new overlord now - Rocky, whose name strikes fear in the heart of his foes.',
        'release_date': date(2022, 4, 14),
        'poster_url': 'https://image.tmdb.org/t/p/w500/v7VZhcfCmJNQ2Ug4QJu3UYjaJpQ.jpg',
        'cast': 'Yash, Sanjay Dutt, Raveena Tandon, Srinidhi Shetty',
        'genres': ['Action', 'Drama', 'Thriller'],
        'country': 'India (Kannada)'
    },
    {
        'title': 'Kirik Party',
        'description': 'Karna from a small town has joined an engineering college and he gangs up with his hostel mates Loki, Alexander, Manja and others to fuel a lot of mischief in the college.',
        'release_date': date(2016, 12, 30),
        'poster_url': 'https://image.tmdb.org/t/p/w500/5Gfk8qKB8HURRPpa2KuGYvVvPkF.jpg',
        'cast': 'Rakshit Shetty, Rashmika Mandanna, Samyuktha Hegde',
        'genres': ['Comedy', 'Drama', 'Romance'],
        'country': 'India (Kannada)'
    },
    {
        'title': 'Ulidavaru Kandanthe',
        'description': 'A journalist sets out to uncover the truth behind an incident, through the perspectives of different people, unraveling how they and their lives are intertwined with it.',
        'release_date': date(2014, 4, 4),
        'poster_url': 'https://image.tmdb.org/t/p/w500/yQsHQEWJYLr3l1VqJqJQKJqJQKJ.jpg',
        'cast': 'Rakshit Shetty, Kishore, Tara, Achyuth Kumar',
        'genres': ['Crime', 'Drama', 'Thriller'],
        'country': 'India (Kannada)'
    },
]

def add_south_indian_movies():
    print('Adding South Indian movies to database...\n')
    
    added = 0
    skipped = 0
    
    for movie_data in SOUTH_INDIAN_MOVIES:
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
    add_south_indian_movies()
