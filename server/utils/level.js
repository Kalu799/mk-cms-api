export const getLevelFromScore = (score) => {
  // MySQL peut renvoyer un BIGINT sous forme de chaîne.
  if (
    typeof score !== 'number' &&
    !(typeof score === 'string' && /^\d+$/.test(score))
  ) {
    throw new TypeError('Le score doit être un entier positif ou nul')
  }

  const totalXp = Number(score)

  if (!Number.isSafeInteger(totalXp) || totalXp < 0) {
    throw new RangeError('Score négatif ou hors de la précision autorisée')
  }

  let level = 1
  let remainingXp = totalXp
  let requiredXp = 1000

  while (remainingXp >= requiredXp) {
    remainingXp -= requiredXp
    level += 1
    requiredXp += 500
  }

  return level
}