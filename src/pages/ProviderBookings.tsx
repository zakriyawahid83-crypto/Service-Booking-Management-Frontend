import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronDown,
  Clock3,
  DollarSign,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  Tags,
  User,
  X,
} from "lucide-react";
import ConfirmationModal from "../components/ConfirmationModal";
import api from "../services/api";
import { clearAuthSession } from "../services/authSession";
import "./ProviderDashboard.css";
import "./ProviderBookings.css";

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
  customer_name: string;
  customer_email: string;
  service_name: string;
};

type Service = {
  id: number;
  duration_minutes: number;
};

type ProviderProfile = {
  business_name: string;
  is_verified: boolean;
};

type StatusFilter = "all" | "pending" | "confirmed" | "completed" | "cancelled";
type DateFilter = "all" | "today" | "upcoming" | "past" | "custom";

const getApiErrorMessage = (error: unknown, fallback: string) => {
  const apiError = error as { response?: { data?: { detail?: unknown } }; message?: string };
  const detail = apiError.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((item: { msg?: string }) => item?.msg || String(item)).join(", ");
  return apiError.message || fallback;
};

const getDateKey = (value: Date) =>
  `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;

const formatDate = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatTime = (value: string) => {
  const [hour, minute] = value.split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return value;
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
};

const formatPrice = (amount: number) =>
  Number.isFinite(amount) ? `Rs ${amount.toLocaleString("en-LK")}` : "Price pending";

const bookingStatus = (booking: Booking) => booking.status.toLowerCase() === "rejected" ? "cancelled" : booking.status.toLowerCase();

function ProviderBookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [confirmation, setConfirmation] = useState<{ bookingId: number; status: "cancelled"; reject: boolean } | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [toast, setToast] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const loadBookings = async () => {
    try {
      setLoading(true);
      setError("");
      const [bookingResponse, serviceResponse, profileResponse] = await Promise.all([
        api.get<Booking[]>("/provider/bookings"),
        api.get<Service[]>("/provider/services"),
        api.get<ProviderProfile>("/provider/profile"),
      ]);
      setBookings(Array.isArray(bookingResponse.data) ? bookingResponse.data : []);
      setServices(Array.isArray(serviceResponse.data) ? serviceResponse.data : []);
      setProvider(profileResponse.data);
    } catch (requestError) {
      console.error("Provider bookings error:", requestError);
      setError(getApiErrorMessage(requestError, "Unable to load bookings."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBookings();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const today = getDateKey(new Date());
  const counts = useMemo(() => ({
    all: bookings.length,
    pending: bookings.filter((booking) => bookingStatus(booking) === "pending").length,
    confirmed: bookings.filter((booking) => bookingStatus(booking) === "confirmed").length,
    completed: bookings.filter((booking) => bookingStatus(booking) === "completed").length,
    cancelled: bookings.filter((booking) => bookingStatus(booking) === "cancelled").length,
  }), [bookings]);

  const filteredBookings = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...bookings]
      .filter((booking) => statusFilter === "all" || bookingStatus(booking) === statusFilter)
      .filter((booking) => {
        const date = booking.booking_date.slice(0, 10);
        if (dateFilter === "today") return date === today;
        if (dateFilter === "upcoming") return date >= today && !["completed", "cancelled"].includes(bookingStatus(booking));
        if (dateFilter === "past") return date < today;
        if (dateFilter === "custom") {
          return (!customStart || date >= customStart) && (!customEnd || date <= customEnd);
        }
        return true;
      })
      .filter((booking) => !query || `${booking.customer_name} ${booking.customer_email} ${booking.service_name}`.toLowerCase().includes(query))
      .sort((left, right) => {
        const leftKey = `${left.booking_date}T${left.start_time}`;
        const rightKey = `${right.booking_date}T${right.start_time}`;
        const leftPriority = left.booking_date.slice(0, 10) >= today && !["completed", "cancelled"].includes(bookingStatus(left)) ? 0 : 1;
        const rightPriority = right.booking_date.slice(0, 10) >= today && !["completed", "cancelled"].includes(bookingStatus(right)) ? 0 : 1;
        if (leftPriority !== rightPriority) return leftPriority - rightPriority;
        return leftPriority === 0 ? leftKey.localeCompare(rightKey) : rightKey.localeCompare(leftKey);
      });
  }, [bookings, customEnd, customStart, dateFilter, search, statusFilter, today]);

  const selectedBooking = bookings.find((booking) => booking.id === selectedBookingId) || null;
  const pendingCount = counts.pending;

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setDateFilter("all");
    setCustomStart("");
    setCustomEnd("");
  };

  const handleLogout = () => {
    clearAuthSession();
    window.location.href = "/login";
  };

  const changeStatus = async (booking: Booking, status: "confirmed" | "cancelled" | "completed", reject = false) => {
    try {
      setActionLoading(booking.id);
      setError("");
      await api.patch(`/provider/bookings/${booking.id}/status`, { status });
      setBookings((current) => current.map((item) => item.id === booking.id ? { ...item, status } : item));
      setToast(reject ? "Booking rejected successfully" : status === "confirmed" ? "Booking confirmed successfully" : status === "completed" ? "Booking marked as completed" : "Booking cancelled successfully");
      setConfirmation(null);
    } catch (requestError) {
      console.error("Unable to update booking status:", requestError);
      setError(getApiErrorMessage(requestError, "Unable to update booking status."));
    } finally {
      setActionLoading(null);
    }
  };

  const serviceDuration = (booking: Booking) => services.find((service) => service.id === booking.service_id)?.duration_minutes;

  const requestConfirmation = (booking: Booking, reject = false) => {
    setConfirmation({ bookingId: booking.id, status: "cancelled", reject });
  };

  const statusCards: Array<{ id: StatusFilter; label: string; icon: typeof CalendarDays; accent: string }> = [
    { id: "all", label: "Total Bookings", icon: CalendarDays, accent: "stat-icon-teal" },
    { id: "pending", label: "Pending", icon: Clock3, accent: "stat-icon-coral" },
    { id: "confirmed", label: "Confirmed", icon: CheckCheck, accent: "stat-icon-green" },
    { id: "completed", label: "Completed", icon: Check, accent: "stat-icon-blue" },
    { id: "cancelled", label: "Cancelled", icon: X, accent: "stat-icon-coral" },
  ];

  const navItems = [
    { label: "Dashboard", route: "/provider/dashboard", icon: LayoutDashboard },
    { label: "Bookings", route: "/provider/bookings", icon: CalendarDays },
    { label: "Calendar", route: "/provider/calendar", icon: CalendarDays },
    { label: "Availability", route: "/provider/availability", icon: Clock3 },
    { label: "Services", route: "/provider/services", icon: BriefcaseBusiness },
    { label: "Categories", route: "/provider/categories", icon: Tags },
    { label: "Reviews", route: "/provider/reviews", icon: CheckCheck },
    { label: "Earnings", route: "/provider/earnings", icon: DollarSign },
  ];

  return (
    <div className="provider-dashboard-layout provider-bookings-page">
      <aside className={`provider-sidebar ${sidebarOpen ? "open" : ""}`}>
        <button type="button" className="sidebar-close-button" onClick={() => setSidebarOpen(false)} aria-label="Close navigation"><X size={18} /></button>
        <div className="provider-sidebar-header">
          <div className="brand-mark">PB</div>
          <div className="brand-copy">
            <h2>{provider?.business_name || "Provider Desk"}</h2>
            <span>{provider?.is_verified ? "Verified provider" : "Provider workspace"}</span>
          </div>
        </div>
        <nav className="provider-sidebar-nav" aria-label="Primary navigation">
          {navItems.map(({ label, route, icon: Icon }) => (
            <button key={label} type="button" className={`nav-button ${label === "Bookings" ? "active" : ""}`} aria-current={label === "Bookings" ? "page" : undefined} onClick={() => { setSidebarOpen(false); navigate(route); }}>
              <span className="nav-icon"><Icon size={16} /></span><span className="nav-label">{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer"><button type="button" className="logout-button" onClick={handleLogout}><LogOut size={16} /> Logout</button></div>
      </aside>
      {sidebarOpen ? <button type="button" className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} /> : null}

      <main className="provider-dashboard-main">
        <header className="provider-topbar">
          <div className="topbar-leading">
            <button type="button" className="icon-button mobile-menu-button" onClick={() => setSidebarOpen((open) => !open)} aria-label="Toggle navigation menu" aria-expanded={sidebarOpen}><Menu size={18} /></button>
            <div><p className="crumb">Provider workspace</p><h1>Bookings</h1></div>
          </div>
          <div className="topbar-actions">
            <div className="pb-dropdown-anchor">
              <button type="button" className="icon-button" aria-label="Notifications" aria-expanded={notificationsOpen} onClick={() => { setNotificationsOpen((open) => !open); setProfileOpen(false); }}>
                <Bell size={18} />{pendingCount > 0 ? <span className="notification-badge">{pendingCount}</span> : null}
              </button>
              {notificationsOpen ? <div className="pb-header-dropdown"><strong>Notifications</strong><p>{pendingCount ? `${pendingCount} pending booking request${pendingCount === 1 ? "" : "s"}` : "You're all caught up."}</p>{pendingCount > 0 ? <button type="button" onClick={() => { setStatusFilter("pending"); setNotificationsOpen(false); }}>Review pending bookings</button> : null}</div> : null}
            </div>
            <div className="pb-dropdown-anchor">
              <button type="button" className="profile-chip" aria-label="Provider profile menu" aria-expanded={profileOpen} onClick={() => { setProfileOpen((open) => !open); setNotificationsOpen(false); }}>
                <div className="profile-avatar">{(provider?.business_name || "P").slice(0, 1).toUpperCase()}</div>
                <div className="profile-meta"><strong>{provider?.business_name || "Provider"}</strong><span>Business profile</span></div><ChevronDown size={16} />
              </button>
              {profileOpen ? <div className="pb-header-dropdown profile-dropdown"><button type="button" onClick={() => navigate("/provider/profile")}><User size={15} /> Business profile</button><button type="button" onClick={() => navigate("/provider/profile")}><Settings size={15} /> Business settings</button><button type="button" onClick={handleLogout}><LogOut size={15} /> Log out</button></div> : null}
            </div>
          </div>
        </header>

        <div className="provider-dashboard-shell pb-shell">
          <section className="pb-page-heading">
            <div><p className="section-eyebrow">Appointments</p><h2>Bookings</h2><p>Manage and track your customer appointments</p></div>
          </section>

          <section className="pb-stats-grid" aria-label="Booking statistics">
            {statusCards.map(({ id, label, icon: Icon, accent }) => (
              <button key={id} type="button" className={`pb-stat-card ${statusFilter === id ? "selected" : ""}`} onClick={() => setStatusFilter(id)} aria-pressed={statusFilter === id}>
                <span className={`stat-icon ${accent}`}><Icon size={17} /></span><span className="pb-stat-label">{label}</span>
                <strong>{loading ? <span className="pb-skeleton pb-stat-skeleton" /> : counts[id]}</strong>
                <small>{loading ? "Loading bookings" : id === "all" ? "Across your schedule" : "Select to filter"}</small>
              </button>
            ))}
          </section>

          <section className="pb-filter-card" aria-label="Booking filters">
            {loading ? <div className="pb-filter-skeleton" aria-label="Loading booking filters"><span className="pb-skeleton" /><div><span className="pb-skeleton" /><span className="pb-skeleton" /><span className="pb-skeleton" /><span className="pb-skeleton" /></div></div> : <>
              <label className="pb-search-field">
                <Search size={17} />
                <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customer or service..." aria-label="Search customer or service" />
              </label>
              <div className="pb-filter-row">
                <div className="pb-status-filters" role="group" aria-label="Filter by status">
                  {(["all", "pending", "confirmed", "completed", "cancelled"] as StatusFilter[]).map((status) => (
                    <button key={status} type="button" className={statusFilter === status ? "active" : ""} onClick={() => setStatusFilter(status)}>{status === "all" ? "All" : status[0].toUpperCase() + status.slice(1)}</button>
                  ))}
                </div>
                <div className="pb-date-filter">
                  <label htmlFor="provider-booking-date-filter">Date</label>
                  <select id="provider-booking-date-filter" value={dateFilter} onChange={(event) => setDateFilter(event.target.value as DateFilter)}>
                    <option value="all">Any date</option><option value="today">Today</option><option value="upcoming">Upcoming</option><option value="past">Past</option><option value="custom">Custom date</option>
                  </select>
                </div>
                <button type="button" className="pb-clear-button" onClick={clearFilters} disabled={statusFilter === "all" && dateFilter === "all" && !search && !customStart && !customEnd}>Clear filters</button>
              </div>
              {dateFilter === "custom" ? <div className="pb-custom-dates"><label>From <input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} /></label><label>To <input type="date" value={customEnd} min={customStart || undefined} onChange={(event) => setCustomEnd(event.target.value)} /></label></div> : null}
            </>}
          </section>

          <section className="pb-list-section">
            <div className="pb-list-heading"><div><p className="section-eyebrow">Schedule</p><h2>{statusFilter === "all" ? "All bookings" : `${statusFilter[0].toUpperCase()}${statusFilter.slice(1)} bookings`}</h2></div><span>{loading ? "Loading…" : `${filteredBookings.length} booking${filteredBookings.length === 1 ? "" : "s"}`}</span></div>

            {error ? <div className="pb-empty-state pb-error-state"><span className="pb-empty-icon"><CalendarDays size={22} /></span><h3>Unable to load bookings.</h3><p>Please try again.</p><button type="button" className="secondary-button" onClick={() => void loadBookings()}>Try Again</button></div>
              : loading ? <div className="pb-booking-skeleton-list">{Array.from({ length: 4 }, (_, index) => <div key={index} className="pb-booking-skeleton"><span className="pb-skeleton" /><span className="pb-skeleton" /><span className="pb-skeleton" /></div>)}</div>
              : filteredBookings.length === 0 ? <div className="pb-empty-state"><span className="pb-empty-icon"><CalendarDays size={22} /></span><h3>No bookings found</h3><p>You don&apos;t have any bookings matching the selected filters.</p><button type="button" className="secondary-button" onClick={clearFilters}>Clear Filters</button></div>
                : <>
                  <div className="pb-booking-table-wrap">
                    <table className="pb-booking-table">
                      <thead><tr><th>Customer</th><th>Service</th><th>Date</th><th>Time</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead>
                      <tbody>{filteredBookings.map((booking) => {
                        const status = bookingStatus(booking);
                        const duration = serviceDuration(booking);
                        return <tr key={booking.id}>
                          <td><div className="pb-customer-cell"><span className="pb-avatar">{booking.customer_name?.trim().slice(0, 1).toUpperCase() || "C"}</span><span><strong>{booking.customer_name || `Customer #${booking.customer_id}`}</strong><small>{booking.customer_email}</small></span></div></td>
                          <td><strong>{booking.service_name}</strong><small className="pb-table-sub">{duration ? `${duration} min` : "Service appointment"}</small></td>
                          <td>{formatDate(booking.booking_date)}</td><td>{formatTime(booking.start_time)} – {formatTime(booking.end_time)}</td><td className="pb-price">{formatPrice(booking.price)}</td>
                          <td><span className={`pb-status-badge ${status}`}>{status}</span></td>
                          <td><div className="pb-action-list">{status === "pending" ? <><button type="button" className="pb-action-view" onClick={() => setSelectedBookingId(booking.id)}>View Details</button><button type="button" className="pb-action-confirm" disabled={actionLoading === booking.id} onClick={() => void changeStatus(booking, "confirmed")}>Confirm</button><button type="button" className="pb-action-danger" disabled={actionLoading === booking.id} onClick={() => requestConfirmation(booking, true)}>Reject</button></> : <><button type="button" className="pb-action-view" onClick={() => setSelectedBookingId(booking.id)}>View Details</button>{status === "confirmed" ? <button type="button" className="pb-action-danger" disabled={actionLoading === booking.id} onClick={() => requestConfirmation(booking)}>Cancel</button> : null}</>}</div></td>
                        </tr>;
                      })}</tbody>
                    </table>
                  </div>
                  <div className="pb-mobile-bookings">{filteredBookings.map((booking) => {
                    const status = bookingStatus(booking);
                    const duration = serviceDuration(booking);
                    return <article key={booking.id} className="pb-booking-card">
                      <div className="pb-card-customer"><span className="pb-avatar">{booking.customer_name?.trim().slice(0, 1).toUpperCase() || "C"}</span><span><strong>{booking.customer_name || `Customer #${booking.customer_id}`}</strong><small>{booking.customer_email}</small></span><span className={`pb-status-dot ${status}`} aria-label={status} /></div>
                      <h3>{booking.service_name}</h3><p className="pb-mobile-date">{formatDate(booking.booking_date)}</p><p className="pb-mobile-time">{formatTime(booking.start_time)} <span>•</span> {duration ? `${duration} min` : "Duration not listed"}</p>
                      <strong className="pb-mobile-price">{formatPrice(booking.price)}</strong>
                      <span className={`pb-status-badge ${status}`}>{status}</span>
                      <div className="pb-mobile-actions">{status === "pending" ? <><button type="button" className="pb-action-view" onClick={() => setSelectedBookingId(booking.id)}>View Details</button><button type="button" className="pb-action-confirm" disabled={actionLoading === booking.id} onClick={() => void changeStatus(booking, "confirmed")}>Confirm</button><button type="button" className="pb-action-danger" disabled={actionLoading === booking.id} onClick={() => requestConfirmation(booking, true)}>Reject</button></> : <><button type="button" className="pb-action-view" onClick={() => setSelectedBookingId(booking.id)}>View Details</button>{status === "confirmed" ? <button type="button" className="pb-action-danger" disabled={actionLoading === booking.id} onClick={() => requestConfirmation(booking)}>Cancel</button> : null}</>}</div>
                    </article>;
                  })}</div>
                </>}
          </section>
        </div>
      </main>

      {selectedBooking ? <div className="pb-modal-backdrop" role="presentation" onClick={() => setSelectedBookingId(null)}>
        <section className="pb-details-modal" role="dialog" aria-modal="true" aria-labelledby="pb-detail-title" onClick={(event) => event.stopPropagation()}>
          <button type="button" className="pb-modal-close" aria-label="Close booking details" onClick={() => setSelectedBookingId(null)}><X size={18} /></button>
          <p className="section-eyebrow">Booking details</p><h2 id="pb-detail-title">Appointment #{selectedBooking.id}</h2>
          <div className="pb-detail-customer"><span className="pb-avatar large">{selectedBooking.customer_name?.trim().slice(0, 1).toUpperCase() || "C"}</span><span><strong>{selectedBooking.customer_name || `Customer #${selectedBooking.customer_id}`}</strong><a href={`mailto:${selectedBooking.customer_email}`}>{selectedBooking.customer_email || "No email provided"}</a></span></div>
          <div className="pb-detail-grid">
            <div><small>Service</small><strong>{selectedBooking.service_name}</strong></div><div><small>Date</small><strong>{formatDate(selectedBooking.booking_date)}</strong></div>
            <div><small>Time</small><strong>{formatTime(selectedBooking.start_time)} – {formatTime(selectedBooking.end_time)}</strong></div><div><small>Duration</small><strong>{serviceDuration(selectedBooking) ? `${serviceDuration(selectedBooking)} minutes` : "Not listed"}</strong></div>
            <div><small>Price</small><strong>{formatPrice(selectedBooking.price)}</strong></div><div><small>Status</small><span className={`pb-status-badge ${bookingStatus(selectedBooking)}`}>{bookingStatus(selectedBooking)}</span></div>
          </div>
          <div className="pb-notes"><small>Customer notes</small><p>{selectedBooking.customer_notes?.trim() || "No additional instructions provided."}</p></div>
          <div className="pb-detail-actions">
            {bookingStatus(selectedBooking) === "pending" ? <><button type="button" className="pb-action-danger" onClick={() => requestConfirmation(selectedBooking, true)}>Reject</button><button type="button" className="pb-action-confirm" disabled={actionLoading === selectedBooking.id} onClick={() => void changeStatus(selectedBooking, "confirmed")}>Confirm</button></> : null}
            {bookingStatus(selectedBooking) === "confirmed" ? <><button type="button" className="pb-action-danger" onClick={() => requestConfirmation(selectedBooking)}>Cancel</button><button type="button" className="pb-action-confirm" disabled={actionLoading === selectedBooking.id} onClick={() => void changeStatus(selectedBooking, "completed")}>Mark Completed</button></> : null}
            <button type="button" className="pb-action-view" onClick={() => setSelectedBookingId(null)}>Close</button>
          </div>
        </section>
      </div> : null}

      <ConfirmationModal
        open={confirmation !== null}
        title={confirmation?.reject ? "Reject this booking?" : "Cancel this booking?"}
        message={confirmation?.reject ? "This booking request will be marked as cancelled." : "This appointment will be marked as cancelled."}
        confirmLabel={confirmation?.reject ? "Reject booking" : "Cancel booking"}
        confirmButtonClassName="confirmation-button-danger"
        loading={confirmation !== null && actionLoading === confirmation.bookingId}
        onCancel={() => setConfirmation(null)}
        onConfirm={() => {
          const booking = bookings.find((item) => item.id === confirmation?.bookingId);
          if (booking && confirmation) void changeStatus(booking, confirmation.status, confirmation.reject);
        }}
      />
      {toast ? <div className="pb-toast" role="status"><Check size={17} />{toast}</div> : null}
    </div>
  );
}

export default ProviderBookings;
