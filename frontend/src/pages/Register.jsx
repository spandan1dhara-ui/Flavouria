import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { formatError } from "../lib/api";
import { LogoIcon } from "../components/Logo";
import { toast } from "sonner";

export default function Register() {
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await register(name, email, password);
      toast.success("Account created!");
      navigate("/");
    } catch (err) {
      setError(formatError(err.response?.data?.detail) || err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="flex flex-col items-center mb-8">
        <LogoIcon size={48} />
        <h1 className="mt-4 font-heading text-3xl font-black text-ink">Create your account</h1>
        <p className="text-ink-soft mt-1">Save, rate and discover the best recipes.</p>
      </div>

      <form onSubmit={submit} data-testid="register-form" className="bg-white rounded-3xl border border-border shadow-soft p-6 sm:p-8 flex flex-col gap-4">
        {error && (
          <div data-testid="register-error" className="rounded-xl bg-coral/10 text-coral-hover px-4 py-3 text-sm font-semibold">
            {error}
          </div>
        )}
        <label className="text-sm font-bold text-ink">
          Name
          <input required data-testid="register-name" value={name} onChange={(e) => setName(e.target.value)}
            className="mt-1.5 w-full h-12 rounded-xl border border-border px-4 outline-none focus:border-coral focus:ring-4 focus:ring-coral/10 font-medium" />
        </label>
        <label className="text-sm font-bold text-ink">
          Email
          <input type="email" required data-testid="register-email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full h-12 rounded-xl border border-border px-4 outline-none focus:border-coral focus:ring-4 focus:ring-coral/10 font-medium" />
        </label>
        <label className="text-sm font-bold text-ink">
          Password
          <input type="password" required minLength={6} data-testid="register-password" value={password} onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 w-full h-12 rounded-xl border border-border px-4 outline-none focus:border-coral focus:ring-4 focus:ring-coral/10 font-medium" />
        </label>
        <button type="submit" disabled={busy} data-testid="register-submit"
          className="mt-2 h-12 rounded-full bg-coral hover:bg-coral-hover text-white font-bold transition-colors disabled:opacity-60">
          {busy ? "Creating..." : "Create account"}
        </button>

        <div className="flex items-center gap-3 my-1 text-ink-soft/60 text-sm">
          <span className="flex-1 h-px bg-border" /> or <span className="flex-1 h-px bg-border" />
        </div>
        <button type="button" onClick={loginWithGoogle} data-testid="google-register"
          className="h-12 rounded-full border border-border bg-white hover:border-coral font-bold text-ink transition-colors flex items-center justify-center gap-2">
          <img src="https://www.google.com/favicon.ico" alt="" className="w-4 h-4" /> Continue with Google
        </button>
      </form>

      <p className="text-center mt-6 text-ink-soft">
        Already have an account?{" "}
        <Link to="/login" data-testid="go-login" className="font-bold text-coral hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
