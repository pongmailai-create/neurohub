import { useEffect, useRef, useState } from 'react';
import { useT } from '../i18n';

// Криптовалюты: символ → id в CoinGecko.
const CRYPTO: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  USDT: 'tether',
  USDC: 'usd-coin',
  BNB: 'binancecoin',
  SOL: 'solana',
  XRP: 'ripple',
  TON: 'the-open-network',
  DOGE: 'dogecoin',
  ADA: 'cardano',
  TRX: 'tron',
};
const ID_TO_SYM: Record<string, string> = Object.fromEntries(
  Object.entries(CRYPTO).map(([s, id]) => [id, s]),
);
const CRYPTO_SYMS = Object.keys(CRYPTO);
const COMMON_FIAT = ['RUB', 'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'KZT', 'TRY', 'UAH'];
const VS_SUPPORTED = new Set([
  'usd', 'eur', 'rub', 'gbp', 'jpy', 'cny', 'try', 'uah', 'aud', 'cad', 'chf', 'inr', 'brl', 'krw',
]);

const isCrypto = (s: string) => s in CRYPTO;

type Period = 'h1' | 'd1' | 'y1';
type Point = { t: number; v: number };

// Кэш серий, чтобы не дёргать CoinGecko при каждом переключении (его лимиты → 429).
const seriesCache = new Map<string, { at: number; data: Point[] }>();
const CACHE_TTL = 90_000;

export function CurrencyConverter() {
  const tr = useT();
  const [fiat, setFiat] = useState<Record<string, number>>({});
  const [cryptoUsd, setCryptoUsd] = useState<Record<string, number>>({});
  const [from, setFrom] = useState('BTC');
  const [to, setTo] = useState('RUB');
  const [amount, setAmount] = useState(1);
  const [status, setStatus] = useState<{ code: string; extra?: string }>({ code: 'cur.loading' });

  const [period, setPeriod] = useState<Period>('d1');
  const [pts, setPts] = useState<Point[] | null>(null);
  const [chartNA, setChartNA] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const chartReq = useRef(0);

  // Курсы — при каждом открытии приложения.
  useEffect(() => {
    let alive = true;
    setStatus({ code: 'cur.loading' });
    const ids = Object.values(CRYPTO).join(',');
    Promise.all([
      fetch('https://open.er-api.com/v6/latest/USD').then((r) => r.json()),
      fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`).then((r) => r.json()).catch(() => ({})),
    ])
      .then(([fx, cg]) => {
        if (!alive) return;
        if (fx?.result === 'success') setFiat(fx.rates);
        const cu: Record<string, number> = {};
        for (const [id, sym] of Object.entries(ID_TO_SYM)) if (cg?.[id]?.usd) cu[sym] = cg[id].usd;
        setCryptoUsd(cu);
        setStatus(fx?.result === 'success'
          ? { code: 'cur.updated', extra: fx.time_last_update_utc?.slice(5, 16) ?? '' }
          : { code: 'cur.failed' });
      })
      .catch((e) => alive && setStatus({ code: 'cur.failed', extra: e.message }));
    return () => { alive = false; };
  }, []);

  const toUsd = (sym: string, amt: number): number | null => {
    if (isCrypto(sym)) return cryptoUsd[sym] ? amt * cryptoUsd[sym] : null;
    return fiat[sym] ? amt / fiat[sym] : null;
  };
  const fromUsd = (sym: string, u: number): number | null => {
    if (isCrypto(sym)) return cryptoUsd[sym] ? u / cryptoUsd[sym] : null;
    return fiat[sym] ? u * fiat[sym] : null;
  };

  const usd = toUsd(from, amount);
  const out = usd != null ? fromUsd(to, usd) : null;
  const rateUsd = toUsd(from, 1);
  const rate = rateUsd != null ? fromUsd(to, rateUsd) : null;

  const fmt = (n: number) =>
    n >= 1000 ? n.toLocaleString('ru-RU', { maximumFractionDigits: 2 })
      : n >= 1 ? n.toFixed(2) : n.toPrecision(4);

  // Серия «1 from = ? to» за период. С кэшем и дебаунсом — чтобы при частом
  // переключении не упираться в лимиты CoinGecko (тогда график «отваливался»).
  useEffect(() => {
    const req = ++chartReq.current;
    setHover(null);
    const fromC = isCrypto(from);
    const toC = isCrypto(to);
    if (!fromC && !toC) { setPts(null); setChartNA(true); return; }
    const cryptoSym = fromC ? from : to;
    const fiatSym = fromC ? to : from;
    const invert = !fromC;
    const vs = !isCrypto(fiatSym) && VS_SUPPORTED.has(fiatSym.toLowerCase()) ? fiatSym.toLowerCase() : 'usd';
    const days = period === 'y1' ? 365 : 1;
    const key = `${cryptoSym}|${vs}|${days}|${invert}`;

    // Свежий кэш — показываем мгновенно, без запроса.
    const cached = seriesCache.get(key);
    if (cached && Date.now() - cached.at < CACHE_TTL) {
      setPts(cached.data);
      setChartNA(cached.data.length < 2);
      return;
    }

    setPts(null);
    setChartNA(false);
    const timer = setTimeout(() => {
      fetch(`https://api.coingecko.com/api/v3/coins/${CRYPTO[cryptoSym]}/market_chart?vs_currency=${vs}&days=${days}`)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((j) => {
          if (req !== chartReq.current) return;
          let arr: Point[] = (j?.prices ?? []).map((p: [number, number]) => ({ t: p[0], v: p[1] }));
          if (period === 'h1') arr = arr.slice(-13);
          if (invert) arr = arr.map((p) => ({ t: p.t, v: p.v ? 1 / p.v : 0 }));
          if (arr.length < 2) { setChartNA(true); return; }
          seriesCache.set(key, { at: Date.now(), data: arr });
          setPts(arr);
        })
        .catch(() => {
          if (req !== chartReq.current) return;
          // При сбое/лимите показываем последний кэш, иначе — недоступно.
          if (cached) { setPts(cached.data); setChartNA(false); }
          else setChartNA(true);
        });
    }, 350);
    return () => clearTimeout(timer);
  }, [from, to, period, cryptoUsd, fiat]);

  const swap = () => { setFrom(to); setTo(from); };
  const statusText = `${tr(status.code)}${status.extra ? ' ' + status.extra : ''}`;

  const Select = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <select className="input py-1 w-28" value={value} onChange={(e) => onChange(e.target.value)}>
      <optgroup label="Crypto">{CRYPTO_SYMS.map((c) => <option key={c} value={c}>{c}</option>)}</optgroup>
      <optgroup label="Fiat">{[...new Set([...COMMON_FIAT, ...Object.keys(fiat)])].map((c) => <option key={c} value={c}>{c}</option>)}</optgroup>
    </select>
  );

  // Геометрия минималистичного графика.
  const W = 300, H = 150;
  const chart = (() => {
    if (!pts || pts.length < 2) return null;
    const vs = pts.map((p) => p.v);
    const min = Math.min(...vs), max = Math.max(...vs);
    const span = max - min || 1;
    const x = (i: number) => (i / (pts.length - 1)) * W;
    const y = (v: number) => H - ((v - min) / span) * (H - 8) - 4;
    const line = pts.map((p, i) => `${x(i)},${y(p.v)}`).join(' ');
    const area = `0,${H} ${line} ${W},${H}`;
    const changePct = pts[0].v ? ((pts[pts.length - 1].v - pts[0].v) / pts[0].v) * 100 : 0;
    return { x, y, line, area, up: changePct >= 0, changePct, min, max };
  })();

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!pts) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - rect.left) / rect.width;
    setHover(Math.max(0, Math.min(pts.length - 1, Math.round(rel * (pts.length - 1)))));
  };

  const hp = hover != null && pts ? pts[hover] : null;
  const hoverTime = hp
    ? new Date(hp.t).toLocaleString('ru-RU', period === 'y1'
      ? { day: '2-digit', month: '2-digit', year: '2-digit' }
      : { hour: '2-digit', minute: '2-digit' })
    : '';

  const periods: Period[] = ['h1', 'd1', 'y1'];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input type="number" className="input py-1 w-24" value={amount} onChange={(e) => setAmount(Number(e.target.value) || 0)} />
        <Select value={from} onChange={setFrom} />
        <button className="btn px-2 py-1" title={tr('cur.swap')} onClick={swap}>⇅</button>
        <Select value={to} onChange={setTo} />
      </div>

      <div className="text-lg font-mono">
        {out != null ? fmt(out) : '—'} <span className="muted text-sm">{to}</span>
      </div>
      <p className="muted text-[10px]">
        {rate != null ? `1 ${from} = ${fmt(rate)} ${to}` : ''} · {statusText}
      </p>

      <div className="flex items-center gap-1">
        {periods.map((p) => (
          <button key={p} className={`btn px-2 py-0.5 text-[11px] ${period === p ? 'btn-accent' : ''}`} onClick={() => setPeriod(p)}>
            {tr(`cur.${p}`)}
          </button>
        ))}
        {chart && (
          <span className="text-[11px] ml-auto font-mono" style={{ color: chart.up ? 'var(--ok)' : 'var(--err)' }}>
            {chart.up ? '▲' : '▼'} {Math.abs(chart.changePct).toFixed(2)}%
          </span>
        )}
      </div>

      <div className="relative">
        {chartNA ? (
          <div className="h-[150px] flex items-center justify-center muted text-[10px]">{tr('cur.chartNA')}</div>
        ) : chart ? (
          <>
            <svg
              viewBox={`0 0 ${W} ${H}`}
              width="100%"
              height={H}
              preserveAspectRatio="none"
              onMouseMove={onMove}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: 'crosshair', display: 'block' }}
            >
              <defs>
                <linearGradient id="cur-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chart.up ? 'var(--ok)' : 'var(--err)'} stopOpacity="0.28" />
                  <stop offset="100%" stopColor={chart.up ? 'var(--ok)' : 'var(--err)'} stopOpacity="0" />
                </linearGradient>
              </defs>
              <polygon points={chart.area} fill="url(#cur-fill)" />
              <polyline points={chart.line} fill="none" stroke={chart.up ? 'var(--ok)' : 'var(--err)'} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
              {hover != null && hp && (
                <>
                  <line x1={chart.x(hover)} y1="0" x2={chart.x(hover)} y2={H} stroke="var(--muted)" strokeWidth="1" vectorEffect="non-scaling-stroke" strokeDasharray="3 3" />
                  <circle cx={chart.x(hover)} cy={chart.y(hp.v)} r="3" fill={chart.up ? 'var(--ok)' : 'var(--err)'} stroke="var(--bg)" strokeWidth="1" />
                </>
              )}
            </svg>
            {hover != null && hp && (
              <div
                className="absolute -top-1 px-2 py-1 rounded panel text-[11px] font-mono pointer-events-none whitespace-nowrap"
                style={{
                  left: `${(hover / (pts!.length - 1)) * 100}%`,
                  transform: `translateX(${hover < pts!.length / 2 ? '8px' : 'calc(-100% - 8px)'})`,
                }}
              >
                <div className="font-semibold">{fmt(hp.v)} {to}</div>
                <div className="muted">{hoverTime}</div>
              </div>
            )}
          </>
        ) : (
          <div className="h-[150px] flex items-center justify-center"><span className="spinner" /></div>
        )}
      </div>
    </div>
  );
}
