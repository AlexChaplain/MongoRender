const { MongoClient } = require("mongodb");
const express = require('express');
const app = express();
const port = 3000;
const uri = "mongodb+srv://testUser:Test1@cluster1.4c770wa.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1";
const crypto = require('crypto'); // Import the crypto module

app.listen(port, () => {
  console.log(`Server started at http://localhost:${port}`);
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Custom hashing function using SHA-256
function hashPassword(password) {
  const hash = crypto.createHash('sha256');
  hash.update(password);
  return hash.digest('hex');
}

// Connect to MongoDB once
const client = new MongoClient(uri);

client.connect()
  .then(() => {
    console.log("Connected to MongoDB successfully");
  })
  .catch(err => {
    console.error("Error connecting to MongoDB:", err);
  });

// Default endpoint
app.get('/', (req, res) => {
  if (req.cookies.authToken) {
    res.send(`You are authenticated with token: ${req.cookies.authToken}`);
  } else {
    res.send(`
        <h2>Welcome to our site!</h2>
        <button onclick="window.location.href='/register'">Register</button>
        <button onclick="window.location.href='/login'">Login</button>
    `);
  }
});

// Register form
app.get('/register', (req, res) => {
  res.send(`
      <h2>Register</h2>
      <form method="post" action="/register">
          <input type="text" name="user_ID" placeholder="Username" required><br>
          <input type="password" name="password" placeholder="Password" required><br>
          <button type="submit">Register</button>
      </form>
  `);
});

// Login form
app.get('/login', (req, res) => {
  res.send(`
      <h2>Login</h2>
      <form method="post" action="/login">
          <input type="text" name="user_ID" placeholder="Username" required><br>
          <input type="password" name="password" placeholder="Password" required><br>
          <button type="submit">Login</button>
      </form>
  `);
});

// Register endpoint
app.post('/register', async (req, res) => {
  try {
    const { user_ID, password } = req.body;

    const hashedPassword = hashPassword(password);

    const db = client.db('ChapDB');
    const users = db.collection('Users');

    const existingUser = await users.findOne({ user_ID });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    await users.insertOne({ user_ID, password: hashedPassword });

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Login endpoint
app.post('/login', async (req, res) => {
  try {
    const { user_ID, password } = req.body;

    const db = client.db('ChapDB');
    const users = db.collection('Users');

    const user = await users.findOne({ user_ID });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const hashedPassword = hashPassword(password);
    if (hashedPassword !== user.password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.cookie('authToken', user_ID, { httpOnly: true });
    res.redirect('/');
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Print all cookies endpoint
app.get('/cookies', (req, res) => {
  if (req.cookies) {
    res.send(`Active Cookies: ${JSON.stringify(req.cookies)}<br><a href="/clear-cookie">Clear Cookie</a>`);
  } else {
    res.send(`No cookies found!<br><a href="/">Return to home</a>`);
  }
});

// Clear cookie endpoint
app.get('/clear-cookie', (req, res) => {
  res.clearCookie('authToken');
  res.send('Cookie cleared successfully!<br><a href="/">Return to home</a>');
});
