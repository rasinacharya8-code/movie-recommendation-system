from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Movie, Rating, Genre

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user

class GenreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Genre
        fields = '__all__'

class MovieSerializer(serializers.ModelSerializer):
    genres = GenreSerializer(many=True, read_only=True)
    average_rating = serializers.SerializerMethodField()

    class Meta:
        model = Movie
        fields = '__all__'
    
    def get_average_rating(self, obj):
        """
        Calculate average rating using formula: (sum of all ratings) / (number of ratings)
        Example: If ratings are [3, 4, 4], average = (3+4+4)/3 = 3.67
        Django's Avg() function automatically does this calculation
        """
        from django.db.models import Avg
        avg = Rating.objects.filter(movie=obj).aggregate(Avg('score'))['score__avg']
        return round(avg, 1) if avg else None

class RatingSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = Rating
        fields = ['id', 'user', 'username', 'movie', 'score', 'review_text', 'created_at']
        read_only_fields = ['user', 'created_at']
