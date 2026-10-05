import { useState } from "react";
import { ArrowLeft, ArrowRight, Eye, EyeOff, House, ShieldCheck } from "lucide-react";
import { AUTH_NOTICE_KEY, clearAuthSession } from "../services/authSession";
import "./Login.css";

interface LoginProps {
  onLogin: () => void;
}

type FormMode = "login" | "register" | "forgot";

function Login({ onLogin }: LoginProps) {
  const [mode, setMode] = useState<FormMode>("login");

  // Login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Register
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("customer");

  // Forgot password
  const [resetEmail, setResetEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(() => {
    const notice = sessionStorage.getItem(AUTH_NOTICE_KEY) || "";
    sessionStorage.removeItem(AUTH_NOTICE_KEY);
    return notice;
  });
  const [success, setSuccess] = useState("");

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const switchMode = (newMode: FormMode) => {
    setMode(newMode);
    clearMessages();
  };

  // ================= LOGIN =================

  const handleLogin = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    clearMessages();

    if (!email.trim() || !password.trim()) {
      setError("Please enter email and password.");
      return;
    }

    setLoading(true);

    try {
      clearAuthSession();

     const response = await fetch(
  `${import.meta.env.VITE_API_BASE_URL}/auth/login`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: email.trim(),
      password,
    }),
  }
);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Invalid email or password."
        );
      }

      if (!data.access_token) {
        throw new Error(
          "Login successful, but access token was not returned."
        );
      }

      const authStorage = rememberMe ? localStorage : sessionStorage;
      authStorage.setItem("token", data.access_token);

      authStorage.setItem(
        "token_type",
        data.token_type || "bearer"
      );

      if (
        data.user_id !== undefined &&
        data.user_id !== null
      ) {
        authStorage.setItem(
          "user_id",
          String(data.user_id)
        );
      }

      if (!data.role) {
        authStorage.removeItem("token");

        throw new Error(
          "Login successful, but user role was not returned."
        );
      }

      authStorage.setItem("role", data.role);

      const savedToken = authStorage.getItem("token");

      if (!savedToken) {
        throw new Error(
          "Token could not be saved in browser storage."
        );
      }

      onLogin();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ================= REGISTER =================

  const handleRegister = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    clearMessages();

    if (
      !name.trim() ||
      !email.trim() ||
      !password.trim() ||
      !confirmPassword.trim()
    ) {
      setError("Please fill in all fields.");
      return;
    }

    if (password.length < 6) {
      setError(
        "Password must be at least 6 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}/auth/register`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
      }),
    }
  );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Registration failed."
        );
      }

      setSuccess(
        "Account created successfully. You can now login."
      );

      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setRole("customer");

      setTimeout(() => {
        setMode("login");
        setSuccess("");
      }, 1500);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Registration failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ================= FORGOT PASSWORD =================

  const handleForgotPassword = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    clearMessages();

    if (!resetEmail.trim()) {
      setError("Please enter your email.");
      return;
    }

    setLoading(true);

    try {
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}/auth/forgot-password`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: resetEmail.trim(),
      }),
    }
  );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to process request."
        );
      }

      setSuccess(
        "If this email exists, a password reset link has been sent."
      );

      setResetEmail("");
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ================= UI =================

  return (
    <div className="auth-screen">
      <section className="auth-brand-panel">
        <div className="auth-brand">
          <span className="auth-brand-mark"><House size={18} strokeWidth={1.7} /></span>
          <span>Service Booking</span>
        </div>
        <div className="auth-brand-copy">
          <span className="auth-overline">CARE, CRAFTED AROUND YOU</span>
          <h2>Hello,<br />Welcome!</h2>
          <p>Book trusted services with ease. Your comfort, our priority.</p>
        </div>
        <div className="auth-brand-footer">
          <ShieldCheck size={17} />
          <span>Thoughtful service, from booking to the finishing touch.</span>
        </div>
        <span className="auth-brand-index">01 / 03</span>
      </section>

      <main className="auth-form-panel">
        <div className="auth-mobile-brand">
          <span className="auth-brand-mark"><House size={17} strokeWidth={1.7} /></span>
          <span>Service Booking</span>
        </div>
        <div className="auth-card">
        {/* ================= LOGIN ================= */}

        {mode === "login" && (
          <>
            <h1
              style={{
                textAlign: "center",
                marginBottom: "10px",
              }}
            >
              Welcome Back
            </h1>

            <p
              style={{
                textAlign: "center",
                color: "#687386",
                marginBottom: "30px",
              }}
            >
              Login to your Service Booking account
            </p>

            {error && (
              <div
                className="auth-message auth-error"
                style={{
                  background: "#fff1f1",
                  border: "1px solid #ffcccc",
                  color: "#c62828",
                  padding: "12px",
                  borderRadius: "10px",
                  marginBottom: "20px",
                }}
              >
                {error}
              </div>
            )}

            {success && (
              <div
                className="auth-message auth-success"
                style={{
                  background: "#effaf3",
                  border: "1px solid #b7e4c7",
                  color: "#18794e",
                  padding: "12px",
                  borderRadius: "10px",
                  marginBottom: "20px",
                }}
              >
                {success}
              </div>
            )}

            <form onSubmit={handleLogin}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: 600,
                }}
              >
                Email
              </label>

              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "13px",
                  marginBottom: "20px",
                  border: "1px solid #d8dee9",
                  borderRadius: "10px",
                  fontSize: "15px",
                }}
              />

              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: 600,
                }}
              >
                Password
              </label>

                <div className="auth-password-field">
              <input
                    type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "13px",
                  marginBottom: "10px",
                  border: "1px solid #d8dee9",
                  borderRadius: "10px",
                  fontSize: "15px",
                }}
              />
                  <button
                    className="auth-visibility-toggle"
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>

              <div
                  className="auth-form-meta"
              >
                  <label className="auth-remember">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(event) => setRememberMe(event.target.checked)}
                    />
                    <span>Remember me</span>
                  </label>
                <button
                  type="button"
                  onClick={() =>
                    switchMode("forgot")
                  }
                   className="auth-text-button"
                >
                  Forgot Password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "14px",
                  border: "none",
                  borderRadius: "10px",
                  background: loading
                    ? "#8da2c0"
                    : "#2563eb",
                  color: "#fff",
                  fontSize: "16px",
                  fontWeight: 600,
                  cursor: loading
                    ? "not-allowed"
                    : "pointer",
                }}
              >
                {loading
                  ? "Logging in..."
                  : <>Login <ArrowRight size={16} /></>}
              </button>
            </form>

            <p
              style={{
                textAlign: "center",
                marginTop: "25px",
                color: "#687386",
              }}
            >
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() =>
                  switchMode("register")
                }
                style={{
                  background: "none",
                  border: "none",
                  color: "#2563eb",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: "15px",
                }}
              >
                Register
              </button>
            </p>
          </>
        )}

        {/* ================= REGISTER ================= */}

        {mode === "register" && (
          <>
            <h1
              style={{
                textAlign: "center",
                marginBottom: "10px",
              }}
            >
              Create Account
            </h1>

            <p
              style={{
                textAlign: "center",
                color: "#687386",
                marginBottom: "30px",
              }}
            >
              Create your Service Booking account
            </p>

            {error && (
              <div
                className="auth-message auth-error"
                style={{
                  background: "#fff1f1",
                  border: "1px solid #ffcccc",
                  color: "#c62828",
                  padding: "12px",
                  borderRadius: "10px",
                  marginBottom: "20px",
                }}
              >
                {error}
              </div>
            )}

            {success && (
              <div
                className="auth-message auth-success"
                style={{
                  background: "#effaf3",
                  border: "1px solid #b7e4c7",
                  color: "#18794e",
                  padding: "12px",
                  borderRadius: "10px",
                  marginBottom: "20px",
                }}
              >
                {success}
              </div>
            )}

            <form onSubmit={handleRegister}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: 600,
                }}
              >
                Name
              </label>

              <input
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "13px",
                  marginBottom: "18px",
                  border: "1px solid #d8dee9",
                  borderRadius: "10px",
                  fontSize: "15px",
                }}
              />

              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: 600,
                }}
              >
                Email
              </label>

              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "13px",
                  marginBottom: "18px",
                  border: "1px solid #d8dee9",
                  borderRadius: "10px",
                  fontSize: "15px",
                }}
              />

              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: 600,
                }}
              >
                Password
              </label>

              <input
                type={showPassword ? "text" : "password"}
                placeholder="Create a password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "13px",
                  marginBottom: "18px",
                  border: "1px solid #d8dee9",
                  borderRadius: "10px",
                  fontSize: "15px",
                }}
              />

              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: 600,
                }}
              >
                Confirm Password
              </label>

              <div className="auth-password-field">
              <input
                  type={showPassword ? "text" : "password"}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(e.target.value)
                }
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "13px",
                  marginBottom: "18px",
                  border: "1px solid #d8dee9",
                  borderRadius: "10px",
                  fontSize: "15px",
                }}
              />
                  <button
                    className="auth-visibility-toggle"
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>

              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: 600,
                }}
              >
                Account Type
              </label>

              <select
                value={role}
                onChange={(e) =>
                  setRole(e.target.value)
                }
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "13px",
                  marginBottom: "25px",
                  border: "1px solid #d8dee9",
                  borderRadius: "10px",
                  fontSize: "15px",
                  background: "#fff",
                }}
              >
                <option value="customer">
                  Customer
                </option>

                <option value="provider">
                  Service Provider
                </option>
              </select>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "14px",
                  border: "none",
                  borderRadius: "10px",
                  background: loading
                    ? "#8da2c0"
                    : "#2563eb",
                  color: "#fff",
                  fontSize: "16px",
                  fontWeight: 600,
                  cursor: loading
                    ? "not-allowed"
                    : "pointer",
                }}
              >
                {loading
                  ? "Creating Account..."
                  : <>Register <ArrowRight size={16} /></>}
              </button>
            </form>

            <p
              style={{
                marginTop: "25px",
                color: "#687386",
              }}
            >
              Already have an account?{" "}
              <button
                type="button"
                onClick={() =>
                  switchMode("login")
                }
                style={{
                  background: "none",
                  border: "none",
                  color: "#2563eb",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: "15px",
                }}
              >
                Login
              </button>
            </p>
          </>
        )}

        {/* ================= FORGOT PASSWORD ================= */}

        {mode === "forgot" && (
          <>
            <h1
              style={{
                textAlign: "center",
                marginBottom: "10px",
              }}
            >
              Forgot Password?
            </h1>

            <p
              style={{
                textAlign: "center",
                color: "#687386",
                marginBottom: "30px",
              }}
            >
              Enter your email to reset your password
            </p>

            {error && (
              <div
                className="auth-message auth-error"
                style={{
                  background: "#fff1f1",
                  border: "1px solid #ffcccc",
                  color: "#c62828",
                  padding: "12px",
                  borderRadius: "10px",
                  marginBottom: "20px",
                }}
              >
                {error}
              </div>
            )}

            {success && (
              <div
                className="auth-message auth-success"
                style={{
                  background: "#effaf3",
                  border: "1px solid #b7e4c7",
                  color: "#18794e",
                  padding: "12px",
                  borderRadius: "10px",
                  marginBottom: "20px",
                }}
              >
                {success}
              </div>
            )}

            <form onSubmit={handleForgotPassword}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: 600,
                }}
              >
                Email
              </label>

              <input
                type="email"
                placeholder="Enter your registered email"
                value={resetEmail}
                onChange={(e) =>
                  setResetEmail(e.target.value)
                }
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "13px",
                  marginBottom: "25px",
                  border: "1px solid #d8dee9",
                  borderRadius: "10px",
                  fontSize: "15px",
                }}
              />

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "14px",
                  border: "none",
                  borderRadius: "10px",
                  background: loading
                    ? "#8da2c0"
                    : "#2563eb",
                  color: "#fff",
                  fontSize: "16px",
                  fontWeight: 600,
                  cursor: loading
                    ? "not-allowed"
                    : "pointer",
                }}
              >
                {loading
                  ? "Sending..."
                  : <>Send Reset Link <ArrowRight size={16} /></>}
              </button>
            </form>

            <p
              style={{
                textAlign: "center",
                marginTop: "25px",
              }}
            >
              <button
                type="button"
                onClick={() =>
                  switchMode("login")
                }
                style={{
                  background: "none",
                  border: "none",
                  color: "#2563eb",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: "15px",
                }}
              >
                <ArrowLeft size={14} /> Back to Login
              </button>
            </p>
          </>
        )}
        </div>
      </main>
    </div>
  );
}

export default Login;