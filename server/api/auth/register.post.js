import mysql from 'mysql2/promise'
import bcrypt from 'bcrypt'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
    // Vérifie que le corps reçu est un objet contenant les champs.
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Données d’inscription invalides',
    })
  }
  const { pseudo, mail, password } = body;
    // Vérifie que les trois champs sont des chaînes de caractères.
  if (
    typeof pseudo !== 'string' ||
    typeof mail !== 'string' ||
    typeof password !== 'string'
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Le pseudo, l’email et le mot de passe doivent être des textes',
    })
  }

  // si pas de données -> erreur
  if (!pseudo || !mail || !password) {
    throw createError({ statusCode: 400, statusMessage: 'Données manquantes' });
  }

  // si mdp < 4 char -> erreur
  if (password.length < 4) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Le mot de passe doit contenir au moins 4 caractères',
    })
  }

  // récip param de la DB
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  })

  try {
    // check si pseudo déjà prit
    const [existingPseudo] = await connection.query(
      `
        SELECT ID_user
        FROM users
        WHERE user_pseudo = ?
        LIMIT 1
      `,
      [pseudo]
    )
    if (existingPseudo.length > 0) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Ce pseudo existe déjà',
      })
    }

    // check si mail déjà prit
    const [existingMail] = await connection.query(
      `
        SELECT ID_user
        FROM users
        WHERE user_mail = ?
        LIMIT 1
      `,
      [mail]
    )
    if (existingMail.length > 0) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Ce mail est déjà pris',
      })
    }

    // crypt du password
    const passwordHash = await bcrypt.hash(password, 12)

    // crée le nvx user
    const [result] = await connection.query(
      'INSERT INTO users (user_pseudo, user_mail, user_password_hash) VALUES (?, ?, ?)',
      [pseudo, mail, passwordHash]
    );

    return {
      id: result.insertId,
      user: "created"
    }
  }
  finally {
    await connection.end()
  }
})