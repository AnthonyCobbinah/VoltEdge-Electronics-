const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs-extra');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'db.json');

// Database Setup
async function initDB() {
    try {
        if (!await fs.pathExists(DB_FILE)) {
            await fs.writeJson(DB_FILE, { users: [], orders: [] });
        }
    } catch (err) { console.error("DB Error:", err); }
}
initDB();

const getData = async () => await fs.readJson(DB_FILE);
const saveData = async (data) => await fs.writeJson(DB_FILE, data, { spaces: 2 });

app.use(cors());
app.use(bodyParser.json());

// Serving the PUBLIC folder. 
// Because index.html is inside /public, Express will find it automatically at '/'
app.use(express.static(path.join(__dirname, 'public')));

// --- AUTHENTICATION ---
app.post('/api/register', async (req, res) => {
    const { name, phone } = req.body;
    const data = await getData();
    const cleanPhone = phone.trim();
    if (data.users.find(u => u.phone === cleanPhone)) {
        return res.status(400).json({ error: "Phone number already exists!" });
    }
    const newUser = { name: name.trim(), phone: cleanPhone };
    data.users.push(newUser);
    await saveData(data);
    res.status(201).json({ user: newUser });
});

app.post('/api/login', async (req, res) => {
    const data = await getData();
    const user = data.users.find(u => u.phone === req.body.phone.trim());
    if (user) res.json({ user });
    else res.status(401).json({ error: "User not found. Please Register." });
});

// --- ORDERS ---
app.post('/api/orders', async (req, res) => {
    const { phone, itemName, price } = req.body;
    const data = await getData();
    const user = data.users.find(u => u.phone === phone.trim());
    if (!user) return res.status(403).json({ error: "Forbidden" });

    const newOrder = { 
        id: Date.now(), 
        customerName: user.name, 
        customerPhone: user.phone, 
        itemName, 
        price, 
        status: 'pending', 
        timestamp: new Date().toLocaleString('en-GB') 
    };
    data.orders.unshift(newOrder);
    await saveData(data);
    res.status(201).json(newOrder);
});

app.get('/api/my-orders/:phone', async (req, res) => {
    const data = await getData();
    res.json(data.orders.filter(o => o.customerPhone === req.params.phone));
});

// --- ADMIN ---
app.post('/api/admin/verify', async (req, res) => {
    if (req.body.password === "G1234") {
        const data = await getData();
        res.json({ success: true, orders: data.orders });
    } else res.status(401).json({ success: false });
});

app.patch('/api/orders/:id/status', async (req, res) => {
    const data = await getData();
    const order = data.orders.find(o => o.id === parseInt(req.params.id));
    if (order) {
        order.status = req.body.status;
        await saveData(data);
        res.json({ success: true });
    } else res.status(404).send();
});

app.delete('/api/orders/:id', async (req, res) => {
    const data = await getData();
    data.orders = data.orders.filter(o => o.id !== parseInt(req.params.id));
    await saveData(data);
    res.json({ success: true });
});

app.listen(PORT, () => console.log(`🚀 VoltEdge live on Port ${PORT}`));