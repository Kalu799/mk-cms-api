import mysql from 'mysql2/promise'
import { getAuthenticatedUser, requireCurrentAdmin } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  // Vérifie le token avant d’ouvrir la connexion.
  const authenticatedUser = await getAuthenticatedUser(event)

  let connection

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    })

    // Vérifie le compte et son rôle actuel avant de lire les catégories.
    await requireCurrentAdmin(connection, authenticatedUser)

    const [categories] = await connection.execute(`
      SELECT id_genre, genre_name
      FROM genres
      ORDER BY genre_name ASC
    `)

    return { categories }
  } catch (error) {
    // Conserve les refus d’authentification et d’autorisation.
    if (error?.statusCode === 401 || error?.statusCode === 403) {
      throw error
    }

    console.error('Erreur chargement des genres :', error)

    throw createError({
      statusCode: 500,
      statusMessage: 'Impossible de charger les genres',
    })
  } finally {
    if (connection) {
      await connection.end()
    }
  }
})