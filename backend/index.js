require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const uri = process.env.MONGODB_URI;

const app = express();
app.use(cors());
app.use(express.json());

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dotty';
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const PORT = process.env.PORT || 3000;

let usersCollection;

console.log("Mongo URI exists:", !!MONGODB_URI);
console.log("Mongo host:", MONGODB_URI?.split("@")[1]);
// TODO: temp above

async function start() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();
  usersCollection = db.collection('users');
  await usersCollection.createIndex({ username: 1 }, { unique: true });
  console.log('Connected to MongoDB');

  app.post('/signup', async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'username and password required' });
      }

      const hashed = await bcrypt.hash(password, 10);
      const result = await usersCollection.insertOne({
        username,
        password: hashed,
        createdAt: new Date(),
      });

      const token = jwt.sign({ id: result.insertedId, username }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ message: 'User created', token });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(400).json({ error: 'username already exists' });
      }
      console.error(err);
      return res.status(500).json({ error: 'internal error' });
    }
  });

  app.post('/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'username and password required' });
      }

      const user = await usersCollection.findOne({ username });
      if (!user) {
        return res.status(400).json({ error: 'invalid credentials' });
      }

      const ok = await bcrypt.compare(password, user.password);
      if (!ok) {
        return res.status(400).json({ error: 'invalid credentials' });
      }

      const token = jwt.sign({ id: user._id, username }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ message: 'Login successful', token });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'internal error' });
    }
  });

  app.get('/', (req, res) => res.send({ ok: true }));

  app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
}

start().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
