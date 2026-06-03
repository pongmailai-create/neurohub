import { useState } from 'react';
import { usePersisted } from '../lib/usePersisted';
import { CopyBtn } from '../components/Section';
import { useT } from '../i18n';

interface Prompt {
  id: string;
  title: string;
  text: string;
}

/** Библиотека сохранённых промптов с быстрым копированием/вставкой. */
export function PromptManager() {
  const tr = useT();
  const [prompts, setPrompts] = usePersisted<Prompt[]>('widget.prompts', []);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [editing, setEditing] = useState<string | null>(null);

  const save = () => {
    const t = text.trim();
    if (!t) return;
    const name = title.trim() || t.slice(0, 30);
    if (editing) {
      setPrompts(prompts.map((p) => (p.id === editing ? { ...p, title: name, text: t } : p)));
      setEditing(null);
    } else {
      setPrompts([{ id: crypto.randomUUID(), title: name, text: t }, ...prompts]);
    }
    setTitle('');
    setText('');
  };

  const edit = (p: Prompt) => {
    setEditing(p.id);
    setTitle(p.title);
    setText(p.text);
  };

  return (
    <div className="space-y-2">
      <input
        className="input py-1 text-xs"
        placeholder={tr('pm.name')}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        className="input h-20 resize-none text-xs"
        placeholder={tr('pm.text')}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="flex gap-2">
        <button className="btn btn-accent text-xs" onClick={save}>
          {editing ? tr('c.save') : tr('pm.add')}
        </button>
        {editing && (
          <button
            className="btn text-xs"
            onClick={() => {
              setEditing(null);
              setTitle('');
              setText('');
            }}
          >
            {tr('c.cancel')}
          </button>
        )}
      </div>
      <ul className="space-y-1 max-h-56 overflow-auto">
        {prompts.map((p) => (
          <li key={p.id} className="panel-2 rounded px-2 py-1 text-xs group">
            <div className="flex items-center gap-2">
              <span className="flex-1 truncate font-medium" title={p.text}>
                {p.title}
              </span>
              <CopyBtn value={p.text} label="⧉" />
              <button className="opacity-0 group-hover:opacity-100 muted" onClick={() => edit(p)}>
                ✎
              </button>
              <button
                className="opacity-0 group-hover:opacity-100 muted"
                onClick={() => setPrompts(prompts.filter((x) => x.id !== p.id))}
              >
                ✕
              </button>
            </div>
          </li>
        ))}
        {prompts.length === 0 && <li className="muted text-xs">{tr('pm.empty')}</li>}
      </ul>
    </div>
  );
}
