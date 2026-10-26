import mysql from 'mysql2/promise'
import { getAuthenticatedUser, requireCurrentAdmin } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  // Attend la vérification du token et du compte.
  const authenticatedUser = await getAuthenticatedUser(event)

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  })

  try {
    // Vérifie le rôle admin avec la connexion ouverte et l’utilisateur vérifié.
    await requireCurrentAdmin(connection, authenticatedUser)

    const [quotes] = await connection.query(`
      SELECT
        q.ID_quote,
        q.quote_text,
        q.quote_language,
        q.quote_source,
        q.quote_status,
        q.quote_created_at,
        q.times_asked,
        q.correct_count,
        q.incorrect_count,
        m.ID_movie,
        m.movie_title
      FROM quotes q
      JOIN movies m ON m.ID_movie = q.ID_movie
      ORDER BY q.ID_quote DESC
    `)

    return { quotes }
  } finally {
    await connection.end()
  }
})