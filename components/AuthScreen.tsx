/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, FormEvent } from 'react';
import { SparkleIcon, GoogleIcon } from './icons';
import Spinner from './Spinner';
import { signIn, signUp, signInWithGoogle, sendPasswordResetEmail } from '../services/supabaseService';

interface AuthScreenProps {
  // No props needed as auth state is now handled globally in App.tsx
}

type AuthView = 'login' | 'register' | 'forgotPassword';

const AuthScreen: React.FC<AuthScreenProps> = () => {
  const [view, setView] = useState<AuthView>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

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
        // No need to call a success callback here.
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
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md mx-auto text-center">
          <div className="bg-gray-800/50 border border-gray-700/80 rounded-xl p-8 backdrop-blur-lg shadow-2xl animate-fade-in">
            <h2 className="text-2xl font-bold text-white mb-2">Check your inbox</h2>
            <p className="text-gray-400 mb-6">
              We've sent a confirmation link to <span className="font-semibold text-blue-400">{email}</span>. Please click the link to activate your account.
            </p>
            <button
              onClick={() => {
                setNeedsConfirmation(false);
                switchView('login');
              }}
              className="font-semibold text-blue-400 hover:text-blue-300"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (resetEmailSent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md mx-auto text-center">
          <div className="bg-gray-800/50 border border-gray-700/80 rounded-xl p-8 backdrop-blur-lg shadow-2xl animate-fade-in">
            <h2 className="text-2xl font-bold text-white mb-2">Check your inbox</h2>
            <p className="text-gray-400 mb-6">
              If an account exists for <span className="font-semibold text-blue-400">{email}</span>, we've sent a password reset link.
            </p>
            <button
              onClick={() => {
                setResetEmailSent(false);
                switchView('login');
              }}
              className="font-semibold text-blue-400 hover:text-blue-300"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  const inputClass = "w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-lg p-3 text-base focus:ring-2 focus:ring-blue-500 focus:outline-none transition";
  const buttonClass = "w-full bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-3 px-6 text-lg rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 disabled:from-gray-600 disabled:to-gray-700 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center";
  const googleButtonClass = "w-full bg-gray-200 text-gray-800 font-bold py-3 px-6 text-lg rounded-lg transition-all duration-300 ease-in-out hover:-translate-y-px active:scale-95 flex items-center justify-center gap-3";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto">
        <div className="flex justify-center items-center gap-3 mb-6">
            <SparkleIcon className="w-8 h-8 text-blue-400" />
            <h1 className="text-3xl font-bold tracking-tight text-gray-100">Picslot</h1>
        </div>
        
        <div className="bg-gray-800/50 border border-gray-700/80 rounded-xl p-8 backdrop-blur-lg shadow-2xl animate-fade-in">
          {view === 'login' && (
            <>
              <h2 className="text-2xl font-bold text-white mb-1">Welcome Back</h2>
              <p className="text-gray-400 mb-6">Sign in to continue to Picslot</p>
            </>
          )}
          {view === 'register' && (
            <>
              <h2 className="text-2xl font-bold text-white mb-1">Create an Account</h2>
              <p className="text-gray-400 mb-6">Get started with your AI photo editor</p>
            </>
          )}
          {view === 'forgotPassword' && (
            <>
              <h2 className="text-2xl font-bold text-white mb-1">Reset Password</h2>
              <p className="text-gray-400 mb-6">Enter your email to get reset instructions.</p>
            </>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-300 p-3 rounded-lg mb-4 text-center">
              {error}
            </div>
          )}

          {view === 'forgotPassword' ? (
            <form onSubmit={handlePasswordReset} className="flex flex-col gap-4">
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClass} />
              <button type="submit" className={buttonClass} disabled={isLoading}>
                {isLoading ? <Spinner size="sm" /> : 'Send Reset Instructions'}
              </button>
            </form>
          ) : (
            <form onSubmit={view === 'login' ? handleLogin : handleRegister} className="flex flex-col gap-4">
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClass}/>
              <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className={inputClass} />
              {view === 'register' && (
                <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className={inputClass} />
              )}

              {view === 'login' && (
                <div className="flex items-center justify-between mt-2 mb-2">
                  <label htmlFor="rememberMe" className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                    <input id="rememberMe" type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500" />
                    Remember Me
                  </label>
                  <button type="button" onClick={() => switchView('forgotPassword')} className="text-sm font-semibold text-blue-400 hover:text-blue-300">
                    Forgot Password?
                  </button>
                </div>
              )}
              
              <button type="submit" className={buttonClass} disabled={isLoading}>
                  {isLoading ? <Spinner size="sm" /> : (view === 'login' ? 'Login' : 'Create Account')}
              </button>
            </form>
          )}


          {view !== 'forgotPassword' && (
            <>
              <div className="my-6 flex items-center gap-4">
                <hr className="w-full border-gray-600" />
                <span className="text-gray-500 font-semibold">OR</span>
                <hr className="w-full border-gray-600" />
              </div>
              <button onClick={handleGoogleLogin} className={googleButtonClass}>
                <GoogleIcon className="w-6 h-6" />
                Sign in with Google
              </button>
            </>
          )}

          <div className="mt-6 text-center">
            {view === 'login' && (
                <p className="text-gray-400">
                Don't have an account?{' '}
                <button onClick={() => switchView('register')} className="font-semibold text-blue-400 hover:text-blue-300">
                    Sign up
                </button>
                </p>
            )}
            {view === 'register' && (
                <p className="text-gray-400">
                Already have an account?{' '}
                <button onClick={() => switchView('login')} className="font-semibold text-blue-400 hover:text-blue-300">
                    Sign in
                </button>
                </p>
            )}
            {view === 'forgotPassword' && (
                <p className="text-gray-400">
                Remembered your password?{' '}
                <button onClick={() => switchView('login')} className="font-semibold text-blue-400 hover:text-blue-300">
                    Back to Sign in
                </button>
                </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;