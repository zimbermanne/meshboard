const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1') 
          ? false 
          : { rejectUnauthorized: false }, // SSL only for remote connections
      }
    : {
        host:     process.env.DB_HOST     || "localhost",
        port:     parseInt(process.env.DB_PORT || "5432"),
        database: process.env.DB_NAME     || "meshboard",
        user:     process.env.DB_USER     || "postgres",
        password: process.env.DB_PASSWORD || "",
      }
);

pool.on("error", (err) => {
  console.error("PostgreSQL pool error:", err);
});

module.exports = pool;
