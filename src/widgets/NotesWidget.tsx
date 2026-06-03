import { usePersisted } from '../lib/usePersisted';
import { useT } from '../i18n';

export function NotesWidget() {
  const t = useT();
  const [notes, setNotes] = usePersisted('widget.notes', '');
  return (
    <div className="space-y-2">
      <textarea
        className="input h-40 resize-none font-mono text-xs leading-relaxed"
        placeholder={t('notes.ph')}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <p className="muted text-[10px]">{t('notes.saved')} · {notes.length} {t('notes.chars')}</p>
    </div>
  );
}
