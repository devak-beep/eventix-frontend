import React, { useEffect, useRef, useState } from "react";
import "./DownloadApp.css";

const apps = [
  {
    id: "rn",
    icon: "⚛️",
    title: "React Native",
    subtitle: "Cross-platform build",
    size: "62 MB",
    version: "v1.0.0",
    badge: "Recommended",
    badgeColor: "#61dafb",
    href: "/eventix-react-native.apk",
    filename: "Eventix.apk",
    features: ["Smooth animations", "Optimized performance", "Modern UI"],
  },
  {
    id: "kotlin",
    icon: "🤖",
    title: "Kotlin Native",
    subtitle: "Android native build",
    size: "5.6 MB",
    version: "v1.0.0",
    badge: "Lightweight",
    badgeColor: "#a97cff",
    href: "/eventix-kotlin.apk",
    filename: "Eventix-Kotlin.apk",
    features: ["Native performance", "Smaller size", "Battery efficient"],
  },
];

function FloatingParticle({ style }) {
  return <div className="da-particle" style={style} />;
}

export default function DownloadApp() {
  const [downloaded, setDownloaded] = useState({});
  const [visible, setVisible] = useState(false);
  const lastClickRef = useRef({});
  const cardsRef = useRef([]);

  useEffect(() => {
    // Trigger entrance animation
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  const handleDownload = (e, id) => {
    const now = Date.now();
    const last = lastClickRef.current[id] || 0;
    if (now - last < 5000) {
      e.preventDefault();
      return;
    }
    lastClickRef.current[id] = now;
    setDownloaded((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => setDownloaded((prev) => ({ ...prev, [id]: false })), 3000);
  };

  // Generate random particles once
  const particles = useRef(
    Array.from({ length: 18 }, (_, i) => ({
      key: i,
      width: `${6 + Math.random() * 10}px`,
      height: `${6 + Math.random() * 10}px`,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 6}s`,
      animationDuration: `${5 + Math.random() * 6}s`,
      opacity: 0.12 + Math.random() * 0.18,
    }))
  ).current;

  return (
    <div className="da-page">
      {/* Floating background particles */}
      <div className="da-particles-bg" aria-hidden="true">
        {particles.map((p) => (
          <FloatingParticle key={p.key} style={p} />
        ))}
      </div>

      {/* Hero section */}
      <div className={`da-hero ${visible ? "da-visible" : ""}`}>
        <div className="da-hero-icon">📱</div>
        <h1 className="da-hero-title">
          Get <span className="da-gradient-text">Eventix</span> on Android
        </h1>
        <p className="da-hero-subtitle">
          Book events, manage tickets, and stay updated — right from your pocket.
        </p>
        <div className="da-hero-badges">
          <span className="da-pill">🔒 Safe & Secure</span>
          <span className="da-pill">⚡ Fast Install</span>
          <span className="da-pill">🆓 Free</span>
        </div>
      </div>

      {/* Cards */}
      <div className={`da-cards ${visible ? "da-visible" : ""}`}>
        {apps.map((app, i) => (
          <div
            key={app.id}
            className="da-card"
            ref={(el) => (cardsRef.current[i] = el)}
            style={{ animationDelay: `${0.15 + i * 0.15}s` }}
          >
            <div className="da-card-glow" style={{ "--glow-color": app.badgeColor }} />

            <div className="da-card-header">
              <div className="da-app-icon">{app.icon}</div>
              <div className="da-app-info">
                <div className="da-app-name">{app.title}</div>
                <div className="da-app-sub">{app.subtitle}</div>
              </div>
              <span className="da-badge" style={{ background: `${app.badgeColor}22`, color: app.badgeColor, border: `1px solid ${app.badgeColor}44` }}>
                {app.badge}
              </span>
            </div>

            <div className="da-card-meta">
              <span>📦 {app.size}</span>
              <span>🏷️ {app.version}</span>
              <span>🤖 Android</span>
            </div>

            <ul className="da-features">
              {app.features.map((f) => (
                <li key={f}>
                  <span className="da-check">✓</span> {f}
                </li>
              ))}
            </ul>

            <a
              href={app.href}
              download={app.filename}
              className={`da-btn ${downloaded[app.id] ? "da-btn-done" : ""}`}
              style={{ "--btn-color": app.badgeColor }}
              onClick={(e) => handleDownload(e, app.id)}
            >
              {downloaded[app.id] ? (
                <>✅ Downloading…</>
              ) : (
                <>⬇️ Download APK</>
              )}
            </a>

            <p className="da-note">Enable "Install from unknown sources" in Android settings before installing.</p>
          </div>
        ))}
      </div>

      {/* Steps */}
      <div className={`da-steps ${visible ? "da-visible" : ""}`}>
        <h2 className="da-steps-title">How to install</h2>
        <div className="da-steps-row">
          {[
            { n: "1", icon: "⬇️", text: "Download the APK" },
            { n: "2", icon: "⚙️", text: 'Allow "Unknown Sources"' },
            { n: "3", icon: "📲", text: "Open & Install" },
            { n: "4", icon: "🎉", text: "Enjoy Eventix!" },
          ].map((s) => (
            <div className="da-step" key={s.n}>
              <div className="da-step-num">{s.n}</div>
              <div className="da-step-icon">{s.icon}</div>
              <div className="da-step-text">{s.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
