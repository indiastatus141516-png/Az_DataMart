import React, { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { authAPI } from "../services/api";
import { getClientId } from "../services/clientId";

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const clientId = getClientId();
      const response = await authAPI.login({ ...formData, clientId });
      const me = await login(response.data.token);
      if (me?.role === "admin") {
        navigate("/admin/dashboard");
      } else {
        navigate("/user/dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full text-left">
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-200">
          Secure Access
        </div>
        <h1 className="mt-4 text-3xl font-semibold text-white">Welcome back</h1>
        <p className="mt-2 text-sm text-slate-300">
          Sign in to continue to Az DataMart CRM.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
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
            autoComplete="current-password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Enter your password"
            required
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-violet-400 px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-900 shadow-lg shadow-cyan-500/30 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-300">
        <span>New here?</span>
        <Link
          to="/register"
          className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-100 transition hover:border-cyan-400/60 hover:text-white"
        >
          Create account
        </Link>
      </div>
    </div>
  );
};

export default Login;
