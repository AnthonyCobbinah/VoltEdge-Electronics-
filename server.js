const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs-extra');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'db.json');

async function initDB() {
    if (!await fs.pathExists(DB_FILE)) {
        await fs.writeJson(DB_FILE, { users: [], orders: [] });
    }
}
initDB();

const getData = async () => await fs.readJson(DB_FILE);
const saveData = async (data) => await fs.writeJson(DB_FILE, data, { spaces: 2 });

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- AUTH ---
app.post('/api/register', async (req, res) => {
    const { name, phone } = req.body;
    const data = await getData();
    // Validation: 10 digits and full name
    if (!name || name.trim().split(' ').length < 2) return res.status(400).json({ error: "Please enter your Full Name (First and Last)." });
    if (!/^\d{10}$/.test(phone)) return res.status(400).json({ error: "Phone must be exactly 10 digits." });
    
    if (data.users.find(u => u.phone === phone.trim())) return res.status(400).json({ error: "Phone already registered!" });
    
    const newUser = { name: name.trim(), phone: phone.trim() };
    data.users.push(newUser);
    await saveData(data);
    res.status(201).json({ user: newUser });
});

app.post('/api/login', async (req, res) => {
    const data = await getData();
    const user = data.users.find(u => u.phone === req.body.phone.trim());
    if (user) res.json({ user });
    else res.status(401).json({ error: "Credentials not found. Please register exactly as before." });
});

// --- ORDERS ---
app.post('/api/orders', async (req, res) => {
    const { phone, itemName, price } = req.body;
    const data = await getData();
    const user = data.users.find(u => u.phone === phone.trim());
    const newOrder = { 
        id: Date.now(), 
        customerName: user.name, 
        customerPhone: user.phone, 
        itemName, 
        price, 
        status: 'pending', 
        timestamp: new Date().toLocaleString() 
    };
    data.orders.unshift(newOrder);
    await saveData(data);
    res.status(201).json(newOrder);
});

app.get('/api/my-orders/:phone', async (req, res) => {
    const data = await getData();
    res.json(data.orders.filter(o => o.customerPhone === req.params.phone));
});

// --- ADMIN ACTIONS (The Fix for your Buttons) ---
app.post('/api/admin/verify', async (req, res) => {
    if (req.body.password === "G1234") {
        const data = await getData();
        res.json({ success: true, orders: data.orders });
    } else res.status(401).json({ success: false });
});

app.patch('/api/orders/:id/status', async (req, res) => {
    const data = await getData();
    const index = data.orders.findIndex(o => o.id === parseInt(req.params.id));
    if (index !== -1) {
        data.orders[index].status = req.body.status;
        await saveData(data);
        return res.json({ success: true });
    }
    res.status(404).json({ error: "Order not found" });
});

app.delete('/api/orders/:id', async (req, res) => {
    const data = await getData();
    data.orders = data.orders.filter(o => o.id !== parseInt(req.params.id));
    await saveData(data);
    res.json({ success: true });
});

app.listen(PORT, () => console.log(`VoltEdge System Online`));
