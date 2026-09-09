/**
 * RiskArc — the signature visual element of Aegis AI.
 * An SVG arc gauge showing risk score 0–100.
 * size: 'sm' | 'md' | 'lg'
 */

const COLORS = {
  crit: '#FF3B5C',
  high: '#FF8A00',
  med:  '#F5CC00',
  low:  '#00D48A',
}

const GLOW = {
  crit: 'arc-crit',
  high: 'arc-high',
  med:  'arc-med',
  low:  'arc-low',
}

export function riskLevel(score) {
  if (score >= 75) return 'crit'
  if (score >= 50) return 'high'
  if (score >= 25) return 'med'
  return 'low'
}

export function riskLabel(score) {
  if (score >= 75) return 'Critical'
  if (score >= 50) return 'High'
  if (score >= 25) return 'Medium'
  return 'Low'
}

const SIZES = {
  sm: { r: 22, stroke: 4,   w: 56,  textSize: 11, labelSize: 8  },
  md: { r: 36, stroke: 5,   w: 88,  textSize: 16, labelSize: 10 },
  lg: { r: 56, stroke: 6.5, w: 130, textSize: 24, labelSize: 12 },
}

export default function RiskArc({ score = 0, size = 'md', showLabel = true }) {
  const { r, stroke, w, textSize, labelSize } = SIZES[size]
  const level  = riskLevel(score)
  const color  = COLORS[level]
  const glow   = GLOW[level]
  const cx     = w / 2
  const cy     = w / 2

  // Arc: 225° span starting from bottom-left (225° from 3 o'clock)
  const startAngle = 225  // degrees (clockwise from right)
  const totalArc   = 270  // degrees of full arc
  const filled     = (score / 100) * totalArc

  function polarToCart(angle, radius) {
    const rad = ((angle - 90) * Math.PI) / 180
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) }
  }

  function arcPath(startDeg, endDeg, rad) {
    const s    = polarToCart(startDeg, rad)
    const e    = polarToCart(endDeg,   rad)
    const large = endDeg - startDeg > 180 ? 1 : 0
    return `M ${s.x} ${s.y} A ${rad} ${rad} 0 ${large} 1 ${e.x} ${e.y}`
  }

  const start = 135   // 225° from top = 135° in SVG (top = 0, clockwise)
  const end   = 405   // start + 270
  const filledEnd = start + filled

  return (
    <svg width={w} height={w} viewBox={`0 0 ${w} ${w}`} aria-label={`Risk score ${score}`}>
      {/* Track */}
      <path
        d={arcPath(start, end, r)}
        fill="none"
        stroke="#1E2F45"
        strokeWidth={stroke}
        strokeLinecap="round"
      />
      {/* Filled arc */}
      {score > 0 && (
        <path
          d={arcPath(start, filledEnd, r)}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          className={glow}
        />
      )}
      {/* Score number */}
      <text
        x={cx}
        y={cy + 4}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={color}
        fontSize={textSize}
        fontWeight="700"
        fontFamily="'Space Grotesk', sans-serif"
      >
        {score}
      </text>
      {/* Label */}
      {showLabel && (
        <text
          x={cx}
          y={cy + textSize / 2 + 10}
          textAnchor="middle"
          fill="#4A6480"
          fontSize={labelSize}
          fontWeight="500"
          fontFamily="'Inter', sans-serif"
        >
          {riskLabel(score)}
        </text>
      )}
    </svg>
  )
}
