// File: superadmin-web/src/components/dashboard/RevenueChart.jsx

import { useEffect, useRef } from 'react'
import Chart from 'chart.js/auto'
import styles from './Dashboard.module.css'

function generateMockRevenueData() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const revenues = [5000, 2000, 3900, 1200, 2500, 7800, 4500]

  // Create alternating colors using #508991 and #74B3CE
  const backgroundColors = revenues.map((_, index) => 
    index % 2 === 0 ? 'rgba(80, 137, 145, 0.8)' : 'rgba(116, 179, 206, 0.8)'
  )
  
  const hoverColors = revenues.map((_, index) => 
    index % 2 === 0 ? 'rgba(80, 137, 145, 1)' : 'rgba(116, 179, 206, 1)'
  )

  return {
    labels: days,
    datasets: [
      {
        label: 'Daily Revenue',
        data: revenues,
        backgroundColor: backgroundColors,
        borderColor: 'transparent',
        borderWidth: 0,
        borderRadius: 4,
        borderSkipped: false,
        hoverBackgroundColor: hoverColors
      }
    ]
  }
}

export function RevenueChart() {
  const chartRef = useRef(null)
  const chartInstanceRef = useRef(null)

  useEffect(() => {
    if (!chartRef.current) return

    const ctx = chartRef.current.getContext('2d')

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy()
    }

    chartInstanceRef.current = new Chart(ctx, {
      type: 'bar',
      data: generateMockRevenueData(),
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'x',

        plugins: {
          legend: {
            display: false
          },
          title: {
            display: false
          }
        },

        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback(value) {
                return '₱' + Number(value).toLocaleString()
              },
              font: {
                size: 12
              }
            },
            grid: {
              drawBorder: false,
              color: 'rgba(0, 0, 0, 0.05)'
            }
          },

          x: {
            grid: {
              display: false
            },
            ticks: {
              font: {
                size: 12
              }
            }
          }
        }
      }
    })

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy()
        chartInstanceRef.current = null
      }
    }
  }, [])

  return (
    <div className={styles.revenueContainer}>
      <div className={styles.revenueHeader}>
        <h3 className={styles.revenueTitle}>
          Platform Revenue
        </h3>

        <select className={styles.periodSelect}>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>

      <div className={styles.chartWrapper}>
        <canvas ref={chartRef} />
      </div>
    </div>
  )
}