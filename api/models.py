from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone

class Genre(models.Model):
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name

class Movie(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField()
    cast = models.TextField(blank=True, help_text="Comma-separated list of main actors")
    release_year = models.IntegerField(null=True, blank=True, validators=[MinValueValidator(1)])
    poster_url = models.URLField(null=True, blank=True)
    duration = models.IntegerField(null=True, blank=True, help_text="Runtime in minutes", validators=[MinValueValidator(1)])
    watch_url = models.URLField(null=True, blank=True, help_text="Official link to watch the movie")
    genres = models.ManyToManyField(Genre)
    
    def __str__(self):
        return self.title

class Rating(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    movie = models.ForeignKey(Movie, on_delete=models.CASCADE)
    rating = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(10)])
    review_text = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    is_verified = models.BooleanField(default=False)

    class Meta:
        unique_together = ('user', 'movie')

    def __str__(self):
        return f"{self.user.username} - {self.movie.title}: {self.rating}"

