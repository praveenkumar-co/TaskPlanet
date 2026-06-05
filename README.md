# TaskPlanet Social - Mini Social Post Application

This is a full-stack social feed feature built with **React**, **Node/Express**, and **MongoDB** following the look, feel, and features of the **TaskPlanet Social Feed** along with bloom filter is also used to verify username does exist to avoid conflict of same username .

## Project Structure

```
taskplanet/
├── backend/            # Express REST API (CORS, Multer, Cloudinary, Google OAuth)
└── frontend/           # React App (Vite, custom CSS modules, context APIs)
```

## Setup Instructions

my own package :  

 npm i scalable-bloom-kit (as a bloom filter)
 npm i node-utils-kit (for core asyncHandling , ApiResponse and ApiError based on user required function)

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) (v16+ recommended) and [MongoDB](https://www.mongodb.com/) installed and running locally.

---

### Step 1: Run the Backend API

1. Navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   - Create a `.env` file from the example:
     ```bash
     cp .env.example .env
     ```
   - Enter your **Cloudinary** credentials and **Google Client ID** inside `.env`.
4. Start the dev server:
   ```bash
   npm run dev
   ```
   The backend server will start on `http://localhost:8000`.

---

### Step 2: Run the Frontend Client

1. Open a new terminal window and navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite React app:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173/` in your browser.

---

## Features Implemented

1. **Authentication Flow**:
   - Register with username, fullName, email, password, and custom avatar.
   - Traditional login with cookies to store access and refresh tokens.
   - One-tap **Google Sign-In** which auto-creates accounts and verifies ID tokens securely.
2. **Create Posts**:
   - Create posts with text content, an attached image (hosted on Cloudinary), or both.
   - Live image preview before posting.
3. **Feed & Sorting Filters**:
   - Sorting navigation tabs: **All Post**, **For You**, **Most Liked**, and **Most Commented**.
   - Efficient pagination (Load More) and live query-based searches.
4. **Like & Comment Interactions**:
   - Click to instantly like posts. List of user likes is preserved.
   - Direct comment threading on each card.
   - **Optimistic rendering** so changes reflect in the UI instantly.
