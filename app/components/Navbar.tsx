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
    <header className="container-max py-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="font-semibold text-lg">INSERAT AI</div>
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
    </header>
  );
}