const connection = require('./db');

const sql = `
    INSERT INTO users (name, email, phone)
    VALUES
        ('Rahul Sharma', 'rahul@example.com', '9876543210'),
        ('Priya Singh', 'priya@example.com', '9876543211'),
        ('Amit Kumar', 'amit@example.com', '9876543212'),
        ('Neha Verma', 'neha@example.com', '9876543213'),
        ('Rohit Gupta', 'rohit@example.com', '9876543214')
`;

connection.query(sql, (error, result) => {
    if (error) {
        console.error('❌ Error:', error.message);
        connection.end();
        return;
    }

    console.log(`✅ ${result.affectedRows} dummy users inserted successfully!`);
    connection.end();
});