import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authAPI } from "../services/api";

const Register = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.email || !formData.password || !formData.confirmPassword) {
      setError("Please fill all fields");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      await authAPI.register({
        email: formData.email,
        password: formData.password,
      });
      setSuccess("Registration successful! Please wait for admin approval.");
      setFormData({ email: "", password: "", confirmPassword: "" });
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full text-left">
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-200">
          Request Access
        </div>
        <h1 className="mt-4 text-3xl font-semibold text-white">
          Create an account
        </h1>
        <p className="mt-2 text-sm text-slate-300">
          Registration is reviewed by admins before activation.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {success}
        </div>
      )}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Email
          </label>
          <input
            className="mt-2 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
            type="email"
            name="email"
            autoComplete="username"
            value={formData.email}
            onChange={handleChange}
            placeholder="you@company.com"
            required
          />
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Password
          </label>
          <input
            className="mt-2 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
            type="password"
            name="password"
            autoComplete="new-password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Create a secure password"
            required
          />
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Confirm Password
          </label>
          <input
            className="mt-2 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
            type="password"
            name="confirmPassword"
            autoComplete="new-password"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="Repeat your password"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-violet-400 px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-900 shadow-lg shadow-cyan-500/30 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Creating..." : "Create account"}
        </button>
      </form>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-300">
        <span>Already registered?</span>
        <button
          type="button"
          onClick={() => navigate("/login")}
          className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-100 transition hover:border-cyan-400/60 hover:text-white"
        >
          Sign in
        </button>
      </div>

      <div className="mt-4 text-xs text-slate-500">
        Need help?{" "}
        <Link
          to="/login"
          className="text-cyan-300 underline-offset-4 hover:underline"
        >
          Go back
        </Link>
      </div>
    </div>
  );
};

export default Register;
