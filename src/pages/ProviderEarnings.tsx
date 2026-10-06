import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell, BriefcaseBusiness, CalendarDays, Check, ChevronDown,
  Clock3, DollarSign, LayoutDashboard, LogOut, Menu, Search,
  Settings, Tags, User, X,
} from "lucide-react";
import api from "../services/api";
import { clearAuthSession } from "../services/authSession";
import "./ProviderDashboard.css";
import "./ProviderBookings.css";
import "./ProviderEarnings.css";

type Earning = {
  booking_id: number;
  customer_id: number;
  customer_name: string;
  service_id: number;
  service_name: string;
  duration_minutes: number;
  booking_date: string;
  start_time: string;
  end_time: string;
  booking_status: string;
  price: number;
  payment_id: number | null;
  payment_amount: number | null;
  payment_status: string | null;
  transaction_id: string | null;
};
type EarningsData = {
  total_earnings: number;
  completed_bookings: number;
  average_booking_value: number;
  booking_count: number;
  completed_revenue: number;
  pending_revenue: number;
  refunded_revenue: number;
  earnings: Earning[];
};
type ServiceSort = "revenue" | "bookings" | "low";
type ChartMode = "daily" | "weekly" | "monthly";
type RangeName = "today" | "week" | "month" | "last-month" | "year" | "custom";
type FilterStatus = "all" | "paid" | "pending" | "refunded" | "unpaid" | "completed" | "confirmed" | "cancelled" | "net-revenue" | "paid-completed";
type Bucket = { key: string; label: string; amount: number };

