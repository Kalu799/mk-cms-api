import mysql from 'mysql2/promise'

export default defineEventHandler(async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  })

  try {
    const [users] = await connection.query(`
  SELECT
    u.ID_user,
    u.user_pseudo,
    u.user_score,
    u.user_avatar_color,
    u.user_avatar_emotion,
    u.user_avatar_hat_id,
    h.hat_asset_key AS user_avatar_hat_asset_key
  FROM users u
  LEFT JOIN hats h ON h.ID_hat = u.user_avatar_hat_id
  WHERE u.user_is_blocked = 0
  ORDER BY u.user_score DESC, u.ID_user ASC
`)

    return {
      leaderboard: users,
    }
  } finally {
    await connection.end()
  }
})