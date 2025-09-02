// ज़रूरी पैकेजों को बुलाना
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const fs = require('fs');

// सर्वर बनाना
const app = express();
const PORT = 3000;
const JWT_SECRET = 'your-super-secret-key-12345'; // इसे आप बदल सकते हैं
const ADMIN_PASSWORD = 'admin123'; // !!! एडमिन पैनल का पासवर्ड, इसे बदल दें !!!
const DB_FILE = './db.json'; // हमारा नकली डेटाबेस

// सर्वर के नियम
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); // Frontend की फाइलें दिखाने के लिए

// डेटाबेस फाइल को पढ़ने/लिखने के फंक्शन
const readDB = () => {
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify({ users: {} }));
    }
    const data = fs.readFileSync(DB_FILE);
    return JSON.parse(data);
};
const writeDB = (data) => {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
};

// --- यूजर के लिए API ---

// 1. रजिस्टर करना
app.post('/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'Username and password are required.' });
    const db = readDB();
    if (db.users[username]) return res.status(400).json({ message: 'Username already exists.' });

    db.users[username] = {
        password,
        coins: 50,
        activity: [`${new Date().toLocaleString()}: +50 coins (Sign up bonus).`],
        redeemRequests: []
    };
    writeDB(db);
    res.status(201).json({ message: 'User registered with 50 bonus coins!' });
});

// 2. लॉगिन करना
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const db = readDB();
    const user = db.users[username];
    if (!user || user.password !== password) return res.status(401).json({ message: 'Invalid credentials.' });

    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token });
});

// 3. यूजर का डेटा लेना (सुरक्षित)
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.sendStatus(401);
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.sendStatus(403);
        req.user = decoded;
        next();
    });
};
app.get('/api/user-data', verifyToken, (req, res) => {
    const db = readDB();
    const user = db.users[req.user.username];
    res.json({ username: req.user.username, coins: user.coins, activity: user.activity });
});

// 4. कॉइन जोड़ना (सुरक्षित)
app.post('/api/add-coins', verifyToken, (req, res) => {
    const { amount, reason } = req.body;
    const db = readDB();
    db.users[req.user.username].coins += amount;
    db.users[req.user.username].activity.push(`${new Date().toLocaleString()}: +${amount} coins (${reason}).`);
    writeDB(db);
    res.json({ message: 'Coins added!', coins: db.users[req.user.username].coins });
});

// 5. रिडीम करना (सुरक्षित)
app.post('/api/redeem', verifyToken, (req, res) => {
    const { diamonds, ffId } = req.body;
    const cost = diamonds * 10;
    const db = readDB();
    const user = db.users[req.user.username];
    if (user.coins < cost) return res.status(400).json({ message: `Not enough coins.` });
    user.coins -= cost;
    user.redeemRequests.push({ ffId, diamonds, cost, date: new Date().toISOString() });
    user.activity.push(`${new Date().toLocaleString()}: Redeemed ${diamonds} diamonds for ${cost} coins.`);
    writeDB(db);
    res.json({ message: `Successfully redeemed ${diamonds} diamonds!` });
});

// --- एडमिन के लिए API ---
const verifyAdmin = (req, res, next) => {
    if (req.body.password !== ADMIN_PASSWORD) return res.status(403).json({ message: "Invalid Admin Password" });
    next();
};
app.post('/admin/login', verifyAdmin, (req, res) => res.json({ message: "Admin login successful" }));
app.post('/admin/dashboard-data', verifyAdmin, (req, res) => res.json(readDB().users));
app.post('/admin/update-user', verifyAdmin, (req, res) => {
    const { username, newCoinValue, reason } = req.body;
    const db = readDB();
    if (!db.users[username]) return res.status(404).json({ message: "User not found" });
    db.users[username].coins = parseInt(newCoinValue, 10);
    db.users[username].activity.push(`${new Date().toLocaleString()}: Admin Update: Coins set to ${newCoinValue} (${reason}).`);
    writeDB(db);
    res.json({ message: `User ${username}'s coins updated.` });
});

// सर्वर को चालू करना
app.listen(PORT, () => {
    console.log(`सर्वर चालू हो गया है -> http://localhost:${PORT}`);
});