import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./ProviderCustomers.css";

type Customer = {
  customer_id: number;
  customer_name: string;
  customer_email: string;
  total_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
  total_spent: number;
};

const getApiErrorMessage = (
  error: unknown,
  fallback: string
): string => {
  const requestError = error as {
    response?: {
      data?: {
        detail?: unknown;
      };
    };
    message?: string;
  };

  const detail = requestError.response?.data?.detail;

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item: any) => item?.msg || String(item))
      .join(", ");
  }

  return requestError.message || fallback;
};

function ProviderCustomers() {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const loadCustomers = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await api.get<Customer[]>(
        "/provider/customers"
      );

      setCustomers(
        Array.isArray(response.data) ? response.data : []
      );
    } catch (error) {
      setError(
        getApiErrorMessage(
          error,
          "Unable to load customers."
        )
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return customers;
    }

    return customers.filter((customer) => {
      return (
        customer.customer_name
          .toLowerCase()
          .includes(query) ||
        customer.customer_email
          .toLowerCase()
          .includes(query)
      );
    });
  }, [customers, search]);

  const totalCustomers = customers.length;

  const totalBookings = customers.reduce(
    (total, customer) =>
      total + customer.total_bookings,
    0
  );

  const totalCompleted = customers.reduce(
    (total, customer) =>
      total + customer.completed_bookings,
    0
  );

  const totalSpent = customers.reduce(
    (total, customer) =>
      total + customer.total_spent,
    0
  );

  return (
    <div className="provider-customers-page">
      <div className="provider-customers-container">

        {/* Header */}
        <div className="customers-page-header">
          <div>
            <span className="customers-eyebrow">
              PROVIDER MANAGEMENT
            </span>

            <h1>Customers</h1>

            <p>
              View customers who have booked your services.
            </p>
          </div>

          <div className="customers-header-actions">
            <button
              className="customers-back-button"
              onClick={() =>
                navigate("/provider/dashboard")
              }
            >
              ← Dashboard
            </button>

            <button
              className="customers-refresh-button"
              onClick={() => loadCustomers(true)}
              disabled={refreshing}
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="customers-message customers-error">
            {error}
          </div>
        )}

        {/* Stats */}
        {!loading && !error && (
          <div className="customers-stats">

            <div className="customer-stat-card">
              <div className="customer-stat-label">
                Total Customers
              </div>

              <div className="customer-stat-value">
                {totalCustomers}
              </div>
            </div>

            <div className="customer-stat-card">
              <div className="customer-stat-label">
                Total Bookings
              </div>

              <div className="customer-stat-value">
                {totalBookings}
              </div>
            </div>

            <div className="customer-stat-card">
              <div className="customer-stat-label">
                Completed
              </div>

              <div className="customer-stat-value">
                {totalCompleted}
              </div>
            </div>

            <div className="customer-stat-card">
              <div className="customer-stat-label">
                Customer Spending
              </div>

              <div className="customer-stat-value">
                Rs {totalSpent.toLocaleString()}
              </div>
            </div>

          </div>
        )}

        {/* Customer Section */}
        <section className="customers-section">

          <div className="customers-section-header">

            <div>
              <h2>Your Customers</h2>

              <p>
                Customers connected to your services.
              </p>
            </div>

            {!loading && customers.length > 0 && (
              <div className="customers-search">
                <input
                  type="text"
                  placeholder="Search customer..."
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                />
              </div>
            )}

          </div>

          {/* Loading */}
          {loading ? (
            <div className="customers-empty-state">
              <div className="customers-loader">
                Loading customers...
              </div>
            </div>
          ) : customers.length === 0 ? (
            /* No Customers */
            <div className="customers-empty-state">
              <div className="customers-empty-icon">
                C
              </div>

              <h3>No customers yet</h3>

              <p>
                Customers will appear here after they
                book your services.
              </p>
            </div>
          ) : filteredCustomers.length === 0 ? (
            /* Search Empty */
            <div className="customers-empty-state">
              <h3>No matching customers</h3>

              <p>
                Try searching with another name or email.
              </p>
            </div>
          ) : (
            /* Customer Cards */
            <div className="customers-grid">

              {filteredCustomers.map((customer) => (
                <article
                  className="customer-card"
                  key={customer.customer_id}
                >

                  <div className="customer-card-top">

                    <div className="customer-avatar">
                      {customer.customer_name
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div className="customer-main-info">
                      <h3>
                        {customer.customer_name}
                      </h3>

                      <p>
                        {customer.customer_email}
                      </p>
                    </div>

                  </div>

                  <div className="customer-divider" />

                  <div className="customer-details">

                    <div className="customer-detail">
                      <span>Total Bookings</span>
                      <strong>
                        {customer.total_bookings}
                      </strong>
                    </div>

                    <div className="customer-detail">
                      <span>Completed</span>
                      <strong>
                        {customer.completed_bookings}
                      </strong>
                    </div>

                    <div className="customer-detail">
                      <span>Cancelled</span>
                      <strong>
                        {customer.cancelled_bookings}
                      </strong>
                    </div>

                    <div className="customer-detail">
                      <span>Total Spent</span>
                      <strong>
                        Rs{" "}
                        {customer.total_spent.toLocaleString()}
                      </strong>
                    </div>

                  </div>

                </article>
              ))}

            </div>
          )}

        </section>

      </div>
    </div>
  );
}

export default ProviderCustomers;
