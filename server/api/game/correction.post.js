import mysql from 'mysql2/promise'
import { createHash, timingSafeEqual } from 'node:crypto'
import { getAuthenticatedUser } from '../../utils/auth'
import { unlockAvailableHats } from '../../utils/hats.js'

// MySQL peut renvoyer les JSON déjà décodés, MariaDB peut renvoyer du texte.
const parseJson = (value) => typeof value === 'string' ? JSON.parse(value) : value

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')

  const authorization = getHeader(event, 'authorization')
  const authenticatedUser = authorization === undefined
    ? null
    : await getAuthenticatedUser(event)
  const body = await readBody(event)

  if (
    !body || typeof body !== 'object' || Array.isArray(body) ||
    typeof body.game_id !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(body.game_id) ||
    !Array.isArray(body.answers) || body.answers.length > 10
  ) {
    throw createError({ statusCode: 400, statusMessage: 'Données de partie invalides' })
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  })

  let transactionStarted = false

  try {
    await connection.beginTransaction()
    transactionStarted = true

    // Deux corrections simultanées attendent sur la même ligne.
    const [games] = await connection.query(
      `SELECT *, game_expires_at <= UTC_TIMESTAMP() AS game_expired
       FROM game_sessions WHERE game_id = ? FOR UPDATE`,
      [body.game_id]
    )

    if (games.length === 0) {
      throw createError({ statusCode: 404, statusMessage: 'Partie introuvable' })
    }

    const game = games[0]

    if (game.ID_user !== null) {
      if (!authenticatedUser) {
        throw createError({ statusCode: 401, statusMessage: 'Connexion requise' })
      }

      if (authenticatedUser.id !== game.ID_user) {
        throw createError({ statusCode: 403, statusMessage: 'Cette partie ne vous appartient pas' })
      }
    } else {
      // Une connexion après le démarrage ne transforme pas une démo en partie classée.
      if (typeof body.game_token !== 'string' || !/^[0-9a-f]{64}$/.test(body.game_token)) {
        throw createError({ statusCode: 403, statusMessage: 'Accès à la partie refusé' })
      }

      const tokenHash = createHash('sha256').update(body.game_token).digest()
      const expectedHash = Buffer.from(game.game_token_hash, 'hex')

      if (expectedHash.length !== tokenHash.length || !timingSafeEqual(tokenHash, expectedHash)) {
        throw createError({ statusCode: 403, statusMessage: 'Accès à la partie refusé' })
      }
    }

    const correction = parseJson(game.game_correction)

    // Une nouvelle soumission renvoie le même corrigé, sans modifier les résultats.
    if (game.game_completed_at !== null) {
      await connection.commit()
      transactionStarted = false
      // Anciennes parties corrigées avant la migration : ancien format conservé.
      return game.game_result ? parseJson(game.game_result) : correction
    }

    if (Number(game.game_expired) === 1) {
      throw createError({ statusCode: 410, statusMessage: 'Cette partie a expiré' })
    }

    const start = parseJson(game.game_start)
    const questions = new Map(start.questions.map((question) => [question.question_id, question]))
    const selectedAnswers = new Map()

    for (const answer of body.answers) {
      if (
        !answer || typeof answer !== 'object' || Array.isArray(answer) ||
        typeof answer.question_id !== 'string' ||
        !questions.has(answer.question_id) ||
        selectedAnswers.has(answer.question_id) ||
        (answer.selected_movie_id !== null && (
          !Number.isSafeInteger(answer.selected_movie_id) || answer.selected_movie_id <= 0
        ))
      ) {
        throw createError({ statusCode: 400, statusMessage: 'Réponse invalide ou question en double' })
      }

      const question = questions.get(answer.question_id)

      if (
        answer.response_time_ms !== undefined &&
        (!Number.isFinite(answer.response_time_ms) || answer.response_time_ms < 0)
      ) {
        throw createError({ statusCode: 400, statusMessage: 'Temps de réponse invalide' })
      }

      if (answer.selected_movie_id !== null && answer.response_time_ms === undefined) {
        throw createError({ statusCode: 400, statusMessage: 'Temps de réponse manquant' })
      }

      if (
        answer.selected_movie_id !== null &&
        !question.options.some((option) => option.ID_movie === answer.selected_movie_id)
      ) {
        throw createError({ statusCode: 400, statusMessage: 'Ce film ne fait pas partie des propositions' })
      }

      selectedAnswers.set(answer.question_id, {
        question_id: answer.question_id,
        selected_movie_id: answer.selected_movie_id,
        response_time_ms: answer.response_time_ms ?? start.question_time_limit_ms,
      })
    }

    // Les questions absentes de la soumission comptent comme sans réponse.
    const answers = start.questions.map((question) => selectedAnswers.get(question.question_id) ?? ({
      question_id: question.question_id,
      selected_movie_id: null,
      response_time_ms: start.question_time_limit_ms,
    }))

    const correctMovies = new Map(correction.games[0].questions.map(
      (question) => [question.question_id, question.correct_movie_id]
    ))

    const corrections = answers.map((answer) => {
      const question = questions.get(answer.question_id)
      const correctMovieId = correctMovies.get(answer.question_id)
      const selectedMovie = question.options.find(
        (movie) => movie.ID_movie === answer.selected_movie_id
      )
      const correctMovie = question.options.find((movie) => movie.ID_movie === correctMovieId)

      if (!correctMovie) {
        throw createError({ statusCode: 500, statusMessage: 'Corrigé de partie incohérent' })
      }

      const isOnTime = answer.response_time_ms >= 0 &&
        answer.response_time_ms < start.question_time_limit_ms
      const isCorrect = answer.selected_movie_id === correctMovieId && isOnTime
      const remainingRatio = isCorrect
        ? (start.question_time_limit_ms - answer.response_time_ms) / start.question_time_limit_ms
        : 0
      const score = isCorrect
        ? game.game_points_per_answer + Math.floor(game.game_speed_bonus_max * remainingRatio)
        : 0

      return {
        ...answer,
        quote_text: question.quote.quote_text,
        selected_movie_title: selectedMovie?.movie_title ?? null,
        correct_movie_title: correctMovie.movie_title,
        correct_movie_id: correctMovieId,
        is_correct: isCorrect,
        score,
      }
    })

    // Met à jour les statistiques des citations auxquelles le joueur a répondu.
    for (const answer of corrections) {

      // Retrouve la citation depuis la partie enregistrée côté serveur.
      const question = questions.get(answer.question_id)
      const quoteId = question.quote.ID_quote

      await connection.query(
        `UPDATE quotes
     SET
       times_asked = times_asked + 1,
       correct_count = correct_count + ?,
       incorrect_count = incorrect_count + ?
     WHERE ID_quote = ?`,
        [
          answer.is_correct ? 1 : 0,
          answer.is_correct ? 0 : 1,
          quoteId,
        ]
      )
    }

    const correctCount = corrections.filter((question) => question.is_correct).length
    const totalScore = corrections.reduce((total, question) => total + question.score, 0)

    const awardedScore = Number(game.game_ranked) === 1
      ? totalScore
      : 0

    // Conserve games pour les consommateurs du premier contrat.
    // Ajoute le format de finishGame pour que le frontend affiche le résultat.
    const gameResult = {
      ...correction,
      game_id: game.game_id,
      summary: {
        correct_answers: correctCount,
        question_count: corrections.length,
        score: totalScore,
        awarded_score: awardedScore,
      },
      corrections,
    }

    if (Number(game.game_ranked) === 1) {
      const [result] = await connection.query(
        'UPDATE users SET user_score = user_score + ? WHERE ID_user = ?',
        [awardedScore, game.ID_user]
      )

      if (result.affectedRows === 0) {
        throw createError({
          statusCode: 401,
          statusMessage: 'Compte introuvable',
        })
      }

      // Utilise le score actualisé et la transaction déjà ouverte.
      await unlockAvailableHats(connection, game.ID_user)
    }

    await connection.query(
      `UPDATE game_sessions
       SET game_answers = ?, game_correct_count = ?, game_awarded_score = ?, game_result = ?,
           game_completed_at = UTC_TIMESTAMP()
       WHERE game_id = ?`,
      [JSON.stringify(answers), correctCount, awardedScore, JSON.stringify(gameResult), game.game_id]
    )

    await connection.commit()
    transactionStarted = false

    return gameResult
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback()
    }

    throw error
  } finally {
    await connection.end()
  }
})
