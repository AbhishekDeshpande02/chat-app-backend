import pkg from "pg";

const { Pool } = pkg;

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "chatDb",
  password: "ABhishek1",
  port: 5432,
});

pool
  .connect()
  .then(() => {
    console.log("✅ PostgreSQL Connected");
  })
  .catch((err) => {
    console.error(
      "❌ PostgreSQL Connection Error:",
      err.message
    );
  });

export default pool;