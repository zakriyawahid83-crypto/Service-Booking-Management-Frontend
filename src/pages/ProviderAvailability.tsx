import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell, BriefcaseBusiness, CalendarDays, Check, ChevronDown, Clock3,
  DollarSign, LayoutDashboard, LogOut, Menu, Settings, Tags, User, X,
} from "lucide-react";
import api from "../services/api";
import { clearAuthSession } from "../services/authSession";
import "./ProviderDashboard.css";
import "./ProviderBookings.css";
import "./ProviderCalendar.css";

type Schedule = {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  break_start: string | null;
  break_end: string | null;
  slot_duration: number;
  is_available: boolean;
};
type Provider = { business_name?: string; is_verified?: boolean };
type FormState = { is_available: boolean; start_time: string; end_time: string; break_start: string; break_end: string; slot_duration: number };
const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const blankForm: FormState = { is_available: true, start_time: "09:00", end_time: "17:00", break_start: "13:00", break_end: "14:00", slot_duration: 30 };
const clock = (value: string | null) => {
  if (!value) return "—";
  const [hour, minute] = value.split(":").map(Number);
  const date = new Date(); date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
};
const apiMessage = (error: unknown) => {
  const item = error as { response?: { data?: { detail?: unknown } }; message?: string };
  if (typeof item.response?.data?.detail === "string") return item.response.data.detail;
  return item.message || "Unable to save availability.";
};

