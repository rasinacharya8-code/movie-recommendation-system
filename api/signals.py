from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Movie, Rating
import firebase_admin
from firebase_admin import credentials, firestore
import os

# STATUS: CONNECTING...
db_client = None

try:
    # Try to locate serviceAccountKey.json in the root directory
    cred_path = os.path.join(os.getcwd(), 'serviceAccountKey.json')
    if os.path.exists(cred_path):
        if not firebase_admin._apps:
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        db_client = firestore.client()
        print("[OK] Firebase Admin SDK initialized successfully for Backend Sync.")
    else:
        print("[WARN] 'serviceAccountKey.json' not found. Backend Sync disabled.")
except Exception as e:
    print(f"[ERROR] Error initializing Firebase Admin: {e}")

@receiver(post_save, sender=Movie)
def sync_movie_to_firestore(sender, instance, **kwargs):
    if not db_client:
        return

    try:
        # Prepare data map (convert types as necessary)
        # Note: Firestore doesn't like complex objects, ensure everything is JSON serializable
        data = {
            'title': instance.title,
            'description': instance.description,
            'release_year': instance.release_year,
            'duration': instance.duration,
            'poster_url': instance.poster_url,
            'watch_url': instance.watch_url,
            'cast': instance.cast,
            # Handle ManyToMany for genres (list of strings)
            'genres': [g.name for g in instance.genres.all()]
        }
        
        # Merge=True to update existing fields without overwriting everything
        db_client.collection('movies').document(str(instance.id)).set(data, merge=True)
        print(f"[SYNC] Synced movie '{instance.title}' to Firestore.")
    except Exception as e:
        print(f"[ERROR] Failed to sync movie {instance.title}: {e}")

@receiver(post_delete, sender=Movie)
def delete_movie_from_firestore(sender, instance, **kwargs):
    if not db_client:
        return

    try:
        db_client.collection('movies').document(str(instance.id)).delete()
        print(f"[DELETE] Deleted movie '{instance.title}' from Firestore.")
    except Exception as e:
        print(f"[ERROR] Failed to delete movie {instance.title}: {e}")

@receiver(post_save, sender=Rating)
def sync_rating_to_firestore(sender, instance, **kwargs):
    if not db_client:
        return

    try:
        reviews_ref = db_client.collection('reviews')

        data = {
            'movieId': str(instance.movie.id),
            'movieTitle': instance.movie.title,
            'userId': str(instance.user.id),
            'userName': instance.user.username,
            'rating': instance.rating,
            'review': instance.review_text,
            'reviewText': instance.review_text,
            'timestamp': firestore.SERVER_TIMESTAMP,
            'isVerified': instance.is_verified,
            'source': 'admin',
            # Store the Django Rating ID so we can reliably find & update this doc later
            'django_rating_id': str(instance.id)
        }

        # Reliable matching: search by the unique Django rating ID stored on the document
        query = reviews_ref.where('django_rating_id', '==', str(instance.id)).limit(1)
        docs = list(query.stream())

        if docs:
            # Update the existing Firestore document for this Django rating
            reviews_ref.document(docs[0].id).set(data, merge=True)
            print(f"[SYNC] Synced rating update for '{instance.movie.title}' to Firestore (ID: {docs[0].id}).")
        else:
            # No matching document found -- create a new one
            reviews_ref.add(data)
            print(f"[ADD] Added new rating for '{instance.movie.title}' to Firestore.")

    except Exception as e:
        print(f"[ERROR] Failed to sync rating: {e}")

@receiver(post_delete, sender=Rating)
def delete_rating_from_firestore(sender, instance, **kwargs):
    if not db_client:
        return

    try:
        reviews_ref = db_client.collection('reviews')

        # 1. Primary: Match by the unique Django rating ID stored on the document
        docs = list(reviews_ref.where('django_rating_id', '==', str(instance.id)).stream())

        # 2. Fallback: Match by movieId + Django userId (for older docs without django_rating_id)
        if not docs:
            docs = list(
                reviews_ref
                .where('movieId', '==', str(instance.movie.id))
                .where('userId', '==', str(instance.user.id))
                .where('source', '==', 'admin')
                .stream()
            )

        deleted_count = 0
        for doc in docs:
            doc.reference.delete()
            deleted_count += 1
            print(f"[DELETE] Deleted review from Firestore (ID: {doc.id})")

        if deleted_count > 0:
            print(f"[OK] Successfully deleted {deleted_count} matching reviews from Firestore.")
        else:
            print(f"[WARN] Could not find matching Firestore review to delete for movie '{instance.movie.title}'.")

    except Exception as e:
        print(f"[ERROR] Failed to delete rating: {e}")
