require('dotenv').config();

export const db = require("knex")({
    client: "pg",
    connection: {
        host: process.env.PG_HOST,
        user: process.env.PG_USER,
        password: process.env.PG_PASS,
        database: process.env.PG_DATABASE
    }
});

db('comparison').select('*').then(function (comparisons) {
    //do something here
    for (var comparison of comparisons) {

        console.log(comparison.id);
        break;
    }

});


