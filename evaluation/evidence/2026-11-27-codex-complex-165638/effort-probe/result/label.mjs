export function label(value) {
  if (typeof value !== 'string') {
    return 'untitled';
  }

  return value.trim() || 'untitled';
}
