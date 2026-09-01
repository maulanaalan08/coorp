import React from "react";
import styles from "../styles/Dashboard.module.css";
import { Search, Bell, Grid } from "lucide-react";

const Header = () => {
  return (
    <header className={styles.topNavbar}>
      <div className={styles.navbarGreeting}>
        <h2>Welcome back, Jimmy.</h2>
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
          <img src="https://i.pravatar.cc/150?img=11" alt="User Avatar" />
        </div>
      </div>
    </header>
  );
};

export default Header;