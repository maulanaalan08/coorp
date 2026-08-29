import React from "react";
import styles from "../styles/Dashboard.module.css";

const StatCard = ({ icon: Icon, label, value, desc, iconClass, isDanger = false }) => {
  return (
    <div className={`${styles.statCard} ${isDanger ? styles.dangerCard : ""}`}>
      <div className={styles.statHeader}>
        <div className={`${styles.statIconWrapper} ${isDanger ? styles.dangerIcon : ""}`}>
          <Icon size={20} className={iconClass ? styles[iconClass] : ""} />
        </div>
        <span className={`${styles.statLabel} ${isDanger ? styles.dangerText : ""}`}>
          {label}
        </span>
      </div>
      <div className={`${styles.statValue} ${isDanger ? styles.dangerText : ""}`}>
        {value}
      </div>
      <div className={styles.statDesc}>{desc}</div>
    </div>
  );
};

export default StatCard;