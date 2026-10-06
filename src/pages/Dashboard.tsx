import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Compass,
  LayoutDashboard,
  LogOut,
  MapPin,
  ReceiptText,
  UserRound,
} from "lucide-react";
import api from "../services/api";
import "./Dashboard.css";


type Booking = {
  id: number;
  customer_id: number;
  provider_id: number;
  service_id: number;
  booking_date: string;
  start_time: string;
  end_time: string;
  price: number;
  status: string;
  customer_notes?: string | null;
  created_at: string;

  service_name?: string;
  business_name?: string;
  provider_location?: string | null;
  provider_phone?: string | null;
};

type DashboardProps = {
  onLogout: () => void;
};

function Dashboard({ onLogout }: DashboardProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [userName, setUserName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const fetchBookings = async (): Promise<void> => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get(
          "/bookings/customer/me"
        );

        setBookings(
          Array.isArray(response.data)
            ? response.data
            : []
        );
      } catch (error: unknown) {
        console.error("Dashboard error:", error);

        const axiosError = error as {
          response?: {
            data?: {
              detail?: unknown;
            };
          };
        };

        const detail =
          axiosError.response?.data?.detail;

        if (typeof detail === "string") {
          setError(detail);
        } else {
          setError("Unable to load your bookings.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();

    api.get<{ name?: string }>("/auth/me")
      .then((response) => {
        setUserName(response.data.name?.trim().split(" ")[0] || "");
      })
      .catch((error: unknown) => {
        console.error("Dashboard profile error:", error);
      });
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const totalBookings = bookings.length;

  const upcomingBookings = bookings.filter(
    (booking) => {
      const bookingDate = new Date(
        `${booking.booking_date}T00:00:00`
      );

      const status =
        booking.status.toLowerCase();

      return (
        bookingDate >= today &&
        status !== "cancelled" &&
        status !== "completed"
      );
    }
  );

  const completedBookings = bookings.filter(
    (booking) =>
      booking.status.toLowerCase() === "completed"
  );

  const pendingBookings = bookings.filter(
    (booking) =>
      booking.status.toLowerCase() === "pending"
  );

  const formatDate = (date: string): string => {
    const value = new Date(
      `${date}T00:00:00`
    );

    return value.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(":");

    const value = new Date();

    value.setHours(
      Number(hours),
      Number(minutes),
      0,
      0
    );

    return value.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const sortedUpcomingBookings = [...upcomingBookings].sort(
    (a, b) =>
      new Date(
        `${a.booking_date}T${a.start_time}`
      ).getTime() -
      new Date(
        `${b.booking_date}T${b.start_time}`
        ).getTime()
      );

  return (
    <div className="dashboard-page customer-dashboard">
      <header className="dashboard-header">
        <div className="dashboard-logo">
          <span className="dashboard-brand-mark" aria-hidden="true">
            <BriefcaseBusiness size={19} strokeWidth={2.2} />
          </span>
          <span>Service Booking</span>
        </div>

        <nav className="dashboard-nav" aria-label="Main navigation">
          <a
            href="/dashboard"
            className="active"
            aria-current="page"
          >
            <LayoutDashboard size={16} />
            Dashboard
          </a>

          <a href="/bookings">
            <CalendarCheck2 size={16} />
            Bookings
          </a>

          <a href="/book-service">
            <Compass size={16} />
            Services
          </a>

          <a href="/profile">
            <UserRound size={16} />
            Profile
          </a>
        </nav>

        <button
          type="button"
          className="logout-button"
          onClick={onLogout}
        >
          <LogOut size={16} />
          Logout
        </button>
      </header>

      <main className="dashboard-main">
        <section className="dashboard-welcome">
          <div className="welcome-copy">
            <span className="welcome-label">YOUR SERVICE HUB</span>
            <h1>Welcome back{userName ? `, ${userName}` : ""}.</h1>
            <p>Your next great service experience starts here.</p>
          </div>
          <a className="welcome-action" href="/book-service">
            Find a service <ArrowUpRight size={17} />
          </a>
        </section>

        {error && (
          <div className="login-error">
            {error}
          </div>
        )}

        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-card-top">
              <span className="stat-icon stat-icon-teal"><ReceiptText size={18} /></span>
              <span>Total Bookings</span>
            </div>
            <strong>{loading ? "..." : totalBookings}</strong>
            <small>Across your account</small>
          </div>

          <div className="stat-card">
            <div className="stat-card-top">
              <span className="stat-icon stat-icon-blue"><CalendarDays size={18} /></span>
              <span>Upcoming Bookings</span>
            </div>
            <strong>{loading ? "..." : upcomingBookings.length}</strong>
            <small>On your schedule</small>
          </div>

          <div className="stat-card">
            <div className="stat-card-top">
              <span className="stat-icon stat-icon-green"><CheckCircle2 size={18} /></span>
              <span>Completed Bookings</span>
            </div>
            <strong>{loading ? "..." : completedBookings.length}</strong>
            <small>Services taken care of</small>
          </div>

          <div className="stat-card">
            <div className="stat-card-top">
              <span className="stat-icon stat-icon-coral"><Clock3 size={18} /></span>
              <span>Pending Bookings</span>
            </div>
            <strong>{loading ? "..." : pendingBookings.length}</strong>
            <small>Awaiting confirmation</small>
          </div>
        </section>

        <section className="dashboard-content">
          <div className="dashboard-box upcoming-box">
            <div className="section-heading">
              <div>
                <span className="section-kicker">ON YOUR SCHEDULE</span>
                <h2>Upcoming bookings</h2>
              </div>
              <a className="text-link" href="/bookings">
                View all <ArrowRight size={16} />
              </a>
            </div>

            {loading ? (
              <p className="dashboard-empty">Loading your schedule...</p>
            ) : sortedUpcomingBookings.length > 0 ? (
              <div className="upcoming-list">
                {sortedUpcomingBookings.slice(0, 3).map((booking) => (
                  <article className="upcoming-booking" key={booking.id}>
                    <div className="upcoming-date">
                      <CalendarDays size={18} />
                      <span>{formatDate(booking.booking_date)}</span>
                    </div>
                    <div className="upcoming-details">
                      <h3>{booking.service_name || "Service Booking"}</h3>
                      <p>
                        <Clock3 size={14} />
                        {formatTime(booking.start_time)} – {formatTime(booking.end_time)}
                        {booking.business_name && <span className="detail-separator">·</span>}
                        {booking.business_name}
                      </p>
                      {booking.provider_location && (
                        <p><MapPin size={14} />{booking.provider_location}</p>
                      )}
                    </div>
                    <span className={`booking-status status-${booking.status.toLowerCase()}`}>
                      {booking.status}
                    </span>
                  </article>
                ))}
              </div>
            ) : (
              <div className="dashboard-empty">
                <CalendarDays size={22} />
                <p>No upcoming bookings. Find a service when you’re ready.</p>
              </div>
            )}
          </div>

          <div className="dashboard-box quick-actions-box">
            <span className="section-kicker">MAKE IT HAPPEN</span>
            <h2>Quick actions</h2>
            <a className="quick-action primary-action" href="/book-service">
              <span className="quick-action-icon"><BriefcaseBusiness size={18} /></span>
              <span><strong>Book a service</strong><small>Find trusted local help</small></span>
              <ArrowUpRight size={17} />
            </a>
            <a className="quick-action" href="/bookings">
              <span className="quick-action-icon"><CalendarCheck2 size={18} /></span>
              <span><strong>View bookings</strong><small>Check your schedule</small></span>
              <ArrowUpRight size={17} />
            </a>
            <a className="quick-action" href="/book-service">
              <span className="quick-action-icon"><Compass size={18} /></span>
              <span><strong>Explore services</strong><small>See what’s available</small></span>
              <ArrowUpRight size={17} />
            </a>
          </div>
        </section>

        <section className="dashboard-box recent-box">
          <div className="section-heading">
            <div>
              <span className="section-kicker">RECENT ACTIVITY</span>
              <h2>Recent bookings</h2>
            </div>
            <a className="text-link" href="/bookings">
              All bookings <ArrowRight size={16} />
            </a>
          </div>

          {loading ? (
            <p>
              Loading bookings...
            </p>
          ) : bookings.length === 0 ? (
            <p>
              You don't have any bookings yet.
            </p>
          ) : (
            <div className="recent-bookings">
              {bookings
                .slice(0, 5)
                .map((booking) => (
                  <div
                    key={booking.id}
                    className="recent-booking"
                  >
                    <div>
                      <strong>
                        {booking.service_name ||
                          `Booking #${booking.id}`}
                      </strong>

                      {booking.business_name && (
                        <p>
                          {booking.business_name}
                        </p>
                      )}

                      <p className="recent-booking-meta">
                        <CalendarDays size={14} />
                        {formatDate(booking.booking_date)}
                        <span>·</span>
                        <Clock3 size={14} />
                        {formatTime(booking.start_time)}
                      </p>
                    </div>

                    <div>
                      <strong>
                        Rs. {booking.price}
                      </strong>

                      <p className={`recent-status status-${booking.status.toLowerCase()}`}>
                        {booking.status}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </section>
      </main>

      <footer className="dashboard-footer">
        <span>
          © 2026 Service Booking Platform
        </span>

        <span>
          Customer Portal
        </span>
      </footer>
    </div>
  );
}

export default Dashboard;
