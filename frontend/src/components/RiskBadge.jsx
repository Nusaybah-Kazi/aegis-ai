import { riskLevel, riskLabel } from './RiskArc'

const STYLES = {
  crit: 'bg-crit/10 text-crit border border-crit/20',
  high: 'bg-high/10 text-high border border-high/20',
  med:  'bg-med/10  text-med  border border-med/20',
  low:  'bg-low/10  text-low  border border-low/20',
}

const DOTS = {
  crit: 'bg-crit',
  high: 'bg-high',
  med:  'bg-med',
  low:  'bg-low',
}

export default function RiskBadge({ score, showScore = true }) {
  const level = riskLevel(score)
  return (
    <span className={`badge gap-1.5 ${STYLES[level]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${DOTS[level]}`} />
      {showScore ? score : riskLabel(score)}
    </span>
  )
}
