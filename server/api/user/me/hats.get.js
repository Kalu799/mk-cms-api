import mysql from 'mysql2/promise'
import { getAuthenticatedUser } from '../../../utils/auth.js'
import { unlockAvailableHats } from '../../../utils/hats.js'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')

  const authenticatedUser = await getAuthenticatedUser(event)

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  })

  try {
    await connection.beginTransaction()

    // Actualise les possessions même si cette route est appelée
    // sans chargement préalable du profil.
    await unlockAvailableHats(connection, authenticatedUser.id)

    const [rows] = await connection.query(
      `SELECT
         h.ID_hat,
         h.hat_name,
         h.hat_asset_key,
         h.hat_required_level,
         (uh.ID_hat IS NOT NULL) AS unlocked,
         COALESCE(u.user_avatar_hat_id = h.ID_hat, 0) AS equipped
       FROM hats h
       JOIN users u ON u.ID_user = ?
       LEFT JOIN user_hats uh
         ON uh.ID_user = u.ID_user
         AND uh.ID_hat = h.ID_hat
       ORDER BY h.hat_required_level ASC, h.ID_hat ASC`,
      [authenticatedUser.id]
    )

    const hats = rows.map((hat) => ({
      ID_hat: hat.ID_hat,
      hat_name: hat.hat_name,
      hat_asset_key: hat.hat_asset_key,
      hat_required_level: hat.hat_required_level,
      unlocked: Number(hat.unlocked) === 1,
      equipped: Number(hat.equipped) === 1,
    }))

    await connection.commit()

    return { hats }
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    await connection.end()
  }
})