# Carely BD

Care services marketplace for Bangladesh connecting customers with Child Care, Aged Care, Nurse, and Physiotherapist professionals.

## Project Structure

```
carely/
  carely-backend/    Node.js + Express + MongoDB + Socket.io
  carely-frontend/   React
```

## Setup

### Backend
```bash
cd carely-backend
npm install
cp .env.example .env
# Fill in .env with your values
npm start
```

### Frontend
```bash
cd carely-frontend
npm install
cp .env.example .env
# Set REACT_APP_API_BASE_URL to your backend URL
npm start
```

## Environment Variables

### Backend (.env)
```
PORT=5000
MONGODB_URI=
JWT_SECRET=
EMAIL_USER=
EMAIL_PASS=
FRONTEND_URL=http://localhost:3000
APP_BASE_URL=http://localhost:3000
NODE_ENV=development
```

### Frontend (.env)
```
REACT_APP_API_BASE_URL=http://localhost:5000
```

## Features
- 4 professional types: Child Care, Aged Care, Nurse, Physiotherapist
- BD location system: Division > District > Thana (462 thanas)
- Booking system with time-slot level conflict detection
- Job post feed (customers post, professionals apply free, credit on selection)
- Credit system (inactive at launch, admin-toggled)
- Real-time chat via Socket.io (after booking only)
- Admin dashboard with all controls
- All revenue features toggled via admin settings

## Deployment
- Frontend: Vercel
- Backend: Render
- Database: MongoDB Atlas

## Legal
Carely is a marketplace platform only. Not responsible for service outcomes.
All professionals operate independently.
