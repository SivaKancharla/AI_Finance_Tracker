import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { signupUser, clearAuthError } from '../redux/slices/authSlice.js';
import { Sparkles, User, Mail, Lock } from 'lucide-react';
import Button from '../components/common/Button.jsx';
import Input from '../components/common/Input.jsx';
import ErrorBanner from '../components/common/ErrorBanner.jsx';

export function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
    return () => {
      dispatch(clearAuthError());
    };
  }, [isAuthenticated, navigate, dispatch]);

  const validate = () => {
    const errs = {};
    if (!name.trim()) errs.name = 'Full name is required';
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      errs.email = 'Valid email is required';
    }
    if (!password || password.length < 8) {
      errs.password = 'Password must be at least 8 characters';
    }
    if (password !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    dispatch(
      signupUser({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password
      })
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 antialiased">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-4">
          <Sparkles className="h-6 w-6 text-white" />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Create your FinTrack Account
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Start tracking your finances with intelligent categorization & budgeting
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl border border-slate-200/80 shadow-xl space-y-6">
          <ErrorBanner message={error} />

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name"
              name="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Siva Kumar"
              icon={User}
              required
              autoComplete="name"
              error={errors.name}
            />

            <Input
              label="Email Address"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="siva@example.com"
              icon={Mail}
              required
              autoComplete="email"
              error={errors.email}
            />

            <Input
              label="Password (min 8 characters)"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              icon={Lock}
              required
              autoComplete="new-password"
              error={errors.password}
            />

            <Input
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              icon={Lock}
              required
              autoComplete="new-password"
              error={errors.confirmPassword}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full justify-center mt-2 shadow-md shadow-indigo-600/20"
              loading={loading}
            >
              Sign Up
            </Button>
          </form>

          <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              Sign in →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Signup;
