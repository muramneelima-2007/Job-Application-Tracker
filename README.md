# Job-Application-Tracker
A complete starter project using:
- Node.js
- Express
- MongoDB + Mongoose
- HTML templates + client-side JavaScript
- Plain CSS + JavaScript

## Features
- User authentication (register, login, logout)
- User-specific application data isolation
- Add, edit, and delete job applications
- Status tracking (`Applied`, `Interview`, `Offer`, `Rejected`)
- Dashboard stats
- Search + filter support
- Responsive UI

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env` from `.env.example` and update values.
   - Set `SESSION_SECRET` to a strong random value.
3. Start MongoDB locally (or use MongoDB Atlas).
4. Run dev server:
   ```bash
   npm run dev
   ```
5. Open `http://localhost:5000`.

## Folder Structure
- `server.js`: Entry point
- `app.js`: Express config and middleware
- `config/db.js`: MongoDB connection
- `models/Application.js`: Mongoose schema
- `routes/applications.js`: App routes + controllers
- `pages/`: Route-served HTML pages
- `public/`: CSS and client-side JS

## Notes
- Current app tracks a single user's applications.
- Next upgrades: authentication, reminders, pagination, and CSV export.
