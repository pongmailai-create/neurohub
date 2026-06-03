import { useCallback, useEffect, useState } from 'react';
import { CopyBtn } from '../components/Section';
import { useT } from '../i18n';

const SETS = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.<>/?',
};

export function PasswordGenerator() {
  const tr = useT();
  const [length, setLength] = useState(20);
  const [opts, setOpts] = useState({ lower: true, upper: true, digits: true, symbols: true });
  const [pwd, setPwd] = useState('');

  const generate = useCallback(() => {
    const pool = (Object.keys(SETS) as (keyof typeof SETS)[])
      .filter((k) => opts[k])
      .map((k) => SETS[k])
      .join('');
    if (!pool) return setPwd('');
    const bytes = new Uint32Array(length);
    crypto.getRandomValues(bytes);
    let out = '';
    for (let i = 0; i < length; i++) out += pool[bytes[i] % pool.length];
    setPwd(out);
  }, [length, opts]);

  useEffect(() => {
    generate();
  }, [generate]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          readOnly
          className="input font-mono text-xs"
          value={pwd}
          placeholder={tr('pg.empty')}
        />
        <CopyBtn value={pwd} />
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className="muted">{tr('pg.length')} {length}</span>
        <input
          type="range"
          min={6}
          max={64}
          value={length}
          onChange={(e) => setLength(Number(e.target.value))}
          className="flex-1"
        />
      </div>
      <div className="flex flex-wrap gap-3 text-xs">
        {(Object.keys(SETS) as (keyof typeof SETS)[]).map((k) => (
          <label key={k} className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={opts[k]}
              onChange={() => setOpts((o) => ({ ...o, [k]: !o[k] }))}
            />
            {tr(`pg.${k}`)}
          </label>
        ))}
        <button className="btn ml-auto" onClick={generate}>
          {tr('pg.regen')}
        </button>
      </div>
    </div>
  );
}
