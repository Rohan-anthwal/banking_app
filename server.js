const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const app = express();
const port = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public')); 

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'money_transfer',
    password: 'rohan123',
    port: 5432,
});

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/customers', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM customers');
        res.render('customers', { customers: result.rows });
    } catch (err) {
        console.error(err);
        res.send('Error fetching customers');
    }
});

app.get('/customer/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM customers WHERE id = $1', [req.params.id]);
        res.render('customer', { customer: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.send('Error fetching customer');
    }
});

app.post('/transfer', async (req, res) => {
    const { fromCustomerId, toCustomerId, amount } = req.body;

    try {
        await pool.query('BEGIN');

        const fromCustomer = await pool.query('SELECT balance FROM customers WHERE id = $1', [fromCustomerId]);

        if (fromCustomer.rows[0].balance < amount) {
            throw new Error('Insufficient balance');
        }

        await pool.query('UPDATE customers SET balance = balance - $1 WHERE id = $2', [amount, fromCustomerId]);
        await pool.query('UPDATE customers SET balance = balance + $1 WHERE id = $2', [amount, toCustomerId]);
        await pool.query('INSERT INTO transfers (from_customer_id, to_customer_id, amount) VALUES ($1, $2, $3)', [fromCustomerId, toCustomerId, amount]);

        await pool.query('COMMIT');

        res.redirect('/customers');
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error(err);
        res.send('Transfer failed');
    }
});

app.listen(port, () => {
    console.log(`Server started on port ${port}`);
});
