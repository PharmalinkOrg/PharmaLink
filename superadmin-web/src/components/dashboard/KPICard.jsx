// File: superadmin-web/src/components/dashboard/KPICard.jsx

import styles from './Dashboard.module.css'

/**
 * KPICard Component
 *
 * Props:
 * - icon: Icon component from lucide-react
 * - label: Card label
 * - value: Current metric value
 * - changePercent: Percentage change
 * - trend: 'up' | 'down' | 'flat'
 * - accentColor: 'green' | 'blue' | 'orange' | 'red'
 */
export function KPICard({
  icon: Icon,
  label,
  value,
  changePercent = 0,
  trend = 'flat',
  accentColor = 'blue'
}) {
  const trendIcon =
    trend === 'up' ? '↑' :
    trend === 'down' ? '↓' :
    '→'

  const trendClass =
    trend === 'up' ? 'up' :
    trend === 'down' ? 'down' :
    'flat'

  return (
    <div className={`${styles.kpiCard} ${styles[accentColor]}`}>
      <div className={styles.kpiHeader}>
        <div className={styles.kpiIconWrapper}>
          {Icon && <Icon size={24} />}
        </div>

        <span className={`${styles.kpiTrend} ${styles[trendClass]}`}>
          {trendIcon}
          {Math.abs(changePercent)}%
        </span>
      </div>

      <div className={styles.kpiContent}>
        <p className={styles.kpiLabel}>{label}</p>
        <p className={styles.kpiValue}>
          {Number(value).toLocaleString()}
        </p>
      </div>
    </div>
  )
}