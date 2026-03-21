"use client";

import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Login fehlgeschlagen");
        return;
      }

      localStorage.setItem("userName", data.user.name);
      localStorage.setItem("userEmail", data.user.email);

      window.location.href = "/dashboard";
    } catch (error) {
      console.error(error);
      alert("Server Fehler beim Login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#111111] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-[#1a1a1a] border border-gray-800 rounded-2xl p-8 shadow-xl">
        <h1 className="text-3xl font-bold text-center mb-2">Willkommen zurück</h1>
        <p className="text-gray-400 text-center mb-8">
          Melden Sie sich an, um den Inserat Generator zu nutzen
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm mb-2">E-Mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg bg-[#111111] border border-gray-700 px-4 py-3 text-white outline-none focus:border-orange-500"
              placeholder="ihre@email.ch"
            />
          </div>

          <div>
            <label className="block text-sm mb-2">Passwort</label>
           <div className="relative">
  <input
    type={showPassword ? "text" : "password"}
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    required
    className="w-full rounded-lg bg-[#111111] border border-gray-700 px-4 py-3 pr-12 text-white outline-none focus:border-orange-500"
    placeholder="********"
  />

  <button
    type="button"
    onClick={() => setShowPassword(!showPassword)}
    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
  >
    👁️
  </button>
</div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-70 text-white font-semibold py-3 rounded-lg transition"
          >
            {loading ? "Wird geladen..." : "Login"}
          </button>
        </form>

        <p className="text-sm text-gray-400 mt-6 text-center">
          Noch kein Konto?{" "}
          <a href="/register" className="text-orange-400 hover:underline">
            Account erstellen
          </a>
        </p>
      </div>
    </main>
  );
}