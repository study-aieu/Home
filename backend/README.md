# Backend - Blog Publishing API

This is the Node.js (Express) backend for the Blog Publishing Mobile App.

## Setup

1. Install dependencies:

```bash
cd backend
npm install
```

2. Create a `.env` file:

```bash
cp .env.example .env
```

Fill in environment variables.

3. Run development server:

```bash
npm run dev
```

The server runs on `http://localhost:4000` by default.

## API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/register | User registration |
| POST | /auth/login | User login |
| POST | /blog/connect-site | Connect WordPress site |
| POST | /posts | Create new post |
| GET | /posts | List posts |
| PUT | /posts/:id | Update post |
| DELETE | /posts/:id | Delete post |
| POST | /upload | Upload image |