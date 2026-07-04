const ACCESS = "access_token";
const REFRESH = "refresh_token";
const USER = "user";

export const tokenService = {
  getAccess: () => localStorage.getItem(ACCESS),
  getRefresh: () => localStorage.getItem(REFRESH),
  getUser: () => {
    const userStr = localStorage.getItem(USER);
    return userStr ? JSON.parse(userStr) : null;
  },

  setTokens(access: string, refresh?: string) {
    localStorage.setItem(ACCESS, access);

    if (refresh) {
      localStorage.setItem(REFRESH, refresh);
    }
  },

  setUser(user: any) {
    localStorage.setItem(USER, JSON.stringify(user));
  },

  clear() {
    localStorage.removeItem(ACCESS);
    localStorage.removeItem(REFRESH);
    localStorage.removeItem(USER);
  },
};
