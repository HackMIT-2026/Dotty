Backend README

This is a minimal Node.js + Express backend for the Flutter sign-in demo.
It provides:
  - POST /signup  { username, password }
  - POST /login   { username, password }

It uses MongoDB to store users and bcrypt to hash passwords. On success it returns a JWT token.

Getting started:
  1. Install Node.js (>=16)
  2. cd backend
  3. npm install
  4. Create or update .env with your MongoDB Atlas connection string and a JWT secret
  5. In MongoDB Atlas, add your current IP address under Network Access
  6. npm start

Notes:
  - The Flutter web client expects the backend to run on http://localhost:3000.
  - The Android emulator uses http://10.0.2.2:3000 instead.
  - If you are using a physical device, use your computer's LAN IP instead.
