const express = require('express');
const bodyParser = require('body-parser');
const publicRoutes = require('./routes/public');

function createPublicApp() {
    const app = express();
    app.use(bodyParser.json());
    app.use('/', publicRoutes);
    return app;
}

function startPublicAPI(port = 3000) {
    const app = createPublicApp();
    app.listen(port, () => {
        console.log(`API publique démarrée sur le port ${port}`);
    });
    return app;
}

module.exports = {
    startPublicAPI
};