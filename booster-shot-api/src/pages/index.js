import Link from "next/link";

const COLOR_DARK = "#23243a"; // deep indigo
const COLOR_CORAL = "#ff8e87"; // coral
const COLOR_LIGHT_BG = "#fafbfc"; // soft background
const COLOR_GRAY = "#e5e7eb";
const COLOR_WHITE = "#fff";
const COLOR_SUCCESS = "#28a745";
const COLOR_PRIMARY = COLOR_DARK;

export default function Dashboard() {
  const styles = {
    main: {
      minHeight: "100vh",
      background: COLOR_LIGHT_BG,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "60px 0 0 0",
      fontFamily: "Inter, Arial, sans-serif",
    },
    logo: {
      width: 180,
      marginBottom: 30,
    },
    title: {
      color: COLOR_PRIMARY,
      fontWeight: 900,
      fontSize: "2.5rem",
      marginBottom: "50px",
      letterSpacing: "-1.5px",
      textAlign: "center",
      lineHeight: 1.2,
    },
    button: {
      width: 320,
      padding: "36px 0",
      background: COLOR_CORAL,
      color: COLOR_WHITE,
      fontWeight: 800,
      fontSize: "1.5rem",
      border: "none",
      borderRadius: "14px",
      cursor: "pointer",
      marginBottom: "32px",
      boxShadow: "0 4px 18px rgba(35,36,58,0.09)",
      transition: "background 0.2s, transform 0.13s",
      display: "block",
      textAlign: "center",
      outline: "none",
      textDecoration: "none",
      letterSpacing: "-0.5px",
    },
    buttonSecondary: {
      background: COLOR_DARK,
      color: COLOR_WHITE,
      marginBottom: 0,
    },
  };

  return (
    <div style={styles.main}>
      <img
        src="https://foreverbooked.com/wp-content/uploads/2022/03/LogoMark-ForeverBooked-Dark.png"
        alt="ForeverBooked Logo"
        style={styles.logo}
      />
      <div style={styles.title}>Booster Shot System</div>

      <Link href="/stats" style={{ ...styles.button, ...styles.buttonSecondary }}>
        <span>Campaing Status</span>
      </Link>
      <Link href="/campaign" style={styles.button}>
        <span>Launch New Campaign</span>
      </Link>
    </div>
  );
}