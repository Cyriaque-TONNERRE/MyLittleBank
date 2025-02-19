const mariadb = require('mariadb');

const pool = mariadb.createPool({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'my_little_bank',
    connectionLimit: 5
});

// Vérification de la connexion
pool.getConnection()
    .then(conn => {
        console.log('Connecté à la base de données');
        conn.release();
    })
    .catch(err => {
        console.error('Erreur de connexion à la base de données', err);
    });

module.exports = pool;