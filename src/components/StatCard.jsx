import React from "react";
import styles from "../styles/Dashboard.module.css";

const colorClasses = {
  gold: styles.iconGold,
  blue: styles.iconBlue,
  emerald: styles.iconEmerald,
  rose: styles.iconRose,
};

const StatCard = ({
  icon: Icon,
  label,
  value,
  desc,
  colorScheme = "gold",
  isDanger = false,
  isActive = false,
  onClick,
}) => {
  const schemeClass = isDanger ? styles.iconRose : (colorClasses[colorScheme] || styles.iconGold);

  return (
    <div
      className={`${styles.statCard} ${onClick ? styles.statCardClickable : ""} ${
        isDanger ? styles.dangerCard : ""
      } ${isActive ? styles.statCardActive : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      title={onClick ? `Filter berdasarkan ${label}` : undefined}
    >
      <div className={styles.statHeader}>
        <div className={styles.statHeaderLeft}>
          <div className={`${styles.statIconWrapper} ${schemeClass}`}>
            <Icon size={18} />
          </div>
          <span className={`${styles.statLabel} ${isDanger ? styles.dangerText : ""}`}>
            {label}
          </span>
        </div>
        {isActive && <span className={styles.activeIndicator} title="Filter aktif" />}
      </div>
      <div className={`${styles.statValue} ${isDanger ? styles.dangerText : ""}`}>
        {value}
      </div>
      <div className={styles.statDesc}>{desc}</div>
    </div>
  );
};

export default StatCard;
