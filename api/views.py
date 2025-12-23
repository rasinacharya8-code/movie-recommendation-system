from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login, logout
from .models import Movie, Rating, Genre
from .serializers import MovieSerializer, RatingSerializer, UserSerializer, GenreSerializer
from django.db.models import Avg

class MovieViewSet(viewsets.ModelViewSet):
    queryset = Movie.objects.all()
    serializer_class = MovieSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['title', 'description', 'genres__name']

    @action(detail=True, methods=['post'], permission_classes=[permissions.AllowAny])
    def rate_movie(self, request, pk=None):
        movie = self.get_object()
        score = request.data.get('score')
        review_text = request.data.get('review_text', '')
        user_email = request.data.get('user_email', 'anonymous@example.com')

        if not score:
            return Response({'error': 'Score is required'}, status=status.HTTP_400_BAD_REQUEST)

        # Get or create user by email
        user, created = User.objects.get_or_create(
            email=user_email,
            defaults={'username': user_email.split('@')[0]}
        )

        rating, created = Rating.objects.update_or_create(
            user=user, movie=movie,
            defaults={'score': score, 'review_text': review_text}
        )
        return Response(RatingSerializer(rating).data)

    @action(detail=False, methods=['get'])
    def recommendations(self, request):
        if not request.user.is_authenticated:
            # Default: specific popular movies if not logged in
            return Response(MovieSerializer(Movie.objects.order_by('-id')[:5], many=True).data)

        # 1. Get User's High Ratings (>= 3)
        user_ratings = Rating.objects.filter(user=request.user, score__gte=3).select_related('movie')
        if not user_ratings.exists():
            # Fallback if user hasn't rated anything: Trending/Random
            return Response(MovieSerializer(Movie.objects.order_by('?')[:5], many=True).data)

        liked_movie_ids = [r.movie.id for r in user_ratings]
        liked_movies_genres = []
        for r in user_ratings:
            # Create a string of genres for each liked movie, e.g. "Action Sci-Fi"
            genres = " ".join([g.name for g in r.movie.genres.all()])
            liked_movies_genres.append(genres)

        # 2. Build Dataset of ALL Movies
        all_movies = Movie.objects.prefetch_related('genres').all()
        movie_data = []
        for m in all_movies:
            genres_str = " ".join([g.name for g in m.genres.all()])
            movie_data.append({
                'id': m.id,
                'title': m.title,
                'genres_str': genres_str,
                'obj': m
            })
        
        # If dataset is too small, just return random excluding seen
        if len(movie_data) < 3:
             watched_ids = Rating.objects.filter(user=request.user).values_list('movie_id', flat=True)
             recs = Movie.objects.exclude(id__in=watched_ids).order_by('?')[:5]
             return Response(MovieSerializer(recs, many=True).data)

        # 3. Content-Based Filtering with Pandas & Scikit-Learn
        import pandas as pd
        from sklearn.feature_extraction.text import CountVectorizer
        from sklearn.metrics.pairwise import cosine_similarity

        df = pd.DataFrame(movie_data)
        
        # Vectorize Genres
        count = CountVectorizer(stop_words='english')
        count_matrix = count.fit_transform(df['genres_str'])
        
        # Sub-logic: Find similarity between "User Profile" and All Movies
        # We build a 'User Generic Profile' by joining all genres they liked
        user_profile_genres = " ".join(liked_movies_genres)
        
        # Transform user profile using the SAME vectorizer
        user_vector = count.transform([user_profile_genres])
        
        # Calculate similarity between User Profile and All Movies
        similarity_scores = cosine_similarity(user_vector, count_matrix)
        
        # Get top matches
        # similarity_scores is [[0.1, 0.5, ...]]
        sim_scores_list = list(enumerate(similarity_scores[0]))
        sim_scores_list = sorted(sim_scores_list, key=lambda x: x[1], reverse=True)
        
        # Filter out movies user already watched
        watched_ids = set(Rating.objects.filter(user=request.user).values_list('movie_id', flat=True))
        
        recommendations = []
        for i, score in sim_scores_list:
            movie_id = df.iloc[i]['id']
            if movie_id not in watched_ids:
                recommendations.append(df.iloc[i]['obj'])
                if len(recommendations) >= 5:
                    break
        
        # If we still don't have enough, fill with random
        if len(recommendations) < 5:
            existing_ids = [m.id for m in recommendations] + list(watched_ids)
            filler = Movie.objects.exclude(id__in=existing_ids).order_by('?')[:5-len(recommendations)]
            recommendations.extend(filler)

        return Response(MovieSerializer(recommendations, many=True).data)

class RatingViewSet(viewsets.ModelViewSet):
    queryset = Rating.objects.all()
    serializer_class = RatingSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

@api_view(['POST'])
def register_user(request):
    serializer = UserSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
def login_user(request):
    username = request.data.get('username')
    password = request.data.get('password')
    user = authenticate(username=username, password=password)
    if user:
        login(request, user)
        return Response({'message': 'Logged in successfully', 'username': user.username})
    return Response({'error': 'Invalid credentials'}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
def logout_user(request):
    logout(request)
    return Response({'message': 'Logged out successfully'})

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def current_user(request):
    return Response({
        'id': request.user.id,
        'username': request.user.username,
        'email': request.user.email
    })
