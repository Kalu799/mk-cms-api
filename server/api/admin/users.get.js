import mysql from 'mysql2/promise'
import { getAuthenticatedUser, requireCurrentAdmin } from '../../utils/auth'

export default defineEventHandler(async (event) => {
// Vérifie le token avant d’ouvrir une connexion à la base.
const authenticatedUser = await getAuthenticatedUser(event)

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  })

  try {
    // Vérifie que le compte existe encore et possède actuellement le rôle admin.
await requireCurrentAdmin(connection, authenticatedUser)
    const [users] = await connection.query(`
      SELECT
        ID_user,
        user_pseudo,
        user_mail,
        user_score,
        user_role,
        user_is_blocked,
        user_avatar_color,
        user_avatar_emotion,
        user_avatar_hat_id,
        user_created_at
      FROM users
      ORDER BY user_pseudo ASC
    `)

    return { users }
  } finally {
    await connection.end()
  }
})