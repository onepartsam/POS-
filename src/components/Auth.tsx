import React, { useState } from 'react';
import { useTenant } from '../App';

export default function Auth() {
  const { setCurrentTenant } = useTenant();
  const [view, setView] = useState<'login' | 'register' | 'forgot'>('login');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    if (view === 'forgot') {
      try {
        const res = await fetch('/api/tenants/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email })
        });
        const data = await res.json();
        if (res.ok) {
          setSuccessMsg(`Your password is: ${data.password}`);
        } else {
          setError(data.error || 'Failed to recover password');
        }
      } catch (err) {
        setError('Network error occurred');
      } finally {
        setLoading(false);
      }
      return;
    }

    const endpoint = view === 'login' ? '/api/tenants/login' : '/api/tenants';
    const body = view === 'login' 
      ? { username, password } 
      : { name, username, email, contact_number: contactNumber, password };
    
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (res.ok) {
        setCurrentTenant(data);
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {view === 'login' && 'Sign in to your store'}
            {view === 'register' && 'Register a new store'}
            {view === 'forgot' && 'Recover Password'}
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-lg">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="text-green-700 text-sm text-center bg-green-50 p-3 rounded-lg">
              {successMsg}
            </div>
          )}
          <div className="rounded-md shadow-sm space-y-4">
            {view === 'register' && (
              <div>
                <label className="sr-only">Store Name</label>
                <input
                  type="text"
                  required
                  className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-black focus:border-black focus:z-10 sm:text-sm"
                  placeholder="Store Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}
            <div>
              <label className="sr-only">Username</label>
              <input
                type="text"
                required
                className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-black focus:border-black focus:z-10 sm:text-sm"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            {(view === 'register' || view === 'forgot') && (
              <div>
                <label className="sr-only">Email</label>
                <input
                  type="email"
                  required
                  className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-black focus:border-black focus:z-10 sm:text-sm"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            )}
            {view === 'register' && (
              <div>
                <label className="sr-only">Contact Number</label>
                <input
                  type="tel"
                  required
                  className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-black focus:border-black focus:z-10 sm:text-sm"
                  placeholder="Contact Number"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                />
              </div>
            )}
            {view !== 'forgot' && (
              <div>
                <label className="sr-only">Password</label>
                <input
                  type="password"
                  required
                  className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-black focus:border-black focus:z-10 sm:text-sm"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50"
            >
              {loading ? <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : (
                <>
                  {view === 'login' && 'Sign In'}
                  {view === 'register' && 'Register'}
                  {view === 'forgot' && 'Recover Password'}
                </>
              )}
            </button>
          </div>
          
          <div className="text-center mt-4 flex flex-col gap-2">
            {view === 'login' && (
              <>
                <button
                  type="button"
                  onClick={() => setView('forgot')}
                  className="text-sm text-gray-600 hover:text-black"
                >
                  Forgot your password?
                </button>
                <button
                  type="button"
                  onClick={() => setView('register')}
                  className="text-sm text-gray-600 hover:text-black"
                >
                  Don't have a store? Register here
                </button>
              </>
            )}
            {view === 'register' && (
              <button
                type="button"
                onClick={() => setView('login')}
                className="text-sm text-gray-600 hover:text-black"
              >
                Already have a store? Sign in
              </button>
            )}
            {view === 'forgot' && (
              <button
                type="button"
                onClick={() => { setView('login'); setSuccessMsg(''); setError(''); }}
                className="text-sm text-gray-600 hover:text-black"
              >
                Back to Sign in
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
