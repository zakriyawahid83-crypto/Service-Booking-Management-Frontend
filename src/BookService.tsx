import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  RefreshCw,
  Search,
} from "lucide-react";
import ConfirmationModal from "./components/ConfirmationModal";
import api from "./services/api";
import "./BookService.css";

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
  provider_name?: string | null;
  provider_location?: string | null;
};

type Category = {
  id: number;
  name: string;
};

type Slot = {
  start_time: string;
  end_time: string;
};

type BookingSuccess = {
  id: number;
  serviceName: string;
  date: string;
  startTime: string;
  endTime: string;
  price: number;
};

/* =========================================================
   LOCAL DATE
========================================================= */

const getLocalDate = (): string => {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    now.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

/* =========================================================
   ERROR MESSAGE
========================================================= */

const getErrorMessage = (
  error: unknown,
  fallback: string
): string => {
  const detail = (
    error as {
      response?: {
        data?: {
          detail?: unknown;
        };
      };
    }
  )?.response?.data?.detail;

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (
          typeof item === "object" &&
          item !== null &&
          "msg" in item
        ) {
          return String(item.msg);
        }

        return String(item);
      })
      .join(", ");
  }

  return fallback;
};

/* =========================================================
   FORMAT TIME
========================================================= */

const formatTime = (
  time: string
): string => {
  const parts = time.split(":");

  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes)
  ) {
    return time;
  }

  const date = new Date();

  date.setHours(
    hours,
    minutes,
    0,
    0
  );

  return date.toLocaleTimeString(
    "en-US",
    {
      hour: "numeric",
      minute: "2-digit",
    }
  );
};

/* =========================================================
   FORMAT DATE
========================================================= */

const formatDate = (
  date: string
): string => {
  const parts = date.split("-");

  if (parts.length !== 3) {
    return date;
  }

  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day)
  ) {
    return date;
  }

  return new Date(
    year,
    month - 1,
    day
  ).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

/* =========================================================
   NORMALIZE SLOTS
========================================================= */

const normaliseSlots = (
  data: unknown
): Slot[] => {
  if (Array.isArray(data)) {
    return data.flatMap((item) => {
      if (
        typeof item !== "object" ||
        item === null
      ) {
        return [];
      }

      const value = item as {
        start_time?: unknown;
        end_time?: unknown;
        start?: unknown;
        end?: unknown;
      };

      const start =
        value.start_time ??
        value.start;

      const end =
        value.end_time ??
        value.end;

      if (
        typeof start !== "string" ||
        typeof end !== "string"
      ) {
        return [];
      }

      return [
        {
          start_time: start,
          end_time: end,
        },
      ];
    });
  }

  if (
    typeof data === "object" &&
    data !== null
  ) {
    const value = data as {
      available_slots?: unknown;
      slots?: unknown;
    };

    const nested =
      value.available_slots ??
      value.slots;

    if (Array.isArray(nested)) {
      return normaliseSlots(nested);
    }
  }

  return [];
};

/* =========================================================
   COMPONENT
========================================================= */

