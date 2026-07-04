import React, { useState } from "react";
import { Radio } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { useRouter } from "../router";
import { authApi } from "../api/authentication";
import { tokenService } from "../api/token";


export function Login() {
  const [, setAuthState] = useAuthStore();
  const { navigate } = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setLoading(true);
    setError("");

    try {
      const response = await authApi.login({ email, password });
      const data = response.data;

      tokenService.setTokens(data.access, data.refresh);
      tokenService.setUser(data.user);

      setAuthState({
        isAuthenticated: true,
        user: data.user,
        accessToken: data.access,
        refreshToken: data.refresh,
      });

      navigate("#dashboard");
    } catch (err: any) {
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError("Network error or invalid credentials. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans transition duration-200">
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        <div className="p-3 bg-[#007e3a] rounded-xl text-white shadow-lg shadow-[#007e3a]/25 mb-4">
          <Radio className="h-8 w-8" />
        </div>
        <h2 className="text-center text-3xl font-extrabold text-slate-900 dark:text-slate-100">
          Sign in to WhatCrm
        </h2>
        <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400 font-semibold">
          WhatsApp Business CRM & Automation Panel
        </p>
        {error && (
          <div className="mt-4 p-2 bg-red-100 text-red-600 text-xs font-bold rounded">
            {error}
          </div>
        )}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-900 py-8 px-4 border border-slate-205 border-slate-200 dark:border-slate-800 sm:rounded-xl sm:px-10 shadow-sm">
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="email" className="block text-[10px] text-slate-455 text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider">
                Email Address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@company.com"
                  className="appearance-none block w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#007e3a] focus:border-[#007e3a]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-[10px] text-slate-455 text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="appearance-none block w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#007e3a] focus:border-[#007e3a]"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-md text-xs font-bold text-white bg-[#007e3a] hover:bg-[#00662f] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#007e3a] transition duration-200 disabled:opacity-50"
              >
                {loading ? "Signing In..." : "Sign In"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
