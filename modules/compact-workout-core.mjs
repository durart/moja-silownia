// Pure presentation-state helpers. Workout records are never modified here.
export const isComplete = card => card.total > 0 && card.done === card.total;
export function resolveOpenCard(cards, selected, previous, initialized) {
  const firstIncomplete = cards.find(card => !isComplete(card))?.key ?? null;
  if (!initialized) return firstIncomplete;
  if (selected === null) return null;
  const index = cards.findIndex(card => card.key === selected);
  if (index < 0) return firstIncomplete;
  const current = cards[index], before = previous.get(selected);
  if (before && !isComplete(before) && isComplete(current) && current.done > before.done) {
    const candidates = [...cards.slice(index + 1), ...cards.slice(0,index)];
    return candidates.find(card => !isComplete(card))?.key ?? null;
  }
  return selected;
}
export function restoreSelection(raw, session) {
  try {
    const value = JSON.parse(raw);
    if (value?.session === session && (value.open === null || typeof value.open === 'string'))
      return { initialized: true, open: value.open };
  } catch {}
  return { initialized: false, open: null };
}
export function extendDeadline(deadline, now, seconds = 15) {
  return Number.isFinite(deadline) && deadline > now ? deadline + seconds * 1000 : null;
}
