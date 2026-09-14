// File: superadmin-web/src/pages/DashboardPage.jsx

import { MetricsGrid } from '../components/dashboard/MetricsGrid'
import { RevenueChart } from '../components/dashboard/RevenueChart'
import { ActivityFeed } from '../components/dashboard/ActivityFeed'
import styles from '../components/dashboard/Dashboard.module.css'

function DashboardPage() {
  return (
    <section className={styles.dashboard}>
      {/* Dashboard Header */}
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Dashboard Overview</h1>
          <p className={styles.pageCopy}>
            System status and key metrics
          </p>
        </div>
      </header>

      <main className={styles.dashboardContent}>
        {/* PharmaLink Heading */}
        <h2 className={styles.brandTitle}>PharmaLink</h2>

        {/* KPI Cards */}
        <MetricsGrid />

        {/* Revenue + Activity */}
        <section className={styles.analyticsGrid}>
          <RevenueChart />
          <ActivityFeed />
        </section>
      </main>
    </section>
  )
}

export default DashboardPage