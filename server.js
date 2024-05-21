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
    const { fromCustomerName, toCustomerName, amount } = req.body;

    try {
        await pool.query('BEGIN');

        // Get the IDs and balances of the customers based on their names
        const fromCustomer = await pool.query('SELECT id, balance FROM customers WHERE name = $1', [fromCustomerName]);
        const toCustomer = await pool.query('SELECT id FROM customers WHERE name = $1', [toCustomerName]);

       

        const fromCustomerId = fromCustomer.rows[0].id;
        const toCustomerId = toCustomer.rows[0].id;
        const fromCustomerBalance = fromCustomer.balance;

        if (fromCustomerBalance < amount) {
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
        res.send('Transfer failed: ' + err.message);
    }
});


app.listen(port, () => {
    console.log(`Server started on port ${port}`);
});
