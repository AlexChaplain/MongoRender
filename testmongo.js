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

// Parse cookies from request headers
app.use((req, res, next) => {
  if (req.headers.cookie) {
    const rawCookies = req.headers.cookie.split('; ');
    const cookies = {};
    rawCookies.forEach(rawCookie => {
      const parsedCookie = rawCookie.split('=');
      cookies[parsedCookie[0]] = parsedCookie[1];
    });
    req.cookies = cookies;
  } else {
    req.cookies = {}; // Set an empty object if no cookies are present
  }
  next();
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

// Custom hashing function using SHA-256
function hashPassword(password) {
  const hash = crypto.createHash('sha256');
  hash.update(password);
  return hash.digest('hex');
}

app.post('/register', async (req, res) => {
  try {
    // Extract user details from request body
    const { user_ID, password } = req.body;

    // Hash the password using custom hashing function
    const hashedPassword = hashPassword(password);

    // Connect to MongoDB
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db('ChapDB');
    const users = db.collection('Users');

    // Check if the user already exists
    const existingUser = await users.findOne({ user_ID });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Insert the new user into the database
    await users.insertOne({ user_ID, password: hashedPassword });
    await client.close();

    // Respond with success message
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

app.post('/login', async (req, res) => {
  try {
    // Extract user details from request body
    const { user_ID, password } = req.body;

    // Connect to MongoDB
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db('ChapDB');
    const users = db.collection('Users');

    // Find the user in the database
    const user = await users.findOne({ user_ID });
    if (!user) {
      // User not found
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Hash the provided password and compare with the stored hashed password
    const hashedPassword = hashPassword(password);
    if (hashedPassword !== user.password) {
      // Incorrect password
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Set cookie
    res.cookie('authToken', user_ID, { httpOnly: true });

    // Redirect to homepage
    res.redirect('/');
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});
