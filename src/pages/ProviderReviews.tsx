import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell, BriefcaseBusiness, CalendarDays, Check, CheckCircle2, DollarSign,
  ChevronDown, Clock3, LayoutDashboard, LogOut, Menu, Search,
  Settings, Star, Tags, User, X,
} from "lucide-react";
import api from "../services/api";
import { clearAuthSession } from "../services/authSession";
import "./ProviderDashboard.css";
import "./ProviderBookings.css";
import "./ProviderReviews.css";

type Review = {
  id: number;
  booking_id: number;
  customer_id: number;
  provider_id: number;
  rating: number;
  title: string | null;
  comment: string | null;
  created_at: string;
  updated_at: string;
  customer_name: string;
  service_name: string;
  provider_name: string;
  verified_booking: boolean;
  booking_date: string | null;
  booking_start_time: string | null;
  booking_end_time: string | null;
  booking_price: number | null;
  booking_status: string | null;
};
type Service = { id: number; name: string };
type Provider = { business_name?: string; is_verified?: boolean };
type SortMode = "newest" | "oldest" | "highest" | "lowest";

const errorMessage = (error: unknown) => {
  const requestError = error as { response?: { data?: { detail?: unknown } }; message?: string };
  return typeof requestError.response?.data?.detail === "string"
    ? requestError.response.data.detail
    : requestError.message || "Unable to load reviews.";
};
const formatDate = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};
const formatTime = (value: string | null) => {
  if (!value) return "—";
  const [hour, minute] = value.split(":").map(Number);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
};
const formatPrice = (value: number | null) =>
  value === null ? "—" : `Rs ${Number(value).toLocaleString("en-LK")}`;

function StarRating({ rating, large = false }: { rating: number; large?: boolean }) {
  return (
    <span className={`pr-stars ${large ? "large" : ""}`} aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => <Star key={star} size={large ? 19 : 14} fill={star <= rating ? "currentColor" : "none"} className={star <= rating ? "filled" : "empty"} />)}
    </span>
  );
}

