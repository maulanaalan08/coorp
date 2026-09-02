import { useState, useEffect } from "react";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  // isLoading: true selama cek localStorage berlangsung
  // Mencegah app "flash" ke halaman login sebelum data terbaca
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem("user");
      const savedToken = localStorage.getItem("token");

      if (savedUser && savedToken) {
        setUser(JSON.parse(savedUser));
        setToken(savedToken);
      }
    } catch (e) {
      // localStorage corrupt / JSON invalid — paksa logout bersih
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginAuth = (userData, userToken) => {
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("token", userToken);
    setUser(userData);
    setToken(userToken);
  };

  const logoutAuth = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setUser(null);
    setToken(null);
  };

  return { user, token, loginAuth, logoutAuth, isAuthenticated: !!token, isLoading };
}