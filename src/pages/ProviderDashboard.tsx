import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  Clock3,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  Sparkles,
  Star,
  TrendingUp,
  Tags,
  User,
  Wallet,
  X,
} from "lucide-react";

import ConfirmationModal from "../components/ConfirmationModal";
import { clearAuthSession } from "../services/authSession";
import api from "../services/api";
import "./ProviderDashboard.css";

type Booking = {
  id: number;
  service_id: number;
  customer_id: number;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
  service_name?: string;
  customer_name?: string;
  customer_email?: string;
  price?: number;
};

type Availability = {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  break_start?: string | null;
  break_end?: string | null;
  is_available: boolean;
};

type Review = {
  id: number;
  customer_id: number;
  service_id: number;
  rating: number;
  comment?: string | null;
  created_at?: string;
  customer_name?: string;
  service_name?: string;
};

type RatingSummary = {
  average_rating: number;
  total_reviews: number;
};

type Service = {
  id: number;
  provider_id: number;
  category_id: number;
  name: string;
  description?: string | null;
  price: number;
  duration_minutes: number;
  is_active: boolean;
};

type Category = {
  id: number;
  name: string;
  description?: string | null;
  provider_id?: number | null;
};

type ProviderProfile = {
  id: number;
  user_id: number;
  business_name: string;
  description?: string | null;
  location?: string | null;
  phone?: string | null;
  is_verified: boolean;
};

type StatItem = {
  label: string;
  value: string;
  helper: string;
  icon: typeof LayoutDashboard;
  accent: "cyan" | "violet" | "green" | "orange" | "slate" | "rose";
  trend?: string;
};

type RangeKey = "today" | "week" | "month" | "year";

const getApiErrorMessage = (error: unknown, fallback: string): string => {
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
    return detail.map((item: any) => item?.msg || String(item)).join(", ");
  }

  return requestError.message || fallback;
};

const formatTime = (time?: string | null) => {
  if (!time) return "-";
  return time.slice(0, 5);
};

const formatDate = (date?: string | null) => {
  if (!date) return "-";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString();
};

const getLocalDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const formatDateTime = (date?: string | null) => {
  if (!date) return "-";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatCurrency = (amount: number) => {
  if (!Number.isFinite(amount)) {
    return "Rs 0";
  }

  return `Rs ${amount.toLocaleString("en-LK")}`;
};

const getDayName = (day: number) => {
  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  return days[day] || "Unknown";
};

const getStatusClass = (status: string) => {
  const normalized = status.toLowerCase();

  if (normalized === "pending") return "status-badge status-pending";
  if (normalized === "confirmed") return "status-badge status-confirmed";
  if (normalized === "completed") return "status-badge status-completed";
  if (normalized === "cancelled") return "status-badge status-cancelled";

  return "status-badge status-default";
};

const getBookingLabel = (status: string) => {
  const normalized = status.toLowerCase();

  if (normalized === "completed") return "Completed";
  if (normalized === "confirmed") return "Confirmed";
  if (normalized === "cancelled") return "Cancelled";
  if (normalized === "pending") return "Pending";

  return status || "Unknown";
};

const getGreeting = () => {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

function StatCard({ label, value, helper, icon: Icon, accent, trend }: StatItem) {
  return (
    <div className={`metric-card metric-${accent}`}>
      <div className="metric-card-header">
        <div className="metric-icon-wrap">
          <Icon size={18} />
        </div>

        {trend ? (
          <div className="metric-trend">
            <TrendingUp size={14} />
            <span>{trend}</span>
          </div>
        ) : null}
      </div>

      <div className="metric-content">
        <p>{label}</p>
        <h3>{value}</h3>
        <span>{helper}</span>
      </div>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="section-header-row">
      <div>
        <p className="section-eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p className="section-description">{description}</p>
      </div>
      {action ? <div className="section-header-action">{action}</div> : null}
    </div>
  );
}

function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="empty-state-card">
      <div className="empty-state-icon">
        <Sparkles size={20} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {actionLabel && onAction ? (
        <button type="button" className="primary-button" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

function LoadingCard({ height = 140 }: { height?: number }) {
  return <div className="skeleton-card" style={{ height }} />;
}

function ProviderDashboard() {
  const navigate = useNavigate();

  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [ratingSummary, setRatingSummary] = useState<RatingSummary>({
    average_rating: 0,
    total_reviews: 0,
  });
  const [loading, setLoading] = useState(true);
  const [providerError, setProviderError] = useState("");
  const [success, setSuccess] = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [confirmDeleteAvailability, setConfirmDeleteAvailability] = useState<number | null>(null);
  const [confirmCancelBooking, setConfirmCancelBooking] = useState<number | null>(null);
  const [confirmDeleteService, setConfirmDeleteService] = useState<Service | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("dashboard");
  const [analyticsRange, setAnalyticsRange] = useState<RangeKey>("month");
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<string>(() => getLocalDateKey(new Date()));
  const [search, setSearch] = useState("");
  const [confirmationLoading, setConfirmationLoading] = useState(false);

  const [availabilityForm, setAvailabilityForm] = useState({
    day_of_week: 0,
    start_time: "09:00",
    end_time: "17:00",
    break_start: "",
    break_end: "",
    is_active: true,
  });

const loadProvider = async () => {
  try {
    const response = await api.get<ProviderProfile>(
      "/provider/profile"
    );

    setProvider(response.data);
  } catch (error) {
    setProviderError(
      getApiErrorMessage(
        error,
        "Unable to load provider profile."
      )
    );
  }
};

  const loadServices = async () => {
    try {
      const response = await api.get<Service[]>("/provider/services");
      setServices(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Services error:", error);
      setProviderError(getApiErrorMessage(error, "Unable to load services."));
    }
  };

  const loadCategories = async () => {
    try {
      const response = await api.get<Category[]>("/categories/my");
      setCategories(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Categories error:", error);
      setProviderError(getApiErrorMessage(error, "Unable to load categories."));
    }
  };

  const loadBookings = async () => {
    try {
      const response = await api.get<Booking[]>("/provider/bookings");
      setBookings(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Bookings error:", error);
      setProviderError(getApiErrorMessage(error, "Unable to load bookings."));
    }
  };

  const loadAvailability = async () => {
    try {
      const response = await api.get<Availability[]>("/availability/my");
      setAvailability(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Availability error:", error);
      setProviderError(getApiErrorMessage(error, "Unable to load availability."));
    }
  };

  const loadReviews = async () => {
    try {
      const profileResponse = await api.get<ProviderProfile>("/provider/profile");
      const providerId = Number(profileResponse.data?.id);

      if (!providerId) {
        throw new Error("Provider identity could not be resolved.");
      }

      const [reviewsResponse, ratingResponse] = await Promise.all([
        api.get<Review[]>(`/reviews/provider/${providerId}`),
        api.get<RatingSummary>(`/reviews/provider/${providerId}/rating`),
      ]);

      setReviews(Array.isArray(reviewsResponse.data) ? reviewsResponse.data : []);
      setRatingSummary({
        average_rating: Number(ratingResponse.data?.average_rating || 0),
        total_reviews: Number(ratingResponse.data?.total_reviews || 0),
      });
    } catch (error) {
      console.error("Reviews error:", error);
      setProviderError(getApiErrorMessage(error, "Unable to load reviews."));
    }
  };

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setProviderError("");

      await Promise.all([
        loadProvider(),
        loadServices(),
        loadCategories(),
        loadBookings(),
        loadAvailability(),
        loadReviews(),
      ]);
    } catch (error) {
      setProviderError(getApiErrorMessage(error, "Unable to load dashboard."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      loadBookings();
    }, 20000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const handleLogout = () => {
    clearAuthSession();
    window.location.href = "/login";
  };

  const scrollToSection = (id: string) => {
    const section = document.getElementById(id);

    if (section) {
      section.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  const updateBookingStatus = async (bookingId: number, status: string) => {
    try {
      setActionLoading(bookingId);
      setProviderError("");
      setSuccess("");

      await api.patch(`/provider/bookings/${bookingId}/status`, { status });

      setSuccess(`Booking ${status.toLowerCase()} successfully.`);
      await loadBookings();
    } catch (error) {
      setProviderError(getApiErrorMessage(error, "Unable to update booking status."));
    } finally {
      setActionLoading(null);
    }
  };

  const toggleServiceStatus = async (service: Service) => {
    try {
      setActionLoading(service.id);
      setProviderError("");
      setSuccess("");
      await api.patch(`/provider/services/${service.id}`, { is_active: !service.is_active });
      setSuccess(`Service ${service.is_active ? "deactivated" : "activated"} successfully.`);
      await loadServices();
    } catch (error) {
      setProviderError(getApiErrorMessage(error, "Unable to update service status."));
    } finally {
      setActionLoading(null);
    }
  };

  const createAvailability = async () => {
    try {
      setProviderError("");
      setSuccess("");

      await api.post("/availability/", {
        day_of_week: availabilityForm.day_of_week,
        start_time: availabilityForm.start_time,
        end_time: availabilityForm.end_time,
        break_start: availabilityForm.break_start || null,
        break_end: availabilityForm.break_end || null,
      });

      setSuccess("Availability added successfully.");
      await loadAvailability();
    } catch (error) {
      setProviderError(getApiErrorMessage(error, "Unable to create availability."));
    }
  };

  const toggleAvailability = async (item: Availability) => {
    try {
      setProviderError("");
      setSuccess("");

      await api.put(`/availability/${item.id}`, { is_available: !item.is_available });
      setSuccess("Availability updated successfully.");
      await loadAvailability();
    } catch (error) {
      setProviderError(getApiErrorMessage(error, "Unable to update availability."));
    }
  };

  const deleteAvailability = async (availabilityId: number) => {
    setConfirmDeleteAvailability(availabilityId);
  };

  const stats = useMemo(() => {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const todayKey = getLocalDateKey(todayDate);
    const pending = bookings.filter((booking) => booking.status.toLowerCase() === "pending").length;
    const confirmed = bookings.filter((booking) => booking.status.toLowerCase() === "confirmed").length;
    const completed = bookings.filter((booking) => booking.status.toLowerCase() === "completed").length;
    const today = bookings.filter((booking) => booking.booking_date?.slice(0, 10) === todayKey);
    const upcoming = bookings.filter((booking) => {
      const date = new Date(`${booking.booking_date}T00:00:00`);
      return date >= todayDate && !["cancelled", "completed"].includes(booking.status.toLowerCase());
    });
    const revenue = bookings.reduce((sum, booking) => {
      const amount = typeof booking.price === "number" ? booking.price : 0;
      return sum + amount;
    }, 0);

    return {
      totalBookings: bookings.length,
      todayBookings: today.length,
      upcomingBookings: upcoming.length,
      pending,
      confirmed,
      completed,
      activeServices: services.filter((service) => service.is_active).length,
      totalRevenue: revenue,
      averageRating: ratingSummary.average_rating,
    };
  }, [bookings, services, ratingSummary.average_rating]);

  const todayBookings = useMemo(() => {
    const today = new Date();
    const todayDate = getLocalDateKey(today);

    return [...bookings]
      .filter((booking) => booking.booking_date && booking.booking_date.slice(0, 10) === todayDate)
      .sort((a, b) => `${a.booking_date} ${a.start_time}`.localeCompare(`${b.booking_date} ${b.start_time}`));
  }, [bookings]);

  const upcomingBookings = useMemo(() => {
    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    return [...bookings]
      .filter((booking) => {
        const bookingDate = new Date(`${booking.booking_date}T00:00:00`);
        return bookingDate >= todayDate && !["cancelled", "completed"].includes(booking.status.toLowerCase());
      })
      .sort((a, b) => new Date(`${a.booking_date}T${a.start_time}`).getTime() - new Date(`${b.booking_date}T${b.start_time}`).getTime())
      .slice(0, 5);
  }, [bookings]);

  const availableBookingDates = useMemo(() => {
    return new Set(bookings.map((booking) => new Date(`${booking.booking_date}T00:00:00`).toDateString()));
  }, [bookings]);

  const calendarDays = useMemo(() => {
    const currentMonth = new Date();
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const startOffset = (monthStart.getDay() + 6) % 7;

    const days: Array<{ day: number; currentMonth: boolean; date: Date }> = [];

    for (let i = 0; i < 42; i += 1) {
      const date = new Date(monthStart);
      date.setDate(monthStart.getDate() + (i - startOffset));
      days.push({
        day: date.getDate(),
        currentMonth: date.getMonth() === currentMonth.getMonth(),
        date,
      });
    }

    return days;
  }, []);

  const recentActivity = useMemo(() => {
    const items: Array<{ id: string; title: string; detail: string; time: string; type: "booking" | "review" }> = [];

    bookings.slice(0, 5).forEach((booking) => {
      const title =
        booking.status === "pending"
          ? "New booking received"
          : booking.status === "confirmed"
            ? "Booking confirmed"
            : booking.status === "completed"
              ? "Booking completed"
              : "Booking updated";

      items.push({
        id: `booking-${booking.id}`,
        title,
        detail: `${booking.customer_name || `Customer #${booking.customer_id}`} • ${booking.service_name || `Service #${booking.service_id}`}`,
        time: formatDateTime(`${booking.booking_date}T${booking.start_time}`),
        type: "booking",
      });
    });

    reviews.slice(0, 3).forEach((review) => {
      items.push({
        id: `review-${review.id}`,
        title: "Customer submitted review",
        detail: `${review.customer_name || `Customer #${review.customer_id}`} rated ${review.rating}/5`,
        time: review.created_at ? formatDateTime(review.created_at) : "Recent",
        type: "review",
      });
    });

    return items
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 6);
  }, [bookings, reviews]);

  const analyticsChart = useMemo(() => {
    const now = new Date();
    const labels =
      analyticsRange === "today"
        ? ["6am", "9am", "12pm", "3pm", "6pm", "9pm"]
        : analyticsRange === "week"
          ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
          : analyticsRange === "month"
            ? ["W1", "W2", "W3", "W4", "W5"]
            : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const values = labels.map((label) => {
      if (analyticsRange === "today") {
        return bookings.filter((booking) => {
          if (!booking.booking_date) return false;
          const bookingDate = new Date(booking.booking_date);
          const sameDay = bookingDate.toDateString() === now.toDateString();
          if (!sameDay) return false;

          const startHour = Number(booking.start_time.slice(0, 2));

          if (label === "6am") return startHour >= 6 && startHour < 9;
          if (label === "9am") return startHour >= 9 && startHour < 12;
          if (label === "12pm") return startHour >= 12 && startHour < 15;
          if (label === "3pm") return startHour >= 15 && startHour < 18;
          if (label === "6pm") return startHour >= 18 && startHour < 21;
          return startHour >= 21 || startHour < 6;
        }).length;
      }

      if (analyticsRange === "week") {
        const idx = labels.indexOf(label);
        const current = new Date();
        current.setDate(current.getDate() - current.getDay() + idx + 1);
        const dayKey = current.toDateString();
        return bookings.filter((booking) => new Date(booking.booking_date).toDateString() === dayKey).length;
      }

      if (analyticsRange === "month") {
        const weekIndex = labels.indexOf(label);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const startDate = new Date(monthStart);
        startDate.setDate(monthStart.getDate() + weekIndex * 7);

        return bookings.filter((booking) => {
          const bookingDate = new Date(booking.booking_date);
          return bookingDate >= startDate && bookingDate < new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + 7);
        }).length;
      }

      const monthIndex = labels.indexOf(label);
      return bookings.filter((booking) => {
        const bookingDate = new Date(booking.booking_date);
        return bookingDate.getFullYear() === now.getFullYear() && bookingDate.getMonth() === monthIndex;
      }).length;
    });

    const maxValue = Math.max(...values, 1);

    return labels.map((label, index) => ({
      label,
      value: values[index],
      height: Math.max((values[index] / maxValue) * 100, values[index] > 0 ? 18 : 6),
    }));
  }, [analyticsRange, bookings]);

  const selectedDateBookings = useMemo(() => {
    return [...bookings].filter((booking) => booking.booking_date && booking.booking_date.slice(0, 10) === calendarSelectedDate);
  }, [bookings, calendarSelectedDate]);

  const visibleServices = useMemo(() => {
    const query = search.trim().toLowerCase();

    return services.filter((service) => {
      if (!query) return true;
      return (
        service.name.toLowerCase().includes(query) ||
        (service.description || "").toLowerCase().includes(query)
      );
    });
  }, [search, services]);

  const visibleBookings = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return todayBookings;
    return todayBookings.filter((booking) =>
      `${booking.customer_name || ""} ${booking.service_name || ""} ${booking.status}`.toLowerCase().includes(query)
    );
  }, [search, todayBookings]);

  const todayAvailability = useMemo(
    () => availability.filter((item) => item.day_of_week === (new Date().getDay() + 6) % 7 && item.is_available),
    [availability],
  );

  const formatRelativeTitle = () => {
    const now = new Date();
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(now);
  };

  const topNavItems = [
    { id: "dashboard", label: "Dashboard", route: "/provider/dashboard", icon: LayoutDashboard },
    { id: "bookings", label: "Bookings", route: "/provider/bookings", icon: CalendarDays },
    { id: "calendar", label: "Calendar", route: "/provider/calendar", icon: CalendarDays },
    { id: "services", label: "Services", route: "/provider/services", icon: BriefcaseBusiness },
    { id: "categories", label: "Categories", route: "/provider/categories", icon: Tags },
    { id: "availability", label: "Availability", route: "/provider/availability", icon: Clock3 },
    { id: "reviews", label: "Reviews", sectionId: "provider-reviews", icon: Star },
    { id: "earnings", label: "Earnings", route: "/provider/earnings", icon: Wallet },
  ];

  const statCards: StatItem[] = [
    {
      label: "Today's Bookings",
      value: String(stats.todayBookings),
      helper: stats.todayBookings ? "Appointments scheduled today" : "No appointments today",
      icon: CalendarDays,
      accent: "cyan",
      trend: stats.todayBookings ? "Today" : undefined,
    },
    {
      label: "Upcoming Bookings",
      value: String(stats.upcomingBookings),
      helper: "Confirmed and pending",
      icon: Clock3,
      accent: "violet",
    },
    {
      label: "Total Bookings",
      value: String(stats.totalBookings),
      helper: "All time bookings",
      icon: BriefcaseBusiness,
      accent: "slate",
    },
    {
      label: "Total Revenue",
      value: stats.totalRevenue > 0 ? formatCurrency(stats.totalRevenue) : "—",
      helper: stats.totalRevenue > 0 ? "From all booking totals" : "Revenue will appear here",
      icon: Wallet,
      accent: "green",
    },
    {
      label: "Pending Requests",
      value: String(stats.pending),
      helper: "Awaiting action",
      icon: Clock3,
      accent: "orange",
      trend: stats.pending > 0 ? "Needs review" : undefined,
    },
    {
      label: "Average Rating",
      value: ratingSummary.total_reviews ? ratingSummary.average_rating.toFixed(1) : "—",
      helper: ratingSummary.total_reviews ? `From ${ratingSummary.total_reviews} reviews` : "No reviews yet",
      icon: Star,
      accent: "rose",
      trend: ratingSummary.total_reviews ? `${ratingSummary.total_reviews} reviews` : undefined,
    },
  ];

  if (loading) {
    return (
      <div className="provider-dashboard-layout">
        <aside className="provider-sidebar provider-sidebar-loading">
          <div className="skeleton-block skeleton-brand" />
          <div className="skeleton-block skeleton-nav" />
          <div className="skeleton-block skeleton-nav" />
          <div className="skeleton-block skeleton-nav" />
        </aside>

        <main className="provider-dashboard-main">
          <div className="provider-dashboard-shell">
            <div className="skeleton-card skeleton-header" />
            <div className="stats-grid">
              {Array.from({ length: 6 }).map((_, index) => (
                <LoadingCard key={index} height={160} />
              ))}
            </div>
            <div className="content-grid">
              <LoadingCard height={260} />
              <LoadingCard height={260} />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="provider-dashboard-layout">
      <aside className={`provider-sidebar ${sidebarOpen ? "open" : ""}`}>
        <button type="button" className="sidebar-close-button" onClick={() => setSidebarOpen(false)} aria-label="Close navigation">
          <X size={18} />
        </button>
        <div className="provider-sidebar-header">
          <div className="brand-mark">PB</div>
          <div className="brand-copy">
            <h2>{provider?.business_name || "Provider Desk"}</h2>
            <span>{provider?.is_verified ? "Verified provider" : "Profile syncing"}</span>
          </div>
        </div>

        <nav className="provider-sidebar-nav" aria-label="Primary navigation">
          {topNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;

            return (
              <button
                key={item.id}
                type="button"
                className={`nav-button ${isActive ? "active" : ""}`}
                onClick={() => {
                  setActiveNav(item.id);
                  setSidebarOpen(false);

                  if (item.route) {
                    navigate(item.route);
                    return;
                  }

                  if (item.sectionId) {
                    scrollToSection(item.sectionId);
                  }
                }}
                aria-current={isActive ? "page" : undefined}
              >
                <span className="nav-icon"><Icon size={16} /></span>
                <span className="nav-label">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button type="button" className="logout-button" onClick={handleLogout}>
            <LogOut size={16} aria-hidden="true" />
            Logout
          </button>
        </div>
      </aside>
      {sidebarOpen ? <button type="button" className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} /> : null}

      <main className="provider-dashboard-main">
        <header className="provider-topbar">
          <div className="topbar-leading">
            <button type="button" className="icon-button mobile-menu-button" onClick={() => setSidebarOpen((value) => !value)} aria-label="Toggle navigation menu" aria-expanded={sidebarOpen}>
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div>
              <p className="crumb">Provider dashboard</p>
              <h1>Dashboard</h1>
            </div>
          </div>

          <div className="topbar-actions">
            <label className="search-shell" aria-label="Search bookings and services">
              <Search size={16} />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search services or bookings"
              />
            </label>

            <div className="dropdown-anchor">
            <button type="button" className="icon-button" aria-label="Notifications" aria-expanded={notificationsOpen} onClick={() => { setNotificationsOpen((value) => !value); setProfileOpen(false); }}>
              <Bell size={18} />
              {stats.pending > 0 ? <span className="notification-badge">{stats.pending}</span> : null}
            </button>

            {notificationsOpen ? (
              <div className="header-dropdown notification-dropdown">
                <strong>Notifications</strong>
                {stats.pending === 0 ? (
                  <p>You&apos;re all caught up.</p>
                ) : (
                  <>
                    <p>{stats.pending} booking request{stats.pending === 1 ? "" : "s"} need your attention.</p>
                    {bookings.filter((booking) => booking.status.toLowerCase() === "pending").slice(0, 3).map((booking) => (
                      <button type="button" key={booking.id} onClick={() => { setSelectedBooking(booking); setNotificationsOpen(false); }}>
                        <span>{booking.customer_name || `Customer #${booking.customer_id}`}</span>
                        <small>{booking.service_name || "New booking request"}</small>
                      </button>
                    ))}
                    <button type="button" className="dropdown-link" onClick={() => { setNotificationsOpen(false); navigate("/provider/bookings"); }}>Review bookings</button>
                  </>
                )}
              </div>
            ) : null}
            </div>

            <div className="dropdown-anchor profile-anchor">
            <button type="button" className="profile-chip" aria-label="Provider profile menu" aria-expanded={profileOpen} onClick={() => { setProfileOpen((value) => !value); setNotificationsOpen(false); }}>
              <div className="profile-avatar">{(provider?.business_name || "P").slice(0, 1).toUpperCase()}</div>
              <div className="profile-meta">
                <strong>{provider?.business_name || "Provider"}</strong>
                <span>{provider?.is_verified ? "Verified provider" : "Manage your profile"}</span>
              </div>
              <ChevronDown size={16} />
            </button>
            {profileOpen ? (
              <div className="header-dropdown profile-dropdown">
                <button type="button" onClick={() => navigate("/provider/profile")}><User size={15} /> Business profile</button>
                <button type="button" onClick={() => navigate("/provider/profile")}><Settings size={15} /> Business settings</button>
                <button type="button" onClick={handleLogout}><LogOut size={15} /> Log out</button>
              </div>
            ) : null}
            </div>
          </div>
        </header>

        <div className="provider-dashboard-shell">
          {providerError ? (
            <div className="provider-alert provider-alert-error">
              <div>
                <strong>Something went wrong.</strong>
                <p>{providerError}</p>
              </div>
              <button type="button" className="secondary-button" onClick={loadDashboard}>
                Try again
              </button>
            </div>
          ) : null}

          {success ? (
            <div className="provider-alert provider-alert-success">
              <div>
                <strong>Update complete.</strong>
                <p>{success}</p>
              </div>
              <button type="button" className="secondary-button" onClick={() => setSuccess("")}>
                Dismiss
              </button>
            </div>
          ) : null}

          <section className="welcome-panel">
            <div className="welcome-copy">
              <p className="section-eyebrow">Overview</p>
              <h2>{getGreeting()}, {provider?.business_name || "Provider"}</h2>
              <p>Here&apos;s what&apos;s happening with your business today.</p>
            </div>

            <div className="welcome-meta">
              <div className="today-pill">
                <CalendarDays size={16} />
                <span>{formatRelativeTitle()}</span>
              </div>
              <div className="status-pill">
                <span className="status-dot" />
                Active
              </div>
              <div className="status-pill category-pill">
                {categories.length} categories
              </div>
            </div>
          </section>

          <section className="stats-grid">
            {statCards.map((stat) => (
              <StatCard key={stat.label} {...stat} />
            ))}
          </section>

          <div className="content-grid">
            <section className="section-card bookings-panel" id="provider-bookings">
              <SectionHeader
                eyebrow="Schedule"
                title="Today&apos;s bookings"
                description="Live appointment list for this date."
                action={
                    <button type="button" className="secondary-button" onClick={() => navigate("/provider/bookings")}>
                    View all bookings
                  </button>
                }
              />

              {todayBookings.length === 0 ? (
                <EmptyState
                  title="No bookings today"
                  description="Your upcoming appointments will appear here."
                  actionLabel="View calendar"
                  onAction={() => navigate("/provider/calendar")}
                />
              ) : visibleBookings.length === 0 ? (
                <EmptyState title="No matching bookings" description="Try a different customer, service, or status search." />
              ) : (
                <div className="stack-list">
                  {visibleBookings.map((booking) => (
                    <div key={booking.id} className="booking-item">
                      <div className="booking-user">
                        <div className="user-avatar">{(booking.customer_name || `C${booking.customer_id}`).slice(0, 1).toUpperCase()}</div>
                        <div>
                          <h3>{booking.customer_name || `Customer #${booking.customer_id}`}</h3>
                          <p>{booking.service_name || `Service #${booking.service_id}`}</p>
                        </div>
                      </div>

                      <div className="booking-meta">
                        <span><CalendarDays size={14} />{formatDate(booking.booking_date)}</span>
                        <span><Clock3 size={14} />{formatTime(booking.start_time)} - {formatTime(booking.end_time)}</span>
                      </div>

                      <div className="booking-footer">
                        <span className={getStatusClass(booking.status)}>{getBookingLabel(booking.status)}</span>
                        <strong>{typeof booking.price === "number" ? formatCurrency(booking.price) : "Price pending"}</strong>
                        <div className="inline-actions booking-actions">
                          <button type="button" className="tiny-button" onClick={() => navigate("/provider/bookings")}>View details</button>
                          {booking.status.toLowerCase() === "pending" ? (
                            <>
                              <button type="button" className="tiny-button success" disabled={actionLoading === booking.id} onClick={() => updateBookingStatus(booking.id, "confirmed")}>{actionLoading === booking.id ? "Saving…" : "Confirm"}</button>
                              <button type="button" className="tiny-button danger" disabled={actionLoading === booking.id} onClick={() => setConfirmCancelBooking(booking.id)}>Reject</button>
                            </>
                          ) : null}
                          {booking.status.toLowerCase() === "confirmed" ? (
                            <button type="button" className="tiny-button danger" disabled={actionLoading === booking.id} onClick={() => setConfirmCancelBooking(booking.id)}>Cancel</button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="section-card upcoming-panel">
              <SectionHeader
                eyebrow="Upcoming"
                title="Upcoming bookings"
                description="Priority schedule and quick actions."
              />

              {upcomingBookings.length === 0 ? (
                <EmptyState
                  title="No upcoming bookings"
                  description="Your upcoming bookings will appear here."
                  actionLabel="Open calendar"
                  onAction={() => navigate("/provider/calendar")}
                />
              ) : (
                <div className="stack-list compact-stack">
                  {upcomingBookings.map((booking) => (
                    <div key={booking.id} className="upcoming-item">
                      <div className="upcoming-date">
                        <strong>{new Date(booking.booking_date).toLocaleDateString([], { month: "short", day: "numeric" })}</strong>
                        <span>{formatTime(booking.start_time)}</span>
                      </div>

                      <div className="upcoming-summary">
                        <h3>{booking.customer_name || `Customer #${booking.customer_id}`}</h3>
                        <p>{booking.service_name || `Service #${booking.service_id}`}</p>
                      </div>

                      <span className={getStatusClass(booking.status)}>{getBookingLabel(booking.status)}</span>

                      <div className="inline-actions">
                        <button type="button" className="tiny-button" onClick={() => navigate("/provider/bookings")}>View details</button>
                        {booking.status === "pending" ? (
                          <button type="button" className="tiny-button success" disabled={actionLoading === booking.id} onClick={() => updateBookingStatus(booking.id, "confirmed")}>Confirm</button>
                        ) : null}
                        {booking.status !== "cancelled" && booking.status !== "completed" ? (
                          <button type="button" className="tiny-button danger" disabled={actionLoading === booking.id} onClick={() => setConfirmCancelBooking(booking.id)}>Cancel</button>
                        ) : null}
                        {booking.status === "confirmed" ? (
                          <button type="button" className="tiny-button" disabled={actionLoading === booking.id} onClick={() => updateBookingStatus(booking.id, "completed")}>Complete</button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="bottom-grid">
            <section className="section-card calendar-card">
              <SectionHeader
                eyebrow="Planner"
                title="Calendar preview"
                description="Track booked and available dates."
                action={
                  <button type="button" className="secondary-button" onClick={() => navigate("/provider/calendar")}>
                    Open calendar
                  </button>
                }
              />

              <div className="calendar-grid-head">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>

              <div className="calendar-grid">
                {calendarDays.map(({ day, currentMonth, date }, index) => {
                  const iso = getLocalDateKey(date);
                  const isBooked = availableBookingDates.has(date.toDateString());
                  const isSelected = iso === calendarSelectedDate;
                  const isToday = iso === getLocalDateKey(new Date());

                  return (
                    <button
                      key={`${iso}-${index}`}
                      type="button"
                      className={[
                        "calendar-day",
                        currentMonth ? "" : "muted",
                        isBooked ? "booked" : "",
                        isSelected ? "selected" : "",
                        isToday ? "today" : "",
                      ].join(" ")}
                      onClick={() => setCalendarSelectedDate(iso)}
                    >
                      <span>{day}</span>
                    </button>
                  );
                })}
              </div>

              <div className="selected-day-summary">
                <strong>{selectedDateBookings.length} bookings on {new Date(calendarSelectedDate).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</strong>
                {selectedDateBookings.length === 0 ? (
                  <span>No appointments on this day.</span>
                ) : (
                  <ul>
                    {selectedDateBookings.slice(0, 3).map((booking) => (
                      <li key={booking.id}>{booking.customer_name || `Customer #${booking.customer_id}`} • {booking.service_name || `Service #${booking.service_id}`}</li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            <section className="section-card services-panel">
              <SectionHeader
                eyebrow="Catalog"
                title="My services"
                description="Keep your menu updated and ready for bookings."
                action={
                  <button type="button" className="primary-button" onClick={() => navigate("/provider/services")}>
                    <Plus size={16} /> Add service
                  </button>
                }
              />

              {visibleServices.length === 0 ? (
                <EmptyState
                  title="No services found"
                  description="Add your first service to start accepting bookings."
                  actionLabel="Add service"
                  onAction={() => navigate("/provider/services")}
                />
              ) : (
                <div className="service-list">
                  {visibleServices.slice(0, 3).map((service) => (
                    <div key={service.id} className="service-item">
                      <div className="service-visual" aria-hidden="true">
                        <BriefcaseBusiness size={18} />
                      </div>

                      <div className="service-copy">
                        <div className="service-header-row">
                          <h3>{service.name}</h3>
                          <span className={service.is_active ? "micro-status active" : "micro-status inactive"}>{service.is_active ? "Active" : "Inactive"}</span>
                        </div>
                        <p>{service.description || "No description provided."}</p>
                        <div className="service-meta-row">
                          <span>{service.duration_minutes} min</span>
                          <strong>{formatCurrency(Number(service.price))}</strong>
                        </div>
                        <div className="service-actions-row">
                          <button type="button" className="tiny-button" onClick={() => navigate("/provider/services")}>View</button>
                          <button type="button" className="tiny-button" onClick={() => navigate(`/provider/services?edit=${service.id}`)}>Edit</button>
                          <button type="button" className="tiny-button success" disabled={actionLoading === service.id} onClick={() => toggleServiceStatus(service)}>{actionLoading === service.id ? "Saving…" : service.is_active ? "Deactivate" : "Activate"}</button>
                          <button type="button" className="tiny-button danger" onClick={() => setConfirmDeleteService(service)}>Delete</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <section className="section-card availability-panel" id="provider-availability">
            <SectionHeader
              eyebrow="Schedule"
              title="Availability"
              description="Manage your weekly working hours and time blocks."
              action={
                <button type="button" className="secondary-button" onClick={() => navigate("/provider/calendar")}>
                  Edit availability
                </button>
              }
            />

            <div className="availability-today-summary">
              <div>
                <span>Today&apos;s availability</span>
                <strong>{todayAvailability.length ? "Available" : "Not scheduled"}</strong>
              </div>
              <div>
                <span>Working hours</span>
                <strong>
                  {(() => {
                    const hours = todayAvailability[0];
                    return hours ? `${formatTime(hours.start_time)} – ${formatTime(hours.end_time)}` : "—";
                  })()}
                </strong>
              </div>
              <div>
                <span>Break time</span>
                <strong>
                  {(() => {
                    const hours = todayAvailability[0];
                    return hours?.break_start && hours.break_end
                      ? `${formatTime(hours.break_start)} – ${formatTime(hours.break_end)}`
                      : "None scheduled";
                  })()}
                </strong>
              </div>
              <div>
                <span>Available slots</span>
                <strong>{todayAvailability.length} open window{todayAvailability.length === 1 ? "" : "s"}</strong>
              </div>
              <div>
                <span>Bookings today</span>
                <strong>{todayBookings.length}</strong>
              </div>
            </div>

            <div className="availability-form-row">
              <div className="field-group">
                <label htmlFor="day_of_week">Day</label>
                <select
                  id="day_of_week"
                  value={availabilityForm.day_of_week}
                  onChange={(event) => setAvailabilityForm((previous) => ({ ...previous, day_of_week: Number(event.target.value) }))}
                >
                  {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day, index) => (
                    <option value={index} key={day}>{day}</option>
                  ))}
                </select>
              </div>

              <div className="field-group">
                <label htmlFor="start_time">Start time</label>
                <input
                  id="start_time"
                  type="time"
                  value={availabilityForm.start_time}
                  onChange={(event) => setAvailabilityForm((previous) => ({ ...previous, start_time: event.target.value }))}
                />
              </div>

              <div className="field-group">
                <label htmlFor="end_time">End time</label>
                <input
                  id="end_time"
                  type="time"
                  value={availabilityForm.end_time}
                  onChange={(event) => setAvailabilityForm((previous) => ({ ...previous, end_time: event.target.value }))}
                />
              </div>

              <div className="field-group">
                <label htmlFor="break_start">Break start</label>
                <input
                  id="break_start"
                  type="time"
                  value={availabilityForm.break_start}
                  onChange={(event) => setAvailabilityForm((previous) => ({ ...previous, break_start: event.target.value }))}
                />
              </div>

              <div className="field-group">
                <label htmlFor="break_end">Break end</label>
                <input
                  id="break_end"
                  type="time"
                  value={availabilityForm.break_end}
                  onChange={(event) => setAvailabilityForm((previous) => ({ ...previous, break_end: event.target.value }))}
                />
              </div>

              <button type="button" className="primary-button" onClick={createAvailability}>Add slot</button>
            </div>

            {availability.length === 0 ? (
              <EmptyState
                title="No availability configured"
                description="Set your weekly schedule to start accepting bookings."
              />
            ) : (
              <div className="availability-week-grid">
                {Array.from({ length: 7 }, (_, index) => {
                  const item = availability.find((entry) => entry.day_of_week === index);

                  return (
                    <div key={index} className={`availability-day-card ${item?.is_available ? "active" : "inactive"}`}>
                      <div className="availability-day-header">
                        <strong>{getDayName(index)}</strong>
                        <span className={item?.is_available ? "micro-status active" : "micro-status inactive"}>{item?.is_available ? "Available" : "Unavailable"}</span>
                      </div>

                      {item ? (
                        <>
                          <p>{formatTime(item.start_time)} - {formatTime(item.end_time)}</p>
                          {item.break_start && item.break_end ? <small>Break: {formatTime(item.break_start)} - {formatTime(item.break_end)}</small> : <small>No break period</small>}
                          <div className="availability-actions-row">
                            <button type="button" className="tiny-button" onClick={() => toggleAvailability(item)}>{item.is_available ? "Disable" : "Enable"}</button>
                            <button type="button" className="tiny-button danger" onClick={() => deleteAvailability(item.id)}>Delete</button>
                          </div>
                        </>
                      ) : (
                        <>
                          <p>Not available</p>
                          <small>Set your hours</small>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="section-card reviews-panel" id="provider-reviews">
            <SectionHeader
              eyebrow="Feedback"
              title="Reviews"
              description="Customer sentiment and service quality at a glance."
              action={
                <div className="review-header-actions">
                  <div className="rating-summary-box">
                    <Star size={16} />
                    <strong>{ratingSummary.average_rating.toFixed(1)}</strong>
                    <span>{ratingSummary.total_reviews} reviews</span>
                  </div>
                  <button type="button" className="secondary-button" onClick={() => navigate("/provider/reviews")}>View all reviews</button>
                </div>
              }
            />

            {reviews.length === 0 ? (
              <EmptyState
                title="No reviews yet"
                description="Your reviews will appear here after completed bookings."
                actionLabel="View reviews"
                onAction={() => navigate("/provider/reviews")}
              />
            ) : (
              <div className="reviews-grid">
                {reviews.slice(0, 4).map((review) => (
                  <article key={review.id} className="review-card">
                    <div className="review-header-row">
                      <div className="review-user">
                        <div className="user-avatar small">{(review.customer_name || `C${review.customer_id}`).slice(0, 1).toUpperCase()}</div>
                        <div>
                          <h3>{review.customer_name || `Customer #${review.customer_id}`}</h3>
                          <span>{review.service_name || `Service #${review.service_id}`}</span>
                        </div>
                      </div>

                      <div className="stars" aria-label={`${review.rating} out of 5 stars`}>
                        {Array.from({ length: 5 }, (_, index) => (
                          <Star key={`${review.id}-${index}`} size={14} fill={index < review.rating ? "currentColor" : "none"} />
                        ))}
                      </div>
                    </div>

                    <p>{review.comment || "No written comment."}</p>
                    <small>{review.created_at ? formatDate(review.created_at) : "Recent"}</small>
                  </article>
                ))}
              </div>
            )}
          </section>

          <div className="quick-activity-grid">
            <section className="section-card quick-actions-panel">
              <SectionHeader
                eyebrow="Shortcuts"
                title="Quick actions"
                description="Manage bookings and services faster."
              />

              <div className="quick-actions-grid">
                {[
                  { label: "Add Service", icon: Plus, action: () => navigate("/provider/services") },
                  { label: "Manage Availability", icon: Clock3, action: () => navigate("/provider/availability") },
                  { label: "View Calendar", icon: CalendarDays, action: () => navigate("/provider/calendar") },
                  { label: "View Bookings", icon: CalendarDays, action: () => navigate("/provider/bookings") },
                  { label: "View Reviews", icon: Star, action: () => scrollToSection("provider-reviews") },
                ].map((item, index) => (
                  <button type="button" key={`${item.label}-${index}`} className="quick-action-card" onClick={item.action}>
                    <item.icon size={20} />
                    <span>{item.label}</span>
                    <ArrowRight size={16} />
                  </button>
                ))}
              </div>
            </section>

            <section className="section-card activity-panel">
              <SectionHeader
                eyebrow="Activity"
                title="Recent activity"
                description="The latest provider updates and customer engagement."
              />

              {recentActivity.length === 0 ? (
                <EmptyState title="No recent activity" description="Activity will appear after upcoming bookings and reviews." />
              ) : (
                <div className="timeline">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="timeline-item">
                      <div className={`timeline-bullet ${activity.type}`} />
                      <div className="timeline-copy">
                        <strong>{activity.title}</strong>
                        <p>{activity.detail}</p>
                        <small>{activity.time}</small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <section className="section-card analytics-card">
            <SectionHeader
              eyebrow="Performance"
              title="Booking analytics"
              description="Real booking trends across your current portfolio."
              action={
                <div className="segmented-control" aria-label="Select analytics range">
                  {(["today", "week", "month", "year"] as RangeKey[]).map((range) => (
                    <button
                      key={range}
                      type="button"
                      className={analyticsRange === range ? "segmented-button active" : "segmented-button"}
                      onClick={() => setAnalyticsRange(range)}
                    >
                      {range === "today" ? "Today" : range === "week" ? "This Week" : range === "month" ? "This Month" : "This Year"}
                    </button>
                  ))}
                </div>
              }
            />

            {bookings.length === 0 ? (
              <EmptyState
                title="No booking data yet"
                description="Your booking trends will appear here once your first appointment is received."
              />
            ) : (
              <div className="chart-shell">
                <div
                  className="chart-bars"
                  aria-label="Booking analytics chart"
                  style={{ gridTemplateColumns: `repeat(${analyticsChart.length}, minmax(0, 1fr))` }}
                >
                  {analyticsChart.map((item) => (
                    <div key={item.label} className="chart-column">
                      <span className="chart-value">{item.value}</span>
                      <div className="chart-bar-wrap">
                        <div className="chart-bar" style={{ height: `${item.height}%` }} />
                      </div>
                      <span className="chart-label">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      <ConfirmationModal
        open={confirmDeleteAvailability !== null}
        title="Delete availability?"
        message="This will remove the selected weekly availability block. This change cannot be undone."
        confirmLabel="Delete availability"
        confirmButtonClassName="confirmation-button-danger"
        loading={confirmationLoading}
        onConfirm={async () => {
          if (confirmDeleteAvailability === null) return;

          try {
            setConfirmationLoading(true);
            setProviderError("");
            setSuccess("");
            await api.delete(`/availability/${confirmDeleteAvailability}`);
            setSuccess("Availability deleted successfully.");
            setConfirmDeleteAvailability(null);
            await loadAvailability();
          } catch (error) {
            setProviderError(getApiErrorMessage(error, "Unable to delete availability."));
          } finally {
            setConfirmationLoading(false);
          }
        }}
        onCancel={() => setConfirmDeleteAvailability(null)}
      />
      <ConfirmationModal
        open={confirmCancelBooking !== null}
        title={bookings.find((booking) => booking.id === confirmCancelBooking)?.status.toLowerCase() === "pending" ? "Reject this booking request?" : "Cancel this booking?"}
        message="The booking will be marked as cancelled. This action cannot be undone."
        confirmLabel={bookings.find((booking) => booking.id === confirmCancelBooking)?.status.toLowerCase() === "pending" ? "Reject request" : "Cancel booking"}
        confirmButtonClassName="confirmation-button-danger"
        loading={confirmationLoading}
        onConfirm={async () => {
          if (confirmCancelBooking === null) return;
          setConfirmationLoading(true);
          await updateBookingStatus(confirmCancelBooking, "cancelled");
          setConfirmationLoading(false);
          setConfirmCancelBooking(null);
        }}
        onCancel={() => setConfirmCancelBooking(null)}
      />
      <ConfirmationModal
        open={confirmDeleteService !== null}
        title="Delete this service?"
        message={confirmDeleteService ? `"${confirmDeleteService.name}" will be permanently removed.` : "This service will be permanently removed."}
        confirmLabel="Delete service"
        confirmButtonClassName="confirmation-button-danger"
        loading={confirmationLoading}
        onConfirm={async () => {
          if (confirmDeleteService === null) return;
          setConfirmationLoading(true);
          try {
            setProviderError("");
            setSuccess("");
            await api.delete(`/provider/services/${confirmDeleteService.id}`);
            setSuccess("Service deleted successfully.");
            setConfirmDeleteService(null);
            await loadServices();
          } catch (error) {
            setProviderError(getApiErrorMessage(error, "Unable to delete service."));
          } finally {
            setConfirmationLoading(false);
          }
        }}
        onCancel={() => setConfirmDeleteService(null)}
      />
      {selectedBooking ? (
        <div className="booking-modal-backdrop" role="presentation" onClick={() => setSelectedBooking(null)}>
          <section className="booking-details-modal" role="dialog" aria-modal="true" aria-labelledby="booking-details-title" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="modal-close-button" onClick={() => setSelectedBooking(null)} aria-label="Close booking details"><X size={18} /></button>
            <p className="section-eyebrow">Booking details</p>
            <h2 id="booking-details-title">{selectedBooking.customer_name || `Customer #${selectedBooking.customer_id}`}</h2>
            <p className="booking-modal-service">{selectedBooking.service_name || `Service #${selectedBooking.service_id}`}</p>
            <div className="booking-modal-details">
              <span><CalendarDays size={16} />{formatDate(selectedBooking.booking_date)}</span>
              <span><Clock3 size={16} />{formatTime(selectedBooking.start_time)} – {formatTime(selectedBooking.end_time)}</span>
              <span><Wallet size={16} />{typeof selectedBooking.price === "number" ? formatCurrency(selectedBooking.price) : "Price pending"}</span>
              <span><Activity size={16} />{getBookingLabel(selectedBooking.status)}</span>
              {selectedBooking.customer_email ? <span><User size={16} />{selectedBooking.customer_email}</span> : null}
            </div>
            <div className="booking-modal-actions">
              {selectedBooking.status.toLowerCase() === "pending" ? (
                <>
                  <button type="button" className="secondary-button" onClick={() => { setConfirmCancelBooking(selectedBooking.id); setSelectedBooking(null); }}>Reject</button>
                  <button type="button" className="primary-button" disabled={actionLoading === selectedBooking.id} onClick={async () => { await updateBookingStatus(selectedBooking.id, "confirmed"); setSelectedBooking(null); }}>Confirm booking</button>
                </>
              ) : null}
              {selectedBooking.status.toLowerCase() === "confirmed" ? (
                <button type="button" className="tiny-button danger" onClick={() => { setConfirmCancelBooking(selectedBooking.id); setSelectedBooking(null); }}>Cancel booking</button>
              ) : null}
              <button type="button" className="secondary-button" onClick={() => setSelectedBooking(null)}>Close</button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

export default ProviderDashboard;
