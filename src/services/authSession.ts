const AUTH_KEYS = ["token", "token_type", "user_id", "role"];

export const getAccessToken = (): string | null =>
  localStorage.getItem("token") || sessionStorage.getItem("token");

export const clearAuthSession = (): void => {
  AUTH_KEYS.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
};

export const AUTH_NOTICE_KEY = "auth_notice";