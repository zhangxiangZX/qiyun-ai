import { Bot, Boxes, Gauge, PanelTop } from "lucide-react";

import styles from "@/styles/industrial-selection-art.module.css";

export function IndustrialSelectionArt({ compact = false }: { compact?: boolean }) {
  return (
    <div className={styles.scene} data-compact={compact} aria-label="蓝白工业智能设备展示">
      <div className={styles.skyline}><i /><i /><i /><i /><i /></div>
      <div className={styles.machineGroup}>
        <div className={`${styles.machine} ${styles.machineLeft}`}><PanelTop /><span /></div>
        <div className={`${styles.machine} ${styles.machineCenter}`}><Gauge /><span /></div>
        <div className={`${styles.machine} ${styles.machineRight}`}><Bot /><span /></div>
        <div className={`${styles.machine} ${styles.machineSmall}`}><Boxes /><span /></div>
      </div>
      <div className={styles.platform}><i /><i /></div>
      <span className={styles.glow} />
    </div>
  );
}