function BookService() {
  const today = getLocalDate();

  /* =======================================================
     SERVICES
  ======================================================= */

  const [services, setServices] =
    useState<Service[]>([]);

  const [
    servicesLoading,
    setServicesLoading,
  ] = useState(true);

  const [
    servicesError,
    setServicesError,
  ] = useState("");

  /* =======================================================
     CATEGORIES
  ======================================================= */

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [
    categoriesError,
    setCategoriesError,
  ] = useState("");

  /* =======================================================
     FILTERS
  ======================================================= */

  const [
    searchQuery,
    setSearchQuery,
  ] = useState("");

  const [
    activeCategory,
    setActiveCategory,
  ] = useState<number | null>(null);

  /* =======================================================
     SELECTED SERVICE
  ======================================================= */

  const [
    selectedService,
    setSelectedService,
  ] = useState<Service | null>(null);

  /* =======================================================
     BOOKING DATE
  ======================================================= */

  const [
    bookingDate,
    setBookingDate,
  ] = useState("");

  /* =======================================================
     SLOTS
  ======================================================= */

  const [slots, setSlots] =
    useState<Slot[]>([]);

  const [
    slotsLoading,
    setSlotsLoading,
  ] = useState(false);

  const [
    slotsError,
    setSlotsError,
  ] = useState("");

  const [
    selectedSlot,
    setSelectedSlot,
  ] = useState<Slot | null>(null);

  const [
    slotRequestVersion,
    setSlotRequestVersion,
  ] = useState(0);

  /* =======================================================
     BOOKING FORM
  ======================================================= */

  const [
    serviceAddress,
    setServiceAddress,
  ] = useState("");

  const [
    customerNotes,
    setCustomerNotes,
  ] = useState("");

  const [
    bookingError,
    setBookingError,
  ] = useState("");

  const [
    bookingLoading,
    setBookingLoading,
  ] = useState(false);

  const [
    bookingConfirmOpen,
    setBookingConfirmOpen,
  ] = useState(false);

  const [
    bookingSuccess,
    setBookingSuccess,
  ] = useState<BookingSuccess | null>(
    null
  );

  /* =======================================================
     LOAD SERVICES
  ======================================================= */

  const loadServices = async () => {
    try {
      setServicesLoading(true);
      setServicesError("");

      const response =
        await api.get<Service[]>(
          "/services"
        );

      const data = Array.isArray(
        response.data
      )
        ? response.data
        : [];

      setServices(
        data.filter(
          (service) =>
            service.is_active
        )
      );
    } catch (error) {
      setServices([]);

      setServicesError(
        getErrorMessage(
          error,
          "Unable to load services."
        )
      );
    } finally {
      setServicesLoading(false);
    }
  };

  /* =======================================================
     LOAD CATEGORIES
  ======================================================= */

  const loadCategories = async () => {
    try {
      setCategoriesError("");

      const response =
        await api.get<Category[]>(
          "/categories"
        );

      setCategories(
        Array.isArray(
          response.data
        )
          ? response.data
          : []
      );
    } catch (error) {
      setCategories([]);

      setCategoriesError(
        getErrorMessage(
          error,
          "Unable to load categories."
        )
      );
    }
  };

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    void loadServices();
    void loadCategories();
  }, []);

  /* =======================================================
     CATEGORY NAME
  ======================================================= */

  const getCategoryName = (
    categoryId: number
  ): string => {
    return (
      categories.find(
        (category) =>
          category.id === categoryId
      )?.name ??
      "Uncategorized"
    );
  };

  /* =======================================================
     FILTER SERVICES
  ======================================================= */

  const filteredServices =
    useMemo(() => {
      const query =
        searchQuery
          .trim()
          .toLowerCase();

      return services.filter(
        (service) => {
          const categoryMatch =
            activeCategory === null ||
            service.category_id ===
              activeCategory;

          const searchableText =
            `${service.name} ${
              service.description ??
              ""
            } ${getCategoryName(
              service.category_id
            )}`.toLowerCase();

          return (
            categoryMatch &&
            searchableText.includes(
              query
            )
          );
        }
      );
    }, [
      services,
      categories,
      activeCategory,
      searchQuery,
    ]);

  /* =======================================================
     RESET BOOKING DETAILS
  ======================================================= */

  const resetBookingDetails =
    () => {
      setBookingDate("");
      setSlots([]);
      setSlotsError("");
      setSelectedSlot(null);
      setServiceAddress("");
      setCustomerNotes("");
      setBookingError("");
      setBookingConfirmOpen(false);
    };

  /* =======================================================
     SELECT SERVICE
  ======================================================= */

  const handleSelectService = (
    service: Service
  ) => {
    setSelectedService(service);

    setBookingSuccess(null);

    setBookingDate("");
    setSlots([]);
    setSlotsError("");
    setSelectedSlot(null);
    setServiceAddress("");
    setCustomerNotes("");
    setBookingError("");
    setBookingConfirmOpen(false);

    /*
      Booking section ko screen par le aao.
    */

    window.setTimeout(() => {
      document
        .getElementById(
          "booking-details"
        )
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 100);
  };

  /* =======================================================
     CHANGE DATE
  ======================================================= */

  const handleDateChange = (
    date: string
  ) => {
    setBookingError("");
    setSlotsError("");
    setSelectedSlot(null);
    setSlots([]);

    if (!date) {
      setBookingDate("");
      return;
    }

    if (date < today) {
      setBookingDate("");

      setBookingError(
        "You cannot select a past date."
      );

      return;
    }

    setBookingDate(date);
  };

  /* =======================================================
     TODAY BUTTON
  ======================================================= */

  const handleToday = () => {
    if (!selectedService) {
      setBookingError(
        "Please select a service first."
      );

      return;
    }

    /*
      Today ki exact local date set hogi.
    */

    const currentDate =
      getLocalDate();

    setBookingError("");
    setSlotsError("");
    setSelectedSlot(null);
    setSlots([]);
    setBookingDate(currentDate);
  };

  /* =======================================================
     LOAD SLOTS
  ======================================================= */

  useEffect(() => {
    if (
      !selectedService ||
      !bookingDate
    ) {
      setSlots([]);
      setSlotsError("");
      setSlotsLoading(false);
      return;
    }

    let cancelled = false;

    const loadSlots = async () => {
      try {
        setSlotsLoading(true);
        setSlotsError("");
        setSlots([]);
        setSelectedSlot(null);

        /*
          IMPORTANT:

          Provider ID is derived from the selected service's
          provider record, not from a hard-coded value.

          Example request shape:

          /availability/slots/<provider_id>
          ?date=2026-10-02
          &service_id=4
        */

        const response =
          await api.get(
            `/availability/slots/${selectedService.provider_id}`,
            {
              params: {
                date: bookingDate,
                service_id:
                  selectedService.id,
              },
            }
          );

        if (cancelled) {
          return;
        }

        const availableSlots =
          normaliseSlots(
            response.data
          );

        setSlots(
          availableSlots
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        setSlots([]);

        setSlotsError(
          getErrorMessage(
            error,
            "Unable to load available time slots."
          )
        );
      } finally {
        if (!cancelled) {
          setSlotsLoading(false);
        }
      }
    };

    void loadSlots();

    return () => {
      cancelled = true;
    };
  }, [
    selectedService,
    bookingDate,
    slotRequestVersion,
  ]);

  /* =======================================================
     VALIDATE BOOKING
  ======================================================= */

  const validateBooking =
    (): boolean => {
      if (!selectedService) {
        setBookingError(
          "Please select a service."
        );

        return false;
      }

      if (!bookingDate) {
        setBookingError(
          "Please select a booking date."
        );

        return false;
      }

      if (!selectedSlot) {
        setBookingError(
          "Please select an available time slot."
        );

        return false;
      }

      if (
        serviceAddress.trim().length <
        5
      ) {
        setBookingError(
          "Please enter a complete service address."
        );

        return false;
      }

      return true;
    };

  /* =======================================================
     OPEN CONFIRMATION
  ======================================================= */

  const handleBookingSubmit = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setBookingError("");

    if (!validateBooking()) {
      return;
    }

    setBookingConfirmOpen(true);
  };

  /* =======================================================
     CREATE BOOKING
  ======================================================= */

  const performBooking =
    async () => {
      if (
        !validateBooking() ||
        !selectedService ||
        !selectedSlot
      ) {
        return;
      }

      try {
        setBookingLoading(true);
        setBookingError("");

        /*
          Provider ID yahan manually nahi bhejna.

          Backend service_id se provider
          automatically identify karega.
        */

        const response =
          await api.post(
            "/bookings",
            {
              service_id:
                selectedService.id,

              booking_date:
                bookingDate,

              start_time:
                selectedSlot.start_time,

              customer_notes:
                customerNotes.trim() ||
                null,

              service_address:
                serviceAddress.trim(),
            }
          );

        setBookingSuccess({
          id: Number(
            response.data.id
          ),

          serviceName:
            selectedService.name,

          date: bookingDate,

          startTime:
            selectedSlot.start_time,

          endTime:
            selectedSlot.end_time,

          price: Number(
            response.data.price ??
              selectedService.price
          ),
        });

        setSelectedService(null);

        resetBookingDetails();
      } catch (error) {
        const status =
          (
            error as {
              response?: {
                status?: number;
              };
            }
          )?.response?.status;

        setBookingConfirmOpen(
          false
        );

        setBookingError(
          getErrorMessage(
            error,
            "Booking failed. Please try again."
          )
        );

        if (status === 409) {
          setSelectedSlot(null);

          /*
            Booking conflict ho to
            slots dobara load karo.
          */

          setSlotRequestVersion(
            (version) =>
              version + 1
          );
        }
      } finally {
        setBookingLoading(false);
      }
    };

  /* =======================================================
     CAN SUBMIT
  ======================================================= */

  const canSubmit =
    Boolean(
      selectedService &&
        bookingDate &&
        selectedSlot &&
        serviceAddress.trim()
          .length >= 5 &&
        !slotsLoading &&
        !bookingLoading
    );

  /* =======================================================
     JSX
  ======================================================= */

  return (
    <main className="booking-page">
      <div className="booking-container">

        {/* =================================================
            HEADER
        ================================================= */}

        <header className="booking-header">
          <div>
            <span className="welcome-label">
              CUSTOMER BOOKING
            </span>

            <h1>
              Book a service
            </h1>

            <p>
              Select a service, date,
              and available time to
              submit your booking request.
            </p>
          </div>

          <a
            href="/dashboard"
            className="back-button"
          >
            Dashboard
          </a>
        </header>

        {/* =================================================
            SUCCESS
        ================================================= */}

        {bookingSuccess && (
          <section
            className="booking-success-card"
            role="status"
          >
            <div className="booking-success-icon">
              <CheckCircle2 size={22} />
            </div>

            <div className="booking-success-copy">
              <h2>
                Booking request submitted
              </h2>

              <p>
                Your provider will
                confirm the request
                shortly.
              </p>

              <div className="booking-success-meta">

                <div>
                  <span>
                    Booking
                  </span>

                  <strong>
                    #{bookingSuccess.id}
                  </strong>
                </div>

                <div>
                  <span>
                    Service
                  </span>

                  <strong>
                    {
                      bookingSuccess.serviceName
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    Date
                  </span>

                  <strong>
                    {formatDate(
                      bookingSuccess.date
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Time
                  </span>

                  <strong>
                    {formatTime(
                      bookingSuccess.startTime
                    )}
                    –
                    {formatTime(
                      bookingSuccess.endTime
                    )}
                  </strong>
                </div>

              </div>

              <div className="booking-success-actions">

                <a
                  href="/bookings"
                  className="success-action-button primary"
                >
                  View My Bookings
                </a>

                <button
                  type="button"
                  className="success-action-button secondary"
                  onClick={() =>
                    setBookingSuccess(
                      null
                    )
                  }
                >
                  Book another service
                </button>

              </div>
            </div>
          </section>
        )}

        <div className="booking-content">

          {/* =================================================
              SERVICE CATALOG
          ================================================= */}

          <section className="services-section">

            <div className="catalog-heading">

              <div>
                <span className="catalog-eyebrow">
                  SERVICE CATALOG
                </span>

                <h2>
                  Choose a service
                </h2>
              </div>

              {!servicesLoading &&
                !servicesError && (
                  <span className="service-count">
                    {
                      filteredServices.length
                    }{" "}
                    available
                  </span>
                )}

            </div>

            {/* SEARCH */}

            <label className="service-search">

              <Search
                size={18}
              />

              <input
                type="search"
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(
                    event.target.value
                  )
                }
                placeholder="Search services..."
              />

            </label>

            {/* CATEGORIES */}

            {categories.length >
              0 && (
              <div className="category-filters">

                <button
                  type="button"
                  className={`category-filter ${
                    activeCategory ===
                    null
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    setActiveCategory(
                      null
                    )
                  }
                >
                  All
                </button>

                {categories.map(
                  (category) => (
                    <button
                      type="button"
                      key={
                        category.id
                      }
                      className={`category-filter ${
                        activeCategory ===
                        category.id
                          ? "active"
                          : ""
                      }`}
                      onClick={() =>
                        setActiveCategory(
                          category.id
                        )
                      }
                    >
                      {category.name}
                    </button>
                  )
                )}

              </div>
            )}

            {categoriesError && (
              <div className="catalog-notice">
                {categoriesError}
              </div>
            )}

            {/* SERVICES LOADING */}

            {servicesLoading ? (
              <div className="loading-state">

                <span className="loading-indicator" />

                Loading services...

              </div>

            ) : servicesError ? (

              <div className="error-state">

                <p>
                  {servicesError}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    void loadServices()
                  }
                >
                  <RefreshCw
                    size={15}
                  />
                  Try again
                </button>

              </div>

            ) : filteredServices.length ===
              0 ? (

              <div className="empty-state">

                <h3>
                  No matching services
                </h3>

                <p>
                  Try another search
                  or category.
                </p>

              </div>

            ) : (

              /* =================================================
                 SERVICE GRID
              ================================================= */

              <div className="services-grid">

                {filteredServices.map(
                  (service) => {

                    const selected =
                      selectedService?.id ===
                      service.id;

                    return (
                      <article
                        key={service.id}
                        className={`service-card ${
                          selected
                            ? "selected"
                            : ""
                        }`}
                      >

                        {/* ================================
                            IMAGE
                        ================================= */}

                        <div className="service-card-image-container">

                          {service.image_url ? (

                            <img
                              src={
                                service.image_url
                              }
                              alt={
                                service.name
                              }
                              width={640}
                              height={360}
                              loading="lazy"
                              decoding="async"
                              className="service-card-image"
                              onError={(
                                event
                              ) => {
                                event.currentTarget.style.display =
                                  "none";

                                const parent =
                                  event
                                    .currentTarget
                                    .parentElement;

                                if (
                                  parent
                                ) {
                                  const fallback =
                                    document.createElement(
                                      "div"
                                    );

                                  fallback.className =
                                    "service-card-image-placeholder";

                                  fallback.textContent =
                                    "Image unavailable";

                                  parent.appendChild(
                                    fallback
                                  );
                                }
                              }}
                            />

                          ) : (

                            <div className="service-card-image-placeholder">
                              No Image
                            </div>

                          )}

                        </div>

                        {/* ================================
                            CATEGORY
                        ================================= */}

                        <div className="service-title-row">

                          <span className="service-category">
                            {
                              getCategoryName(
                                service.category_id
                              )
                            }
                          </span>

                          {selected && (
                            <span className="selected-label">
                              <CheckCircle2
                                size={14}
                              />
                              Selected
                            </span>
                          )}

                        </div>

                        {/* ================================
                            NAME
                        ================================= */}

                        <h3>
                          {service.name}
                        </h3>

                        {/* ================================
                            DESCRIPTION
                        ================================= */}

                        {service.description && (
                          <p className="service-description">
                            {
                              service.description
                            }
                          </p>
                        )}

                        {/* ================================
                            PROVIDER
                        ================================= */}

                        {service.provider_name && (
                          <p className="service-provider-details">
                            {
                              service.provider_name
                            }

                            {service.provider_location
                              ? ` · ${service.provider_location}`
                              : ""}
                          </p>
                        )}

                        {/* ================================
                            PRICE / DURATION
                        ================================= */}

                        <div className="service-info">

                          <strong>
                            Rs.{" "}
                            {Number(
                              service.price
                            ).toLocaleString()}
                          </strong>

                          <span>
                            <Clock3
                              size={15}
                            />

                            {
                              service.duration_minutes
                            }{" "}
                            min
                          </span>

                        </div>

                        {/* ================================
                            SELECT BUTTON
                        ================================= */}

                        <button
                          type="button"
                          className="service-book-button"
                          onClick={() =>
                            handleSelectService(
                              service
                            )
                          }
                          disabled={
                            bookingLoading
                          }
                        >
                          {selected
                            ? "Selected"
                            : "Select service"}
                        </button>

                      </article>
                    );
                  }
                )}

              </div>
            )}

          </section>

          {/* =================================================
              BOOKING DETAILS
          ================================================= */}

          <section
            id="booking-details"
            className="booking-form-section"
          >

            <div className="catalog-heading">

              <div>
                <span className="catalog-eyebrow">
                  BOOKING DETAILS
                </span>

                <h2>
                  Choose date and time
                </h2>
              </div>

            </div>

            {/* BOOKING ERROR */}

            {bookingError && (
              <div
                className="booking-error"
                role="alert"
              >
                {bookingError}
              </div>
            )}

            {/* =================================================
                SELECTED SERVICE
            ================================================= */}

            {selectedService ? (

              <div className="selected-service-card">

                <div>

                  <span className="selected-service-label">
                    Selected service
                  </span>

                  <h3>
                    {
                      selectedService.name
                    }
                  </h3>

                  {selectedService.provider_name && (
                    <p>
                      Provider:{" "}
                      {
                        selectedService.provider_name
                      }
                    </p>
                  )}

                </div>

                <div className="selected-service-meta">

                  <strong>
                    Rs.{" "}
                    {Number(
                      selectedService.price
                    ).toLocaleString()}
                  </strong>

                  <span>
                    {
                      selectedService.duration_minutes
                    }{" "}
                    min
                  </span>

                </div>

              </div>

            ) : (

              <div className="selection-prompt">

                <CalendarDays
                  size={20}
                />

                <p>
                  Select a service above
                  to start your booking.
                </p>

              </div>

            )}

            {/* =================================================
                FORM
            ================================================= */}

            <form
              className="booking-form"
              onSubmit={
                handleBookingSubmit
              }
            >

              {/* =================================================
                  DATE
              ================================================= */}

              <div className="form-group">

                <label htmlFor="bookingDate">
                  Booking date
                </label>

                <div className="date-picker-row">

                  <input
                    id="bookingDate"
                    type="date"
                    value={bookingDate}
                    min={today}
                    disabled={
                      !selectedService ||
                      bookingLoading
                    }
                    onChange={(event) =>
                      handleDateChange(
                        event.target.value
                      )
                    }
                  />

                  <button
                    type="button"
                    className="today-button"
                    disabled={
                      !selectedService ||
                      bookingLoading
                    }
                    onClick={
                      handleToday
                    }
                  >
                    Today
                  </button>

                </div>

                <p className="field-hint">
                  Today:{" "}
                  {formatDate(today)}
                </p>

              </div>

              {/* =================================================
                  AVAILABLE SLOTS
              ================================================= */}

              <div className="form-group">

                <label>
                  Available time slots
                </label>

                {!selectedService ? (

                  <div className="disabled-state">
                    Select a service first.
                  </div>

                ) : !bookingDate ? (

                  <div className="disabled-state">
                    Select a date first.
                  </div>

                ) : slotsLoading ? (

                  <div className="loading-state compact">

                    <span className="loading-indicator" />

                    Loading available
                    slots...

                  </div>

                ) : slotsError ? (

                  <div
                    className="error-state compact"
                    role="alert"
                  >

                    <p>
                      {slotsError}
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        setSlotRequestVersion(
                          (
                            version
                          ) =>
                            version + 1
                        )
                      }
                    >
                      <RefreshCw
                        size={15}
                      />
                      Retry
                    </button>

                  </div>

                ) : slots.length ===
                  0 ? (

                  <div className="empty-state compact">

                    <h3>
                      No slots available
                    </h3>

                    <p>
                      No available time
                      slots were returned
                      for{" "}
                      {formatDate(
                        bookingDate
                      )}
                      .
                    </p>

                  </div>

                ) : (

                  <div className="slots-grid">

                    {slots.map(
                      (slot) => {

                        const selected =
                          selectedSlot?.start_time ===
                            slot.start_time &&
                          selectedSlot?.end_time ===
                            slot.end_time;

                        return (
                          <button
                            type="button"
                            key={`${slot.start_time}-${slot.end_time}`}
                            className={`slot-button ${
                              selected
                                ? "selected"
                                : ""
                            }`}
                            aria-pressed={
                              selected
                            }
                            disabled={
                              bookingLoading
                            }
                            onClick={() => {
                              setSelectedSlot(
                                slot
                              );

                              setBookingError(
                                ""
                              );
                            }}
                          >
                            {formatTime(
                              slot.start_time
                            )}
                            {" – "}
                            {formatTime(
                              slot.end_time
                            )}
                          </button>
                        );
                      }
                    )}

                  </div>

                )}

              </div>

              {/* =================================================
                  ADDRESS
              ================================================= */}

              <div className="form-group">

                <label htmlFor="serviceAddress">
                  Service address
                </label>

                <div className="input-with-icon">

                  <MapPin
                    size={17}
                  />

                  <textarea
                    id="serviceAddress"
                    rows={3}
                    maxLength={500}
                    value={
                      serviceAddress
                    }
                    disabled={
                      !selectedService ||
                      bookingLoading
                    }
                    onChange={(event) =>
                      setServiceAddress(
                        event.target.value
                      )
                    }
                    placeholder="Enter your service / meeting address"
                  />

                </div>

                <p className="field-hint">
                  Minimum 5 characters.
                </p>

              </div>

              {/* =================================================
                  NOTES
              ================================================= */}

              <div className="form-group">

                <label htmlFor="customerNotes">
                  Additional notes{" "}
                  <span>
                    (optional)
                  </span>
                </label>

                <textarea
                  id="customerNotes"
                  rows={3}
                  maxLength={2000}
                  value={
                    customerNotes
                  }
                  disabled={
                    !selectedService ||
                    bookingLoading
                  }
                  onChange={(event) =>
                    setCustomerNotes(
                      event.target.value
                    )
                  }
                  placeholder="Anything the provider should know?"
                />

              </div>

              {/* =================================================
                  SUMMARY
              ================================================= */}

              {selectedService &&
                bookingDate &&
                selectedSlot && (

                  <div className="booking-summary">

                    <h3>
                      Booking summary
                    </h3>

                    <div>
                      <span>
                        Service
                      </span>

                      <strong>
                        {
                          selectedService.name
                        }
                      </strong>
                    </div>

                    <div>
                      <span>
                        Provider
                      </span>

                      <strong>
                        {
                          selectedService.provider_name ??
                          "Provider"
                        }
                      </strong>
                    </div>

                    <div>
                      <span>
                        Date
                      </span>

                      <strong>
                        {formatDate(
                          bookingDate
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Time
                      </span>

                      <strong>
                        {formatTime(
                          selectedSlot.start_time
                        )}
                        {" – "}
                        {formatTime(
                          selectedSlot.end_time
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Price
                      </span>

                      <strong>
                        Rs.{" "}
                        {Number(
                          selectedService.price
                        ).toLocaleString()}
                      </strong>
                    </div>

                  </div>

                )}

              {/* =================================================
                  SUBMIT
              ================================================= */}

              <button
                type="submit"
                className="book-button"
                disabled={
                  !canSubmit
                }
              >
                {bookingLoading
                  ? "Submitting..."
                  : "Review booking"}
              </button>

            </form>

          </section>
        </div>
      </div>

      {/* =====================================================
          CONFIRMATION MODAL
      ===================================================== */}

      <ConfirmationModal
        open={
          bookingConfirmOpen
        }
        title="Confirm booking?"
        message={
          selectedService &&
          selectedSlot
            ? `Book ${
                selectedService.name
              } on ${formatDate(
                bookingDate
              )} from ${formatTime(
                selectedSlot.start_time
              )} to ${formatTime(
                selectedSlot.end_time
              )}?`
            : "Confirm this booking?"
        }
        confirmLabel="Submit booking"
        loading={
          bookingLoading
        }
        onConfirm={() =>
          void performBooking()
        }
        onCancel={() => {
          if (
            !bookingLoading
          ) {
            setBookingConfirmOpen(
              false
            );
          }
        }}
      />
    </main>
  );
}

export default BookService;
