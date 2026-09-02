// src/components/Header.jsx
import React from "react";
import styles from "../styles/Dashboard.module.css";
import { Search, Bell, Grid, LogOut } from "lucide-react";
import { useAuth } from "../hooks/useAuth"; // <-- Import useAuth

const Header = () => {
  // Ambil data user dan fungsi logoutAuth
  const { user, logoutAuth } = useAuth(); 

  return (
    <header className={styles.topNavbar}>
      <div className={styles.navbarGreeting}>
        {/* Tampilkan nama user secara dinamis */}
        <h2>Welcome back, {user?.name || "User"}.</h2>
        <p>Here is the summary of PT. Dives Jaya Perkasa projects today.</p>
      </div>

      <div className={styles.navbarActions}>
        <button className={styles.iconBtn} type="button">
          <Bell size={20} />
        </button>

        <button className={styles.iconBtn} type="button">
          <Grid size={20} />
        </button>

        <div className={styles.userAvatar}>
          <img 
            src={`https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=d4af37&color=fff`} 
            alt="User Avatar" 
            title={user?.name}
          />
        </div>

        {/* Tombol Logout Ekstra di Header (Opsional, mempermudah akses) */}
        <button className={styles.iconBtn} type="button" onClick={logoutAuth} title="Logout">
          <LogOut size={20} color="#ef4444" />
        </button>
      </div>
    </header>
  );
};

export default Header;