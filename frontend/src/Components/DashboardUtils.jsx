/**
 * Shared dashboard utility components:
 * - ChartTooltip: custom dark tooltip for Recharts
 * - CalendarHeatmap: git-style activity heatmap
 * - SparkBadge: small status badge
 * - StatRing: SVG circular progress ring
 */

// ─── Recharts dark tooltip ────────────────────────────────────────────────────
export const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-2 backdrop-blur-xl border border-line rounded-xl px-3 py-2 shadow-2xl">
      {label !== undefined && label !== null && (
        <p className="text-[11px] text-ink-soft mb-1.5">{label}</p>
      )}
      {payload.map((p, i) => (
        <p key={i} className="text-xs font-semibold" style={{ color: p.color || p.fill || '#0b1220' }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  );
};

// ─── Calendar Heatmap ────────────────────────────────────────────────────────
/**
 * @param {Object} data  - { 'YYYY-MM-DD': count }
 * @param {string} color - hex color string, e.g. '#ef4444'
 * @param {number} weeks - number of weeks to display (default 12)
 */
export const CalendarHeatmap = ({ data = {}, color = '#6366f1', weeks = 12 }) => {
  const totalDays = weeks * 7;
  const days = Array.from({ length: totalDays }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (totalDays - 1 - i));
    const key = date.toISOString().split('T')[0];
    return { date, key, val: data[key] || 0 };
  });

  const maxVal = Math.max(...days.map(d => d.val), 1);

  // Parse hex -> rgb
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className="flex gap-0.5">
      {/* Day labels */}
      <div className="flex flex-col gap-0.5 mr-1 justify-around">
        {DAYS.map((d, i) => (
          <span key={i} className="text-[9px] text-ink-faint h-3 flex items-center">{d}</span>
        ))}
      </div>

      {/* Heatmap grid */}
      {Array.from({ length: weeks }, (_, w) => (
        <div key={w} className="flex flex-col gap-0.5">
          {days.slice(w * 7, w * 7 + 7).map((d, i) => {
            const opacity = d.val > 0 ? 0.18 + (d.val / maxVal) * 0.82 : 0.07;
            return (
              <div
                key={i}
                className="w-3 h-3 rounded-[2px] transition-all hover:scale-125"
                style={{ backgroundColor: `rgba(${r},${g},${b},${opacity})` }}
                title={`${d.key}: ${d.val} events`}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
};

// ─── SVG Stat Ring ────────────────────────────────────────────────────────────
/**
 * @param {number} value    - 0-100
 * @param {string} color    - stroke color
 * @param {string|number} label - center text
 * @param {string} subLabel - small text below
 * @param {number} size     - px size of the ring (default 64)
 */
export const StatRing = ({ value = 0, color = '#6366f1', label, subLabel, size = 64 }) => {
  const r = size * 0.38;
  const circ = 2 * Math.PI * r;
  const dash = Math.max(0, (value / 100)) * circ;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          viewBox={`0 0 ${size} ${size}`}
          width={size}
          height={size}
          style={{ transform: 'rotate(-90deg)' }}
        >
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke="#e6eaf2" strokeWidth={size * 0.07}
          />
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke={color} strokeWidth={size * 0.07}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            style={{ transition: 'stroke-dasharray 1.2s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs font-black" style={{ color }}>{label ?? `${value}%`}</span>
        </div>
      </div>
      {subLabel && <span className="text-[10px] text-ink0 text-center">{subLabel}</span>}
    </div>
  );
};

// ─── Spark Badge ──────────────────────────────────────────────────────────────
export const SparkBadge = ({ label, color = '#6366f1', pulse = false }) => (
  <div
    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-semibold"
    style={{
      backgroundColor: `${color}18`,
      borderColor: `${color}40`,
      color,
    }}
  >
    <div
      className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${pulse ? 'animate-pulse' : ''}`}
      style={{ backgroundColor: color }}
    />
    {label}
  </div>
);
