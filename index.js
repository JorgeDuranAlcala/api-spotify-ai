const express = require('express');
const bodyParser = require('body-parser');
const routes = require('./routes');
const dotenv = require('dotenv').config();
const cors = require('cors');	

const app = express();
const port   
 = process.env.PORT || 3000;

app.use(cors({
    origin: process.env.CLIENT_DOMAIN,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
}));
app.use(bodyParser.json());
app.use('/', routes);


app.listen(port, () => {
    console.log(`Server listening on   
 port ${port}`);
});

module.exports = app