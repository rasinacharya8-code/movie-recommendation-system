from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from api.models import Movie, Rating
import random

class Command(BaseCommand):
    help = 'Seeds database with users and ratings'

    def handle(self, *args, **kwargs):
        # 1. Create Users
        users_data = [
            {'username': 'alice', 'email': 'alice@example.com', 'password': 'password123'},
            {'username': 'bob', 'email': 'bob@example.com', 'password': 'password123'},
            {'username': 'charlie', 'email': 'charlie@example.com', 'password': 'password123'},
            {'username': 'dave', 'email': 'dave@example.com', 'password': 'password123'},
        ]

        created_users = []
        for u_data in users_data:
            if not User.objects.filter(username=u_data['username']).exists():
                user = User.objects.create_user(**u_data)
                self.stdout.write(f"Created user: {user.username}")
                created_users.append(user)
            else:
                self.stdout.write(f"User {u_data['username']} already exists")
                created_users.append(User.objects.get(username=u_data['username']))

        # 2. Create Ratings
        movies = Movie.objects.all()
        if not movies.exists():
            self.stdout.write(self.style.WARNING("No movies found. Run seed_movies first."))
            return

        for user in created_users:
            # Each user rates 3 random movies
            sample_movies = random.sample(list(movies), min(3, len(movies)))
            for movie in sample_movies:
                score = random.randint(3, 5) # Mostly positive ratings for demo
                
                # Check if rating exists
                if not Rating.objects.filter(user=user, movie=movie).exists():
                    Rating.objects.create(
                        user=user,
                        movie=movie,
                        score=score,
                        review_text=f"This is a simulated review with a score of {score}. Good movie!"
                    )
                    self.stdout.write(f"User {user.username} rated {movie.title}: {score}")
                else:
                    self.stdout.write(f"Rating already exists for {user.username} -> {movie.title}")

        self.stdout.write(self.style.SUCCESS('Successfully seeded users and ratings'))
