import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell, BriefcaseBusiness, CalendarDays, Check, ChevronDown, ChevronLeft,
  ChevronRight, Clock3, DollarSign, LayoutDashboard, LogOut, Menu, Settings, Tags, User, X,
} from "lucide-react";
import ConfirmationModal from "../components/ConfirmationModal";
import api from "../services/api";
import { clearAuthSession } from "../services/authSession";
import "./ProviderDashboard.css";
import "./ProviderBookings.css";
import "./ProviderCalendar.css";

type Booking = {
  booking_id: number;
  service_id: number;
  service_name: string;
  service_duration: number;
  customer_id: number;
  customer_name: string;
  customer_email: string;
  start_time: string;
  end_time: string;
  price: number;
  status: string;
  customer_notes: string | null;
};
type BlockedPeriod = { id: number; start_time: string; end_time: string; reason: string | null };
type Day = {
  date: string; day_of_week: number; is_available: boolean; start_time: string | null;
  end_time: string | null; break_start: string | null; break_end: string | null;
  slot_duration: number | null; is_blocked: boolean; blocked_reason: string | null;
  blocked_times: BlockedPeriod[]; bookings: Booking[];
};
type CalendarPayload = { calendar: Day[] };
type Provider = { business_name?: string; is_verified?: boolean };
type ViewMode = "month" | "week" | "day";
type Service = { id: number; duration_minutes: number; is_active?: boolean };
type CalendarResponse = { calendar: Day[] };
type SelectedBooking = { booking: Booking; date: string };
type BlockForm = { date: string; start: string; end: string; reason: string };

const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const localToday = () => dateKey(new Date());
const fromKey = (key: string) => new Date(`${key}T00:00:00`);
const addDays = (date: Date, days: number) => { const result = new Date(date); result.setDate(result.getDate() + days); return result; };
const timeLabel = (value: string | null) => {
  if (!value) return "—";
  const [hour, minute] = value.split(":").map(Number);
  const date = new Date(); date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
};
const dateLabel = (value: string, options: Intl.DateTimeFormatOptions = { weekday: "long", month: "long", day: "numeric", year: "numeric" }) =>
  fromKey(value).toLocaleDateString("en-US", options);
const errorMessage = (error: unknown, fallback: string) => {
  const requestError = error as { response?: { data?: { detail?: unknown } }; message?: string };
  return typeof requestError.response?.data?.detail === "string" ? requestError.response.data.detail : requestError.message || fallback;
};
const weekStart = (date: Date) => addDays(date, -((date.getDay() + 6) % 7));
const minutes = (time: string) => { const [hour, minute] = time.split(":").map(Number); return hour * 60 + minute; };
const statusLabel = (status: string) => status.toLowerCase() === "rejected" ? "cancelled" : status.toLowerCase();

