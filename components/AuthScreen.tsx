/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, FormEvent, useEffect } from 'react';
import { SparkleIcon, GoogleIcon, XMarkIcon } from './icons';
import Spinner from './Spinner';
import { signIn, signUp, signInWithGoogle, sendPasswordResetEmail } from '../services/supabaseService';

type AuthView = 'login' | 'register' | 'forgotPassword';

interface AuthScreenProps {
  initialView?: AuthView;
  isModalMode?: boolean;
  onClose?: () => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ initialView = 'login', isModalMode = false, onClose }) => {
  const [view, setView] = useState<AuthView>(initialView);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  
  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    
    setIsLoading(true);
    try {
        const { data, error: signUpError } = await signUp(email, password);
        if (signUpError) throw signUpError;
        // On successful sign-up, Supabase sends a confirmation email.
        // We need to show the user a message to check their inbox.
        if (data.user) {
            setNeedsConfirmation(true);
        }
    } catch (err: any) {
        setError(err.message || "Failed to register. Please try again.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
        const { error: signInError } = await signIn(email, password);
        if (signInError) {
             // Check for specific Supabase error for unconfirmed email
            if (signInError.message.toLowerCase().includes('email not confirmed')) {
                setNeedsConfirmation(true); // Show the confirmation prompt again for better UX
            } else {
                throw signInError;
            }
        } 
        // On success, the onAuthStateChange listener in App.tsx handles navigation.
    } catch (err: any) {
        setError(err.message || "Invalid email or password.");
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleGoogleLogin = async () => {
    setError(null);
    const { error } = await signInWithGoogle();
    if (error) {
      setError(error.message);
    }
    // On success, the onAuthStateChange listener in App.tsx will handle the redirect.
  };

  const handlePasswordReset = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
        const { error: resetError } = await sendPasswordResetEmail(email);
        if (resetError) throw resetError;
        setResetEmailSent(true); // Show confirmation screen
    } catch (err: any) {
        setError(err.message || "Failed to send reset instructions.");
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleDemoLogin = async () => {
    setError(null);
    setIsLoading(true);
    try {
        const { error: signInError } = await signIn('demo@picslot.com', 'Demo@Pics#444');
        if (signInError) {
            throw signInError;
        }
        // On success, the onAuthStateChange listener in App.tsx handles navigation.
    } catch (err: any) {
        setError(err.message || "Failed to log in as demo user.");
    } finally {
        setIsLoading(false);
    }
  };

  const switchView = (newView: AuthView) => {
    setView(newView);
    setError(null);
    setPassword('');
    setConfirmPassword('');
    // Keep email when switching between login and forgot password
    if (newView === 'register') {
      setEmail('');
    }
  };

  if (needsConfirmation) {
    return (
        <div className="w-full max-w-md mx-auto text-center">
          <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 rounded-xl p-8 backdrop-blur-lg shadow-2xl animate-fade-in">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Check your inbox</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              We've sent a confirmation link to <span className="font-semibold text-violet-500 dark:text-violet-400">{email}</span>. Please click the link to activate your account.
            </p>
            <button
              type="button"
              onClick={() => {
                setNeedsConfirmation(false);
                switchView('login');
              }}
              className="font-semibold text-violet-500 dark:text-violet-400 hover:text-violet-600 dark:hover:text-violet-300"
            >
              Back to Login
            </button>
          </div>
        </div>
    );
  }

  if (resetEmailSent) {
    return (
        <div className="w-full max-w-md mx-auto text-center">
          <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 rounded-xl p-8 backdrop-blur-lg shadow-2xl animate-fade-in">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Check your inbox</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              If an account exists for <span className="font-semibold text-violet-500 dark:text-violet-400">{email}</span>, we've sent a password reset link.
            </p>
            <button
              type="button"
              onClick={() => {
                setResetEmailSent(false);
                switchView('login');
              }}
              className="font-semibold text-violet-500 dark:text-violet-400 hover:text-violet-600 dark:hover:text-violet-300"
            >
              Back to Login
            </button>
          </div>
        </div>
    );
  }

  const inputClass = "w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 rounded-lg p-3 text-base focus:ring-2 focus:ring-violet-500 focus:outline-none transition";
  const buttonClass = "w-full bg-gradient-to-br from-violet-500 to-cyan-500 text-white font-bold py-3 px-6 text-lg rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-violet-500/20 hover:shadow-xl hover:shadow-violet-500/40 hover:-translate-y-px active:scale-95 disabled:from-slate-500 disabled:to-slate-600 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center";
  const googleButtonClass = "w-full bg-white dark:bg-slate-200 text-slate-800 font-bold py-3 px-6 text-lg rounded-lg transition-all duration-300 ease-in-out hover:-translate-y-px active:scale-95 flex items-center justify-center gap-3 border border-slate-300 dark:border-transparent shadow-sm hover:shadow-md";
  const demoButtonClass = "w-full bg-slate-200 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold py-3 px-6 text-lg rounded-lg transition-all duration-300 ease-in-out hover:bg-slate-300 dark:hover:bg-slate-700 hover:-translate-y-px active:scale-95 flex items-center justify-center gap-3 mb-4";

  return (
    <div className={isModalMode ? "w-full max-w-md mx-auto" : "min-h-screen flex flex-col items-center justify-center p-4"}>
      {!isModalMode && (
          <div className="flex justify-center items-center gap-3 mb-6">
              <SparkleIcon className="w-8 h-8 text-violet-500" />
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Picslot</h1>
          </div>
      )}
      
      <div className="relative bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 rounded-xl p-8 backdrop-blur-lg shadow-2xl animate-fade-in w-full">
          {isModalMode && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-3 right-3 p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              aria-label="Close"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          )}

          {view === 'login' && (
            <>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Welcome Back</h2>
              <p className="text-slate-500 dark:text-slate-400 mb-6">Sign in to continue to Picslot</p>
            </>
          )}
          {view === 'register' && (
            <>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Create an Account</h2>
              <p className="text-slate-500 dark:text-slate-400 mb-6">Get started with your AI photo editor</p>
            </>
          )}
          {view === 'forgotPassword' && (
            <>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Reset Password</h2>
              <p className="text-slate-500 dark:text-slate-400 mb-6">Enter your email to get reset instructions.</p>
            </>
          )}

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 p-3 rounded-lg mb-4 text-center">
              {error}
            </div>
          )}

          {view === 'forgotPassword' ? (
            <form onSubmit={handlePasswordReset} className="flex flex-col gap-4">
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClass} autoComplete="email" />
              <button type="submit" className={buttonClass} disabled={isLoading}>
                {isLoading ? <Spinner size="sm" /> : 'Send Reset Instructions'}
              </button>
            </form>
          ) : (
            <form onSubmit={view === 'login' ? handleLogin : handleRegister} className="flex flex-col gap-4">
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClass} autoComplete="email"/>
              <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className={inputClass} autoComplete={view === 'login' ? 'current-password' : 'new-password'} />
              {view === 'register' && (
                <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className={inputClass} autoComplete="new-password" />
              )}

              {view === 'login' && (
                <div className="flex items-center justify-between mt-2 mb-2">
                  <label htmlFor="rememberMe" className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 cursor-pointer">
                    <input id="rememberMe" type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-4 h-4 text-violet-600 bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded focus:ring-violet-500" />
                    Remember Me
                  </label>
                  <button type="button" onClick={() => switchView('forgotPassword')} className="text-sm font-semibold text-violet-500 dark:text-violet-400 hover:text-violet-600 dark:hover:text-violet-300">
                    Forgot Password?
                  </button>
                </div>
              )}
              
              <button type="submit" className={buttonClass} disabled={isLoading}>
                  {isLoading ? <Spinner size="sm" /> : (view === 'login' ? 'Login' : 'Create Account')}
              </button>
            </form>
          )}


          {view === 'login' && (
            <>
              <div className="my-6 flex items-center gap-4">
                <hr className="w-full border-slate-300 dark:border-slate-600" />
                <span className="text-slate-400 dark:text-slate-500 font-semibold text-sm">OR</span>
                <hr className="w-full border-slate-300 dark:border-slate-600" />
              </div>
              <button type="button" onClick={handleDemoLogin} className={demoButtonClass} disabled={isLoading}>
                {isLoading ? <Spinner size="sm" /> : 'Login as Demo User'}
              </button>
              <button type="button" onClick={handleGoogleLogin} className={googleButtonClass}>
                <GoogleIcon className="w-6 h-6" />
                Sign in with Google
              </button>
            </>
          )}
          
          {view === 'register' && (
             <>
                <div className="my-6 flex items-center gap-4">
                    <hr className="w-full border-slate-300 dark:border-slate-600" />
                    <span className="text-slate-400 dark:text-slate-500 font-semibold text-sm">OR</span>
                    <hr className="w-full border-slate-300 dark:border-slate-600" />
                </div>
                <button type="button" onClick={handleGoogleLogin} className={googleButtonClass}>
                    <GoogleIcon className="w-6 h-6" />
                    Sign up with Google
                </button>
            </>
          )}

          <div className="mt-6 text-center">
            {view === 'login' && (
                <p className="text-slate-500 dark:text-slate-400">
                Don't have an account?{' '}
                <button type="button" onClick={() => switchView('register')} className="font-semibold text-violet-500 dark:text-violet-400 hover:text-violet-600 dark:hover:text-violet-300">
                    Sign up
                </button>
                </p>
            )}
            {view === 'register' && (
                <p className="text-slate-500 dark:text-slate-400">
                Already have an account?{' '}
                <button type="button" onClick={() => switchView('login')} className="font-semibold text-violet-500 dark:text-violet-400 hover:text-violet-600 dark:hover:text-violet-300">
                    Sign in
                </button>
                </p>
            )}
            {view === 'forgotPassword' && (
                <p className="text-slate-500 dark:text-slate-400">
                Remembered your password?{' '}
                <button type="button" onClick={() => switchView('login')} className="font-semibold text-violet-500 dark:text-violet-400 hover:text-violet-600 dark:hover:text-violet-300">
                    Back to Sign in
                </button>
                </p>
            )}
          </div>
      </div>
    </div>
  );
};

export default AuthScreen;