export default function ProviderAvailability() {
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(blankForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const scheduleByDay = new Map(schedules.map((schedule) => [schedule.day_of_week, schedule]));
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
  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const [availabilityResponse, profileResponse] = await Promise.all([
        api.get<Schedule[]>("/availability/my"),
        api.get<Provider>("/provider/profile"),
      ]);
      setSchedules(Array.isArray(availabilityResponse.data) ? availabilityResponse.data : []);
      setProvider(profileResponse.data);
    } catch (requestError) {
      console.error("Provider availability error:", requestError);
      setError(apiMessage(requestError));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);
  const logout = () => { clearAuthSession(); window.location.href = "/login"; };
  const openEditor = (day: number) => {
    const current = scheduleByDay.get(day);
    setEditingDay(day);
    setForm(current ? {
      is_available: current.is_available,
      start_time: current.start_time.slice(0, 5),
      end_time: current.end_time.slice(0, 5),
      break_start: current.break_start?.slice(0, 5) || "",
      break_end: current.break_end?.slice(0, 5) || "",
      slot_duration: current.slot_duration,
    } : { ...blankForm });
    setFormError("");
  };
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (form.is_available) {
      if (form.start_time >= form.end_time) { setFormError("Start time must be before end time."); return; }
      if (!!form.break_start !== !!form.break_end) { setFormError("Enter both break start and break end, or leave both empty."); return; }
      if (form.break_start && form.break_end) {
        if (form.break_start >= form.break_end) { setFormError("Break start time must be before break end time."); return; }
        if (form.break_start < form.start_time || form.break_end > form.end_time) { setFormError("Break must be inside working hours."); return; }
      }
      if (!Number.isInteger(form.slot_duration) || form.slot_duration < 1 || form.slot_duration > 480) { setFormError("Slot duration must be between 1 and 480 minutes."); return; }
    }
    if (editingDay === null) return;
    const existing = scheduleByDay.get(editingDay);
    try {
      setSaving(true);
      setFormError("");
      if (!existing && !form.is_available) {
        setEditingDay(null);
        setToast(`${weekdays[editingDay]} marked unavailable`);
        return;
      }
      const payload = {
        day_of_week: editingDay,
        start_time: form.start_time,
        end_time: form.end_time,
        break_start: form.break_start || null,
        break_end: form.break_end || null,
        slot_duration: form.slot_duration,
      };
      if (existing) {
        await api.put(`/availability/${existing.id}`, { ...payload, is_available: form.is_available });
      } else {
        const response = await api.post<Schedule>("/availability/", payload);
        if (!form.is_available) await api.put(`/availability/${response.data.id}`, { is_available: false });
      }
      setEditingDay(null);
      setToast("Availability updated successfully.");
      await load();
    } catch (requestError) {
      setFormError(apiMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="provider-dashboard-layout provider-bookings-page pc-page">
      <aside className={`provider-sidebar ${sidebarOpen ? "open" : ""}`}>
        <button type="button" className="sidebar-close-button" onClick={() => setSidebarOpen(false)} aria-label="Close navigation"><X size={18} /></button>
        <div className="provider-sidebar-header"><div className="brand-mark">PB</div><div className="brand-copy"><h2>{provider?.business_name || "Provider Desk"}</h2><span>{provider?.is_verified ? "Verified provider" : "Provider workspace"}</span></div></div>
        <nav className="provider-sidebar-nav" aria-label="Primary navigation">{navItems.map(({ label, route, icon: Icon }) => <button key={label} type="button" className={`nav-button ${label === "Availability" ? "active" : ""}`} aria-current={label === "Availability" ? "page" : undefined} onClick={() => { setSidebarOpen(false); navigate(route); }}><span className="nav-icon"><Icon size={16} /></span><span className="nav-label">{label}</span></button>)}</nav>
        <div className="sidebar-footer"><button type="button" className="logout-button" onClick={logout}><LogOut size={16} /> Logout</button></div>
      </aside>
      {sidebarOpen && <button type="button" className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
      <main className="provider-dashboard-main">
        <header className="provider-topbar">
          <div className="topbar-leading"><button type="button" className="icon-button mobile-menu-button" onClick={() => setSidebarOpen((open) => !open)} aria-label="Toggle navigation menu" aria-expanded={sidebarOpen}><Menu size={18} /></button><div><p className="crumb">Provider workspace</p><h1>Availability</h1></div></div>
          <div className="topbar-actions">
            <div className="pb-dropdown-anchor"><button type="button" className="icon-button" aria-label="Notifications" aria-expanded={notificationsOpen} onClick={() => { setNotificationsOpen((open) => !open); setProfileOpen(false); }}><Bell size={18} /></button>{notificationsOpen && <div className="pb-header-dropdown"><strong>Notifications</strong><p>You&apos;re all caught up.</p></div>}</div>
            <div className="pb-dropdown-anchor"><button type="button" className="profile-chip" aria-label="Provider profile menu" aria-expanded={profileOpen} onClick={() => { setProfileOpen((open) => !open); setNotificationsOpen(false); }}><div className="profile-avatar">{(provider?.business_name || "P").slice(0, 1).toUpperCase()}</div><div className="profile-meta"><strong>{provider?.business_name || "Provider"}</strong><span>Business profile</span></div><ChevronDown size={16} /></button>{profileOpen && <div className="pb-header-dropdown profile-dropdown"><button type="button" onClick={() => navigate("/provider/profile")}><User size={15} /> Business profile</button><button type="button" onClick={() => navigate("/provider/profile")}><Settings size={15} /> Business settings</button><button type="button" onClick={logout}><LogOut size={15} /> Log out</button></div>}</div>
          </div>
        </header>
        <div className="provider-dashboard-shell pb-shell pc-shell">
          <section className="pb-page-heading"><div><p className="section-eyebrow">Scheduling</p><h2>Availability</h2><p>Set the weekly hours when customers can book your services.</p></div><button type="button" className="secondary-button" onClick={() => navigate("/provider/calendar")}>View Calendar</button></section>
          {error && <div className="pc-alert" role="alert">{error}<button type="button" onClick={() => void load()}>Try again</button></div>}
          <div className="pc-availability-intro"><span className="pc-intro-icon"><Clock3 size={20} /></span><div><strong>Your weekly schedule</strong><p>Availability is used to generate bookable appointment slots. Breaks and existing bookings are excluded automatically.</p></div></div>
          {loading ? <div className="pc-availability-grid">{weekdays.map((day) => <div className="pc-availability-skeleton" key={day}><span className="pb-skeleton" /><span className="pb-skeleton" /><span className="pb-skeleton" /></div>)}</div>
            : error ? <div className="pc-empty"><Clock3 size={22} /><h3>Unable to load availability</h3><p>Please try again.</p><button type="button" className="secondary-button" onClick={() => void load()}>Try Again</button></div>
              : <div className="pc-availability-grid">{weekdays.map((dayName, dayIndex) => {
                const schedule = scheduleByDay.get(dayIndex);
                const active = Boolean(schedule?.is_available);
                return <article className={`pc-availability-card ${active ? "" : "off"}`} key={dayName}>
                  <div className="pc-availability-card-head"><h3>{dayName}</h3><span className={`pc-toggle-state ${active ? "on" : "off"}`}><i />{active ? "Available" : "Unavailable"}</span></div>
                  {active && schedule ? <><div className="pc-hours-display">{clock(schedule.start_time)} <span>→</span> {clock(schedule.end_time)}</div><div className="pc-availability-meta"><div><small>Break</small><strong>{schedule.break_start && schedule.break_end ? `${clock(schedule.break_start)} – ${clock(schedule.break_end)}` : "No break set"}</strong></div><div><small>Slot duration</small><strong>{schedule.slot_duration} minutes</strong></div></div></> : <p className="pc-unavailable-note">Customers cannot book appointments on this day.</p>}
                  <button type="button" className="secondary-button pc-edit-schedule" onClick={() => openEditor(dayIndex)}>{active ? "Edit Schedule" : "Set Schedule"}</button>
                </article>;
              })}</div>}
          {!loading && !error && schedules.length === 0 && <div className="pc-empty-inline"><p>Set your working hours to start accepting bookings.</p><button type="button" className="pc-manage-link" onClick={() => openEditor(0)}>Set Availability <span>→</span></button></div>}
        </div>
      </main>
      {editingDay !== null && <div className="pc-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditingDay(null); }}><form className="pc-modal pc-availability-modal" role="dialog" aria-modal="true" aria-labelledby="pc-schedule-title" onSubmit={(event) => void save(event)}><button type="button" className="pc-modal-close" aria-label="Close schedule editor" onClick={() => setEditingDay(null)}><X size={18} /></button><p className="section-eyebrow">Weekly schedule</p><h2 id="pc-schedule-title">Edit {weekdays[editingDay]} schedule</h2><label className="pc-availability-toggle"><span><strong>Available</strong><small>Allow customers to book this day</small></span><input type="checkbox" checked={form.is_available} onChange={(event) => setForm({ ...form, is_available: event.target.checked })} /></label>{form.is_available && <><div className="pc-form-row"><label>Start time<input type="time" required value={form.start_time} onChange={(event) => setForm({ ...form, start_time: event.target.value })} /></label><label>End time<input type="time" required value={form.end_time} onChange={(event) => setForm({ ...form, end_time: event.target.value })} /></label></div><div className="pc-form-row"><label>Break start<input type="time" value={form.break_start} onChange={(event) => setForm({ ...form, break_start: event.target.value })} /></label><label>Break end<input type="time" value={form.break_end} onChange={(event) => setForm({ ...form, break_end: event.target.value })} /></label></div><label>Slot duration<select value={form.slot_duration} onChange={(event) => setForm({ ...form, slot_duration: Number(event.target.value) })}>{[15, 20, 30, 45, 60, 90, 120].map((duration) => <option key={duration} value={duration}>{duration} minutes</option>)}</select></label></>}{formError && <p className="pc-form-error" role="alert">{formError}</p>}<div className="pc-modal-actions"><button type="button" className="secondary-button" onClick={() => setEditingDay(null)}>Cancel</button><button type="submit" className="primary-button" disabled={saving}>{saving ? "Saving…" : "Save Changes"}</button></div></form></div>}
      {toast && <div className="pb-toast" role="status">{toast}</div>}
    </div>
  );
}
