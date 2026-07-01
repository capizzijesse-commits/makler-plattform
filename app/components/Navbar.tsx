"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function Navbar() {
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const savedName = localStorage.getItem("userName");
    if (savedName) {
      setUserName(savedName);
    }
  }, []);

  function handleLogout() {
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    window.location.href = "/login";
  }

  return (
  <header
  style={{
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    width: "100%",
    zIndex: 9999,
    background: "rgba(2, 6, 23, 0.94)",
    borderBottom: "1px solid rgba(255,255,255,0.10)",
    backdropFilter: "blur(16px)",
  }}
>
  <div
    style={{
      maxWidth: "1100px",
      margin: "0 auto",
      padding: "16px 24px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "24px",
      boxSizing: "border-box",
    }}
  >
      <Link href="/" className="navBrand">
  <span className="navLogoMark">AI</span>
  <span>Inserat-AI</span>
</Link>
      <div className="flex items-center gap-4">
        {userName ? (
          <>
            <span className="text-sm font-medium">Hallo {userName}</span>
            <Link href="/dashboard" className="text-sm font-medium">
              Dashboard
            </Link>
            <button onClick={handleLogout} className="text-sm font-medium">
              Logout
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="navLogin">
  Login
</Link>
            <Link
              href="/register"
              className="topGlowButton"
            >
              Kostenlos testen
            </Link>
          </>
        )}
          </div>
  </div>
</header>
);
}