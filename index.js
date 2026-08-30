const pool = require('./db');

async function getUsers() {
    try {
        const result = await pool.query('SELECT * FROM users');
        console.log(result.rows);
    } catch (error) {
        console.error(error.message);
    }
}

getUsers();