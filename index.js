// index.js
const { startPublicAPI } = require('./app-public');
const { startPrivateAPI } = require('./app-private');

startPublicAPI();
startPrivateAPI();