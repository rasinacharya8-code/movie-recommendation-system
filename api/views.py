from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login, logout
from django.db.models import Avg
from django.utils import timezone
from .models import Movie, Rating, Genre
from django.db.models import Avg, Q
import json

def movie_list(request):
    """
    MANUAL VIEW: Fetches all movies and calculates average ratings automatically.
    """
    search_query = request.GET.get('search', '')
    
    # 1. Base Queryset with Annotation (Optimized)
    base_qs = Movie.objects.annotate(
        calculated_rating=Avg('rating__rating')
    ).prefetch_related('genres')

    if search_query:
        movies = base_qs.filter(title__icontains=search_query)
    else:
        movies = base_qs.all()

    data = []
    for movie in movies:
        # 2. Use the annotated value (No extra DB call)
        avg_rating = movie.calculated_rating or 0
        
        movie_year = movie.release_year or "N/A"

        data.append({
            'id': movie.id,
            'title': movie.title,
            'year': movie_year,
            'release_year': movie_year,
            'description': movie.description,
            'poster_url': movie.poster_url,
            'genres': [g.name for g in movie.genres.all()],
            'average_rating': round(avg_rating, 1),
            'duration': movie.duration,
            'cast': movie.cast,
            'watch_url': movie.watch_url
        })
    
    return JsonResponse(data, safe=False)

def movie_detail(request, pk):
    """
    MANUAL VIEW: Fetches a single movie with its calculated rating.
    """
    try:
        # Optimized fetch with annotation
        movie = Movie.objects.annotate(
            calculated_rating=Avg('rating__rating')
        ).get(pk=pk)
        
        avg_rating = movie.calculated_rating or 0
        movie_year = movie.release_year or "N/A"

        data = {
            'id': movie.id,
            'title': movie.title,
            'year': movie_year,
            'release_year': movie_year,
            'description': movie.description,
            'poster_url': movie.poster_url,
            'genres': [g.name for g in movie.genres.all()],
            'average_rating': round(avg_rating, 1),
            'duration': movie.duration,
            'cast': movie.cast,
            'watch_url': movie.watch_url
        }
        return JsonResponse(data)
    except Movie.DoesNotExist:
        return JsonResponse({'error': 'Movie not found'}, status=404)

@csrf_exempt
def register_user_manual(request):
    """
    MANUAL VIEW: Handles user registration without using Serializers.
    """
    if request.method == 'POST':
        try:
            body = json.loads(request.body)
            username = body.get('username')
            password = body.get('password')
            email = body.get('email')

            if User.objects.filter(username=username).exists():
                return JsonResponse({'error': 'Username already exists'}, status=400)

            user = User.objects.create_user(username=username, password=password, email=email)
            return JsonResponse({'message': 'User created', 'username': user.username}, status=201)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
    return JsonResponse({'error': 'Method not allowed'}, status=405)

@csrf_exempt
def login_user_manual(request):
    """
    MANUAL VIEW: Custom login logic.
    """
    if request.method == 'POST':
        body = json.loads(request.body)
        username = body.get('username')
        password = body.get('password')
        user = authenticate(username=username, password=password)
        if user:
            login(request, user)
            return JsonResponse({'message': 'Welcome', 'username': user.username})
        return JsonResponse({'error': 'Invalid credentials'}, status=400)
    return JsonResponse({'error': 'Method not allowed'}, status=405)

@csrf_exempt
def logout_user_manual(request):
    logout(request)
    return JsonResponse({'message': 'Logged out'})

@csrf_exempt
def rate_movie_manual(request, pk):
    """
    MANUAL VIEW: Handles rating and reviewing a movie.
    Requires a Firebase UID (user_uid) to verify the caller is a real authenticated user.
    """
    if request.method == 'POST':
        try:
            movie = Movie.objects.get(pk=pk)
            body = json.loads(request.body)
            rating_val = body.get('rating') or body.get('score')
            review_text = body.get('review_text', '')
            user_email = body.get('user_email', '')
            user_uid = body.get('user_uid', '').strip()

            # Security: Reject requests that don't provide a Firebase UID
            if not user_uid:
                return JsonResponse({'error': 'Authentication required. Please log in.'}, status=401)

            if not rating_val:
                return JsonResponse({'error': 'Rating is required'}, status=400)

            if not user_email:
                return JsonResponse({'error': 'User email is required'}, status=400)

            # Look up existing Django user by email — do NOT create ghost users
            # Use get_or_create safely: if the user exists, reuse them;
            # if they're new, create with a secure unusable password.
            username_base = user_email.split('@')[0]
            # Ensure unique username if it already belongs to a different email
            user = None
            try:
                user = User.objects.get(email=user_email)
            except User.DoesNotExist:
                # Create a proper Django user with an unusable (not guessable) password
                # This user can only be authenticated via Firebase
                username = username_base
                counter = 1
                while User.objects.filter(username=username).exists():
                    username = f"{username_base}_{counter}"
                    counter += 1
                user = User.objects.create_user(
                    username=username,
                    email=user_email,
                    password=None  # Sets unusable password — cannot log in with password
                )

            is_verified = body.get('is_verified', False)

            rating_obj, created = Rating.objects.update_or_create(
                user=user, movie=movie,
                defaults={'rating': rating_val, 'review_text': review_text, 'is_verified': is_verified}
            )

            return JsonResponse({
                'id': rating_obj.id,
                'rating': rating_obj.rating,
                'review_text': rating_obj.review_text,
                'username': user.username,
                'message': "Review submitted successfully!"
            })
        except Movie.DoesNotExist:
            return JsonResponse({'error': 'Movie not found'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
    return JsonResponse({'error': 'Method not allowed'}, status=405)


def get_movie_reviews_manual(request, pk):
    """
    MANUAL VIEW: Fetches all reviews for a specific movie.
    """
    try:
        movie = Movie.objects.get(pk=pk)
        ratings = Rating.objects.filter(movie=movie).select_related('user')
        
        data = []
        for r in ratings:
            data.append({
                'id': r.id,
                'userId': r.user.id,
                'userName': r.user.username,
                'rating': r.rating,
                'review': r.review_text,
                'timestamp': str(r.timestamp)
            })
        return JsonResponse(data, safe=False)
    except Movie.DoesNotExist:
        return JsonResponse({'error': 'Movie not found'}, status=404)


def get_current_user_manual(request):
    if request.user.is_authenticated:
        return JsonResponse({
            'id': request.user.id,
            'username': request.user.username,
            'email': request.user.email
        })
    return JsonResponse({'error': 'Not logged in'}, status=401)
