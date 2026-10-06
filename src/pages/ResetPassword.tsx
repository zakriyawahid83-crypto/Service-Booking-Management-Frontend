import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, ArrowRight, House } from "lucide-react";

function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const API_BASE_URL = (
    import.meta.env.VITE_API_BASE_URL || ""
  ).replace(/\/+$/, "");

  const handleResetPassword = async (
    e: FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!token) {
      setError(
        "Invalid or missing password reset link."
      );
      return;
    }

    if (!password || !confirmPassword) {
      setError(
        "Please enter and confirm your new password."
      );
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
      const params = new URLSearchParams();

      params.set("token", token);
      params.set("new_password", password);

      const response = await fetch(
        `${API_BASE_URL}/auth/reset-password?${params.toString()}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      let data: any = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Unable to reset password."
        );
      }

      setSuccess(
        "Password reset successfully. You can now login."
      );

      setPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err) {
      console.error(
        "Reset password error:",
        err
      );

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          "Unable to reset password."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "#f5f7fb",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "430px",
          background: "#ffffff",
          borderRadius: "18px",
          padding: "35px",
          boxShadow:
            "0 20px 50px rgba(0,0,0,0.08)",
        }}
      >
        {/* BRAND */}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "9px",
            marginBottom: "30px",
            fontSize: "18px",
            fontWeight: 700,
          }}
        >
          <span
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "10px",
              background: "#2563eb",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <House size={18} />
          </span>

          Service Booking
        </div>

        {/* TITLE */}

        <h1
          style={{
            textAlign: "center",
            marginBottom: "10px",
            fontSize: "28px",
          }}
        >
          Reset Password
        </h1>

        <p
          style={{
            textAlign: "center",
            color: "#687386",
            marginBottom: "28px",
          }}
        >
          Create a new password for your account.
        </p>

        {/* ERROR */}

        {error && (
          <div
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

        {/* SUCCESS */}

        {success && (
          <div
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

        {!token ? (
          <button
            type="button"
            onClick={() => navigate("/login")}
            style={{
              width: "100%",
              padding: "14px",
              border: "none",
              borderRadius: "10px",
              background: "#2563eb",
              color: "#fff",
              fontSize: "16px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Back to Login
          </button>
        ) : (
          <form
            onSubmit={handleResetPassword}
          >
            {/* NEW PASSWORD */}

            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: 600,
              }}
            >
              New Password
            </label>

            <div
              style={{
                position: "relative",
                marginBottom: "20px",
              }}
            >
              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={password}
                onChange={(e) =>
                  setPassword(
                    e.target.value
                  )
                }
                placeholder="Enter new password"
                autoComplete="new-password"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "13px 45px 13px 13px",
                  border: "1px solid #d8dee9",
                  borderRadius: "10px",
                  fontSize: "15px",
                }}
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    !showPassword
                  )
                }
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color: "#687386",
                }}
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>

            {/* CONFIRM PASSWORD */}

            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: 600,
              }}
            >
              Confirm Password
            </label>

            <div
              style={{
                position: "relative",
                marginBottom: "25px",
              }}
            >
              <input
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(
                    e.target.value
                  )
                }
                placeholder="Confirm new password"
                autoComplete="new-password"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "13px 45px 13px 13px",
                  border: "1px solid #d8dee9",
                  borderRadius: "10px",
                  fontSize: "15px",
                }}
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword(
                    !showConfirmPassword
                  )
                }
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color: "#687386",
                }}
              >
                {showConfirmPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>

            {/* RESET BUTTON */}

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
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              {loading
                ? "Resetting..."
                : (
                  <>
                    Reset Password
                    <ArrowRight size={16} />
                  </>
                )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default ResetPassword;