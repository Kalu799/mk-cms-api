import { getLevelFromScore } from './level.js'

// À appeler dans une transaction déjà ouverte.
// La connexion et la transaction restent gérées par l'appelant.
export const unlockAvailableHats = async (connection, userId) => {
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    throw new TypeError('Identifiant utilisateur invalide')
  }

  const [users] = await connection.query(
    `SELECT user_score
     FROM users
     WHERE ID_user = ?
     FOR UPDATE`,
    [userId]
  )

  if (users.length === 0) {
    throw new Error('Compte introuvable pendant le déblocage des chapeaux')
  }

  const level = getLevelFromScore(users[0].user_score)

  await connection.query(
    `INSERT INTO user_hats (ID_user, ID_hat)
     SELECT ?, h.ID_hat
     FROM hats h
     WHERE h.hat_required_level <= ?
     ON DUPLICATE KEY UPDATE
       unlocked_at = user_hats.unlocked_at`,
    [userId, level]
  )

  return level
}