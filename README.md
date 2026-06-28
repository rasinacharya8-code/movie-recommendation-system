# CineMatch: Full-Stack Movie Recommendation System

CineMatch is a full-stack web application designed to demonstrate clean coding practices, modern frontend-backend integration, and pragmatic system architecture. I built this project to showcase my ability to solve real-world development challenges, handle data synchronization, and build user-centric features.

Here is a breakdown of the design decisions, engineering choices, and technical details behind the project.

## Why I Built This (Engineering Goals)

Instead of building a standard CRUD application, I focused on addressing common challenges in modern web development:

1. Data Availability: I implemented a hybrid database flow using SQLite locally and Firebase Firestore in the cloud. This combination guarantees that the application stays fast by pulling local data first, while leveraging cloud storage for real-time features.
2. Algorithmic Personalization: I wrote a custom recommendation engine from scratch to show how user behavior can directly drive personalized UI experiences.
3. Feature Integrity: I created an anti-spam watch-time validation system to ensure reviews are authenticated and user engagement is genuine.

## Core Architecture and Data Flow

To ensure high performance and data consistency, the application follows a structured sync pipeline:

* Local Database (The Source of Truth): Django handles structured data such as users, movies, and reviews inside a local SQLite database.
* Real-Time Mirroring: Whenever data is modified on the backend, Django Signals trigger a background sync to update Firebase Firestore.
* Hybrid Client Fetching: The React frontend requests data from the local API and the cloud database concurrently. It presents the local data instantly for zero latency, and merges any new cloud records in the background.

## Key Features Under the Hood

### Custom Recommendation Engine
Instead of relying on third-party black-box services, the recommendation logic runs directly on the client:
* It analyzes the user's past movie ratings, identifying genres rated 7/10 or higher as positive matches.
* It penalizes genres rated 3/10 or lower to avoid suggesting unwanted categories.
* It weights newer ratings more heavily, dynamically ranking and ordering unwatched movies on the homepage.

### Anti-Spam Watch-Time Verification
To prevent review manipulation, the system enforces a strict watch-time rule:
* A timer tracks the active time a user spends on a movie.
* The review submission box remains locked until the user has completed at least 90% of the movie's duration.
* Once verified, their status is saved to the cloud, allowing them to review the movie from any device.

### Persistent Theme Configuration
I built a dark and light theme system using React Context. Theme choices are stored in local storage so the application remembers the user's visual preference on return visits.

### Bulk Database Sync Tool
For administrative tasks, I built a sync page that handles batch updates. It splits database writes into blocks of 400 to prevent hitting Firestore rate limits, keeping operations clean and efficient.

## The API Structure

The backend exposes stateless endpoints prefixed with /api/:

* GET /api/movies/ - Returns all movies and automatically calculates average ratings.
* GET /api/movies/<id>/ - Returns detailed info for a single movie.
* POST /api/movies/<id>/rate_movie/ - Handles authenticated rating submissions.
* POST /api/register/ & POST /api/login/ - Session authentication handlers.

## Local Setup Instructions

### Prerequisites
* Python 3.9 or higher
* Node.js (version 18 or higher)
* A Firebase account with Authentication and Firestore enabled

### Backend Configuration

1. Go to the project root folder:
   ```bash
   cd "movie recommendation system"
   ```
2. Set up and run a virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On Mac/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a .env file in the root folder:
   ```env
   SECRET_KEY=your-secure-random-string
   DEBUG=True
   CORS_ALLOW_ALL=True
   ```
5. Set up the Firebase private key:
   * Generate a private key JSON from Firebase Console -> Project Settings -> Service Accounts.
   * Save the file as serviceAccountKey.json in the project root folder.
6. Run migrations and start the server:
   ```bash
   python manage.py migrate
   python manage.py createsuperuser
   python manage.py runserver
   ```

### Frontend Configuration

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install packages:
   ```bash
   npm install
   ```
3. Create a .env file in the frontend folder containing your Firebase keys:
   ```env
   VITE_FIREBASE_API_KEY=your-key
   VITE_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-id
   VITE_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   VITE_FIREBASE_APP_ID=your-app-id
   ```
4. Launch the local development server:
   ```bash
   npm run dev
   ```

## Key Technical Takeaways from This Project
* I learned how to bridge SQL and NoSQL databases, maintaining data integrity between Django and Firestore.
* I designed and implemented front-end verification rules to secure user input before it hits our servers.
* I focused on writing clean, modular components and clean API endpoints without relying on unnecessary third-party packages.

