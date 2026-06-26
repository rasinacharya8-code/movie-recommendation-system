from django.urls import path
from .views import (
    movie_list, 
    movie_detail, 
    register_user_manual, 
    login_user_manual, 
    logout_user_manual, 
    get_current_user_manual,
    rate_movie_manual,
    get_movie_reviews_manual
)

urlpatterns = [
    # Manual Routes
    path('movies/', movie_list, name='movie-list'),
    path('movies/<int:pk>/', movie_detail, name='movie-detail'),
    path('movies/<int:pk>/rate_movie/', rate_movie_manual, name='rate-movie'),
    path('movies/<int:pk>/reviews/', get_movie_reviews_manual, name='movie-reviews'),
    path('register/', register_user_manual, name='register'),
    path('login/', login_user_manual, name='login'),
    path('logout/', logout_user_manual, name='logout'),
    path('me/', get_current_user_manual, name='current-user'),
]