export default function ProviderCalendar() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(localToday);
  const [view, setView] = useState<ViewMode>("month");
  const [days, setDays] = useState<Day[]>([]);
  const [todayBookings, setTodayBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<SelectedBooking | null>(null);
  const [bookingConfirmation, setBookingConfirmation] = useState<"reject" | "cancel" | null>(null);
  const [blockToDelete, setBlockToDelete] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockForm, setBlockForm] = useState<BlockForm>({ date: selectedDate, start: "13:00", end: "14:00", reason: "Personal" });
  const [blockLoading, setBlockLoading] = useState(false);

  const range = useMemo(() => {
    const focus = fromKey(selectedDate);
    if (view === "day") return [selectedDate, selectedDate] as const;
    if (view === "week") {
      const start = weekStart(focus);
      return [dateKey(start), dateKey(addDays(start, 6))] as const;
    }
    const start = new Date(focus.getFullYear(), focus.getMonth(), 1);
    const end = new Date(focus.getFullYear(), focus.getMonth() + 1, 0);
    return [dateKey(start), dateKey(end)] as const;
  }, [selectedDate, view]);

  const loadCalendar = async () => {
    try {
      setLoading(true);
      setError("");
      const [calendarResponse, todayResponse, serviceResponse, profileResponse] = await Promise.all([
        api.get<CalendarPayload>("/availability/calendar", { params: { start_date: range[0], end_date: range[1] } }),
        api.get<CalendarResponse>("/availability/calendar", { params: { start_date: localToday(), end_date: localToday() } }),
        api.get<Service[]>("/provider/services"),
        api.get<Provider>("/provider/profile"),
      ]);
      const result = calendarResponse.data.calendar;
      setDays(Array.isArray(result) ? result : []);
      setTodayBookings(Array.isArray(todayResponse.data.calendar?.[0]?.bookings) ? todayResponse.data.calendar[0].bookings : []);
      setServices(Array.isArray(serviceResponse.data) ? serviceResponse.data : []);
      setProvider(profileResponse.data);
    } catch (requestError) {
      console.error("Provider calendar error:", requestError);
      setError(errorMessage(requestError, "Unable to load calendar."));
      setDays([]);
      setTodayBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadCalendar(); }, [range[0], range[1]]);
  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const dayMap = useMemo(() => new Map(days.map((day) => [day.date, day])), [days]);
  const currentDay = dayMap.get(selectedDate);
  const pendingCount = useMemo(() => days.reduce((count, day) => count + day.bookings.filter((booking) => statusLabel(booking.status) === "pending").length, 0), [days]);
  const navItems = [
    { label: "Dashboard", route: "/provider/dashboard", icon: LayoutDashboard },
    { label: "Bookings", route: "/provider/bookings", icon: CalendarDays },
    { label: "Calendar", route: "/provider/calendar", icon: CalendarDays },
    { label: "Availability", route: "/provider/availability", icon: Clock3 },
    { label: "Services", route: "/provider/services", icon: BriefcaseBusiness },
    { label: "Categories", route: "/provider/categories", icon: Tags },
    { label: "Reviews", route: "/provider/reviews", icon: Check },
    { label: "Earnings", route: "/provider/earnings", icon: DollarSign },
  ];

  const go = (direction: -1 | 1) => {
    const focus = fromKey(selectedDate);
    if (view === "month") focus.setMonth(focus.getMonth() + direction);
    else if (view === "week") focus.setDate(focus.getDate() + direction * 7);
    else focus.setDate(focus.getDate() + direction);
    setSelectedDate(dateKey(focus));
  };
  const rangeTitle = view === "month"
    ? fromKey(selectedDate).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : view === "week"
      ? `${dateLabel(range[0], { month: "short", day: "numeric" })} – ${dateLabel(range[1], { month: "short", day: "numeric", year: "numeric" })}`
      : dateLabel(selectedDate);
  const selectBooking = (booking: Booking, date: string) => setSelectedBooking({ booking, date });

  const updateBooking = async (status: "confirmed" | "cancelled" | "completed") => {
    if (!selectedBooking) return;
    try {
      setActionLoading(true);
      await api.patch(`/provider/bookings/${selectedBooking.booking.booking_id}/status`, { status });
      setToast(status === "confirmed" ? "Booking confirmed successfully" : status === "completed" ? "Booking marked as completed" : "Booking cancelled successfully");
      setSelectedBooking(null);
      setBookingConfirmation(null);
      await loadCalendar();
    } catch (requestError) {
      setError(errorMessage(requestError, "Unable to update booking status."));
    } finally {
      setActionLoading(false);
    }
  };
  const saveBlock = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (blockForm.start >= blockForm.end) {
      setError("End time must be after start time.");
      return;
    }
    try {
      setBlockLoading(true);
      setError("");
      await api.post("/availability/blocked-times", {
        blocked_date: blockForm.date, start_time: blockForm.start,
        end_time: blockForm.end, reason: blockForm.reason || null,
      });
      setBlockOpen(false);
      setSelectedDate(blockForm.date);
      setToast("Blocked time added to your calendar");
      await loadCalendar();
    } catch (requestError) {
      setError(errorMessage(requestError, "Unable to block this time."));
    } finally {
      setBlockLoading(false);
    }
  };
  const removeBlock = async () => {
    if (blockToDelete === null) return;
    try {
      await api.delete(`/availability/blocked-times/${blockToDelete}`);
      setBlockToDelete(null);
      setToast("Blocked time removed");
      await loadCalendar();
    } catch (requestError) {
      setError(errorMessage(requestError, "Unable to remove blocked time."));
    }
  };
  const logout = () => { clearAuthSession(); window.location.href = "/login"; };

  const renderDayEvents = (day: Day, compact = false) => (
    <div className="pc-day-events">
      {day.is_available && !day.is_blocked && <span className="pc-day-hours">{timeLabel(day.start_time)}–{timeLabel(day.end_time)}</span>}
      {!compact && day.break_start && day.break_end && <div className="pc-event break"><span>{timeLabel(day.break_start)} · Break</span><small>{timeLabel(day.break_end)}</small></div>}
      {day.bookings.map((booking) => (
        <button key={booking.booking_id} type="button" className={`pc-event ${statusLabel(booking.status)}`} onClick={() => selectBooking(booking, day.date)}>
          <span>{timeLabel(booking.start_time)} · {booking.customer_name}</span>
          {!compact && <small>{booking.service_name}</small>}
        </button>
      ))}
      {day.blocked_times.map((block) => (
        <div key={`blocked-${block.id}`} className="pc-event blocked"><span>{timeLabel(block.start_time)} · {block.reason || "Blocked"}</span>{!compact && <small>{timeLabel(block.end_time)}</small>}</div>
      ))}
      {day.is_blocked && <span className="pc-day-note">Unavailable all day</span>}
      {day.is_available && !day.is_blocked && <span className="pc-slot-hint">{compact ? `${getAvailableCount(day, services)} open starts` : getAvailableStarts(day, services).slice(0, 5).map(timeLabel).join(" · ") || "No open starts"}</span>}
    </div>
  );

  const calendarDates = useMemo(() => {
    if (view === "month") {
      const first = fromKey(range[0]);
      const offset = (first.getDay() + 6) % 7;
      return Array.from({ length: Math.ceil((offset + fromKey(range[1]).getDate()) / 7) * 7 }, (_, index) => {
        const day = addDays(first, index - offset);
        return { date: dateKey(day), inMonth: day.getMonth() === first.getMonth() };
      });
    }
    const start = fromKey(range[0]);
    return Array.from({ length: view === "week" ? 7 : 1 }, (_, index) => ({ date: dateKey(addDays(start, index)), inMonth: true }));
  }, [range, view]);

  return (
    <div className="provider-dashboard-layout provider-bookings-page pc-page">
      <aside className={`provider-sidebar ${sidebarOpen ? "open" : ""}`}>
        <button type="button" className="sidebar-close-button" onClick={() => setSidebarOpen(false)} aria-label="Close navigation"><X size={18} /></button>
        <div className="provider-sidebar-header"><div className="brand-mark">PB</div><div className="brand-copy"><h2>{provider?.business_name || "Provider Desk"}</h2><span>{provider?.is_verified ? "Verified provider" : "Provider workspace"}</span></div></div>
        <nav className="provider-sidebar-nav" aria-label="Primary navigation">
          {navItems.map(({ label, route, icon: Icon }) => <button key={label} type="button" className={`nav-button ${label === "Calendar" ? "active" : ""}`} aria-current={label === "Calendar" ? "page" : undefined} onClick={() => { setSidebarOpen(false); navigate(route); }}><span className="nav-icon"><Icon size={16} /></span><span className="nav-label">{label}</span></button>)}
        </nav>
        <div className="sidebar-footer"><button type="button" className="logout-button" onClick={logout}><LogOut size={16} /> Logout</button></div>
      </aside>
      {sidebarOpen && <button type="button" className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}

      <main className="provider-dashboard-main">
        <header className="provider-topbar">
          <div className="topbar-leading"><button type="button" className="icon-button mobile-menu-button" onClick={() => setSidebarOpen((open) => !open)} aria-label="Toggle navigation menu" aria-expanded={sidebarOpen}><Menu size={18} /></button><div><p className="crumb">Provider workspace</p><h1>Calendar</h1></div></div>
          <div className="topbar-actions">
            <div className="pb-dropdown-anchor"><button type="button" className="icon-button" aria-label="Notifications" aria-expanded={notificationsOpen} onClick={() => { setNotificationsOpen((open) => !open); setProfileOpen(false); }}><Bell size={18} />{pendingCount > 0 && <span className="notification-badge">{pendingCount}</span>}</button>{notificationsOpen && <div className="pb-header-dropdown"><strong>Notifications</strong><p>{pendingCount ? `${pendingCount} pending booking request${pendingCount === 1 ? "" : "s"}` : "You're all caught up."}</p><button type="button" onClick={() => navigate("/provider/bookings")}>Review bookings</button></div>}</div>
            <div className="pb-dropdown-anchor"><button type="button" className="profile-chip" aria-label="Provider profile menu" aria-expanded={profileOpen} onClick={() => { setProfileOpen((open) => !open); setNotificationsOpen(false); }}><div className="profile-avatar">{(provider?.business_name || "P").slice(0, 1).toUpperCase()}</div><div className="profile-meta"><strong>{provider?.business_name || "Provider"}</strong><span>Business profile</span></div><ChevronDown size={16} /></button>{profileOpen && <div className="pb-header-dropdown profile-dropdown"><button type="button" onClick={() => navigate("/provider/profile")}><User size={15} /> Business profile</button><button type="button" onClick={() => navigate("/provider/profile")}><Settings size={15} /> Business settings</button><button type="button" onClick={logout}><LogOut size={15} /> Log out</button></div>}</div>
          </div>
        </header>

        <div className="provider-dashboard-shell pb-shell pc-shell">
          <section className="pb-page-heading pc-heading"><div><p className="section-eyebrow">Schedule</p><h2>Calendar</h2><p>Manage your schedule and appointments</p></div><button type="button" className="primary-button" onClick={() => { setBlockForm((form) => ({ ...form, date: selectedDate })); setBlockOpen(true); }}>Block Time</button></section>
          {error && <div className="pc-alert" role="alert">{error}<button type="button" onClick={() => void loadCalendar()}>Try again</button></div>}
          <section className="pc-toolbar">
            <div className="pc-date-controls"><button className="secondary-button" type="button" onClick={() => setSelectedDate(localToday())}>Today</button><button className="icon-button" aria-label="Previous period" onClick={() => go(-1)}><ChevronLeft size={18} /></button><button className="icon-button" aria-label="Next period" onClick={() => go(1)}><ChevronRight size={18} /></button><strong>{rangeTitle}</strong></div>
            <div className="pc-view-switch" role="group" aria-label="Calendar view">{(["month", "week", "day"] as ViewMode[]).map((mode) => <button type="button" key={mode} className={view === mode ? "active" : ""} onClick={() => setView(mode)}>{mode[0].toUpperCase() + mode.slice(1)}</button>)}</div>
          </section>

          <div className="pc-main-grid">
            <section className="pc-calendar-card">
              {view !== "day" && <div className="pc-weekdays">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => <span key={label}>{label}</span>)}</div>}
              {loading ? <div className={`pc-calendar-grid ${view}`}><div className="pc-loading"><span className="pb-skeleton" /><span className="pb-skeleton" /><span className="pb-skeleton" /><p>Loading calendar…</p></div></div> : error ? <div className="pc-empty"><CalendarDays size={22} /><h3>Unable to load calendar</h3><p>Please try again.</p><button type="button" className="secondary-button" onClick={() => void loadCalendar()}>Try Again</button></div> : days.length === 0 ? <div className="pc-empty"><CalendarDays size={22} /><h3>No appointments scheduled</h3><p>Set your working hours to start accepting bookings.</p><button type="button" className="secondary-button" onClick={() => navigate("/provider/availability")}>View Availability</button></div> : <div className={`pc-calendar-grid ${view}`}>
                {calendarDates.map(({ date, inMonth }) => {
                  const day = dayMap.get(date);
                  const current = date === selectedDate;
                  return <div key={date} className={`pc-calendar-day ${!inMonth ? "outside" : ""} ${current ? "selected" : ""} ${date === localToday() ? "today" : ""} ${day?.is_blocked ? "unavailable" : ""}`} onClick={() => setSelectedDate(date)}>
                    <button type="button" className="pc-day-number" aria-label={`Select ${dateLabel(date)}`} onClick={() => setSelectedDate(date)}>{fromKey(date).getDate()}</button>
                    {day ? renderDayEvents(day, view === "month") : <span className="pc-day-note">{inMonth ? "No schedule" : ""}</span>}
                  </div>;
                })}
              </div>}
              <div className="pc-legend"><span><i className="pending" />Pending</span><span><i className="confirmed" />Confirmed</span><span><i className="completed" />Completed</span><span><i className="blocked" />Blocked / break</span></div>
            </section>

            <aside className="pc-side-panel">
              <section className="pc-side-card">
                <div className="pc-side-heading"><div><p className="section-eyebrow">Daily schedule</p><h3>{dateLabel(selectedDate, { weekday: "long", month: "short", day: "numeric" })}</h3></div><button type="button" aria-label="Select date" className="icon-button" onClick={() => (document.getElementById("pc-date-picker") as HTMLInputElement | null)?.click()}><CalendarDays size={17} /></button></div>
                <input id="pc-date-picker" className="pc-hidden-date" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
                {loading ? <div className="pc-schedule-skeleton"><span className="pb-skeleton" /><span className="pb-skeleton" /></div> : currentDay?.is_available && !currentDay.is_blocked ? <div className="pc-hours"><strong>{timeLabel(currentDay.start_time)} – {timeLabel(currentDay.end_time)}</strong><span>Working hours · {currentDay.slot_duration} min slots</span>{currentDay.break_start && currentDay.break_end && <small>Break {timeLabel(currentDay.break_start)} – {timeLabel(currentDay.break_end)}</small>}</div> : <div className="pc-hours unavailable"><strong>Unavailable</strong><span>No working hours configured for this day</span></div>}
                <button type="button" className="pc-manage-link" onClick={() => navigate("/provider/availability")}>Manage Availability <ChevronRight size={15} /></button>
                <button type="button" className="pc-block-link" onClick={() => { setBlockForm((form) => ({ ...form, date: selectedDate })); setBlockOpen(true); }}>Block a time</button>
                {currentDay?.blocked_times.map((block) => <div className="pc-blocked-row" key={block.id}><span>{timeLabel(block.start_time)}–{timeLabel(block.end_time)} · {block.reason || "Blocked"}</span><button type="button" aria-label="Remove blocked time" onClick={() => setBlockToDelete(block.id)}><X size={14} /></button></div>)}
              </section>
              <section className="pc-side-card pc-today-card"><div className="pc-side-heading"><div><p className="section-eyebrow">Today</p><h3>Upcoming appointments</h3></div><span className="pc-count">{todayBookings.length}</span></div>
                {loading ? <div className="pc-schedule-skeleton"><span className="pb-skeleton" /><span className="pb-skeleton" /></div> : todayBookings.length ? <div className="pc-today-list">{todayBookings.slice().sort((a, b) => a.start_time.localeCompare(b.start_time)).map((booking) => <button type="button" key={booking.booking_id} className="pc-today-item" onClick={() => selectBooking(booking, localToday())}><span className="pc-time-label">{timeLabel(booking.start_time)}</span><span className="pc-today-copy"><strong>{booking.customer_name}</strong><small>{booking.service_name}</small></span><span className={`pb-status-badge ${statusLabel(booking.status)}`}>{statusLabel(booking.status)}</span></button>)}</div> : <div className="pc-empty-mini"><p>No appointments scheduled</p><button type="button" onClick={() => navigate("/provider/availability")}>View Availability</button></div>}
              </section>
              {currentDay?.is_available && !currentDay.is_blocked && <section className="pc-side-card"><div className="pc-side-heading"><div><p className="section-eyebrow">Availability</p><h3>Open booking starts</h3></div></div><div className="pc-slots">{getAvailableStarts(currentDay, services).slice(0, 12).map((slot) => <span key={slot}>{timeLabel(slot)}</span>)}{getAvailableStarts(currentDay, services).length > 12 && <small>+{getAvailableStarts(currentDay, services).length - 12} more</small>}{getAvailableStarts(currentDay, services).length === 0 && <p>No open starts available</p>}</div></section>}
            </aside>
          </div>
        </div>
      </main>

      {selectedBooking && <div className="pc-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedBooking(null); }}><section className="pc-modal" role="dialog" aria-modal="true" aria-labelledby="pc-booking-title"><button type="button" className="pc-modal-close" aria-label="Close booking details" onClick={() => setSelectedBooking(null)}><X size={18} /></button><p className="section-eyebrow">Booking details</p><h2 id="pc-booking-title">{selectedBooking.booking.service_name}</h2><div className="pc-customer"><span className="pc-customer-avatar">{selectedBooking.booking.customer_name.slice(0, 1).toUpperCase()}</span><div><strong>{selectedBooking.booking.customer_name}</strong><a href={`mailto:${selectedBooking.booking.customer_email}`}>{selectedBooking.booking.customer_email}</a></div></div><div className="pc-detail-grid"><div><small>Date</small><strong>{dateLabel(selectedBooking.date)}</strong></div><div><small>Time</small><strong>{timeLabel(selectedBooking.booking.start_time)} – {timeLabel(selectedBooking.booking.end_time)}</strong></div><div><small>Duration</small><strong>{selectedBooking.booking.service_duration} minutes</strong></div><div><small>Price</small><strong>Rs {Number(selectedBooking.booking.price).toLocaleString("en-LK")}</strong></div><div><small>Status</small><span className={`pb-status-badge ${statusLabel(selectedBooking.booking.status)}`}>{statusLabel(selectedBooking.booking.status)}</span></div></div><div className="pc-notes"><small>Customer notes</small><p>{selectedBooking.booking.customer_notes || "No additional instructions."}</p></div><div className="pc-modal-actions">{statusLabel(selectedBooking.booking.status) === "pending" && <><button type="button" className="primary-button" disabled={actionLoading} onClick={() => void updateBooking("confirmed")}>{actionLoading ? "Saving…" : "Confirm booking"}</button><button type="button" className="secondary-button danger" disabled={actionLoading} onClick={() => setBookingConfirmation("reject")}>Reject</button></>}{statusLabel(selectedBooking.booking.status) === "confirmed" && <><button type="button" className="primary-button" disabled={actionLoading} onClick={() => void updateBooking("completed")}>{actionLoading ? "Saving…" : "Mark completed"}</button><button type="button" className="secondary-button danger" disabled={actionLoading} onClick={() => setBookingConfirmation("cancel")}>Cancel booking</button></>}</div></section></div>}

      {blockOpen && <div className="pc-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setBlockOpen(false); }}><form className="pc-modal" role="dialog" aria-modal="true" aria-labelledby="pc-block-title" onSubmit={(event) => void saveBlock(event)}><button type="button" className="pc-modal-close" aria-label="Close" onClick={() => setBlockOpen(false)}><X size={18} /></button><p className="section-eyebrow">Schedule exception</p><h2 id="pc-block-title">Block time</h2><label>Date<input required type="date" min={localToday()} value={blockForm.date} onChange={(event) => setBlockForm({ ...blockForm, date: event.target.value })} /></label><div className="pc-form-row"><label>Start time<input required type="time" value={blockForm.start} onChange={(event) => setBlockForm({ ...blockForm, start: event.target.value })} /></label><label>End time<input required type="time" min={blockForm.start} value={blockForm.end} onChange={(event) => setBlockForm({ ...blockForm, end: event.target.value })} /></label></div><label>Reason<select value={blockForm.reason} onChange={(event) => setBlockForm({ ...blockForm, reason: event.target.value })}>{["Personal", "Holiday", "Meeting", "Emergency", "Other"].map((reason) => <option key={reason}>{reason}</option>)}</select></label><div className="pc-modal-actions"><button type="button" className="secondary-button" onClick={() => setBlockOpen(false)}>Cancel</button><button type="submit" className="primary-button" disabled={blockLoading}>{blockLoading ? "Saving…" : "Save blocked time"}</button></div></form></div>}
      <ConfirmationModal open={bookingConfirmation !== null} title={bookingConfirmation === "reject" ? "Reject this booking?" : "Cancel this booking?"} message={bookingConfirmation === "reject" ? "This booking request will be marked as cancelled." : "This appointment will be marked as cancelled."} confirmLabel={bookingConfirmation === "reject" ? "Reject booking" : "Cancel booking"} confirmButtonClassName="confirmation-button-danger" loading={actionLoading} onCancel={() => setBookingConfirmation(null)} onConfirm={() => void updateBooking("cancelled")} />
      <ConfirmationModal open={blockToDelete !== null} title="Remove blocked time?" message="Customers may be able to book this period after it is removed." confirmLabel="Remove blocked time" confirmButtonClassName="confirmation-button-danger" onCancel={() => setBlockToDelete(null)} onConfirm={() => void removeBlock()} />
      {toast && <div className="pb-toast" role="status">{toast}</div>}
    </div>
  );
}

