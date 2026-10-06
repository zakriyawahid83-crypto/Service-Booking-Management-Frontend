import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell, BriefcaseBusiness, CalendarDays, Check, ChevronDown, Clock3,
  DollarSign, LayoutDashboard, LogOut, Menu, MoreVertical, Search,
  Settings, Sparkles, Tags, User, X,
} from "lucide-react";
import ConfirmationModal from "../components/ConfirmationModal";
import api from "../services/api";
import { clearAuthSession } from "../services/authSession";
import "./ProviderDashboard.css";
import "./ProviderBookings.css";
import "./ProviderServices.css";

type Service = {
  id: number;
  provider_id: number;
  category_id: number;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  image_url: string | null;
  is_active: boolean;
};
type Category = { id: number; name: string; description: string | null; provider_id?: number | null };
type Booking = {
  id: number;
  service_id: number;
  customer_name: string;
  booking_date: string;
  start_time: string;
  status: string;
};
type Provider = { business_name?: string; is_verified?: boolean };
type ServiceForm = {
  category_id: string;
  name: string;
  description: string;
  price: string;
  duration_minutes: string;
  image_url: string;
  is_active: boolean;
};
type StatusFilter = "all" | "active" | "inactive";
type SortMode = "newest" | "oldest" | "price-low" | "price-high" | "most-booked";

