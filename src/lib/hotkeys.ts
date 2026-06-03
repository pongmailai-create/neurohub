// Преобразование события клавиатуры в строку-комбинацию вида "Ctrl+Shift+K".
export function comboFromEvent(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey) parts.push('Ctrl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');
  if (e.metaKey) parts.push('Meta');
  let key = e.key;
  if (key === ' ') key = 'Space';
  // Модификаторы сами по себе — не комбинация.
  if (['Control', 'Alt', 'Shift', 'Meta'].includes(key)) return parts.join('+');
  if (key.length === 1) key = key.toUpperCase();
  parts.push(key);
  return parts.join('+');
}

// Считается ли комбинация «полной» (есть основная клавиша, не только модификаторы).
export function isCompleteCombo(combo: string): boolean {
  const last = combo.split('+').pop() ?? '';
  return last !== '' && !['Ctrl', 'Alt', 'Shift', 'Meta'].includes(last);
}
