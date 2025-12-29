import { useState } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();
  const [productId, setProductId] = useState('');

  const handleProductRedirect = () => {
    if (productId.trim()) {
      router.push(`/p/${productId.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gradient-to-br from-gray-800/50 via-gray-900/70 to-black/70 rounded-2xl shadow-2xl overflow-hidden border border-amber-900/30 backdrop-blur-sm p-6 sm:p-8 text-center">
        <div className="mb-6">
          <div className="flex flex-col items-center gap-4">
            {/* Logo Container */}
            <div className="h-28 w-28 flex items-center justify-center p-2">
              <img
                src="/farooqui-logo.png"
                alt="FAROOQUI Logo"
                className="h-24 w-24 object-contain filter drop-shadow-[0_0_18px_rgba(245,158,11,0.5)]"
              />
            </div>
            
            {/* Horizontal divider between logo and tagline */}
            <div className="w-24 h-px bg-gradient-to-r from-transparent via-amber-600/60 to-transparent my-2"></div>
            
            {/* Brand Tagline */}
            <div className="text-center">
              <div className="text-lg font-serif italic tracking-wider text-amber-200/90 font-light leading-tight">
                Mark of true
              </div>
              <div className="text-2xl font-serif font-bold tracking-wider text-amber-300 mt-1.5">
                DISTINCTION
              </div>
            </div>
          </div>
          <p className="text-amber-200/80 mt-4 text-sm">Scan product QR or enter design number</p>
        </div>

        <div className="space-y-5">
          <div>
            <label htmlFor="productId" className="block text-sm font-medium text-amber-200/80 text-left mb-2">
              Design Number
            </label>
            <input
              type="text"
              id="productId"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              placeholder="e.g., SAREe-001 or FAR-2024-001"
              className="w-full px-4 py-3 bg-gradient-to-r from-gray-800 to-black border border-amber-900/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-amber-100 placeholder-amber-200/50 text-sm"
              onKeyPress={(e) => e.key === 'Enter' && handleProductRedirect()}
            />
          </div>

          <button
            onClick={handleProductRedirect}
            disabled={!productId.trim()}
            className="w-full bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700 text-white py-3 px-4 rounded-xl hover:from-amber-600 hover:via-amber-500 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-serif font-bold tracking-wide shadow-lg hover:shadow-xl disabled:hover:shadow-lg text-sm"
          >
            View Product Details
          </button>
        </div>

        <div className="mt-6 pt-5 border-t border-amber-900/30">
          <p className="text-xs text-amber-200/60">
            For owners: Login on product pages
          </p>
        </div>
        
        <div className="mt-5 pt-5 border-t border-amber-900/30">
          <p className="text-xs text-amber-200/60 mb-3">
            Owner admin access
          </p>
          <button
            onClick={() => router.push('/admin/login')}
            className="text-amber-300 hover:text-amber-200 text-xs font-medium hover:underline transition-all duration-300 flex items-center justify-center gap-1.5 mx-auto"
          >
            <span>🔐 Owner Portal</span>
            <span className="text-base">→</span>
          </button>
        </div>

        {/* Decorative element */}
        <div className="mt-6 flex items-center justify-center gap-2">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-700/30 to-transparent"></div>
          <span className="text-xs text-amber-200/40 px-2">PREMIUM COLLECTION</span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-700/30 to-transparent"></div>
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