const EMPTY_EARNINGS: Earning[] = [];
const localDateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const dateFromKey = (value: string) => new Date(`${value}T00:00:00`);
const errorText = (error: unknown) => {
  const requestError = error as { response?: { data?: { detail?: unknown } }; message?: string };
  return typeof requestError.response?.data?.detail === "string"
    ? requestError.response.data.detail
    : requestError.message || "Unable to load earnings.";
};
const money = (amount: number | null | undefined) =>
  `Rs ${Number(amount || 0).toLocaleString("en-LK", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const displayDate = (value: string, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) => {
  const parsed = dateFromKey(value.slice(0, 10));
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("en-US", options);
};
const displayTime = (value: string) => {
  const [hour, minute] = value.split(":").map(Number);
  const parsed = new Date();
  parsed.setHours(hour, minute, 0, 0);
  return parsed.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
};
const earningStatus = (item: Earning): string => {
  if (item.payment_status === "paid") return "paid";
  if (item.payment_status === "refunded") return "refunded";
  if (item.payment_status === "pending") return "pending";
  if (item.booking_status === "cancelled") return "cancelled";
  if (item.booking_status === "completed") return "completed";
  return item.booking_status || "unpaid";
};
const dateRange = (range: RangeName, customStart: string, customEnd: string) => {
  const now = new Date();
  const today = localDateKey(now);
  if (range === "today") return [today, today];
  if (range === "week") {
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return [localDateKey(monday), localDateKey(sunday)];
  }
  if (range === "month") return [localDateKey(new Date(now.getFullYear(), now.getMonth(), 1)), today];
  if (range === "last-month") return [
    localDateKey(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
    localDateKey(new Date(now.getFullYear(), now.getMonth(), 0)),
  ];
  if (range === "year") return [localDateKey(new Date(now.getFullYear(), 0, 1)), today];
  return [customStart || today, customEnd || today];
};
function makeBuckets(items: Earning[], mode: ChartMode, rangeStart: string, rangeEnd: string): Bucket[] {
  const sums = new Map<string, number>();
  const labels = new Map<string, string>();
  items.forEach((item) => {
    if (item.payment_status !== "paid" && item.payment_status !== "refunded") return;
    const date = dateFromKey(item.booking_date.slice(0, 10));
    let key: string;
    let label: string;
    if (mode === "monthly") {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      label = date.toLocaleDateString("en-US", { month: "short" });
    } else if (mode === "weekly") {
      const monday = new Date(date);
      monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
      key = localDateKey(monday);
      label = monday.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } else {
      key = localDateKey(date);
      label = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
    const signedAmount = item.payment_status === "refunded" ? -(item.payment_amount || 0) : item.payment_amount || 0;
    sums.set(key, (sums.get(key) || 0) + signedAmount);
    labels.set(key, label);
  });
  const start = dateFromKey(rangeStart);
  const end = dateFromKey(rangeEnd);
  if (mode === "daily" && (end.getTime() - start.getTime()) / 86400000 <= 45) {
    for (let day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
      const key = localDateKey(day);
      if (!sums.has(key)) {
        sums.set(key, 0);
        labels.set(key, day.toLocaleDateString("en-US", { month: "short", day: "numeric" }));
      }
    }
  }
  return [...sums.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, amount]) => ({ key, amount, label: labels.get(key) || key }));
}

export default function ProviderEarnings() {
  const navigate = useNavigate();
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [range, setRange] = useState<RangeName>("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [customOpen, setCustomOpen] = useState(false);
  const [chartMode, setChartMode] = useState<ChartMode>("daily");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [serviceSort, setServiceSort] = useState<ServiceSort>("revenue");
  const [selected, setSelected] = useState<Earning | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [providerName, setProviderName] = useState("Provider");
  const [reloadKey, setReloadKey] = useState(0);

  const [rangeStart, rangeEnd] = dateRange(range, customStart, customEnd);
  useEffect(() => {
    let cancelled = false;
    const loadEarnings = async () => {
      try {
        const [earningsResponse, profileResponse] = await Promise.all([
          api.get<EarningsData>("/provider/earnings", { params: { start_date: rangeStart, end_date: rangeEnd } }),
          api.get<{ business_name?: string }>("/provider/profile"),
        ]);
        if (cancelled) return;
        setData(earningsResponse.data);
        setProviderName(profileResponse.data.business_name || "Provider");
        setError("");
      } catch (requestError) {
        if (cancelled) return;
        console.error("Provider earnings error:", requestError);
        setError(errorText(requestError));
        setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadEarnings();
    return () => { cancelled = true; };
  }, [rangeStart, rangeEnd, reloadKey]);

  const records = data?.earnings ?? EMPTY_EARNINGS;
  const services = useMemo(() => {
    const byService = new Map<number, { id: number; name: string; bookings: number; revenue: number }>();
    for (const item of records) {
      const service = byService.get(item.service_id) || { id: item.service_id, name: item.service_name, bookings: 0, revenue: 0 };
      service.bookings += 1;
      if (item.payment_status === "paid") service.revenue += item.payment_amount || 0;
      if (item.payment_status === "refunded") service.revenue -= item.payment_amount || 0;
      byService.set(item.service_id, service);
    }
    return [...byService.values()].sort((left, right) =>
      serviceSort === "bookings" ? right.bookings - left.bookings || right.revenue - left.revenue
        : serviceSort === "low" ? left.revenue - right.revenue
          : right.revenue - left.revenue,
    );
  }, [records, serviceSort]);
  const serviceNames = useMemo(() => [...new Set(records.map((item) => item.service_name))].sort(), [records]);
  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records.filter((item) => {
      const status = earningStatus(item);
      const statusMatches = statusFilter === "all"
        || (statusFilter === "net-revenue" && ["paid", "refunded"].includes(item.payment_status || ""))
        || (statusFilter === "paid-completed" && item.payment_status === "paid" && item.booking_status === "completed")
        || (statusFilter !== "net-revenue" && statusFilter !== "paid-completed"
          && (status === statusFilter
            || item.booking_status.toLowerCase() === statusFilter
            || item.payment_status?.toLowerCase() === statusFilter));
      return statusMatches
        && (serviceFilter === "all" || item.service_name === serviceFilter)
        && (!query || `${item.customer_name} ${item.service_name} ${item.booking_id} ${item.transaction_id || ""}`.toLowerCase().includes(query));
    });
  }, [records, search, statusFilter, serviceFilter]);
  const chartBuckets = useMemo(() => makeBuckets(records, chartMode, rangeStart, rangeEnd), [records, chartMode, rangeStart, rangeEnd]);
  const maxChartValue = Math.max(1, ...chartBuckets.map((bucket) => Math.abs(bucket.amount)));
  const chartPoints = chartBuckets.map((bucket, index) => {
    const x = chartBuckets.length < 2 ? 400 : 42 + (index * 716) / (chartBuckets.length - 1);
    const y = 162 - (bucket.amount / maxChartValue) * 130;
    return `${x},${y}`;
  }).join(" ");
  const hasRecords = records.length > 0;
  const completedAmount = data?.completed_revenue || 0;
  const pendingAmount = data?.pending_revenue || 0;
  const netAmount = data?.total_earnings || 0;
  const refundAmount = data?.refunded_revenue || 0;
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
  const clearFilters = () => { setSearch(""); setStatusFilter("all"); setServiceFilter("all"); };
  const logout = () => { clearAuthSession(); window.location.href = "/login"; };
  const retryLoad = () => {
    setLoading(true);
    setError("");
    setReloadKey((key) => key + 1);
  };
  const applyCustomRange = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!customStart || !customEnd || customEnd < customStart) return;
    setLoading(true);
    setError("");
    setRange("custom");
    setReloadKey((key) => key + 1);
    setCustomOpen(false);
  };
  const selectedRangeLabel = range === "custom"
    ? `${displayDate(rangeStart, { month: "short", day: "numeric" })} – ${displayDate(rangeEnd, { month: "short", day: "numeric", year: "numeric" })}`
    : ({ today: "Today", week: "This Week", month: "This Month", "last-month": "Last Month", year: "This Year", custom: "Custom Range" } as const)[range];

  return (
    <div className="provider-dashboard-layout provider-bookings-page provider-earnings-page">
      <aside className={`provider-sidebar ${sidebarOpen ? "open" : ""}`}>
        <button type="button" className="sidebar-close-button" onClick={() => setSidebarOpen(false)} aria-label="Close navigation"><X size={18} /></button>
        <div className="provider-sidebar-header"><div className="brand-mark">PB</div><div className="brand-copy"><h2>{providerName}</h2><span>Provider workspace</span></div></div>
        <nav className="provider-sidebar-nav" aria-label="Primary navigation">{navItems.map(({ label, route, icon: Icon }) => <button key={label} type="button" className={`nav-button ${label === "Earnings" ? "active" : ""}`} aria-current={label === "Earnings" ? "page" : undefined} onClick={() => { setSidebarOpen(false); navigate(route); }}><span className="nav-icon"><Icon size={16} /></span><span className="nav-label">{label}</span></button>)}</nav>
        <div className="sidebar-footer"><button type="button" className="logout-button" onClick={logout}><LogOut size={16} /> Logout</button></div>
      </aside>
      {sidebarOpen && <button type="button" className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}

      <main className="provider-dashboard-main">
        <header className="provider-topbar">
          <div className="topbar-leading"><button type="button" className="icon-button mobile-menu-button" onClick={() => setSidebarOpen((open) => !open)} aria-label="Toggle navigation menu" aria-expanded={sidebarOpen}><Menu size={18} /></button><div><p className="crumb">Provider workspace</p><h1>Earnings</h1></div></div>
          <div className="topbar-actions">
            <div className="pb-dropdown-anchor"><button type="button" className="icon-button" aria-label="Notifications" aria-expanded={notificationsOpen} onClick={() => { setNotificationsOpen((open) => !open); setProfileOpen(false); }}><Bell size={18} /></button>{notificationsOpen && <div className="pb-header-dropdown"><strong>Notifications</strong><p>You&apos;re all caught up.</p></div>}</div>
            <div className="pb-dropdown-anchor"><button type="button" className="profile-chip" aria-label="Provider profile menu" aria-expanded={profileOpen} onClick={() => { setProfileOpen((open) => !open); setNotificationsOpen(false); }}><div className="profile-avatar">{providerName.slice(0, 1).toUpperCase()}</div><div className="profile-meta"><strong>{providerName}</strong><span>Business profile</span></div><ChevronDown size={16} /></button>{profileOpen && <div className="pb-header-dropdown profile-dropdown"><button type="button" onClick={() => navigate("/provider/profile")}><User size={15} /> Business profile</button><button type="button" onClick={() => navigate("/provider/profile")}><Settings size={15} /> Business settings</button><button type="button" onClick={logout}><LogOut size={15} /> Log out</button></div>}</div>
          </div>
        </header>

        <div className="provider-dashboard-shell pb-shell pe-shell">
          <section className="pb-page-heading pe-heading"><div><p className="section-eyebrow">Financial overview</p><h2>Earnings</h2><p>Track your revenue and booking income.</p></div><label className="pe-range-select"><CalendarDays size={16} /><select value={range} onChange={(event) => { const selectedRange = event.target.value as RangeName; if (selectedRange === "custom") { setCustomOpen(true); return; } setLoading(true); setError(""); setRange(selectedRange); setReloadKey((key) => key + 1); }} aria-label="Earnings date range"><option value="today">Today</option><option value="week">This Week</option><option value="month">This Month</option><option value="last-month">Last Month</option><option value="year">This Year</option><option value="custom">Custom Range</option></select></label></section>

          {error && <div className="pe-alert" role="alert"><span>Unable to load earnings. Please try again.</span><button type="button" onClick={retryLoad}>Try Again</button></div>}

          {loading ? <section className="pe-stat-grid">{[1, 2, 3, 4].map((item) => <div className="pe-stat-skeleton" key={item}><span className="pb-skeleton" /><span className="pb-skeleton" /><span className="pb-skeleton" /></div>)}</section>
            : error ? <div className="pe-empty"><h3>Unable to load earnings.</h3><p>Please try again.</p><button type="button" className="secondary-button" onClick={retryLoad}>Try Again</button></div>
              : !hasRecords ? <div className="pe-empty pe-no-earnings"><span className="pe-empty-icon"><DollarSign size={23} /></span><h3>No earnings yet</h3><p>Your earnings will appear here after customers complete bookings.</p><button type="button" className="primary-button" onClick={() => navigate("/provider/bookings")}>View Bookings</button></div>
                : <>
                  <section className="pe-stat-grid" aria-label="Earnings summary">
                    {[{ label: "Total Earnings", value: money(data?.total_earnings), note: "Paid revenue less refunds", icon: DollarSign, accent: "green", filter: "net-revenue" }, { label: "Completed Revenue", value: money(data?.completed_revenue), note: "Paid, completed bookings", icon: Check, accent: "blue", filter: "paid-completed" }, { label: "Pending Revenue", value: money(data?.pending_revenue), note: "Payments awaiting settlement", icon: Clock3, accent: "amber", filter: "pending" }, { label: "Total Bookings", value: String(data?.booking_count || 0), note: `${data?.completed_bookings || 0} completed`, icon: CalendarDays, accent: "slate", filter: "all" }].map(({ label, value, note, icon: Icon, accent, filter }) => <button type="button" className={`pe-stat-card ${statusFilter === filter ? "selected" : ""}`} key={label} onClick={() => setStatusFilter(filter as FilterStatus)}><span className={`pe-stat-icon ${accent}`}><Icon size={17} /></span><span className="pe-stat-label">{label}</span><strong>{value}</strong><small>{note}</small></button>)}
                  </section>

                  <section className="pe-chart-card">
                    <div className="pe-section-heading"><div><p className="section-eyebrow">Revenue trend</p><h2>Revenue</h2><p>Based on paid payments less refunds · {selectedRangeLabel}</p></div><div className="pe-chart-switch" role="group" aria-label="Revenue chart grouping">{(["daily", "weekly", "monthly"] as ChartMode[]).map((mode) => <button type="button" className={chartMode === mode ? "active" : ""} key={mode} onClick={() => setChartMode(mode)}>{mode[0].toUpperCase() + mode.slice(1)}</button>)}</div></div>
                    {chartBuckets.length ? <div className="pe-chart-wrap"><svg className="pe-chart" viewBox="0 0 800 220" role="img" aria-label={`${chartMode} net paid revenue chart`} preserveAspectRatio="none"><line x1="42" y1="32" x2="758" y2="32" /><line x1="42" y1="97" x2="758" y2="97" /><line x1="42" y1="162" x2="758" y2="162" /><text x="2" y="35">{money(maxChartValue)}</text><text x="2" y="100">{money(maxChartValue / 2)}</text><text x="2" y="165">{money(0)}</text>{chartBuckets.length > 1 && <polyline points={chartPoints} />}{chartBuckets.map((bucket, index) => { const x = chartBuckets.length < 2 ? 400 : 42 + (index * 716) / (chartBuckets.length - 1); const y = 162 - (bucket.amount / maxChartValue) * 130; const labelStride = Math.max(1, Math.ceil(chartBuckets.length / 7)); return <g key={bucket.key}><circle cx={x} cy={y} r="5"><title>{bucket.label}: {money(bucket.amount)}</title></circle>{(index % labelStride === 0 || index === chartBuckets.length - 1) && <text className="pe-chart-label" x={x} y="195" textAnchor="middle">{bucket.label}</text>}</g>; })}</svg></div> : <div className="pe-chart-empty">No paid revenue recorded for this date range.</div>}
                  </section>

                  <div className="pe-lower-grid">
                    <section className="pe-panel"><div className="pe-section-heading"><div><p className="section-eyebrow">Period totals</p><h2>Revenue Breakdown</h2></div></div><div className="pe-breakdown-row"><span>Paid, completed bookings</span><strong>{money(completedAmount)}</strong></div><div className="pe-breakdown-row"><span>Payments pending</span><strong>{money(pendingAmount)}</strong></div><div className="pe-breakdown-row"><span>Refunds issued</span><strong className="negative">{refundAmount ? `−${money(refundAmount)}` : money(0)}</strong></div><div className="pe-breakdown-row total"><span>Net paid earnings</span><strong>{money(netAmount)}</strong></div><p className="pe-breakdown-note">Only recorded payments are counted. No platform fee or tax is applied by the current payment records.</p></section>

                    <section className="pe-panel"><div className="pe-section-heading pe-service-heading"><div><p className="section-eyebrow">Performance</p><h2>Service Earnings</h2></div><select value={serviceSort} onChange={(event) => setServiceSort(event.target.value as ServiceSort)} aria-label="Sort service earnings"><option value="revenue">Highest Revenue</option><option value="bookings">Most Bookings</option><option value="low">Lowest Revenue</option></select></div>{services.length ? <div className="pe-service-list">{services.map((service) => <div className="pe-service-row" key={service.id}><span className="pe-service-name">{service.name}</span><span>{service.bookings} bookings</span><strong>{money(service.revenue)}</strong></div>)}</div> : <div className="pe-chart-empty">No services in this period.</div>}</section>
                  </div>

                  <section className="pe-history">
                    <div className="pe-section-heading"><div><p className="section-eyebrow">Transactions</p><h2>Earning History</h2></div><span>{filteredRecords.length} records</span></div>
                    <div className="pe-filters"><label className="pe-search"><Search size={16} /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customer or service..." aria-label="Search earnings" /></label><label><span>Status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as FilterStatus)}><option value="all">All statuses</option><option value="net-revenue">Paid / refunded</option><option value="paid-completed">Paid, completed</option><option value="paid">Paid</option><option value="pending">Payment pending</option><option value="refunded">Refunded</option><option value="unpaid">Unpaid</option><option value="completed">Completed booking</option><option value="confirmed">Confirmed booking</option><option value="cancelled">Cancelled booking</option></select></label><label><span>Service</span><select value={serviceFilter} onChange={(event) => setServiceFilter(event.target.value)}><option value="all">All services</option>{serviceNames.map((name) => <option key={name} value={name}>{name}</option>)}</select></label><label className="pe-date-label"><span>Date range</span><button type="button" onClick={() => setCustomOpen(true)}>{selectedRangeLabel}</button></label>{(search || statusFilter !== "all" || serviceFilter !== "all") && <button type="button" className="pe-clear" onClick={clearFilters}>Clear Filters</button>}</div>
                    {filteredRecords.length ? <><div className="pe-table-wrap"><table className="pe-table"><thead><tr><th>Date</th><th>Customer</th><th>Service / Booking</th><th>Payment</th><th>Amount</th><th></th></tr></thead><tbody>{filteredRecords.map((item) => <tr key={item.booking_id} onClick={() => setSelected(item)}><td>{displayDate(item.booking_date)}</td><td><span className="pe-customer"><i>{item.customer_name.slice(0, 1).toUpperCase()}</i>{item.customer_name}</span></td><td>{item.service_name}<small>#{item.booking_id}</small></td><td><span className={`pe-status ${earningStatus(item)}`}>{earningStatus(item)}</span></td><td className={item.payment_status === "refunded" ? "pe-refund-amount" : "pe-amount"}>{item.payment_amount === null ? "—" : money(item.payment_amount)}</td><td><button type="button" onClick={(event) => { event.stopPropagation(); setSelected(item); }}>Details</button></td></tr>)}</tbody></table></div><div className="pe-mobile-history">{filteredRecords.map((item) => <button type="button" className="pe-mobile-card" key={item.booking_id} onClick={() => setSelected(item)}><span className="pe-mobile-customer"><i>{item.customer_name.slice(0, 1).toUpperCase()}</i><strong>{item.customer_name}</strong><span className={`pe-status ${earningStatus(item)}`}>{earningStatus(item)}</span></span><span className="pe-mobile-service">{item.service_name} · #{item.booking_id}</span><span className="pe-mobile-date">{displayDate(item.booking_date)} · {displayTime(item.start_time)}</span><strong className={item.payment_status === "refunded" ? "pe-refund-amount" : "pe-amount"}>{item.payment_amount === null ? "No payment recorded" : money(item.payment_amount)}</strong><span className="pe-mobile-view">View Details</span></button>)}</div></> : <div className="pe-empty pe-filter-empty"><h3>No matching earnings</h3><p>Try another search or clear your filters.</p><button type="button" className="secondary-button" onClick={clearFilters}>Clear Filters</button></div>}
                  </section>
                </>}
        </div>
      </main>

      {selected && <div className="pe-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><section className="pe-modal" role="dialog" aria-modal="true" aria-labelledby="pe-detail-title"><button type="button" className="pe-modal-close" aria-label="Close earning details" onClick={() => setSelected(null)}><X size={18} /></button><p className="section-eyebrow">Booking financial details</p><h2 id="pe-detail-title">{selected.service_name}</h2><div className="pe-detail-customer"><i>{selected.customer_name.slice(0, 1).toUpperCase()}</i><strong>{selected.customer_name}</strong></div><div className="pe-detail-grid"><div><small>Booking reference</small><strong>#{selected.booking_id}</strong></div><div><small>Date & time</small><strong>{displayDate(selected.booking_date)} · {displayTime(selected.start_time)}</strong></div><div><small>Duration</small><strong>{selected.duration_minutes} minutes</strong></div><div><small>Booking status</small><span className={`pe-status ${selected.booking_status}`}>{selected.booking_status}</span></div><div><small>Service price</small><strong>{money(selected.price)}</strong></div>{selected.payment_amount !== null && <div><small>Recorded payment</small><strong>{money(selected.payment_amount)}</strong></div>}<div><small>Payment status</small><span className={`pe-status ${earningStatus(selected)}`}>{selected.payment_status || "Not paid"}</span></div>{selected.transaction_id && <div><small>Transaction</small><strong>{selected.transaction_id}</strong></div>}</div><p className="pe-detail-note">Discounts, taxes, platform fees, and provider payouts are not recorded in the current payment data.</p><div className="pe-modal-actions"><button type="button" className="primary-button" onClick={() => setSelected(null)}>Close</button></div></section></div>}

      {customOpen && <div className="pe-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCustomOpen(false); }}><form className="pe-modal pe-custom-modal" role="dialog" aria-modal="true" aria-labelledby="pe-custom-title" onSubmit={applyCustomRange}><button type="button" className="pe-modal-close" aria-label="Close date range" onClick={() => setCustomOpen(false)}><X size={18} /></button><p className="section-eyebrow">Earnings period</p><h2 id="pe-custom-title">Choose a date range</h2><label>From<input type="date" required value={customStart || rangeStart} onChange={(event) => setCustomStart(event.target.value)} /></label><label>To<input type="date" required min={customStart || rangeStart} value={customEnd || rangeEnd} onChange={(event) => setCustomEnd(event.target.value)} /></label><div className="pe-modal-actions"><button type="button" className="secondary-button" onClick={() => setCustomOpen(false)}>Cancel</button><button type="submit" className="primary-button">Apply Range</button></div></form></div>}
    </div>
  );
}
