from django.core.management.base import BaseCommand
from api.models import Rating
import firebase_admin
from firebase_admin import credentials, firestore
import os

class Command(BaseCommand):
    help = 'Sets is_verified=True for all existing reviews in Django and Firestore'

    def safe_print(self, msg):
        try:
            os.write(1, (msg + '\n').encode('utf-8'))
        except:
            pass

    def handle(self, *args, **options):
        # 1. Update Django SQLite database
        self.safe_print("Step 1: Updating Django Rating records...")
        django_count = Rating.objects.filter(is_verified=False).update(is_verified=True)
        self.safe_print(f"Updated {django_count} ratings in Django to is_verified=True")

        # 2. Initialize Firebase
        cred_path = os.path.join(os.getcwd(), 'serviceAccountKey.json')
        if not os.path.exists(cred_path):
            self.safe_print('serviceAccountKey.json not found! Skipping Firestore update.')
            return

        if not firebase_admin._apps:
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        
        db = firestore.client()

        # 3. Update Firestore reviews collection
        self.safe_print("\nStep 2: Updating Firestore reviews collection...")
        reviews_ref = db.collection('reviews')
        docs = reviews_ref.stream()
        
        batch = db.batch()
        firestore_count = 0
        
        for doc in docs:
            doc_ref = reviews_ref.document(doc.id)
            batch.update(doc_ref, {'isVerified': True})
            firestore_count += 1
            
            # Commit every 400 items (Firestore batch limit is 500)
            if firestore_count % 400 == 0:
                batch.commit()
                self.safe_print(f'Updated {firestore_count} reviews in Firestore...')
                batch = db.batch()

        # Commit remaining
        if firestore_count % 400 != 0:
            batch.commit()

        self.safe_print(f"\nCompleted! Updated {firestore_count} reviews in Firestore.")
        self.safe_print(f"Total: {django_count} Django + {firestore_count} Firestore = All reviews verified!")