const emptyForm: ServiceForm = {
  category_id: "", name: "", description: "", price: "", duration_minutes: "30", image_url: "", is_active: true,
};
const getError = (error: unknown, fallback: string) => {
  const requestError = error as { response?: { data?: { detail?: unknown } }; message?: string };
  const detail = requestError.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((item: { msg?: string }) => item?.msg || String(item)).join(", ");
  return requestError.message || fallback;
};
const formatPrice = (price: number) => `Rs ${Number(price).toLocaleString("en-LK")}`;
const formatTime = (value: string) => {
  const [hour, minute] = value.split(":").map(Number);
  const date = new Date(); date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
};
const formatBookingDate = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export default function ProviderServices() {
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortMode>("newest");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ServiceForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [moreOpenId, setMoreOpenId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Service | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [saving, setSaving] = useState(false);
  const [workingId, setWorkingId] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const [serviceResponse, categoryResponse, bookingResponse, profileResponse] = await Promise.all([
        api.get<Service[]>("/provider/services"),
        api.get<Category[]>("/categories/my"),
        api.get<Booking[]>("/provider/bookings"),
        api.get<Provider>("/provider/profile"),
      ]);
      const loadedServices = Array.isArray(serviceResponse.data) ? serviceResponse.data : [];
      setServices(loadedServices);
      setCategories(Array.isArray(categoryResponse.data) ? categoryResponse.data : []);
      setBookings(Array.isArray(bookingResponse.data) ? bookingResponse.data : []);
      setProvider(profileResponse.data);
      const requestedEditId = Number(new URLSearchParams(window.location.search).get("edit"));
      const requestedService = loadedServices.find((service) => service.id === requestedEditId);
      if (requestedService) {
        openEdit(requestedService);
        const url = new URL(window.location.href);
        url.searchParams.delete("edit");
        window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
      }
    } catch (requestError) {
      console.error("Provider services error:", requestError);
      setError(getError(requestError, "Unable to load services."));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);
  const bookingCounts = useMemo(() => {
    const counts = new Map<number, number>();
    bookings.forEach((booking) => counts.set(booking.service_id, (counts.get(booking.service_id) || 0) + 1));
    return counts;
  }, [bookings]);
  const sortedServices = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = services.filter((service) => {
      const matchesSearch = !query || `${service.name} ${service.description || ""}`.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? service.is_active : !service.is_active);
      return matchesSearch && matchesStatus;
    });
    return list.sort((left, right) => {
      if (sort === "newest") return right.id - left.id;
      if (sort === "oldest") return left.id - right.id;
      if (sort === "price-low") return left.price - right.price;
      if (sort === "price-high") return right.price - left.price;
      return (bookingCounts.get(right.id) || 0) - (bookingCounts.get(left.id) || 0) || right.id - left.id;
    });
  }, [services, search, statusFilter, sort, bookingCounts]);
  const selectedService = services.find((service) => service.id === selectedServiceId) || null;
  const selectedRecentBookings = selectedService ? bookings
    .filter((booking) => booking.service_id === selectedService.id)
    .sort((left, right) => `${right.booking_date}T${right.start_time}`.localeCompare(`${left.booking_date}T${left.start_time}`))
    .slice(0, 4) : [];
  const activeCount = services.filter((service) => service.is_active).length;
  const inactiveCount = services.length - activeCount;
  const mostBooked = services.reduce<Service | null>((best, item) =>
    !best || (bookingCounts.get(item.id) || 0) > (bookingCounts.get(best.id) || 0) ? item : best, null);
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

  function openEdit(service: Service) {
    setEditingId(service.id);
    setForm({
      category_id: String(service.category_id), name: service.name,
      description: service.description || "", price: String(service.price),
      duration_minutes: String(service.duration_minutes), image_url: service.image_url || "",
      is_active: service.is_active,
    });
    setError("");
    setShowForm(true);
  }
  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setError("");
    setShowForm(true);
  };
  const closeForm = () => {
    if (saving) return;
    setShowForm(false);
    setEditingId(null);
  };
  const saveService = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.category_id || !form.name.trim() || !form.price || Number(form.price) <= 0 || !form.duration_minutes || Number(form.duration_minutes) <= 0) {
      setError("Enter a category, service name, valid price, and duration.");
      return;
    }
    if (form.image_url.trim()) {
      try { new URL(form.image_url.trim()); } catch { setError("Enter a valid image URL."); return; }
    }
    const payload = {
      category_id: Number(form.category_id),
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: Number(form.price),
      duration_minutes: Number(form.duration_minutes),
      image_url: form.image_url.trim() || null,
      is_active: form.is_active,
    };
    try {
      setSaving(true);
      setError("");
      if (editingId !== null) {
        const response = await api.patch<Service>(`/provider/services/${editingId}`, payload);
        setServices((current) => current.map((service) => service.id === editingId ? { ...service, ...response.data } : service));
        setToast("Service updated successfully.");
      } else {
        const response = await api.post<Service>("/provider/services", payload);
        setServices((current) => [response.data, ...current]);
        setToast("Service created successfully.");
      }
      setShowForm(false);
      setEditingId(null);
    } catch (requestError) {
      setError(getError(requestError, "Unable to save service."));
    } finally {
      setSaving(false);
    }
  };
  const toggleStatus = async (service: Service): Promise<boolean> => {
    try {
      setWorkingId(service.id);
      setError("");
      const response = await api.patch<Service>(`/provider/services/${service.id}`, { is_active: !service.is_active });
      setServices((current) => current.map((item) => item.id === service.id ? { ...item, ...response.data } : item));
      setToast(`Service ${service.is_active ? "deactivated" : "activated"} successfully.`);
      return true;
    } catch (requestError) {
      setError(getError(requestError, "Unable to update service status."));
      return false;
    } finally {
      setWorkingId(null);
    }
  };
  const deleteService = async () => {
    if (!confirmDelete) return;
    try {
      setWorkingId(confirmDelete.id);
      setDeleteError("");
      await api.delete(`/provider/services/${confirmDelete.id}`);
      setServices((current) => current.filter((service) => service.id !== confirmDelete.id));
      setSelectedServiceId(null);
      setConfirmDelete(null);
      setToast("Service deleted successfully.");
    } catch (requestError) {
      setDeleteError(getError(requestError, "Unable to delete service."));
    } finally {
      setWorkingId(null);
    }
  };
  const logout = () => { clearAuthSession(); window.location.href = "/login"; };
  const categoryName = (id: number) => categories.find((category) => category.id === id)?.name || "Service";
  return (
    <div className="provider-dashboard-layout provider-bookings-page provider-services-page">
      <aside className={`provider-sidebar ${sidebarOpen ? "open" : ""}`}>
        <button type="button" className="sidebar-close-button" onClick={() => setSidebarOpen(false)} aria-label="Close navigation"><X size={18} /></button>
        <div className="provider-sidebar-header"><div className="brand-mark">PB</div><div className="brand-copy"><h2>{provider?.business_name || "Provider Desk"}</h2><span>{provider?.is_verified ? "Verified provider" : "Provider workspace"}</span></div></div>
        <nav className="provider-sidebar-nav" aria-label="Primary navigation">{navItems.map(({ label, route, icon: Icon }) => <button key={label} type="button" className={`nav-button ${label === "Services" ? "active" : ""}`} aria-current={label === "Services" ? "page" : undefined} onClick={() => { setSidebarOpen(false); navigate(route); }}><span className="nav-icon"><Icon size={16} /></span><span className="nav-label">{label}</span></button>)}</nav>
        <div className="sidebar-footer"><button type="button" className="logout-button" onClick={logout}><LogOut size={16} /> Logout</button></div>
      </aside>
      {sidebarOpen && <button type="button" className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}

      <main className="provider-dashboard-main">
        <header className="provider-topbar">
          <div className="topbar-leading"><button type="button" className="icon-button mobile-menu-button" onClick={() => setSidebarOpen((open) => !open)} aria-label="Toggle navigation menu" aria-expanded={sidebarOpen}><Menu size={18} /></button><div><p className="crumb">Provider workspace</p><h1>Services</h1></div></div>
          <div className="topbar-actions">
            <div className="pb-dropdown-anchor"><button type="button" className="icon-button" aria-label="Notifications" aria-expanded={notificationsOpen} onClick={() => { setNotificationsOpen((open) => !open); setProfileOpen(false); }}><Bell size={18} /></button>{notificationsOpen && <div className="pb-header-dropdown"><strong>Notifications</strong><p>You&apos;re all caught up.</p></div>}</div>
            <div className="pb-dropdown-anchor"><button type="button" className="profile-chip" aria-label="Provider profile menu" aria-expanded={profileOpen} onClick={() => { setProfileOpen((open) => !open); setNotificationsOpen(false); }}><div className="profile-avatar">{(provider?.business_name || "P").slice(0, 1).toUpperCase()}</div><div className="profile-meta"><strong>{provider?.business_name || "Provider"}</strong><span>Business profile</span></div><ChevronDown size={16} /></button>{profileOpen && <div className="pb-header-dropdown profile-dropdown"><button type="button" onClick={() => navigate("/provider/profile")}><User size={15} /> Business profile</button><button type="button" onClick={() => navigate("/provider/profile")}><Settings size={15} /> Business settings</button><button type="button" onClick={logout}><LogOut size={15} /> Log out</button></div>}</div>
          </div>
        </header>

        <div className="provider-dashboard-shell pb-shell psv-shell">
          <section className="pb-page-heading psv-page-heading"><div><p className="section-eyebrow">Your catalog</p><h2>Services</h2><p>Manage the services you offer to your customers.</p></div><button type="button" className="primary-button" onClick={openCreate}><span>+</span> Add Service</button></section>

          {error && <div className="psv-alert" role="alert">{error}{!loading && <button type="button" onClick={() => void load()}>Try again</button>}</div>}

          <section className="psv-stats" aria-label="Service summary">
            <button type="button" className={`psv-stat ${statusFilter === "all" ? "selected" : ""}`} onClick={() => setStatusFilter("all")}><span className="psv-stat-icon"><BriefcaseBusiness size={17} /></span><span>Total Services</span><strong>{loading ? "—" : services.length}</strong></button>
            <button type="button" className={`psv-stat ${statusFilter === "active" ? "selected" : ""}`} onClick={() => setStatusFilter("active")}><span className="psv-stat-icon green"><Check size={17} /></span><span>Active Services</span><strong>{loading ? "—" : activeCount}</strong></button>
            <button type="button" className={`psv-stat ${statusFilter === "inactive" ? "selected" : ""}`} onClick={() => setStatusFilter("inactive")}><span className="psv-stat-icon muted"><X size={17} /></span><span>Inactive Services</span><strong>{loading ? "—" : inactiveCount}</strong></button>
            <button type="button" className="psv-stat psv-most-booked" onClick={() => mostBooked && setSelectedServiceId(mostBooked.id)}><span className="psv-stat-icon warm"><Sparkles size={17} /></span><span>Most Booked Service</span><strong>{loading ? "—" : mostBooked?.name || "—"}</strong><small>{mostBooked ? `${bookingCounts.get(mostBooked.id) || 0} bookings` : "Booking activity"}</small></button>
          </section>

          <section className="psv-toolbar" aria-label="Service search and filters">
            <label className="psv-search"><Search size={17} /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search services..." aria-label="Search services" /></label>
            <label className="psv-select"><span>Status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}><option value="all">All services</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
            <label className="psv-select"><span>Sort</span><select value={sort} onChange={(event) => setSort(event.target.value as SortMode)}><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="price-low">Price: Low to high</option><option value="price-high">Price: High to low</option><option value="most-booked">Most booked</option></select></label>
            <button type="button" className="primary-button psv-toolbar-add" onClick={openCreate}><span>+</span> Add Service</button>
          </section>

          <section className="psv-results">
            <div className="psv-results-heading"><div><p className="section-eyebrow">Service catalog</p><h2>{statusFilter === "all" ? "Your services" : `${statusFilter[0].toUpperCase()}${statusFilter.slice(1)} services`}</h2></div><span>{loading ? "Loading…" : `${sortedServices.length} service${sortedServices.length === 1 ? "" : "s"}`}</span></div>
            {loading ? <div className="psv-grid">{Array.from({ length: 6 }, (_, index) => <div className="psv-card-skeleton" key={index}><span className="pb-skeleton" /><span className="pb-skeleton" /><span className="pb-skeleton" /></div>)}</div>
              : error && services.length === 0 ? <div className="psv-empty error-state"><BriefcaseBusiness size={24} /><h3>Unable to load services.</h3><p>Please try again.</p><button type="button" className="secondary-button" onClick={() => void load()}>Try Again</button></div>
                : sortedServices.length === 0 ? <div className="psv-empty"><span className="psv-empty-icon"><BriefcaseBusiness size={23} /></span><h3>{services.length === 0 ? "No services yet" : "No matching services"}</h3><p>{services.length === 0 ? "Add your first service to start accepting customer bookings." : "Try a different search or status filter."}</p>{services.length === 0 ? <button type="button" className="primary-button" onClick={openCreate}>+ Add Service</button> : <button type="button" className="secondary-button" onClick={() => { setSearch(""); setStatusFilter("all"); }}>Clear filters</button>}</div>
                  : <div className="psv-grid">{sortedServices.map((service) => {
                    const count = bookingCounts.get(service.id) || 0;
                    return <article className="psv-card" key={service.id} onClick={() => setSelectedServiceId(service.id)} tabIndex={0} onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) setSelectedServiceId(service.id); }}>
                      <div className="psv-card-image">{service.image_url ? <img src={service.image_url} alt="" width={640} height={360} loading="lazy" decoding="async" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : <span><BriefcaseBusiness size={26} /></span>}<span className={`psv-status ${service.is_active ? "active" : "inactive"}`}><i />{service.is_active ? "Active" : "Inactive"}</span></div>
                      <div className="psv-card-body"><span className="psv-category">{categoryName(service.category_id)}</span><div className="psv-title-row"><h3>{service.name}</h3><strong>{formatPrice(service.price)}</strong></div><p className="psv-description">{service.description || "No description provided."}</p><div className="psv-meta"><span><Clock3 size={14} />{service.duration_minutes} min</span><span><CalendarDays size={14} />{count} booking{count === 1 ? "" : "s"}</span></div><div className="psv-card-actions" onClick={(event) => event.stopPropagation()}><button type="button" className="secondary-button" onClick={() => openEdit(service)}>Edit</button><button type="button" className={`psv-toggle ${service.is_active ? "on" : ""}`} aria-label={`${service.is_active ? "Deactivate" : "Activate"} ${service.name}`} aria-pressed={service.is_active} disabled={workingId === service.id} onClick={() => void toggleStatus(service)}><span />{workingId === service.id ? "Saving…" : service.is_active ? "Active" : "Inactive"}</button><div className="psv-more-wrap"><button type="button" className="psv-more" aria-label={`More actions for ${service.name}`} aria-expanded={moreOpenId === service.id} onClick={() => setMoreOpenId((id) => id === service.id ? null : service.id)}><MoreVertical size={18} /></button>{moreOpenId === service.id && <div className="psv-more-menu"><button type="button" onClick={() => { setMoreOpenId(null); setSelectedServiceId(service.id); }}>View details</button><button type="button" onClick={() => { setMoreOpenId(null); openEdit(service); }}>Edit service</button><button type="button" className="danger" onClick={() => { setMoreOpenId(null); setDeleteError(""); setConfirmDelete(service); }}>Delete service</button></div>}</div></div></div>
                    </article>;
                  })}</div>}
          </section>
        </div>
      </main>

      {showForm && <div className="psv-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeForm(); }}><form className="psv-modal" role="dialog" aria-modal="true" aria-labelledby="psv-form-title" onSubmit={(event) => void saveService(event)}><button type="button" className="psv-modal-close" aria-label="Close service form" onClick={closeForm}><X size={18} /></button><p className="section-eyebrow">Service management</p><h2 id="psv-form-title">{editingId === null ? "Add Service" : "Edit Service"}</h2><label>Service Name<input autoFocus required maxLength={150} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Example: Signature haircut" /></label><label>Category<select required value={form.category_id} onChange={(event) => setForm({ ...form, category_id: event.target.value })}><option value="">Select a category</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label>{categories.length === 0 && <p className="psv-field-hint">Add a category before creating a service.</p>}<label>Description<textarea maxLength={1000} rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Describe the service you provide…" /></label><div className="psv-form-row"><label>Price (Rs)<input required type="number" min="0.01" step="0.01" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} placeholder="2500" /></label><label>Duration<select required value={form.duration_minutes} onChange={(event) => setForm({ ...form, duration_minutes: event.target.value })}>{[15, 20, 30, 45, 60, 90, 120, 180, 240].map((duration) => <option key={duration} value={duration}>{duration} minutes</option>)}</select></label></div><label>Service Image URL<input type="url" value={form.image_url} onChange={(event) => setForm({ ...form, image_url: event.target.value })} placeholder="https://example.com/service.jpg" /></label>{form.image_url && <div className="psv-image-preview"><img src={form.image_url} alt="Service preview" width={640} height={360} loading="lazy" decoding="async" onError={(event) => { event.currentTarget.style.display = "none"; }} /></div>}<label className="psv-active-toggle"><span><strong>Service status</strong><small>{form.is_active ? "Available to customers" : "Hidden from new bookings"}</small></span><input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} /></label>{error && <p className="psv-form-error" role="alert">{error}</p>}<div className="psv-modal-actions"><button type="button" className="secondary-button" disabled={saving} onClick={closeForm}>Cancel</button><button type="submit" className="primary-button" disabled={saving || categories.length === 0}>{saving ? "Saving…" : editingId === null ? "Create Service" : "Save Changes"}</button></div></form></div>}

      {selectedService &&       <div className="psv-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedServiceId(null); }}><section className="psv-modal psv-details-modal" role="dialog" aria-modal="true" aria-labelledby="psv-detail-title"><button type="button" className="psv-modal-close" aria-label="Close service details" onClick={() => setSelectedServiceId(null)}><X size={18} /></button>{selectedService.image_url && <div className="psv-detail-image"><img src={selectedService.image_url} alt={selectedService.name} width={640} height={360} loading="lazy" decoding="async" /></div>}<p className="section-eyebrow">{categoryName(selectedService.category_id)}</p><div className="psv-detail-title-row"><h2 id="psv-detail-title">{selectedService.name}</h2><span className={`psv-status ${selectedService.is_active ? "active" : "inactive"}`}><i />{selectedService.is_active ? "Active" : "Inactive"}</span></div><p className="psv-detail-description">{selectedService.description || "No description provided."}</p><div className="psv-detail-stats"><div><small>Price</small><strong>{formatPrice(selectedService.price)}</strong></div><div><small>Duration</small><strong>{selectedService.duration_minutes} minutes</strong></div><div><small>Total bookings</small><strong>{bookingCounts.get(selectedService.id) || 0}</strong></div></div><div className="psv-recent"><h3>Recent bookings</h3>{selectedRecentBookings.length ? selectedRecentBookings.map((booking) => <div className="psv-recent-row" key={booking.id}><span className="psv-recent-avatar">{(booking.customer_name || "C").slice(0, 1).toUpperCase()}</span><strong>{booking.customer_name}</strong><span>{formatBookingDate(booking.booking_date)} · {formatTime(booking.start_time)}</span></div>) : <p>No bookings for this service yet.</p>}</div><div className="psv-modal-actions"><button type="button" className="secondary-button danger" disabled={workingId === selectedService.id} onClick={() => { setSelectedServiceId(null); setDeleteError(""); setConfirmDelete(selectedService); }}>Delete</button><button type="button" className="secondary-button" disabled={workingId === selectedService.id} onClick={() => void toggleStatus(selectedService)}>{selectedService.is_active ? "Deactivate" : "Activate"}</button><button type="button" className="primary-button" onClick={() => { setSelectedServiceId(null); openEdit(selectedService); }}>Edit Service</button></div></section></div>}
      <ConfirmationModal open={confirmDelete !== null} title="Delete service?" message={confirmDelete ? `Are you sure you want to delete "${confirmDelete.name}"? This action cannot be undone.` : "Are you sure you want to delete this service?"} confirmLabel="Delete Service" confirmButtonClassName="confirmation-button-danger" loading={workingId !== null} onCancel={() => { setConfirmDelete(null); setDeleteError(""); }} onConfirm={() => void deleteService()} />
      {deleteError && confirmDelete && <div className="psv-delete-error-backdrop"><section className="psv-delete-error" role="alertdialog" aria-modal="true"><h3>Service could not be deleted</h3><p>{deleteError}</p><p>If the service has existing bookings, deactivate it to prevent new bookings while preserving history.</p><div className="psv-modal-actions"><button type="button" className="secondary-button" onClick={() => { setConfirmDelete(null); setDeleteError(""); }}>Close</button><button type="button" className="primary-button" disabled={workingId === confirmDelete.id} onClick={() => { void toggleStatus(confirmDelete).then((updated) => { if (updated) { setConfirmDelete(null); setDeleteError(""); } }); }}>{confirmDelete.is_active ? "Deactivate Service" : "Keep Inactive"}</button></div></section></div>}
      {toast && <div className="pb-toast" role="status">{toast}</div>}
    </div>
  );
}
