import pool from "../config/db.js";

export async function saveLog({
  event_type,
  user_id = null,
  partner_id = null,
  message = null,
}) {
  try {
    await pool.query(
      `
      INSERT INTO chat_app_logs
      (
        event_type,
        user_id,
        partner_id,
        message
      )
      VALUES ($1, $2, $3, $4)
      `,
      [
        event_type,
        user_id,
        partner_id,
        message,
      ]
    );
  } catch (err) {
    console.error(
      "❌ Log Insert Error:",
      err.message
    );
  }
}