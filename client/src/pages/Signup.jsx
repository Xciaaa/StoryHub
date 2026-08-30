import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { api, API_BASE } from '../lib/api';

export default function Signup() {
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.signup({ username, email, password });
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthLayout title="Account created" subtitle="You're almost ready">
        <div className="w-full text-center space-y-4">
          <span className="material-symbols-outlined text-5xl text-emerald-400 block">check_circle</span>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Your account has been created successfully.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="btn-primary w-full py-3 rounded-lg font-label-md text-label-md"
          >
            Proceed to Login
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Create account" subtitle="Start mapping your story world">
      <form onSubmit={handleSubmit} className="w-full space-y-5">
        <div className="flex flex-col gap-2">
          <label className="font-label-md text-label-md text-gray-300" htmlFor="username">
            Username
          </label>
          <div className="relative">
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="johndoe"
              className="input-field w-full py-3 px-4 font-body-md text-body-md"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-label-md text-label-md text-gray-300" htmlFor="email">
            Email Address
          </label>
          <div className="relative">
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="input-field w-full py-3 px-4 font-body-md text-body-md"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-label-md text-label-md text-gray-300" htmlFor="password">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input-field w-full py-3 px-4 pr-10 font-body-md text-body-md"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-[20px]">
                {showPassword ? 'visibility' : 'visibility_off'}
              </span>
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">At least 8 characters</p>
        </div>

        {error && <p className="text-sm text-error">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-3 rounded-lg font-label-md text-label-md mt-6 flex justify-center items-center gap-2"
        >
          {loading ? 'Creating account…' : 'Sign up'}
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </button>
      </form>

      <div className="w-full flex items-center gap-4 my-8">
        <div className="h-px bg-gray-800 flex-1" />
        <span className="font-label-sm text-label-sm text-gray-500 uppercase tracking-widest">or continue with</span>
        <div className="h-px bg-gray-800 flex-1" />
      </div>

      <div className="grid grid-cols-2 gap-4 w-full">
        <a
          href={`${API_BASE}/api/auth/google`}
          className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-gray-700 bg-[#1f2937] hover:bg-[#374151] transition-colors font-label-md text-label-md text-gray-200 shadow-sm"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Google
        </a>
        <a
          href={`${API_BASE}/api/auth/github`}
          className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-gray-700 bg-[#1f2937] hover:bg-[#374151] transition-colors font-label-md text-label-md text-gray-200 shadow-sm"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .267.18.578.688.48A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
          </svg>
          GitHub
        </a>
      </div>

      <p className="text-center text-sm text-gray-500 mt-8">
        Already have an account?{' '}
        <Link to="/login" className="text-[#6366f1] hover:text-[#818cf8] transition-colors font-medium">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