function getAvailableStarts(day: Day, services: Service[]): string[] {
  if (!day.is_available || day.is_blocked || !day.start_time || !day.end_time) return [];
  const durationOptions = services.filter((service) => service.is_active !== false && service.duration_minutes > 0).map((service) => service.duration_minutes);
  const step = Math.max(1, day.slot_duration || 30);
  const workStart = minutes(day.start_time);
  const workEnd = minutes(day.end_time);
  const bookings = day.bookings.filter((booking) => ["pending", "confirmed"].includes(statusLabel(booking.status))).map((booking) => [minutes(booking.start_time), minutes(booking.end_time)]);
  const blocks = day.blocked_times.map((block) => [minutes(block.start_time), minutes(block.end_time)]);
  const breakStart = day.break_start ? minutes(day.break_start) : -1;
  const breakEnd = day.break_end ? minutes(day.break_end) : -1;
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const starts = new Set<string>();
  for (let start = workStart; start < workEnd; start += step) {
    const fitsService = durationOptions.some((duration) => {
      const end = start + duration;
      const overlaps = (ranges: number[][]) => ranges.some(([left, right]) => start < right && end > left);
      return end <= workEnd && !(breakStart >= 0 && start < breakEnd && end > breakStart) && !overlaps(bookings) && !overlaps(blocks)
        && !(day.date === localToday() && start <= nowMinutes);
    });
    if (fitsService) starts.add(`${String(Math.floor(start / 60)).padStart(2, "0")}:${String(start % 60).padStart(2, "0")}`);
  }
  return [...starts];
}
function getAvailableCount(day: Day, services: Service[]) { return getAvailableStarts(day, services).length; }
