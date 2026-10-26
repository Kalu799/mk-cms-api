import mysql from 'mysql2/promise'
import { getAuthenticatedUser } from '../../../utils/auth.js'
import { unlockAvailableHats } from '../../../utils/hats.js'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')

  const authenticatedUser = await getAuthenticatedUser(event)
  const body = await readBody(event)

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Données invalides',
    })
  }

  const allowedFields = [
    'user_avatar_color',
    'user_avatar_emotion',
    'user_avatar_hat_id',
  ]

  const fields = Object.keys(body)

  if (
    fields.length === 0 ||
    fields.some((field) => !allowedFields.includes(field))
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Champs manquants ou non autorisés',
    })
  }

  if (
    fields.includes('user_avatar_color') &&
    !['blue', 'red', 'yellow'].includes(body.user_avatar_color)
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Couleur invalide',
    })
  }

  if (
    fields.includes('user_avatar_emotion') &&
    !['happy', 'neutral', 'sad', 'angry', 'surprised'].includes(
      body.user_avatar_emotion
    )
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Émotion invalide',
    })
  }

  if (
    fields.includes('user_avatar_hat_id') &&
    body.user_avatar_hat_id !== null &&
    (
      !Number.isSafeInteger(body.user_avatar_hat_id) ||
      body.user_avatar_hat_id <= 0
    )
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Identifiant de chapeau invalide',
    })
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  })

  try {
    await connection.beginTransaction()

    // Actualise les possessions et verrouille le compte.
    await unlockAvailableHats(connection, authenticatedUser.id)

    if (
      fields.includes('user_avatar_hat_id') &&
      body.user_avatar_hat_id !== null
    ) {
      const [hats] = await connection.query(
        `SELECT h.ID_hat, uh.ID_user AS owner_id
         FROM hats h
         LEFT JOIN user_hats uh
           ON uh.ID_hat = h.ID_hat
           AND uh.ID_user = ?
         WHERE h.ID_hat = ?
         LIMIT 1`,
        [authenticatedUser.id, body.user_avatar_hat_id]
      )

      if (hats.length === 0) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Chapeau introuvable',
        })
      }

      if (hats[0].owner_id === null) {
        throw createError({
          statusCode: 403,
          statusMessage: 'Ce chapeau n’est pas débloqué',
        })
      }
    }

    // Les noms de colonnes sont validés par la liste autorisée.
    // Seules les valeurs sont fournies comme paramètres SQL.
    const updates = fields.map((field) => `${field} = ?`).join(', ')
    const values = fields.map((field) => body[field])

    await connection.query(
      `UPDATE users SET ${updates} WHERE ID_user = ?`,
      [...values, authenticatedUser.id]
    )

    const [users] = await connection.query(
      `SELECT
         u.ID_user,
         u.user_pseudo,
         u.user_mail,
         u.user_score,
         u.user_role,
         u.user_avatar_color,
         u.user_avatar_emotion,
         u.user_avatar_hat_id,
         h.hat_asset_key AS user_avatar_hat_asset_key
       FROM users u
       LEFT JOIN hats h ON h.ID_hat = u.user_avatar_hat_id
       WHERE u.ID_user = ?
       LIMIT 1`,
      [authenticatedUser.id]
    )

    await connection.commit()

    return users[0]
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    await connection.end()
  }
})