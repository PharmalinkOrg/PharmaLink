import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../components/auth/useAuth';
import { apiRequest } from '../lib/api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// ----- helper: chart colour palette -----
const CHART_COLORS = {
  inventory: {
    total: '#1a6e5c',
    low: '#b45309',
    out: '#b91c1c',
  },
  reservations: {
    pending: '#b45309',
    confirmed: '#166534',
    completed: '#17634f',
  },
};

function DashboardPage() {
  const { accessToken, user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // ----- fetch data -----
  useEffect(() => {
    let isCurrent = true;

    setIsLoading(true);
    setError('');

    apiRequest(`/dashboard/${user.pharmacy_id}`, {
      token: accessToken,
    })
      .then((response) => {
        if (isCurrent) {
          setDashboard(response.data);
        }
      })
      .catch((requestError) => {
        if (isCurrent) {
          setError(requestError.message || 'Failed to load dashboard');
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [accessToken, user.pharmacy_id]);

  // ----- prepare chart data -----
  const inventoryChartData = useMemo(() => {
    if (!dashboard) return null;
    return {
      labels: ['Total Inventory', 'Low Stock', 'Out of Stock'],
      datasets: [
        {
          label: 'Count',
          data: [
            dashboard.totalInventory || 0,
            dashboard.lowStock || 0,
            dashboard.outOfStock || 0,
          ],
          backgroundColor: [
            CHART_COLORS.inventory.total,
            CHART_COLORS.inventory.low,
            CHART_COLORS.inventory.out,
          ],
          borderRadius: 6,
        },
      ],
    };
  }, [dashboard]);

  const reservationsChartData = useMemo(() => {
    if (!dashboard) return null;
    return {
      labels: ['Pending', 'Confirmed', 'Completed'],
      datasets: [
        {
          label: 'Reservations',
          data: [
            dashboard.pendingReservations || 0,
            dashboard.confirmedReservations || 0,
            dashboard.completedReservations || 0,
          ],
          backgroundColor: [
            CHART_COLORS.reservations.pending,
            CHART_COLORS.reservations.confirmed,
            CHART_COLORS.reservations.completed,
          ],
          borderColor: '#ffffff',
          borderWidth: 2,
        },
      ],
    };
  }, [dashboard]);

  // ----- summary cards data -----
  const summaryCards = useMemo(() => {
    if (!dashboard) return [];
    return [
      { label: 'Total Medicines', value: dashboard.totalMedicines || 0 },
      { label: 'Total Inventory', value: dashboard.totalInventory || 0 },
      { label: 'Low Stock', value: dashboard.lowStock || 0 },
      { label: 'Out of Stock', value: dashboard.outOfStock || 0 },
      { label: 'Pending Reservations', value: dashboard.pendingReservations || 0 },
      { label: 'Confirmed Reservations', value: dashboard.confirmedReservations || 0 },
      { label: 'Completed Reservations', value: dashboard.completedReservations || 0 },
    ];
  }, [dashboard]);

  // ----- loading / error states -----
  if (isLoading) {
    return (
      <section className="dashboard-page">
        <div className="page-heading">
          <span className="eyebrow">Pharmacy Overview</span>
          <h2 className="page-title">Dashboard</h2>
          <p className="page-copy">Loading dashboard data…</p>
        </div>
      </section>
    );
  }

  return (
    <section className="dashboard-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Pharmacy Overview</span>
          <h2 className="page-title">Dashboard</h2>
          <p className="page-copy">
            Monitor your pharmacy inventory and customer reservations.
          </p>
        </div>
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {dashboard && (
        <>
          {/* ----- Summary Cards ----- */}
          <div className="dashboard-summary-grid">
            {summaryCards.map((card) => (
              <div className="dashboard-summary-card" key={card.label}>
                <span>{card.label}</span>
                <strong>{card.value}</strong>
              </div>
            ))}
          </div>

          {/* ----- Charts Section ----- */}
          <div className="dashboard-charts-grid">
            {/* Inventory Bar Chart */}
            <div className="dashboard-chart-card">
              <h4>Inventory Overview</h4>
              {inventoryChartData ? (
                <Bar
                  data={inventoryChartData}
                  options={{
                    indexAxis: 'y', // horizontal bar
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          label: (context) => `${context.parsed.x} items`,
                        },
                      },
                    },
                    scales: {
                      x: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.05)' },
                      },
                      y: {
                        grid: { display: false },
                      },
                    },
                  }}
                  height={200}
                />
              ) : (
                <p className="dashboard-chart-placeholder">No inventory data</p>
              )}
            </div>

            {/* Reservations Doughnut Chart */}
            <div className="dashboard-chart-card">
              <h4>Reservations Breakdown</h4>
              {reservationsChartData ? (
                <Doughnut
                  data={reservationsChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: {
                          padding: 16,
                          usePointStyle: true,
                          pointStyle: 'circle',
                        },
                      },
                    },
                    cutout: '70%',
                  }}
                  height={200}
                />
              ) : (
                <p className="dashboard-chart-placeholder">No reservation data</p>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

export default DashboardPage;