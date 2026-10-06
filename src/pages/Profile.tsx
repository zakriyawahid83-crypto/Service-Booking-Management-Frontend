import { useEffect, useState, type FormEvent } from "react";
import { Building2, Check, CircleUserRound, LogOut, MapPin, Phone, Save, ShieldCheck } from "lucide-react";
import api from "../services/api";
import "./Profile.css";

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
};

type ProviderProfile = {
  id: number;
  user_id: number;
  business_name: string;
  description: string | null;
  location: string | null;
  phone: string | null;
  is_verified: boolean;
};

type FieldErrors = Record<string, string>;

const getErrorMessage = (error: any): string => {
  const detail = error?.response?.data?.detail;

  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((item: any) => item?.msg || String(item)).join(", ");
  }

  return "Unable to load your profile. Please try again.";
};

function Profile() {
  const [user, setUser] = useState<User | null>(null);
  const [providerProfile, setProviderProfile] = useState<ProviderProfile | null>(null);
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError("");

        const accountResponse = await api.get("/auth/me");
        const account = accountResponse.data as User;
        setUser(account);
        setName(account.name || "");

        if (account.role === "provider") {
          const response = await api.get("/providers/profile");
          const profile = response.data as ProviderProfile;
          setProviderProfile(profile);
          setBusinessName(profile.business_name || "");
          setDescription(profile.description || "");
          setLocation(profile.location || "");
          setPhone(profile.phone || "");
        } else {
          const response = await api.get("/customer/profile");
          setUser(response.data);
          setName(response.data.name || "");
        }
      } catch (profileError: any) {
        console.error("Profile error:", profileError);
        setError(getErrorMessage(profileError));
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const isProvider = user?.role === "provider";
  const displayName = isProvider
    ? providerProfile?.business_name || user?.name || "Provider"
    : user?.name || "User";

  const handleFieldChange = (field: string, update: (value: string) => void) =>
    (value: string): void => {
      update(value);
      setFieldErrors((current) => ({ ...current, [field]: "" }));
      setError("");
      setSuccess("");
    };

  const handleSave = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const nextErrors: FieldErrors = {};

    if (isProvider) {
      const cleanBusinessName = businessName.trim();
      const cleanLocation = location.trim();
      const cleanPhone = phone.trim();

      if (!cleanBusinessName) nextErrors.businessName = "Business name is required.";
      if (cleanBusinessName.length > 150) nextErrors.businessName = "Use 150 characters or fewer.";
      if (cleanLocation.length > 255) nextErrors.location = "Use 255 characters or fewer.";
      if (cleanPhone.length > 30) nextErrors.phone = "Use 30 characters or fewer.";
      if (cleanPhone && !/^[+()\d .-]{7,30}$/.test(cleanPhone)) {
        nextErrors.phone = "Enter a valid phone number.";
      }
    } else {
      const cleanName = name.trim();
      if (!cleanName) nextErrors.name = "Name is required.";
      if (cleanName.length > 100) nextErrors.name = "Use 100 characters or fewer.";
    }

    setFieldErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    try {
      setSaving(true);

      if (isProvider) {
        const response = await api.put("/providers/profile", {
          business_name: businessName.trim(),
          description: description.trim() || null,
          location: location.trim() || null,
          phone: phone.trim() || null,
        });
        setProviderProfile(response.data);
        setBusinessName(response.data.business_name || "");
        setDescription(response.data.description || "");
        setLocation(response.data.location || "");
        setPhone(response.data.phone || "");
      } else {
        const response = await api.put("/customer/profile", {
          name: name.trim(),
        });
        setUser(response.data);
        setName(response.data.name || "");
      }

      setSuccess("Your profile changes have been saved.");
    } catch (saveError: any) {
      console.error("Profile update error:", saveError);
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = (): void => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "/login";
  };

  const dashboardPath = isProvider ? "/provider/dashboard" : "/dashboard";

  return (
    <div className="account-profile-page">
      <header className="account-profile-header">
        <a className="account-profile-brand" href={dashboardPath}>
          <span className="account-profile-brand-mark"><Building2 size={17} /></span>
          Service Booking
        </a>
        <div className="account-profile-header-actions">
          <a href={dashboardPath}>Dashboard</a>
          <button type="button" onClick={handleLogout}>
            <LogOut size={15} /> Logout
          </button>
        </div>
      </header>

      <main className="account-profile-main">
        <div className="account-profile-heading">
          <div>
            <span className="account-profile-eyebrow">ACCOUNT SETTINGS</span>
            <h1>Profile</h1>
            <p>Manage your personal and account information.</p>
          </div>
        </div>

        {error && <div className="account-profile-message error" role="alert">{error}</div>}
        {success && (
          <div className="account-profile-message success" role="status">
            <Check size={17} /> {success}
          </div>
        )}

        {loading ? (
          <div className="account-profile-loading" aria-live="polite">
            <span className="account-profile-spinner" aria-hidden="true" />
            <p>Loading your profile...</p>
          </div>
        ) : user ? (
          <div className="account-profile-layout">
            <aside className="account-profile-summary">
              <div className="account-profile-avatar" aria-hidden="true">
                {displayName.charAt(0).toUpperCase() || <CircleUserRound size={30} />}
              </div>
              <span className="account-profile-eyebrow">
                {isProvider ? "SERVICE PROVIDER" : "CUSTOMER ACCOUNT"}
              </span>
              <h2>{displayName}</h2>
              {isProvider && providerProfile?.is_verified && (
                <span className="account-profile-verified"><ShieldCheck size={14} /> Verified provider</span>
              )}

              <div className="account-profile-readonly">
                {isProvider && (
                  <div>
                    <span>Account holder</span>
                    <strong>{user.name}</strong>
                  </div>
                )}
                <div>
                  <span>Email address</span>
                  <strong>{user.email}</strong>
                </div>
                <div>
                  <span>Account type</span>
                  <strong>{user.role}</strong>
                </div>
                <div>
                  <span>Account ID</span>
                  <strong>#{user.id}</strong>
                </div>
                {isProvider && providerProfile && (
                  <div>
                    <span>Provider ID</span>
                    <strong>#{providerProfile.id}</strong>
                  </div>
                )}
              </div>
              <p className="account-profile-readonly-note">Email and account identifiers are read-only.</p>
            </aside>

            <section className="account-profile-editor">
              <div className="account-profile-editor-heading">
                <div>
                  <span className="account-profile-eyebrow">PROFILE DETAILS</span>
                  <h2>{isProvider ? "Business information" : "Personal information"}</h2>
                </div>
              </div>

              <form onSubmit={handleSave} noValidate>
                {isProvider ? (
                  <>
                    <div className="account-profile-field">
                      <label htmlFor="businessName">Business name</label>
                      <input
                        id="businessName"
                        value={businessName}
                        onChange={(event) => handleFieldChange("businessName", setBusinessName)(event.target.value)}
                        maxLength={150}
                        aria-invalid={Boolean(fieldErrors.businessName)}
                        aria-describedby={fieldErrors.businessName ? "businessName-error" : undefined}
                        required
                      />
                      {fieldErrors.businessName && <span className="account-profile-field-error" id="businessName-error">{fieldErrors.businessName}</span>}
                    </div>

                    <div className="account-profile-field">
                      <label htmlFor="description">Business description <span>Optional</span></label>
                      <textarea
                        id="description"
                        value={description}
                        onChange={(event) => handleFieldChange("description", setDescription)(event.target.value)}
                        rows={4}
                        placeholder="Describe the services you provide"
                      />
                    </div>

                    <div className="account-profile-form-row">
                      <div className="account-profile-field">
                        <label htmlFor="location">Business location <span>Optional</span></label>
                        <div className="account-profile-input-icon">
                          <MapPin size={16} aria-hidden="true" />
                          <input
                            id="location"
                            value={location}
                            onChange={(event) => handleFieldChange("location", setLocation)(event.target.value)}
                            maxLength={255}
                            aria-invalid={Boolean(fieldErrors.location)}
                            aria-describedby={fieldErrors.location ? "location-error" : undefined}
                          />
                        </div>
                        {fieldErrors.location && <span className="account-profile-field-error" id="location-error">{fieldErrors.location}</span>}
                      </div>
                      <div className="account-profile-field">
                        <label htmlFor="phone">Business phone <span>Optional</span></label>
                        <div className="account-profile-input-icon">
                          <Phone size={16} aria-hidden="true" />
                          <input
                            id="phone"
                            type="tel"
                            value={phone}
                            onChange={(event) => handleFieldChange("phone", setPhone)(event.target.value)}
                            maxLength={30}
                            aria-invalid={Boolean(fieldErrors.phone)}
                            aria-describedby={fieldErrors.phone ? "phone-error" : undefined}
                          />
                        </div>
                        {fieldErrors.phone && <span className="account-profile-field-error" id="phone-error">{fieldErrors.phone}</span>}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="account-profile-field">
                    <label htmlFor="name">Full name</label>
                    <input
                      id="name"
                      autoComplete="name"
                      value={name}
                      onChange={(event) => handleFieldChange("name", setName)(event.target.value)}
                      maxLength={100}
                      aria-invalid={Boolean(fieldErrors.name)}
                      aria-describedby={fieldErrors.name ? "name-error" : undefined}
                      required
                    />
                    {fieldErrors.name && <span className="account-profile-field-error" id="name-error">{fieldErrors.name}</span>}
                  </div>
                )}

                <div className="account-profile-form-footer">
                  <span>Changes are saved to your account.</span>
                  <button type="submit" className="account-profile-save" disabled={saving}>
                    <Save size={16} />
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        ) : !error ? (
          <div className="account-profile-empty">Profile information is unavailable.</div>
        ) : null}
      </main>
    </div>
  );
}

export default Profile;