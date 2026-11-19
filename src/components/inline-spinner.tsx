import styles from "./inline-spinner.module.css";

export function InlineSpinner() {
  return <span className={styles.spinner} aria-hidden="true" />;
}
