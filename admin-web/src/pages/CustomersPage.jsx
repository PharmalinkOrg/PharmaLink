import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../components/auth/useAuth';
import { apiRequest } from '../lib/api';

function formatDate(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getCustomerName(customer) {
  const fullName = [customer?.first_name, customer?.last_name]
    .filter(Boolean)
    .join(' ')
    .trim();
  return fullName || 'Unnamed Customer';
}

function CustomersPage() {
  // ✅ Use the auth hook – same as ReservationsPage
  const { accessToken } = useAuth();

  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    let isCurrent = true;

    if (!accessToken) {
      setError('Your session has expired. Please sign in again.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    apiRequest('/reservations/pharmacy', {
      token: accessToken, // same as ReservationsPage
    })
      .then((response) => {
        if (isCurrent) {
          setReservations(response.data || []);
        }
      })
      .catch((err) => {
        if (isCurrent) {
          console.error('Failed to load pharmacy customers:', err);
          setError(err.message || 'Failed to load customers.');
        }
      })
      .finally(() => {
        if (isCurrent) {
          setLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [accessToken]); // re‑fetch when token changes

  // Build unique customer list from reservations
  const customers = useMemo(() => {
    const customerMap = new Map();

    for (const reservation of reservations) {
      const customer = reservation.users;
      if (!customer?.user_id) continue;

      const customerId = customer.user_id;
      if (!customerMap.has(customerId)) {
        customerMap.set(customerId, {
          user_id: customerId,
          first_name: customer.first_name || '',
          last_name: customer.last_name || '',
          email: customer.email || '',
          phone: customer.phone || '',
          reservations: [],
        });
      }
      customerMap.get(customerId).reservations.push(reservation);
    }

    return Array.from(customerMap.values()).map((customer) => {
      const sortedReservations = [...customer.reservations].sort(
        (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
      );
      return {
        ...customer,
        reservations: sortedReservations,
        reservationCount: sortedReservations.length,
        lastReservation: sortedReservations[0] || null,
      };
    });
  }, [reservations]);

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return customers.filter((customer) => {
      const name = getCustomerName(customer).toLowerCase();
      const email = (customer.email || '').toLowerCase();
      const phone = (customer.phone || '').toLowerCase();

      const matchesSearch =
        !query ||
        name.includes(query) ||
        email.includes(query) ||
        phone.includes(query);

      if (!matchesSearch) return false;

      if (statusFilter === 'ALL') return true;

      const hasActiveReservation = customer.reservations.some((r) =>
        ['PENDING', 'CONFIRMED'].includes(r.status)
      );

      if (statusFilter === 'ACTIVE') return hasActiveReservation;
      if (statusFilter === 'COMPLETED')
        return customer.reservations.some((r) => r.status === 'COMPLETED');
      if (statusFilter === 'CANCELLED')
        return customer.reservations.every((r) => r.status === 'CANCELLED');

      return true;
    });
  }, [customers, search, statusFilter]);

  const totalCustomers = customers.length;
  const activeCustomers = customers.filter((c) =>
    c.reservations.some((r) => ['PENDING', 'CONFIRMED'].includes(r.status))
  ).length;
  const totalReservations = reservations.length;

  return (
    <div className="customers-page">
      <div className="customers-header">
        <div>
          <h1>Customers</h1>
          <p>Customers who have made reservations at your pharmacy.</p>
        </div>
      </div>

      <div className="customer-stats">
        <div className="customer-stat-card">
          <span className="customer-stat-label">Total Customers</span>
          <strong>{loading ? '—' : totalCustomers}</strong>
        </div>
        <div className="customer-stat-card">
          <span className="customer-stat-label">Active Customers</span>
          <strong>{loading ? '—' : activeCustomers}</strong>
        </div>
        <div className="customer-stat-card">
          <span className="customer-stat-label">Total Reservations</span>
          <strong>{loading ? '—' : totalReservations}</strong>
        </div>
      </div>

      <div className="customers-card">
        <div className="customers-toolbar">
          <div className="customer-search">
            <span className="customer-search-icon"></span>
            <input
              type="text"
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All customers</option>
            <option value="ACTIVE">Active reservations</option>
            <option value="COMPLETED">Completed reservations</option>
            <option value="CANCELLED">Cancelled only</option>
          </select>
        </div>

        {loading && (
          <div className="customers-state">
            <div className="customers-spinner" />
            <p>Loading customers...</p>
          </div>
        )}

        {!loading && error && (
          <div className="customers-state customers-error">
            <div className="customers-state-icon">!</div>
            <h3>Unable to load customers</h3>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && filteredCustomers.length === 0 && (
          <div className="customers-state">
            <div className="customers-state-icon">👥</div>
            <h3>
              {customers.length === 0
                ? 'No customers yet'
                : 'No customers found'}
            </h3>
            <p>
              {customers.length === 0
                ? 'Customers will appear here after they make a reservation at your pharmacy.'
                : 'Try changing your search or filter.'}
            </p>
          </div>
        )}

        {!loading && !error && filteredCustomers.length > 0 && (
          <div className="customers-table-wrapper">
            <table className="customers-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Contact</th>
                  <th>Reservations</th>
                  <th>Last Reservation</th>
                  <th>Latest Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => {
                  const latest = customer.lastReservation;
                  return (
                    <tr key={customer.user_id}>
                      <td>
                        <div className="customer-info">
                          <div className="customer-avatar">
                            {getCustomerName(customer).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <strong>{getCustomerName(customer)}</strong>
                            <span>Customer ID #{customer.user_id}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="customer-contact">
                          <span>{customer.email || 'No email'}</span>
                          <span>{customer.phone || 'No phone'}</span>
                        </div>
                      </td>
                      <td>
                        <span className="reservation-count">
                          {customer.reservationCount}
                        </span>
                      </td>
                      <td>{formatDate(latest?.created_at)}</td>
                      <td>
                        <span
                          className={`customer-status customer-status-${(
                            latest?.status || ''
                          ).toLowerCase()}`}
                        >
                          {latest?.status || 'UNKNOWN'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default CustomersPage;