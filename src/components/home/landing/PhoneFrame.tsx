import type { ReactNode } from "react";
import styles from "./PhoneFrame.module.css";

export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div aria-hidden="true" className={styles.frame}>
      <span className={styles.button} style={{ top: 150, height: 62 }} />
      <span className={styles.button} style={{ top: 232, height: 36 }} />
      <div className={styles.bezel}>
        <div className="relative flex h-full w-full flex-col gap-3.5 overflow-hidden rounded-[35px] bg-canvas px-4 pb-0 pt-11 text-fg">
          <span className={styles.camera} />
          <span className={styles.glare} />
          {children}
          <span className="absolute bottom-2 left-1/2 -ml-12 h-1 w-24 rounded-sm bg-fg/55" />
        </div>
      </div>
    </div>
  );
}
