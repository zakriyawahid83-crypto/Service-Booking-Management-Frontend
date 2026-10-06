import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./ProviderProfile.css";

type ProviderProfileData = {
  id: number;
  user_id: number;
  business_name: string;
  description: string | null;
  location: string | null;
  phone: string | null;
  is_verified: boolean;
};

type ProfileForm = {
  business_name: string;
  description: string;
  location: string;
  phone: string;
};

function ProviderProfile() {
  const navigate = useNavigate();

  const [profile, setProfile] =
    useState<ProviderProfileData | null>(null);

  const [form, setForm] = useState<ProfileForm>({
    business_name: "",
    description: "",
    location: "",
    phone: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError("");

      const response =
        await api.get<ProviderProfileData>(
          "/provider/profile"
        );

      const data = response.data;

      setProfile(data);

      setForm({
        business_name:
          data.business_name || "",
        description:
          data.description || "",
        location:
          data.location || "",
        phone:
          data.phone || "",
      });
    } catch (error: any) {
      const detail =
        error?.response?.data?.detail;

      setError(
        typeof detail === "string"
          ? detail
          : error?.message ||
              "Unable to load provider profile."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response =
        await api.put<ProviderProfileData>(
          "/provider/profile",
          form
        );

      const updatedProfile = response.data;

      setProfile(updatedProfile);

      setForm({
        business_name:
          updatedProfile.business_name || "",
        description:
          updatedProfile.description || "",
        location:
          updatedProfile.location || "",
        phone:
          updatedProfile.phone || "",
      });

      setSuccess(
        "Profile updated successfully."
      );
    } catch (error: any) {
      const detail =
        error?.response?.data?.detail;

      setError(
        typeof detail === "string"
          ? detail
          : error?.message ||
              "Unable to update profile."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="provider-profile-page">
        <div className="provider-profile-loading">
          Loading profile...
        </div>
      </div>
    );
  }

  return (
    <div className="provider-profile-page">
      <div className="provider-profile-container">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="provider-profile-header">
          <div>
            <span className="profile-eyebrow">
              BUSINESS ACCOUNT
            </span>

            <h1>Provider Profile</h1>

            <p>
              Manage your business information and
              provider profile.
            </p>
          </div>

          <button
            type="button"
            className="profile-back-button"
            onClick={() =>
              navigate(
                "/provider/dashboard"
              )
            }
          >
            ← Dashboard
          </button>
        </div>

        {/* =================================================
            MESSAGES
        ================================================= */}

        {error && (
          <div className="profile-message profile-error">
            {error}
          </div>
        )}

        {success && (
          <div className="profile-message profile-success">
            {success}
          </div>
        )}

        <div className="provider-profile-layout">

          {/* =================================================
              PROFILE SUMMARY
          ================================================= */}

          <aside className="profile-summary-card">

            <div className="profile-avatar">
              {form.business_name
                .charAt(0)
                .toUpperCase() || "P"}
            </div>

            <h2>
              {form.business_name ||
                "Provider"}
            </h2>

            <p>
              {form.location ||
                "Location not provided"}
            </p>

            <div
              className={
                profile?.is_verified
                  ? "verification-badge verified"
                  : "verification-badge pending"
              }
            >
              <span>
                {profile?.is_verified
                  ? "✓"
                  : "•"}
              </span>

              {profile?.is_verified
                ? "Verified Provider"
                : "Verification Pending"}
            </div>

            <div className="profile-summary-divider" />

            <div className="profile-summary-item">
              <span>Provider ID</span>
              <strong>
                #{profile?.id}
              </strong>
            </div>

            <div className="profile-summary-item">
              <span>Account ID</span>
              <strong>
                #{profile?.user_id}
              </strong>
            </div>

          </aside>

          {/* =================================================
              PROFILE FORM
          ================================================= */}

          <section className="profile-form-card">

            <div className="profile-form-header">
              <div>
                <h2>Business Information</h2>

                <p>
                  Keep your provider information
                  up to date.
                </p>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="provider-profile-form"
            >

              {/* BUSINESS NAME */}

              <div className="profile-form-group full-width">
                <label htmlFor="business_name">
                  Business Name
                </label>

                <input
                  id="business_name"
                  name="business_name"
                  type="text"
                  value={form.business_name}
                  onChange={handleChange}
                  placeholder="Enter business name"
                  required
                />
              </div>

              {/* LOCATION */}

              <div className="profile-form-group">
                <label htmlFor="location">
                  Location
                </label>

                <input
                  id="location"
                  name="location"
                  type="text"
                  value={form.location}
                  onChange={handleChange}
                  placeholder="Enter business location"
                />
              </div>

              {/* PHONE */}

              <div className="profile-form-group">
                <label htmlFor="phone">
                  Phone
                </label>

                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="03001234567"
                />
              </div>

              {/* DESCRIPTION */}

              <div className="profile-form-group full-width">
                <label htmlFor="description">
                  Description
                </label>

                <textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Describe your business..."
                  rows={5}
                />
              </div>

              {/* ACTIONS */}

              <div className="profile-form-actions">

                <button
                  type="button"
                  className="profile-cancel-button"
                  onClick={() =>
                    navigate(
                      "/provider/dashboard"
                    )
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="profile-save-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : "Save Changes"}
                </button>

              </div>

            </form>

          </section>

        </div>
      </div>
    </div>
  );
}

export default ProviderProfile;
