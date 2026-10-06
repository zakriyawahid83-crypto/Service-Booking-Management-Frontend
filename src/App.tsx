import { lazy, Suspense } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Bookings = lazy(() => import("./pages/Bookings"));
const Profile = lazy(() => import("./pages/Profile"));
const ProviderDashboard = lazy(() => import("./pages/ProviderDashboard"));
const ProviderBookings = lazy(() => import("./pages/ProviderBookings"));
const ProviderServices = lazy(() => import("./pages/ProviderServices"));
const ProviderCalendar = lazy(() => import("./pages/ProviderCalendar"));
const ProviderAvailability = lazy(() => import("./pages/ProviderAvailability"));
const ProviderCategories = lazy(() => import("./pages/ProviderCategories"));
const ProviderCustomers = lazy(() => import("./pages/ProviderCustomers"));
const ProviderEarnings = lazy(() => import("./pages/ProviderEarnings"));
const ProviderReviews = lazy(() => import("./pages/ProviderReviews"));
const ProviderProfile = lazy(() => import("./pages/ProviderProfile"));
const BookService = lazy(() => import("./BookService"));
import { clearAuthSession } from "./services/authSession";

import "./App.css";

function App() {
  const token =
    localStorage.getItem("token") ||
    sessionStorage.getItem("token");

  const role =
    localStorage.getItem("role") ||
    sessionStorage.getItem("role");

  const handleLogout = () => {
    clearAuthSession();
    window.location.href = "/login";
  };

  const handleLogin = () => {
    const userRole =
      localStorage.getItem("role") ||
      sessionStorage.getItem("role");

    if (userRole === "provider") {
      window.location.href = "/provider/dashboard";
    } else {
      window.location.href = "/dashboard";
    }
  };

  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>

        {/* =================================================
            LOGIN
        ================================================= */}

        <Route
          path="/login"
          element={
            token ? (
              <Navigate
                to={
                  role === "provider"
                    ? "/provider/dashboard"
                    : "/dashboard"
                }
                replace
              />
            ) : (
              <Login onLogin={handleLogin} />
            )
          }
        />

        {/* =================================================
            HOME
        ================================================= */}

        <Route
          path="/"
          element={
            <Navigate
              to={
                token
                  ? role === "provider"
                    ? "/provider/dashboard"
                    : "/dashboard"
                  : "/login"
              }
              replace
            />
          }
        />

        {/* =================================================
            CUSTOMER
        ================================================= */}

        <Route
          path="/dashboard"
          element={
            token && role === "customer" ? (
              <Dashboard onLogout={handleLogout} />
            ) : (
              <Navigate
                to="/login"
                replace
              />
            )
          }
        />

        <Route
          path="/bookings"
          element={
            token && role === "customer" ? (
              <Bookings />
            ) : (
              <Navigate
                to="/login"
                replace
              />
            )
          }
        />

        <Route
          path="/book-service"
          element={
            token && role === "customer" ? (
              <BookService />
            ) : (
              <Navigate
                to="/login"
                replace
              />
            )
          }
        />

        {/* =================================================
            CUSTOMER PROFILE
        ================================================= */}

        <Route
          path="/profile"
          element={
            token ? (
              <Profile />
            ) : (
              <Navigate
                to="/login"
                replace
              />
            )
          }
        />

        {/* =================================================
            PROVIDER DASHBOARD
        ================================================= */}

        <Route
          path="/provider/dashboard"
          element={
            token && role === "provider" ? (
              <ProviderDashboard />
            ) : (
              <Navigate
                to="/login"
                replace
              />
            )
          }
        />

        <Route
          path="/provider/bookings"
          element={
            token && role === "provider" ? (
              <ProviderBookings />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* =================================================
            PROVIDER SERVICES
        ================================================= */}

        <Route
          path="/provider/services"
          element={
            token && role === "provider" ? (
              <ProviderServices />
            ) : (
              <Navigate
                to="/login"
                replace
              />
            )
          }
        />

        {/* =================================================
            PROVIDER CATEGORIES
        ================================================= */}

        <Route
          path="/provider/categories"
          element={
            token && role === "provider" ? (
              <ProviderCategories />
            ) : (
              <Navigate
                to="/login"
                replace
              />
            )
          }
        />

        {/* =================================================
            PROVIDER CALENDAR
        ================================================= */}

        <Route
          path="/provider/calendar"
          element={
            token && role === "provider" ? (
              <ProviderCalendar />
            ) : (
              <Navigate
                to="/login"
                replace
              />
            )
          }
        />

        <Route
          path="/provider/availability"
          element={
            token && role === "provider" ? (
              <ProviderAvailability />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* =================================================
            PROVIDER CUSTOMERS
        ================================================= */}

        <Route
          path="/provider/customers"
          element={
            token && role === "provider" ? (
              <ProviderCustomers />
            ) : (
              <Navigate
                to="/login"
                replace
              />
            )
          }
        />

        {/* =================================================
            PROVIDER EARNINGS
        ================================================= */}

        <Route
          path="/provider/earnings"
          element={
            token && role === "provider" ? (
              <ProviderEarnings />
            ) : (
              <Navigate
                to="/login"
                replace
              />
            )
          }
        />

        {/* =================================================
            PROVIDER REVIEWS
        ================================================= */}

        <Route
          path="/provider/reviews"
          element={
            token && role === "provider" ? (
              <ProviderReviews />
            ) : (
              <Navigate
                to="/login"
                replace
              />
            )
          }
        />

        {/* =================================================
            PROVIDER PROFILE
        ================================================= */}

        <Route
          path="/provider/profile"
          element={
            token && role === "provider" ? (
              <ProviderProfile />
            ) : (
              <Navigate
                to="/login"
                replace
              />
            )
          }
        />

        {/* =================================================
            UNKNOWN URL
        ================================================= */}

        <Route
          path="*"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />

        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
