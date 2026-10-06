import { useEffect, useState } from "react";
import {
  CalendarDays,
  Clock3,
  Eye,
  EyeOff,
  MapPin,
  Phone,
  RefreshCw,
} from "lucide-react";

import ConfirmationModal from "../components/ConfirmationModal";
import api from "../services/api";
import { clearAuthSession } from "../services/authSession";

import "./BookingsManagement.css";

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
  service_address?: string | null;
  created_at: string;
  service_name?: string;
  business_name?: string;
  provider_location?: string | null;
  provider_phone?: string | null;
};

type AvailableSlot = {
  start_time: string;
  end_time: string;
};

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
  customer_name?: string;
  service_name?: string;
  provider_name?: string;
  verified_booking?: boolean;
};

type BookingFilter =
  | "all"
  | "upcoming"
  | "pending"
  | "completed"
  | "cancelled"
  | "rejected";

function Bookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  const [bookingLoadTime, setBookingLoadTime] = useState(
    Date.now()
  );

  const [activeFilter, setActiveFilter] =
    useState<BookingFilter>("all");

  const [expandedBookingId, setExpandedBookingId] =
    useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =====================================================
  // RESCHEDULE STATES
  // =====================================================

  const [rescheduleId, setRescheduleId] =
    useState<number | null>(null);

  const [newDate, setNewDate] =
    useState("");

  const [availableSlots, setAvailableSlots] =
    useState<AvailableSlot[]>([]);

  const [selectedSlot, setSelectedSlot] =
    useState("");

  const [slotsLoading, setSlotsLoading] =
    useState(false);

  const [slotsError, setSlotsError] =
    useState("");

  const [actionLoading, setActionLoading] =
    useState<number | null>(null);

  // =====================================================
  // REVIEW STATES
  // =====================================================

  const [reviewBookingId, setReviewBookingId] =
    useState<number | null>(null);

  const [rating, setRating] = useState(5);

  const [reviewTitle, setReviewTitle] =
    useState("");

  const [comment, setComment] =
    useState("");

  const [reviewSuccess, setReviewSuccess] =
    useState("");

  const [actionSuccess, setActionSuccess] =
    useState("");

  const [reviewLoading, setReviewLoading] =
    useState(false);

  // =====================================================
  // CONFIRMATION MODAL
  // =====================================================

  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
  }>({
    open: false,
    title: "",
    message: "",
    confirmLabel: "Confirm",
    onConfirm: () => {},
  });

  // =====================================================
  // ERROR MESSAGE
  // =====================================================

  const getErrorMessage = (
    error: any,
    fallback: string
  ): string => {
    const detail =
      error?.response?.data?.detail;

    if (typeof detail === "string") {
      return detail;
    }

    if (Array.isArray(detail)) {
      return detail
        .map((item: any) =>
          item?.msg
            ? item.msg
            : String(item)
        )
        .join(", ");
    }

    return fallback;
  };

  // =====================================================
  // LOAD DATA
  // =====================================================

  useEffect(() => {
    void loadBookings();
    void loadReviews();

    const refreshTimer =
      window.setInterval(() => {
        void loadBookings(false);
      }, 20000);

    return () =>
      window.clearInterval(refreshTimer);
  }, []);

  // =====================================================
  // LOAD BOOKINGS
  // =====================================================

  const loadBookings = async (
    showLoading = true
  ) => {
    try {
      if (showLoading) {
        setLoading(true);
      }

      setError("");

      const response = await api.get(
        "/bookings/customer/me"
      );

      const bookingData =
        Array.isArray(response.data)
          ? response.data
          : [];

      console.log(
        "CUSTOMER BOOKINGS:",
        bookingData
      );

      bookingData.forEach(
        (booking: Booking) => {
          console.log(
            "BOOKING DATA:",
            {
              id: booking.id,
              service_name:
                booking.service_name,
              provider_id:
                booking.provider_id,
              service_id:
                booking.service_id,
              booking_date:
                booking.booking_date,
            }
          );
        }
      );

      setBookings(bookingData);
      setBookingLoadTime(Date.now());
    } catch (error: any) {
      console.error(
        "Bookings error:",
        error
      );

      setError(
        getErrorMessage(
          error,
          "Unable to load your bookings."
        )
      );
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  // =====================================================
  // LOAD REVIEWS
  // =====================================================

  const loadReviews = async () => {
    try {
      const response = await api.get(
        "/reviews/my"
      );

      setReviews(
        Array.isArray(response.data)
          ? response.data
          : []
      );
    } catch (error: any) {
      console.error(
        "Reviews error:",
        error
      );
    }
  };

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (
    date: string
  ) => {
    if (!date) {
      return "";
    }

    const [
      year,
      month,
      day,
    ] = date
      .split("-")
      .map(Number);

    const value = new Date(
      year,
      month - 1,
      day
    );

    return value.toLocaleDateString(
      "en-US",
      {
        month: "short",
        day: "numeric",
        year: "numeric",
      }
    );
  };

  // =====================================================
  // FORMAT TIME
  // =====================================================

  const formatTime = (
    time: string
  ) => {
    if (!time) {
      return "";
    }

    const [
      hours,
      minutes,
    ] = time.split(":");

    const value = new Date();

    value.setHours(
      Number(hours),
      Number(minutes),
      0,
      0
    );

    return value.toLocaleTimeString(
      "en-US",
      {
        hour: "numeric",
        minute: "2-digit",
      }
    );
  };

  // =====================================================
  // CANCEL BOOKING
  // =====================================================

  const handleCancel = async (
    bookingId: number
  ) => {
    const booking =
      bookings.find(
        (item) =>
          item.id === bookingId
      );

    setConfirmModal({
      open: true,
      title: "Cancel booking?",
      message:
        booking &&
        booking.service_name
          ? `Are you sure you want to cancel ${booking.service_name}?`
          : "Are you sure you want to cancel this booking?",
      confirmLabel:
        "Cancel booking",

      onConfirm: async () => {
        try {
          setActionLoading(
            bookingId
          );

          setError("");
          setActionSuccess("");

          await api.patch(
            `/bookings/${bookingId}/cancel`
          );

          setConfirmModal(
            (current) => ({
              ...current,
              open: false,
            })
          );

          setActionSuccess(
            "Booking cancelled successfully."
          );

          await loadBookings();
        } catch (error: any) {
          console.error(
            "Cancel error:",
            error
          );

          setConfirmModal(
            (current) => ({
              ...current,
              open: false,
            })
          );

          setError(
            getErrorMessage(
              error,
              "Unable to cancel booking."
            )
          );
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  // =====================================================
  // OPEN RESCHEDULE
  // =====================================================

  const openReschedule = (
    booking: Booking
  ) => {
    console.log(
      "================================"
    );

    console.log(
      "OPEN RESCHEDULE"
    );

    console.log(
      "Booking ID:",
      booking.id
    );

    console.log(
      "Provider ID:",
      booking.provider_id
    );

    console.log(
      "Service ID:",
      booking.service_id
    );

    console.log(
      "Service:",
      booking.service_name
    );

    console.log(
      "================================"
    );

    setRescheduleId(
      booking.id
    );

    setNewDate("");
    setAvailableSlots([]);
    setSelectedSlot("");
    setSlotsError("");
    setError("");
  };

  // =====================================================
  // CLOSE RESCHEDULE
  // =====================================================

  const closeReschedule = () => {
    setRescheduleId(null);
    setNewDate("");
    setAvailableSlots([]);
    setSelectedSlot("");
    setSlotsError("");
    setError("");
  };

  // =====================================================
  // LOAD AVAILABLE SLOTS
  // =====================================================

  const loadAvailableSlots = async (
    booking: Booking,
    date: string
  ) => {
    if (!date) {
      setAvailableSlots([]);
      setSelectedSlot("");
      setSlotsError("");
      return;
    }

    try {
      setSlotsLoading(true);

      setSlotsError("");
      setAvailableSlots([]);
      setSelectedSlot("");

      // IMPORTANT:
      // Always take provider_id and service_id
      // from the selected booking.

      const providerId =
        Number(
          booking.provider_id
        );

      const serviceId =
        Number(
          booking.service_id
        );

      console.log(
        "======================================"
      );

      console.log(
        "AVAILABILITY SLOT REQUEST"
      );

      console.log(
        "Booking ID:",
        booking.id
      );

      console.log(
        "Provider ID:",
        providerId
      );

      console.log(
        "Service ID:",
        serviceId
      );

      console.log(
        "Service Name:",
        booking.service_name
      );

      console.log(
        "Date:",
        date
      );

      console.log(
        "======================================"
      );

      if (!providerId) {
        throw new Error(
          "Provider ID is missing from this booking."
        );
      }

      if (!serviceId) {
        throw new Error(
          "Service ID is missing from this booking."
        );
      }

      const response =
        await api.get(
          `/availability/slots/${providerId}`,
          {
            params: {
              date: date,
              service_id:
                serviceId,
            },
          }
        );

      console.log(
        "AVAILABILITY API RESPONSE:",
        response.data
      );

      const slots: AvailableSlot[] =
        Array.isArray(
          response.data
            ?.available_slots
        )
          ? response.data
              .available_slots
          : [];

      console.log(
        "AVAILABLE SLOTS:",
        slots
      );

      setAvailableSlots(
        slots
      );

      if (
        slots.length === 0
      ) {
        setSlotsError(
          `No available slots for ${date}.`
        );
      }
    } catch (error: any) {
      console.error(
        "Available slots error:",
        error
      );

      console.error(
        "Response:",
        error?.response?.data
      );

      setAvailableSlots([]);
      setSelectedSlot("");

      setSlotsError(
        getErrorMessage(
          error,
          "Unable to load available time slots."
        )
      );
    } finally {
      setSlotsLoading(false);
    }
  };

  // =====================================================
  // DATE CHANGE
  // =====================================================

  const handleDateChange = async (
    booking: Booking,
    date: string
  ) => {
    console.log(
      "======================================"
    );

    console.log(
      "DATE CHANGED"
    );

    console.log(
      "Booking ID:",
      booking.id
    );

    console.log(
      "Provider ID:",
      booking.provider_id
    );

    console.log(
      "Service ID:",
      booking.service_id
    );

    console.log(
      "Service:",
      booking.service_name
    );

    console.log(
      "Selected Date:",
      date
    );

    console.log(
      "======================================"
    );

    setNewDate(date);
    setSelectedSlot("");
    setAvailableSlots([]);
    setSlotsError("");

    if (!date) {
      return;
    }

    await loadAvailableSlots(
      booking,
      date
    );
  };

  // =====================================================
  // SLOT CHANGE
  // =====================================================

  const handleSlotChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setSelectedSlot(
      event.target.value
    );
  };

  // =====================================================
  // RESCHEDULE
  // =====================================================

  const handleReschedule =
    async () => {
      if (
        rescheduleId === null
      ) {
        setError(
          "Booking ID is missing."
        );
        return;
      }

      if (!newDate) {
        setError(
          "Please select a date."
        );
        return;
      }

      if (!selectedSlot) {
        setError(
          "Please select an available time slot."
        );
        return;
      }

      const slot =
        availableSlots.find(
          (item) =>
            `${item.start_time}|${item.end_time}` ===
            selectedSlot
        );

      if (!slot) {
        setError(
          "Selected time slot is no longer available."
        );
        return;
      }

      const requestData = {
        booking_date:
          newDate,

        start_time:
          slot.start_time,

        end_time:
          slot.end_time,
      };

      try {
        setActionLoading(
          rescheduleId
        );

        setError("");

        console.log(
          "RESCHEDULE REQUEST:",
          {
            bookingId:
              rescheduleId,
            ...requestData,
          }
        );

        await api.patch(
          `/bookings/${rescheduleId}/reschedule`,
          requestData
        );

        setRescheduleId(null);
        setNewDate("");
        setAvailableSlots([]);
        setSelectedSlot("");

        await loadBookings();

        setActionSuccess(
          "Booking rescheduled successfully."
        );
      } catch (error: any) {
        console.error(
          "Reschedule error:",
          error
        );

        setError(
          getErrorMessage(
            error,
            "Unable to reschedule booking."
          )
        );
      } finally {
        setActionLoading(null);
      }
    };

  // =====================================================
  // OPEN REVIEW
  // =====================================================

  const openReview = (
    bookingId: number,
    existingReview?: Review
  ) => {
    setReviewBookingId(
      bookingId
    );

    setRating(
      existingReview?.rating ||
        5
    );

    setReviewTitle(
      existingReview?.title ||
        ""
    );

    setComment(
      existingReview?.comment ||
        ""
    );

    setError("");
    setReviewSuccess("");
  };

  // =====================================================
  // CLOSE REVIEW
  // =====================================================

  const closeReview = () => {
    setReviewBookingId(null);
    setRating(5);
    setReviewTitle("");
    setComment("");
  };

  // =====================================================
  // GET REVIEW
  // =====================================================

  const getReviewForBooking = (
    bookingId: number
  ) => {
    return reviews.find(
      (review) =>
        review.booking_id ===
        bookingId
    );
  };

  // =====================================================
  // SUBMIT REVIEW
  // =====================================================

  const handleSubmitReview =
    async () => {
      if (
        reviewBookingId === null
      ) {
        setError(
          "Booking ID is missing."
        );
        return;
      }

      if (
        rating < 1 ||
        rating > 5
      ) {
        setError(
          "Please select a rating between 1 and 5."
        );
        return;
      }

      if (!comment.trim()) {
        setError(
          "Please add a few words about your experience."
        );
        return;
      }

      if (
        comment.trim()
          .length > 2000
      ) {
        setError(
          "Your review must be 2,000 characters or fewer."
        );
        return;
      }

      if (
        reviewTitle.trim()
          .length > 120
      ) {
        setError(
          "Your title must be 120 characters or fewer."
        );
        return;
      }

      try {
        setReviewLoading(true);
        setError("");

        const existingReview =
          getReviewForBooking(
            reviewBookingId
          );

        const reviewData = {
          rating,
          title:
            reviewTitle.trim() ||
            null,
          comment:
            comment.trim(),
        };

        if (existingReview) {
          await api.put(
            `/reviews/${existingReview.id}`,
            reviewData
          );
        } else {
          await api.post(
            "/reviews/",
            {
              booking_id:
                reviewBookingId,
              ...reviewData,
            }
          );
        }

        await loadReviews();

        setReviewSuccess(
          existingReview
            ? "Your review has been updated."
            : "Thank you. Your review has been submitted."
        );

        closeReview();
      } catch (error: any) {
        console.error(
          "Review error:",
          error
        );

        setError(
          getErrorMessage(
            error,
            "Unable to submit review."
          )
        );
      } finally {
        setReviewLoading(false);
      }
    };

  // =====================================================
  // DELETE REVIEW
  // =====================================================

  const handleDeleteReview =
    async (
      review: Review
    ) => {
      setConfirmModal({
        open: true,

        title:
          "Delete review?",

        message:
          "Delete your review? You can submit another review for this completed booking later.",

        confirmLabel:
          "Delete review",

        onConfirm:
          async () => {
            try {
              setReviewLoading(
                true
              );

              setError("");

              setConfirmModal(
                (current) => ({
                  ...current,
                  open: false,
                })
              );

              await api.delete(
                `/reviews/${review.id}`
              );

              await loadReviews();

              setReviewSuccess(
                "Your review has been deleted."
              );

              closeReview();
            } catch (error: any) {
              console.error(
                "Delete review error:",
                error
              );

              setError(
                getErrorMessage(
                  error,
                  "Unable to delete your review."
                )
              );
            } finally {
              setReviewLoading(
                false
              );
            }
          },
      });
    };

  // =====================================================
  // STATUS CLASS
  // =====================================================

  const getStatusClass = (
    status: string
  ) => {
    return `booking-status ${status.toLowerCase()}`;
  };

  // =====================================================
  // TODAY
  // =====================================================

  const getToday = () => {
    const today =
      new Date();

    const year =
      today.getFullYear();

    const month =
      String(
        today.getMonth() + 1
      ).padStart(2, "0");

    const day =
      String(
        today.getDate()
      ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  // =====================================================
  // UPCOMING
  // =====================================================

  const isUpcoming = (
    booking: Booking
  ): boolean => {
    const status =
      booking.status.toLowerCase();

    const start =
      new Date(
        `${booking.booking_date}T${booking.start_time}`
      ).getTime();

    return (
      (
        status ===
          "pending" ||
        status ===
          "confirmed"
      ) &&
      start >=
        bookingLoadTime
    );
  };

  // =====================================================
  // BOOKING COUNT
  // =====================================================

  const getBookingCount = (
    filter: BookingFilter
  ): number => {
    if (
      filter === "all"
    ) {
      return bookings.length;
    }

    if (
      filter ===
      "upcoming"
    ) {
      return bookings.filter(
        isUpcoming
      ).length;
    }

    return bookings.filter(
      (booking) =>
        booking.status.toLowerCase() ===
        filter
    ).length;
  };

  // =====================================================
  // VISIBLE BOOKINGS
  // =====================================================

  const visibleBookings =
    bookings
      .filter((booking) => {
        if (
          activeFilter ===
          "all"
        ) {
          return true;
        }

        if (
          activeFilter ===
          "upcoming"
        ) {
          return isUpcoming(
            booking
          );
        }

        return (
          booking.status.toLowerCase() ===
          activeFilter
        );
      })
      .sort(
        (
          first,
          second
        ) => {
          const firstStart =
            new Date(
              `${first.booking_date}T${first.start_time}`
            ).getTime();

          const secondStart =
            new Date(
              `${second.booking_date}T${second.start_time}`
            ).getTime();

          return (
            firstStart -
            secondStart
          );
        }
      );

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="customer-bookings-page">

      {/* HEADER */}

      <header className="customer-bookings-header">

        <div className="customer-bookings-logo">
          Service Booking
        </div>

        <nav
          className="customer-bookings-nav"
          aria-label="Main navigation"
        >
          <a href="/dashboard">
            Dashboard
          </a>

          <a
            href="/bookings"
            className="active"
            aria-current="page"
          >
            Bookings
          </a>

          <a href="/book-service">
            Services
          </a>

          <a href="/profile">
            Profile
          </a>
        </nav>

        <button
          type="button"
          className="customer-bookings-logout"
          onClick={() => {
            clearAuthSession();
            window.location.href =
              "/login";
          }}
        >
          Logout
        </button>

      </header>

      {/* MAIN */}

      <main className="customer-bookings-main">

        {/* INTRO */}

        <section className="customer-bookings-intro">

          <div>
            <span className="bookings-eyebrow">
              YOUR SCHEDULE
            </span>

            <h1>
              My Bookings
            </h1>

            <p>
              Keep track of upcoming appointments and past services.
            </p>
          </div>

          <a
            className="bookings-new-link"
            href="/book-service"
          >
            Book a service{" "}
            <span aria-hidden="true">
              ↗
            </span>
          </a>

          <button
            type="button"
            className="bookings-refresh-button"
            onClick={() =>
              void loadBookings(
                false
              )
            }
            disabled={
              loading ||
              actionLoading !==
                null
            }
          >
            <RefreshCw
              size={15}
              aria-hidden="true"
            />

            Refresh
          </button>

        </section>

        {/* ERROR */}

        {error && (
          <div
            className="customer-bookings-error"
            role="alert"
          >
            <span>
              {error}
            </span>

            {bookings.length ===
              0 &&
              !loading && (
                <button
                  type="button"
                  onClick={() =>
                    void loadBookings()
                  }
                >
                  Try again
                </button>
              )}
          </div>
        )}

        {/* REVIEW SUCCESS */}

        {reviewSuccess && (
          <div
            className="review-success-notice"
            role="status"
          >
            {reviewSuccess}
          </div>
        )}

        {/* ACTION SUCCESS */}

        {actionSuccess && (
          <div
            className="review-success-notice"
            role="status"
          >
            {actionSuccess}
          </div>
        )}

        {/* LOADING */}

        {loading ? (
          <section
            className="customer-bookings-loading"
            aria-live="polite"
          >
            <span
              className="loading-indicator"
              aria-hidden="true"
            />

            <p>
              Loading your bookings...
            </p>
          </section>

        ) : bookings.length ===
            0 &&
          !error ? (

          <section className="customer-bookings-empty">

            <span className="empty-calendar-icon">
              <CalendarDays
                size={24}
              />
            </span>

            <span className="bookings-eyebrow">
              NOTHING ON THE CALENDAR
            </span>

            <h2>
              No bookings yet
            </h2>

            <p>
              Your appointments will appear here once you book a service.
            </p>

            <a href="/book-service">
              Explore services{" "}
              <span aria-hidden="true">
                ↗
              </span>
            </a>

          </section>

        ) : bookings.length >
          0 ? (

          <>

            {/* STATUS FILTERS */}

            <section
              className="booking-status-overview"
              aria-label="Booking status filters"
            >
              {([
                [
                  "upcoming",
                  "Upcoming",
                ],
                [
                  "pending",
                  "Pending",
                ],
                [
                  "completed",
                  "Completed",
                ],
                [
                  "rejected",
                  "Rejected",
                ],
                [
                  "cancelled",
                  "Cancelled",
                ],
              ] as [
                BookingFilter,
                string
              ][]).map(
                ([
                  filter,
                  label,
                ]) => (
                  <button
                    type="button"
                    key={filter}
                    className={`booking-overview-item ${
                      activeFilter ===
                      filter
                        ? "active"
                        : ""
                    }`}
                    aria-pressed={
                      activeFilter ===
                      filter
                    }
                    onClick={() =>
                      setActiveFilter(
                        filter
                      )
                    }
                  >
                    <span>
                      {label}
                    </span>

                    <strong>
                      {getBookingCount(
                        filter
                      )}
                    </strong>
                  </button>
                )
              )}
            </section>

            {/* LIST HEADER */}

            <div className="booking-list-heading">

              <div>
                <span className="bookings-eyebrow">
                  BOOKING HISTORY
                </span>

                <h2>
                  {activeFilter ===
                  "all"
                    ? "All bookings"
                    : `${activeFilter[0].toUpperCase()}${activeFilter.slice(
                        1
                      )} bookings`}
                </h2>
              </div>

              <label className="booking-filter-select">

                <span className="visually-hidden">
                  Filter bookings
                </span>

                <select
                  value={
                    activeFilter
                  }
                  onChange={(
                    event
                  ) =>
                    setActiveFilter(
                      event.target
                        .value as BookingFilter
                    )
                  }
                >
                  <option value="all">
                    All bookings
                  </option>

                  <option value="upcoming">
                    Upcoming
                  </option>

                  <option value="pending">
                    Pending
                  </option>

                  <option value="completed">
                    Completed
                  </option>

                  <option value="rejected">
                    Rejected
                  </option>

                  <option value="cancelled">
                    Cancelled
                  </option>
                </select>

              </label>

            </div>

            {/* EMPTY FILTER */}

            {visibleBookings.length ===
            0 ? (

              <section className="customer-bookings-empty filtered-empty">

                <span className="empty-calendar-icon">
                  <CalendarDays
                    size={24}
                  />
                </span>

                <h2>
                  No{" "}
                  {activeFilter}{" "}
                  bookings
                </h2>

                <p>
                  There are no bookings in this group right now.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    setActiveFilter(
                      "all"
                    )
                  }
                >
                  View all bookings
                </button>

              </section>

            ) : (

              <section
                className="customer-bookings-list"
                aria-label="Bookings"
              >

                {visibleBookings.map(
                  (booking) => {

                    // IMPORTANT DEBUG
                    console.log(
                      "BOOKING:",
                      booking.id,
                      "SERVICE:",
                      booking.service_name,
                      "PROVIDER ID:",
                      booking.provider_id,
                      "SERVICE ID:",
                      booking.service_id
                    );

                    const status =
                      booking.status.toLowerCase();

                    const canManage =
                      status ===
                        "pending" ||
                      status ===
                        "confirmed";

                    const existingReview =
                      getReviewForBooking(
                        booking.id
                      );

                    return (
                      <article
                        key={
                          booking.id
                        }
                        className={`customer-booking-card ${status}`}
                      >

                        {/* BOOKING HEADER */}

                        <div className="customer-booking-card-header">

                          <div className="customer-booking-name">

                            <h2>
                              {booking.service_name ||
                                `Booking #${booking.id}`}
                            </h2>

                            <span
                              className={getStatusClass(
                                booking.status
                              )}
                            >
                              {booking.status}
                            </span>

                            {isUpcoming(
                              booking
                            ) && (
                              <span className="upcoming-marker">
                                Upcoming
                              </span>
                            )}

                          </div>

                          <strong className="customer-booking-price">
                            Rs.{" "}
                            {Number(
                              booking.price
                            ).toLocaleString()}
                          </strong>

                        </div>

                        {/* SUMMARY */}

                        <div className="customer-booking-summary">

                          <div>
                            <CalendarDays
                              size={17}
                              aria-hidden="true"
                            />

                            <span>
                              {formatDate(
                                booking.booking_date
                              )}
                            </span>
                          </div>

                          <div>
                            <Clock3
                              size={17}
                              aria-hidden="true"
                            />

                            <span>
                              {formatTime(
                                booking.start_time
                              )}
                              {" - "}
                              {formatTime(
                                booking.end_time
                              )}
                            </span>
                          </div>

                        </div>

                        {/* DETAILS TOGGLE */}

                        <button
                          type="button"
                          className="booking-details-toggle"
                          aria-expanded={
                            expandedBookingId ===
                            booking.id
                          }
                          onClick={() =>
                            setExpandedBookingId(
                              expandedBookingId ===
                                booking.id
                                ? null
                                : booking.id
                            )
                          }
                        >
                          {expandedBookingId ===
                          booking.id ? (
                            <EyeOff
                              size={16}
                            />
                          ) : (
                            <Eye
                              size={16}
                            />
                          )}

                          {expandedBookingId ===
                          booking.id
                            ? "Hide details"
                            : "View details"}
                        </button>

                        {/* DETAILS */}

                        {expandedBookingId ===
                          booking.id && (
                          <div className="customer-booking-details">

                            <p>
                              <strong>
                                Booking ID
                              </strong>

                              <span>
                                #{booking.id}
                              </span>
                            </p>

                            <p>
                              <strong>
                                Business
                              </strong>

                              <span>
                                {booking.business_name ||
                                  "Service Provider"}
                              </span>
                            </p>

                            <p>
                              <strong>
                                Date
                              </strong>

                              <span>
                                {formatDate(
                                  booking.booking_date
                                )}
                              </span>
                            </p>

                            <p>
                              <strong>
                                Time
                              </strong>

                              <span>
                                {formatTime(
                                  booking.start_time
                                )}
                                {" - "}
                                {formatTime(
                                  booking.end_time
                                )}
                              </span>
                            </p>

                            {booking.provider_location && (
                              <p>
                                <strong>
                                  <MapPin
                                    size={14}
                                  />
                                  {" "}
                                  Location
                                </strong>

                                <span>
                                  {booking.provider_location}
                                </span>
                              </p>
                            )}

                            {booking.provider_phone && (
                              <p>
                                <strong>
                                  <Phone
                                    size={14}
                                  />
                                  {" "}
                                  Phone
                                </strong>

                                <span>
                                  {booking.provider_phone}
                                </span>
                              </p>
                            )}

                            {booking.service_address && (
                              <p>
                                <strong>
                                  Service address
                                </strong>

                                <span>
                                  {booking.service_address}
                                </span>
                              </p>
                            )}

                            {booking.customer_notes && (
                              <p>
                                <strong>
                                  Notes
                                </strong>

                                <span>
                                  {booking.customer_notes}
                                </span>
                              </p>
                            )}

                          </div>
                        )}

                        {/* ACTIONS */}

                        {canManage && (
                          <div className="booking-actions">

                            <button
                              type="button"
                              onClick={() =>
                                openReschedule(
                                  booking
                                )
                              }
                              disabled={
                                actionLoading !==
                                null
                              }
                            >
                              Reschedule
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleCancel(
                                  booking.id
                                )
                              }
                              disabled={
                                actionLoading !==
                                null
                              }
                            >
                              {actionLoading ===
                              booking.id
                                ? "Processing..."
                                : "Cancel Booking"}
                            </button>

                          </div>
                        )}

                        {/* COMPLETED REVIEW */}

                        {status ===
                          "completed" && (
                          <>
                            {!existingReview ? (
                              <div className="booking-actions">

                                <button
                                  type="button"
                                  onClick={() =>
                                    openReview(
                                      booking.id
                                    )
                                  }
                                  disabled={
                                    reviewLoading ||
                                    actionLoading !==
                                      null
                                  }
                                >
                                  Write Review
                                </button>

                              </div>
                            ) : (
                              <div className="review-summary">

                                <div className="review-summary-header">

                                  <div className="review-author">

                                    <span
                                      className="review-avatar"
                                      aria-hidden="true"
                                    >
                                      {(
                                        existingReview.customer_name ||
                                        "You"
                                      )
                                        .charAt(
                                          0
                                        )
                                        .toUpperCase()}
                                    </span>

                                    <div>

                                      <span className="review-label">
                                        YOUR REVIEW
                                      </span>

                                      <h3>
                                        {existingReview.customer_name ||
                                          "You"}
                                      </h3>

                                    </div>

                                  </div>

                                  <div className="review-summary-meta">

                                    {existingReview.verified_booking && (
                                      <span className="verified-booking-badge">
                                        Verified booking
                                      </span>
                                    )}

                                    <span className="review-date">
                                      {formatDate(
                                        existingReview.created_at.split(
                                          "T"
                                        )[0]
                                      )}
                                    </span>

                                  </div>

                                </div>

                                {existingReview.service_name && (
                                  <p className="review-service-name">
                                    {
                                      existingReview.service_name
                                    }

                                    {existingReview.provider_name &&
                                      ` · ${existingReview.provider_name}`}
                                  </p>
                                )}

                                <div className="review-rating">

                                  {Array.from(
                                    {
                                      length: 5,
                                    }
                                  ).map(
                                    (
                                      _,
                                      index
                                    ) => (
                                      <span
                                        key={
                                          index
                                        }
                                        className={
                                          index <
                                          existingReview.rating
                                            ? "star filled"
                                            : "star"
                                        }
                                      >
                                        ★
                                      </span>
                                    )
                                  )}

                                  <strong>
                                    {
                                      existingReview.rating
                                    }
                                    /5
                                  </strong>

                                </div>

                                {existingReview.title && (
                                  <h4 className="review-title">
                                    {
                                      existingReview.title
                                    }
                                  </h4>
                                )}

                                {existingReview.comment ? (
                                  <p className="review-comment">
                                    {
                                      existingReview.comment
                                    }
                                  </p>
                                ) : (
                                  <p className="review-no-comment">
                                    No comment added.
                                  </p>
                                )}

                                <div className="review-actions">

                                  <button
                                    type="button"
                                    onClick={() =>
                                      openReview(
                                        booking.id,
                                        existingReview
                                      )
                                    }
                                    disabled={
                                      reviewLoading ||
                                      actionLoading !==
                                        null
                                    }
                                  >
                                    Edit review
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDeleteReview(
                                        existingReview
                                      )
                                    }
                                    disabled={
                                      reviewLoading ||
                                      actionLoading !==
                                        null
                                    }
                                  >
                                    Delete review
                                  </button>

                                </div>

                              </div>
                            )}
                          </>
                        )}

                        {/* REVIEW FORM */}

                        {reviewBookingId ===
                          booking.id && (
                          <div className="review-box">

                            <div className="review-form-header">

                              <span className="review-label">
                                SHARE YOUR EXPERIENCE
                              </span>

                              <h3>
                                {getReviewForBooking(
                                  booking.id
                                )
                                  ? "Edit your review"
                                  : "How was your experience?"}
                              </h3>

                              <p>
                                Your feedback helps us improve our service.
                              </p>

                            </div>

                            {/* RATING */}

                            <div className="rating-section">

                              <label>
                                Your Rating
                              </label>

                              <div className="star-rating">

                                {Array.from(
                                  {
                                    length: 5,
                                  }
                                ).map(
                                  (
                                    _,
                                    index
                                  ) => {

                                    const starValue =
                                      index +
                                      1;

                                    return (
                                      <button
                                        key={
                                          starValue
                                        }
                                        type="button"
                                        className={
                                          starValue <=
                                          rating
                                            ? "rating-star active"
                                            : "rating-star"
                                        }
                                        onClick={() =>
                                          setRating(
                                            starValue
                                          )
                                        }
                                        disabled={
                                          reviewLoading
                                        }
                                        aria-label={`Rate ${starValue} out of 5`}
                                      >
                                        ★
                                      </button>
                                    );
                                  }
                                )}

                              </div>

                              <span className="rating-value">

                                {rating ===
                                  1 &&
                                  "Very Poor"}

                                {rating ===
                                  2 &&
                                  "Poor"}

                                {rating ===
                                  3 &&
                                  "Average"}

                                {rating ===
                                  4 &&
                                  "Good"}

                                {rating ===
                                  5 &&
                                  "Excellent"}

                              </span>

                            </div>

                            {/* TITLE */}

                            <div className="comment-section">

                              <label
                                htmlFor={`review-title-${booking.id}`}
                              >
                                Review title{" "}
                                <span>
                                  (optional)
                                </span>
                              </label>

                              <input
                                id={`review-title-${booking.id}`}
                                value={
                                  reviewTitle
                                }
                                onChange={(
                                  event
                                ) =>
                                  setReviewTitle(
                                    event.target
                                      .value
                                  )
                                }
                                placeholder="Sum up your experience"
                                maxLength={
                                  120
                                }
                                disabled={
                                  reviewLoading
                                }
                              />

                              <div className="comment-footer">
                                <span>
                                  Up to 120 characters
                                </span>

                                <span>
                                  {
                                    reviewTitle.length
                                  }
                                  /120
                                </span>
                              </div>

                            </div>

                            {/* COMMENT */}

                            <div className="comment-section">

                              <label
                                htmlFor={`review-comment-${booking.id}`}
                              >
                                Your Review
                              </label>

                              <textarea
                                id={`review-comment-${booking.id}`}
                                value={
                                  comment
                                }
                                onChange={(
                                  event
                                ) =>
                                  setComment(
                                    event.target
                                      .value
                                  )
                                }
                                placeholder="Tell us about your experience..."
                                rows={5}
                                maxLength={
                                  2000
                                }
                                required
                                disabled={
                                  reviewLoading
                                }
                              />

                              <div className="comment-footer">

                                <span>
                                  Your feedback is valuable to us.
                                </span>

                                <span>
                                  {
                                    comment.length
                                  }
                                  /2000
                                </span>

                              </div>

                            </div>

                            {/* REVIEW ACTIONS */}

                            <div className="review-actions">

                              <button
                                type="button"
                                className="submit-review-button"
                                onClick={
                                  handleSubmitReview
                                }
                                disabled={
                                  reviewLoading
                                }
                              >
                                {reviewLoading
                                  ? "Saving..."
                                  : getReviewForBooking(
                                        booking.id
                                      )
                                    ? "Save Review"
                                    : "Submit Review"}
                              </button>

                              <button
                                type="button"
                                className="close-review-button"
                                onClick={
                                  closeReview
                                }
                                disabled={
                                  reviewLoading
                                }
                              >
                                Cancel
                              </button>

                            </div>

                          </div>
                        )}

                        {/* CANCELLED */}

                        {status ===
                          "cancelled" && (
                          <p>
                            This booking was cancelled.
                          </p>
                        )}

                        {/* =================================================
                            RESCHEDULE
                        ================================================= */}

                        {rescheduleId ===
                          booking.id && (

                          <div className="reschedule-box">

                            <h3>
                              Reschedule Booking
                            </h3>

                            <p>
                              Service:{" "}
                              <strong>
                                {booking.service_name}
                              </strong>
                            </p>

                            <p>
                              Provider ID:{" "}
                              <strong>
                                {booking.provider_id}
                              </strong>
                            </p>

                            <p>
                              Service ID:{" "}
                              <strong>
                                {booking.service_id}
                              </strong>
                            </p>

                            {/* DATE */}

                            <label>
                              New Date
                            </label>

                            <input
                              type="date"
                              value={
                                newDate
                              }
                              min={
                                getToday()
                              }
                              onChange={(
                                event
                              ) =>
                                handleDateChange(
                                  booking,
                                  event.target
                                    .value
                                )
                              }
                            />

                            {/* AVAILABLE TIME */}

                            <label>
                              Available Time
                            </label>

                            {slotsLoading ? (

                              <p>
                                Loading available slots...
                              </p>

                            ) : !newDate ? (

                              <p>
                                Please select a date first.
                              </p>

                            ) : slotsError ? (

                              <div
                                className="reschedule-slots-error"
                                role="alert"
                              >

                                <p>
                                  {slotsError}
                                </p>

                                <button
                                  type="button"
                                  onClick={() => {
                                    void loadAvailableSlots(
                                      booking,
                                      newDate
                                    );
                                  }}
                                >
                                  Retry slots
                                </button>

                              </div>

                            ) : availableSlots.length ===
                              0 ? (

                              <p>
                                No available slots for this date.
                              </p>

                            ) : (

                              <select
                                value={
                                  selectedSlot
                                }
                                onChange={
                                  handleSlotChange
                                }
                              >

                                <option value="">
                                  Select an available time
                                </option>

                                {availableSlots.map(
                                  (
                                    slot
                                  ) => {

                                    const value =
                                      `${slot.start_time}|${slot.end_time}`;

                                    return (
                                      <option
                                        key={
                                          value
                                        }
                                        value={
                                          value
                                        }
                                      >
                                        {formatTime(
                                          slot.start_time
                                        )}
                                        {" - "}
                                        {formatTime(
                                          slot.end_time
                                        )}
                                      </option>
                                    );
                                  }
                                )}

                              </select>
                            )}

                            {/* SELECTED SLOT */}

                            {selectedSlot && (
                              <p>
                                Selected:{" "}
                                <strong>

                                  {(() => {

                                    const parts =
                                      selectedSlot.split(
                                        "|"
                                      );

                                    return (
                                      <>
                                        {formatTime(
                                          parts[0]
                                        )}
                                        {" - "}
                                        {formatTime(
                                          parts[1]
                                        )}
                                      </>
                                    );

                                  })()}

                                </strong>
                              </p>
                            )}

                            {/* RESCHEDULE ACTIONS */}

                            <div className="booking-actions">

                              <button
                                type="button"
                                onClick={
                                  handleReschedule
                                }
                                disabled={
                                  actionLoading ===
                                    booking.id ||
                                  !newDate ||
                                  !selectedSlot ||
                                  availableSlots.length ===
                                    0
                                }
                              >
                                {actionLoading ===
                                booking.id
                                  ? "Saving..."
                                  : "Save Changes"}
                              </button>

                              <button
                                type="button"
                                onClick={
                                  closeReschedule
                                }
                                disabled={
                                  actionLoading ===
                                  booking.id
                                }
                              >
                                Close
                              </button>

                            </div>

                          </div>
                        )}

                      </article>
                    );
                  }
                )}

              </section>
            )}
          </>
        ) : null}

      </main>

      {/* CONFIRMATION */}

      <ConfirmationModal
        open={
          confirmModal.open
        }
        title={
          confirmModal.title
        }
        message={
          confirmModal.message
        }
        confirmLabel={
          confirmModal.confirmLabel
        }
        loading={
          actionLoading !== null ||
          reviewLoading
        }
        onConfirm={
          confirmModal.onConfirm
        }
        onCancel={() => {
          if (
            actionLoading ===
              null &&
            !reviewLoading
          ) {
            setConfirmModal(
              (current) => ({
                ...current,
                open: false,
              })
            );
          }
        }}
      />

      {/* FOOTER */}

      <footer className="customer-bookings-footer">

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

export default Bookings;