export default function ProviderReviews() {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [sort, setSort] = useState<SortMode>("newest");
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const loadReviews = async () => {
    try {
      setLoading(true);
      setError("");
      const [reviewResponse, serviceResponse, profileResponse] = await Promise.all([
        api.get<Review[]>("/reviews/provider/me"),
        api.get<Service[]>("/provider/services"),
        api.get<Provider>("/provider/profile"),
      ]);
      setReviews(Array.isArray(reviewResponse.data) ? reviewResponse.data : []);
      setServices(Array.isArray(serviceResponse.data) ? serviceResponse.data : []);
      setProvider(profileResponse.data);
    } catch (requestError) {
      console.error("Provider reviews error:", requestError);
      setError(errorMessage(requestError));
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void loadReviews(); }, []);

  const total = reviews.length;
  const average = total ? reviews.reduce((sum, review) => sum + review.rating, 0) / total : 0;
  const distribution = useMemo(() => [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: reviews.filter((review) => review.rating === rating).length,
  })), [reviews]);
  const filteredReviews = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = reviews.filter((review) =>
      (ratingFilter === "all" || review.rating === Number(ratingFilter))
      && (serviceFilter === "all" || review.service_name === serviceFilter)
      && (!query || `${review.customer_name} ${review.service_name} ${review.title || ""} ${review.comment || ""}`.toLowerCase().includes(query)),
    );
    return filtered.sort((left, right) => {
      if (sort === "highest") return right.rating - left.rating || right.created_at.localeCompare(left.created_at);
      if (sort === "lowest") return left.rating - right.rating || right.created_at.localeCompare(left.created_at);
      return sort === "newest" ? right.created_at.localeCompare(left.created_at) : left.created_at.localeCompare(right.created_at);
    });
  }, [reviews, search, ratingFilter, serviceFilter, sort]);

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
  const logout = () => { clearAuthSession(); window.location.href = "/login"; };
  const clearFilters = () => { setSearch(""); setRatingFilter("all"); setServiceFilter("all"); };
  const openDetails = (review: Review) => { setSelectedReview(review); setBookingOpen(false); };
  const toggleBooking = () => setBookingOpen((open) => !open);

  return (
    <div className="provider-dashboard-layout provider-bookings-page provider-reviews-page">
      <aside className={`provider-sidebar ${sidebarOpen ? "open" : ""}`}>
        <button type="button" className="sidebar-close-button" onClick={() => setSidebarOpen(false)} aria-label="Close navigation"><X size={18} /></button>
        <div className="provider-sidebar-header"><div className="brand-mark">PB</div><div className="brand-copy"><h2>{provider?.business_name || "Provider Desk"}</h2><span>{provider?.is_verified ? "Verified provider" : "Provider workspace"}</span></div></div>
        <nav className="provider-sidebar-nav" aria-label="Primary navigation">{navItems.map(({ label, route, icon: Icon }) => <button key={label} type="button" className={`nav-button ${label === "Reviews" ? "active" : ""}`} aria-current={label === "Reviews" ? "page" : undefined} onClick={() => { setSidebarOpen(false); navigate(route); }}><span className="nav-icon"><Icon size={16} /></span><span className="nav-label">{label}</span></button>)}</nav>
        <div className="sidebar-footer"><button type="button" className="logout-button" onClick={logout}><LogOut size={16} /> Logout</button></div>
      </aside>
      {sidebarOpen && <button type="button" className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}

      <main className="provider-dashboard-main">
        <header className="provider-topbar">
          <div className="topbar-leading"><button type="button" className="icon-button mobile-menu-button" onClick={() => setSidebarOpen((open) => !open)} aria-label="Toggle navigation menu" aria-expanded={sidebarOpen}><Menu size={18} /></button><div><p className="crumb">Provider workspace</p><h1>Reviews</h1></div></div>
          <div className="topbar-actions">
            <div className="pb-dropdown-anchor"><button type="button" className="icon-button" aria-label="Notifications" aria-expanded={notificationsOpen} onClick={() => { setNotificationsOpen((open) => !open); setProfileOpen(false); }}><Bell size={18} /></button>{notificationsOpen && <div className="pb-header-dropdown"><strong>Notifications</strong><p>You&apos;re all caught up.</p></div>}</div>
            <div className="pb-dropdown-anchor"><button type="button" className="profile-chip" aria-label="Provider profile menu" aria-expanded={profileOpen} onClick={() => { setProfileOpen((open) => !open); setNotificationsOpen(false); }}><div className="profile-avatar">{(provider?.business_name || "P").slice(0, 1).toUpperCase()}</div><div className="profile-meta"><strong>{provider?.business_name || "Provider"}</strong><span>Business profile</span></div><ChevronDown size={16} /></button>{profileOpen && <div className="pb-header-dropdown profile-dropdown"><button type="button" onClick={() => navigate("/provider/profile")}><User size={15} /> Business profile</button><button type="button" onClick={() => navigate("/provider/profile")}><Settings size={15} /> Business settings</button><button type="button" onClick={logout}><LogOut size={15} /> Log out</button></div>}</div>
          </div>
        </header>

        <div className="provider-dashboard-shell pb-shell pr-shell">
          <section className="pb-page-heading pr-heading"><div><p className="section-eyebrow">Customer feedback</p><h2>Reviews</h2><p>View and manage feedback from your customers.</p></div><div className="pr-rating-summary"><span className="pr-rating-star"><Star size={21} fill="currentColor" /></span><strong>{loading ? "—" : average.toFixed(1)}</strong><div><b>Overall Rating</b><span>Based on {loading ? "—" : total} {total === 1 ? "review" : "reviews"}</span></div></div></section>

          {error && <div className="pr-alert" role="alert"><span>Unable to load reviews. Please try again.</span><button type="button" onClick={() => void loadReviews()}>Try Again</button></div>}

          <section className="pr-stat-grid" aria-label="Review statistics">
            {[{ rating: "overall", label: "Overall Rating", value: loading ? "—" : average.toFixed(1), icon: Star }, { rating: "all", label: "Total Reviews", value: loading ? "—" : total, icon: CheckCircle2 }, ...distribution.map(({ rating, count }) => ({ rating: String(rating), label: `${rating} Star Reviews`, value: loading ? "—" : count, icon: Star }))].map(({ rating, label, value, icon: Icon }) => (
              <button type="button" key={rating} className={`pr-stat-card ${ratingFilter === rating || (rating === "overall" && ratingFilter === "all") ? "selected" : ""}`} onClick={() => setRatingFilter(rating === "overall" ? "all" : rating === "all" ? "all" : rating)} aria-pressed={rating === "overall" ? ratingFilter === "all" : ratingFilter === rating}>
                <span className={`pr-stat-icon ${rating === "overall" || rating === "5" ? "gold" : ""}`}><Icon size={16} /></span><span>{label}</span><strong>{value}</strong>
              </button>
            ))}
          </section>

          <section className="pr-breakdown" aria-label="Rating distribution">
            <div className="pr-breakdown-heading"><div><p className="section-eyebrow">At a glance</p><h2>Rating breakdown</h2></div><span>{loading ? "—" : total} reviews</span></div>
            {loading ? <div className="pr-breakdown-skeleton">{[1, 2, 3, 4, 5].map((item) => <span key={item} className="pb-skeleton" />)}</div> : <div className="pr-bars">{distribution.map(({ rating, count }) => <button type="button" className={`pr-bar-row ${ratingFilter === String(rating) ? "selected" : ""}`} key={rating} onClick={() => setRatingFilter(ratingFilter === String(rating) ? "all" : String(rating))} aria-label={`Filter ${rating} star reviews, ${count} reviews`}>
              <span>{rating} <Star size={12} fill="currentColor" /></span><span className="pr-bar-track"><i style={{ width: `${total ? (count / total) * 100 : 0}%` }} /></span><strong>{count}</strong>
            </button>)}</div>}
          </section>

          <section className="pr-toolbar" aria-label="Review search and filters">
            <label className="pr-search"><Search size={17} /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search reviews..." aria-label="Search reviews" /></label>
            <label className="pr-filter"><span>Rating</span><select value={ratingFilter} onChange={(event) => setRatingFilter(event.target.value)}><option value="all">All Ratings</option>{[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} Star{rating === 1 ? "" : "s"}</option>)}</select></label>
            <label className="pr-filter"><span>Service</span><select value={serviceFilter} onChange={(event) => setServiceFilter(event.target.value)}><option value="all">All Services</option>{services.map((service) => <option key={service.id} value={service.name}>{service.name}</option>)}</select></label>
            <label className="pr-filter"><span>Sort</span><select value={sort} onChange={(event) => setSort(event.target.value as SortMode)}><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="highest">Highest Rating</option><option value="lowest">Lowest Rating</option></select></label>
            {(search || ratingFilter !== "all" || serviceFilter !== "all") && <button type="button" className="pr-clear" onClick={clearFilters}>Clear filters</button>}
          </section>

          <section className="pr-reviews-section">
            <div className="pr-list-heading"><div><p className="section-eyebrow">Feedback</p><h2>Customer Reviews</h2></div><span>{loading ? "Loading…" : `${filteredReviews.length} review${filteredReviews.length === 1 ? "" : "s"}`}</span></div>
            {loading ? <div className="pr-review-grid">{[1, 2, 3, 4, 5, 6].map((item) => <div className="pr-review-skeleton" key={item}><span className="pb-skeleton" /><span className="pb-skeleton" /><span className="pb-skeleton" /></div>)}</div>
              : error ? <div className="pr-empty pr-error"><span className="pr-empty-icon"><Star size={22} /></span><h3>Unable to load reviews.</h3><p>Please try again.</p><button type="button" className="secondary-button" onClick={() => void loadReviews()}>Try Again</button></div>
                : filteredReviews.length === 0 ? <div className="pr-empty"><span className="pr-empty-icon"><Star size={22} /></span><h3>{reviews.length === 0 ? "No reviews yet" : "No reviews match your filters"}</h3><p>{reviews.length === 0 ? "Customer reviews will appear here after customers complete their bookings." : "Try another search or filter."}</p>{reviews.length === 0 ? <button type="button" className="secondary-button" onClick={() => navigate("/provider/bookings")}>View Bookings</button> : <button type="button" className="secondary-button" onClick={clearFilters}>Clear Filters</button>}</div>
                  : <div className="pr-review-grid">{filteredReviews.map((review) => <article className="pr-review-card" key={review.id} onClick={() => openDetails(review)} tabIndex={0} onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) openDetails(review); }}>
                    <div className="pr-review-top"><span className="pr-avatar">{(review.customer_name || "C").slice(0, 1).toUpperCase()}</span><div className="pr-customer-copy"><strong>{review.customer_name}</strong>{review.verified_booking && <span className="pr-verified"><CheckCircle2 size={12} />Verified Booking</span>}</div></div>
                    <div className="pr-rating-row"><StarRating rating={review.rating} /><strong>{review.rating.toFixed(1)}</strong></div>
                    {review.title && <h3 className="pr-review-title">{review.title}</h3>}
                    <p className="pr-review-comment">{review.comment || "No written feedback was provided."}</p>
                    <div className="pr-review-meta"><span>{review.service_name}</span><i /> <span>{formatDate(review.created_at)}</span></div>
                    <div className="pr-review-footer"><span>Booking #{review.booking_id}</span><button type="button" onClick={(event) => { event.stopPropagation(); openDetails(review); setBookingOpen(true); }}>View Booking</button></div>
                  </article>)}</div>}
          </section>
        </div>
      </main>
      {selectedReview && <div className="pr-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setSelectedReview(null); setBookingOpen(false); } }}><section className="pr-modal" role="dialog" aria-modal="true" aria-labelledby="pr-detail-title"><button type="button" className="pr-modal-close" aria-label="Close review details" onClick={() => { setSelectedReview(null); setBookingOpen(false); }}><X size={18} /></button><p className="section-eyebrow">Review details</p><h2 id="pr-detail-title">{selectedReview.title || "Customer feedback"}</h2><div className="pr-detail-customer"><span className="pr-avatar large">{(selectedReview.customer_name || "C").slice(0, 1).toUpperCase()}</span><div><strong>{selectedReview.customer_name}</strong><span>{selectedReview.verified_booking && <span className="pr-verified"><CheckCircle2 size={12} />Verified Booking</span>}</span></div></div><div className="pr-detail-rating"><StarRating rating={selectedReview.rating} large /><strong>{selectedReview.rating.toFixed(1)} / 5</strong></div><blockquote>{selectedReview.comment || "No written feedback was provided."}</blockquote><div className="pr-detail-grid"><div><small>Service</small><strong>{selectedReview.service_name}</strong></div><div><small>Review date</small><strong>{formatDate(selectedReview.created_at)}</strong></div><div><small>Booking date</small><strong>{selectedReview.booking_date ? formatDate(selectedReview.booking_date) : "—"}</strong></div><div><small>Booking reference</small><strong>#{selectedReview.booking_id}</strong></div></div>{bookingOpen && <div className="pr-booking-details"><h3>Related booking</h3><div><small>Customer</small><strong>{selectedReview.customer_name}</strong></div><div><small>Service</small><strong>{selectedReview.service_name}</strong></div><div><small>Date & time</small><strong>{selectedReview.booking_date ? formatDate(selectedReview.booking_date) : "—"} · {formatTime(selectedReview.booking_start_time)} – {formatTime(selectedReview.booking_end_time)}</strong></div><div><small>Price</small><strong>{formatPrice(selectedReview.booking_price)}</strong></div><div><small>Status</small><span className={`pb-status-badge ${selectedReview.booking_status || ""}`}>{selectedReview.booking_status || "—"}</span></div></div>}<div className="pr-detail-actions"><button type="button" className="secondary-button" onClick={() => setSelectedReview(null)}>Close</button>{!bookingOpen && <button type="button" className="primary-button" onClick={toggleBooking}>View Booking</button>}</div></section></div>}
    </div>
  );
}
