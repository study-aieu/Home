# Backend

Environment variables (.env):

- JWT_SECRET
- PORT (default 4000)
- DB_FILE (default ./data/app.db)
- ENCRYPTION_KEY (64-hex chars for AES-256-GCM)
- CORS_ORIGIN

Scripts:

- npm run dev
- npm start

Endpoints:

- POST /register { email, password }
- POST /login { email, password }
- POST /connect-site { url, username, appPassword } (Auth: Bearer)
- GET /posts (Auth)
- POST /posts { title, content, status?, featured_media? } (Auth)
- PUT /posts/:id body of WP update fields (Auth)
- DELETE /posts/:id (Auth)
- POST /upload-image multipart/form-data field `image` (Auth)