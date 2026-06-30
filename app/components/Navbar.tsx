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
      <div className="flex items-center gap-3">
        <div className="font-semibold text-lg">Inserat-AI</div>
      </div>
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
            <Link href="/login" className="text-sm font-medium">
              Login
            </Link>
            <Link
              href="/register"
              className="bg-yellow-500 text-black px-4 py-2 rounded-lg font-medium"
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