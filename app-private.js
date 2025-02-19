const express = require('express');
const bodyParser = require('body-parser');
const privateRoutes = require('./routes/private');

function createPrivateApp() {
    const app = express();
    app.use(bodyParser.json());

    // Middleware d'authentification pour l'API privée
    app.use((req, res, next) => {
        // Ajoutez ici votre logique d'authentification
        next();
    });

    app.use('/', privateRoutes);
    return app;
}

function startPrivateAPI(port = 3001) {
    const app = createPrivateApp();
    app.listen(port, () => {
        console.log(`API privée démarrée sur le port ${port}`);
    });
    return app;
}

module.exports = {
    startPrivateAPI
};