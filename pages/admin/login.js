import { useState } from 'react';
import { useRouter } from 'next/router';
import api from '../../utils/api';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/api/auth/owner-login', {
        password
      });

      if (response.data.token) {
        localStorage.setItem('ownerToken', response.data.token);
        router.push('/admin/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gradient-to-br from-gray-800/50 via-gray-900/70 to-black/70 rounded-2xl shadow-2xl overflow-hidden border border-amber-900/30 backdrop-blur-sm p-6 sm:p-8">
        {/* Header with Logo */}
        <div className="mb-8">
          <div className="flex flex-col items-center gap-4">
            {/* Logo */}
            <div className="h-16 w-16 flex items-center justify-center">
              <img
                src="/farooqui-logo.png"
                alt="FAROOQUI Logo"
                className="h-14 w-14 object-contain filter drop-shadow-[0_0_12px_rgba(245,158,11,0.4)]"
              />
            </div>
            
            {/* Horizontal divider */}
            <div className="w-20 h-px bg-gradient-to-r from-transparent via-amber-600/60 to-transparent"></div>
            
            {/* Title */}
            <div className="text-center">
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-amber-300 mb-2">👑 Owner Portal</h1>
              <p className="text-amber-200/80 text-sm">Enter owner password to access dashboard</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleLogin}>
          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-amber-200/80 mb-2">
              Owner Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gradient-to-r from-gray-800 to-black border border-amber-900/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-amber-100 placeholder-amber-200/50"
              placeholder="Enter owner password"
              required
            />
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-gradient-to-r from-red-900/30 to-black/30 border border-red-700/40 text-red-300 rounded-lg backdrop-blur-sm">
              {error}
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700 text-white py-3 px-4 rounded-xl hover:from-amber-600 hover:via-amber-500 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-serif font-bold tracking-wide shadow-lg hover:shadow-xl disabled:hover:shadow-lg"
          >
            {loading ? 'Authenticating...' : 'Login as Owner'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-amber-900/30 text-center">
          <button
            onClick={() => router.push('/')}
            className="text-amber-300 hover:text-amber-200 text-sm font-medium hover:underline transition-all duration-300 flex items-center justify-center gap-1.5 mx-auto"
          >
            <span className="text-base">←</span>
            <span>Back to Home</span>
          </button>
        </div>

        {/* Decorative element */}
        <div className="mt-6 flex items-center justify-center gap-2">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-700/30 to-transparent"></div>
          <span className="text-xs text-amber-200/40 px-2">SECURE ACCESS</span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-700/30 to-transparent"></div>
        </div>

        {/* Security note */}
        <div className="mt-4 p-3 bg-gradient-to-r from-amber-900/20 to-black/20 border border-amber-700/30 rounded-lg">
          <p className="text-xs text-amber-200/60 text-center">
            🔒 Authorized personnel only. All access is logged.
          </p>
        </div>
      </div>

      {/* Background pattern */}
      <div className="fixed inset-0 -z-10 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25px 25px, rgba(245, 158, 11, 0.2) 2%, transparent 0%), 
                           radial-gradient(circle at 75px 75px, rgba(245, 158, 11, 0.2) 2%, transparent 0%)`,
          backgroundSize: '100px 100px'
        }}></div>
      </div>
    </div>
  );
}