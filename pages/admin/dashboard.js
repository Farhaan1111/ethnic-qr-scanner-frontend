import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useRouter } from 'next/router';

export default function AdminDashboard() {
  const [products, setProducts] = useState([]);
  const [qrCodes, setQrCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qrLoading, setQrLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('products');
  const [searchImage, setSearchImage] = useState(null);
  const [searchPreview, setSearchPreview] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const router = useRouter();

  useEffect(() => {
    checkAuth();
    fetchProducts();
    loadSavedQRCodesFromDB();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('ownerToken');
    if (!token) {
      window.location.href = '/';
      return;
    }
  };

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('ownerToken');
      const response = await api.get('/api/products', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('ownerToken');
        window.location.href = '/';
      }
    } finally {
      setLoading(false);
    }
  };

  // Load saved QR codes from database
  const loadSavedQRCodesFromDB = async () => {
    try {
      setQrLoading(true);
      const token = localStorage.getItem('ownerToken');
      const response = await api.get('/api/qr/saved/all', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQrCodes(response.data);
    } catch (error) {
      console.error('Error loading saved QR codes from DB:', error);
      // Fallback to localStorage if DB endpoint doesn't exist yet
      loadSavedQRCodesFromStorage();
    } finally {
      setQrLoading(false);
    }
  };

  // Fallback: Load from localStorage
  const loadSavedQRCodesFromStorage = () => {
    try {
      const savedQRCodes = localStorage.getItem('generatedQRCodes');
      if (savedQRCodes) {
        setQrCodes(JSON.parse(savedQRCodes));
      }
    } catch (error) {
      console.error('Error loading saved QR codes from storage:', error);
    }
  };

  // Save QR codes to localStorage (fallback)
  const saveQRCodesToStorage = (qrCodes) => {
    try {
      localStorage.setItem('generatedQRCodes', JSON.stringify(qrCodes));
    } catch (error) {
      console.error('Error saving QR codes:', error);
    }
  };

  const generateQRCode = async (productId, productName) => {
    try {
      const token = localStorage.getItem('ownerToken');
      const response = await api.get(`/api/qr/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const qrData = {
        ...response.data,
        productName: productName,
        generatedAt: new Date().toISOString()
      };

      setQrCodes(prev => {
        const filtered = prev.filter(qr => qr.productId !== productId);
        const newQRCodes = [...filtered, qrData];
        saveQRCodesToStorage(newQRCodes); // Save to localStorage as backup
        return newQRCodes;
      });

      alert(`QR code ${response.data.fromCache ? 'loaded from cache' : 'generated'} for ${productName}`);
    } catch (error) {
      console.error('Error generating QR:', error);
      alert('Error generating QR code. Please check authentication.');
    }
  };

  const generateAllQRCodes = async () => {
    try {
      const token = localStorage.getItem('ownerToken');
      const response = await api.get('/api/qr', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const qrWithNames = response.data.map(qr => {
        const product = products.find(p => p.productId === qr.productId);
        return {
          ...qr,
          productName: product?.name || qr.productId,
          generatedAt: new Date().toISOString()
        };
      });

      setQrCodes(qrWithNames);
      saveQRCodesToStorage(qrWithNames); // Save to localStorage as backup
      alert(`Generated ${qrWithNames.length} QR codes`);
    } catch (error) {
      console.error('Error generating QR codes:', error);
      alert('Error generating QR codes. Please check authentication.');
    }
  };

  const downloadQR = (qrData) => {
    const link = document.createElement('a');
    link.href = qrData.qrCode;
    link.download = `qr-${qrData.productId}-${qrData.productName}.png`.replace(/\s+/g, '-');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAllQRCodes = () => {
    qrCodes.forEach((qrData, index) => {
      setTimeout(() => {
        downloadQR(qrData);
      }, index * 300);
    });
  };

  const clearAllQRCodes = async () => {
    if (confirm('Are you sure you want to clear all generated QR codes?')) {
      try {
        // Try to clear from database first
        const token = localStorage.getItem('ownerToken');
        await api.delete('/api/qr', {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(err => {
          console.log('DB clear not available, using localStorage only');
        });

        setQrCodes([]);
        localStorage.removeItem('generatedQRCodes');
        alert('All QR codes cleared!');
      } catch (error) {
        console.error('Error clearing QR codes:', error);
        alert('Error clearing QR codes');
      }
    }
  };

  const deleteQRCode = async (productId) => {
    if (confirm('Are you sure you want to delete this QR code?')) {
      try {
        // Try to delete from database first
        const token = localStorage.getItem('ownerToken');
        await api.delete(`/api/qr/${productId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(err => {
          console.log('DB delete not available, using localStorage only');
        });

        setQrCodes(prev => prev.filter(qr => qr.productId !== productId));
        saveQRCodesToStorage(qrCodes.filter(qr => qr.productId !== productId));
        alert('QR code deleted successfully!');
      } catch (error) {
        console.error('Error deleting QR code:', error);
        alert('Error deleting QR code');
      }
    }
  };

  // ==========================
  // 🔍 IMAGE SEARCH HANDLERS
  // ==========================

  const handleSearchImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSearchError('');
    setSearchResult(null);
    setSearchImage(file);
    setSearchPreview(URL.createObjectURL(file));
  };

  const handleSearchByImage = async (e) => {
    e.preventDefault();

    if (!searchImage) {
      setSearchError('Please select an image first.');
      return;
    }

    try {
      setSearchLoading(true);
      setSearchError('');

      const token = localStorage.getItem('ownerToken');
      if (!token) {
        alert('Session expired. Please login again.');
        localStorage.removeItem('ownerToken');
        window.location.href = '/admin/login';
        return;
      }

      const formData = new FormData();
      formData.append('image', searchImage);

      const response = await api.post('/api/products/search-by-image', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      setSearchResult(response.data);
    } catch (error) {
      console.error('Error searching by image:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('ownerToken');
        window.location.href = '/admin/login';
        return;
      }
      setSearchError(
        error.response?.data?.error ||
        'Error while searching. Please try again.'
      );
    } finally {
      setSearchLoading(false);
    }
  };

  const handleClearSearch = () => {
    setSearchImage(null);
    setSearchPreview('');
    setSearchResult(null);
    setSearchError('');

    // Reset file input
    if (typeof window !== 'undefined') {
      const input = document.getElementById('search-image-input');
      if (input) input.value = '';
    }
  };

  const handleManageProduct = (productId) => {
    // 👇 Open product page where owner can manage stock, etc.
    router.push(`/p/${productId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">FAROOQUI</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-green-600 bg-green-100 px-3 py-1 rounded-full">
                Owner Mode
              </span>
              <button
                onClick={() => {
                  localStorage.removeItem('ownerToken');
                  window.location.href = '/';
                }}
                className="text-sm text-red-600 hover:text-red-700 px-3 py-1 border border-red-200 rounded"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('products')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'products'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Products
            </button>
            <button
              onClick={() => setActiveTab('qrcodes')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'qrcodes'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              QR Codes ({qrCodes.length})
            </button>
            <button
              onClick={() => setActiveTab('image-search')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'image-search'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Search by Image
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'products' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow border">
                <h3 className="text-lg font-semibold text-gray-700">Total Products</h3>
                <p className="text-3xl font-bold text-gray-900">{products.length}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow border">
                <h3 className="text-lg font-semibold text-gray-700">Low Stock</h3>
                <p className="text-3xl font-bold text-orange-600">
                  {products.filter(p => p.stock < (p.lowStockAlert || 5)).length}
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow border">
                <h3 className="text-lg font-semibold text-gray-700">Out of Stock</h3>
                <p className="text-3xl font-bold text-red-600">
                  {products.filter(p => p.stock === 0).length}
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow border">
                <h3 className="text-lg font-semibold text-gray-700">QR Codes</h3>
                <p className="text-3xl font-bold text-green-600">{qrCodes.length}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg shadow border p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
              <div className="flex gap-4 flex-wrap">
                <button
                  onClick={generateAllQRCodes}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-semibold"
                >
                  Generate All QR Codes
                </button>
                <button
                  onClick={() => setActiveTab('qrcodes')}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-semibold"
                >
                  View Generated QR Codes
                </button>
                <button
                  onClick={() => window.open('/', '_blank')}
                  className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition font-semibold"
                >
                  Open Customer Site
                </button>
                <button
                  onClick={() => router.push('/admin/inventory')}
                  className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition font-semibold"
                >
                  Inventory Management
                </button>
                <button
                  onClick={() => router.push('/admin/products')}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition font-semibold"
                >
                  Manage Products
                </button>
                <button
                  onClick={() => router.push('/admin/fabrics')}
                  className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition font-semibold"
                >
                  🧵 Fabric Inventory
                </button>
              </div>
            </div>

            {/* Products List */}
            <div className="bg-white rounded-lg shadow border p-6">
              <h2 className="text-xl font-semibold mb-4">Products List</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stock
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {products.map((product) => (
                      <tr key={product._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {product.productId}
                            </div>
                            <div className="text-sm text-gray-500">
                              {product.name}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${product.stock === 0
                            ? 'bg-red-100 text-red-800'
                            : product.stock < (product.lowStockAlert || 5)
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-green-100 text-green-800'
                            }`}>
                            {product.stock} units
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹{product.sellingPrice}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => generateQRCode(product.productId, product.name)}
                            className="text-blue-600 hover:text-blue-900 mr-4 bg-blue-50 px-3 py-1 rounded"
                          >
                            Generate QR
                          </button>
                          <button
                            onClick={() => window.open(`/p/${product.productId}`, '_blank')}
                            className="text-green-600 hover:text-green-900 bg-green-50 px-3 py-1 rounded"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {activeTab === 'qrcodes' && (
          <div className="bg-white rounded-lg shadow border p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-semibold">Generated QR Codes</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {qrCodes.length} QR codes • QR codes are now saved and persist after refresh
                </p>
              </div>
              {qrCodes.length > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={downloadAllQRCodes}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm"
                  >
                    Download All
                  </button>
                  <button
                    onClick={clearAllQRCodes}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm"
                  >
                    Clear All
                  </button>
                </div>
              )}
            </div>

            {qrLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading QR codes...</p>
              </div>
            ) : qrCodes.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📱</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No QR Codes Generated</h3>
                <p className="text-gray-500 mb-4">Generate QR codes from the Products tab</p>
                <button
                  onClick={() => setActiveTab('products')}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                >
                  Go to Products
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                {qrCodes.map((qrData, index) => (
                  <div key={index} className="text-center border rounded-lg p-4 bg-gray-50 relative">
                    {/* Cache indicator */}
                    {qrData.fromCache && (
                      <span className="absolute top-2 right-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                        Cached
                      </span>
                    )}

                    <img
                      src={qrData.qrCode}
                      alt={`QR Code for ${qrData.productId}`}
                      className="w-full h-auto border rounded bg-white"
                    />
                    <div className="mt-3">
                      <p className="text-sm font-medium text-gray-900 truncate" title={qrData.productName}>
                        {qrData.productName}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{qrData.productId}</p>
                      {qrData.generatedAt && (
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(qrData.generatedAt).toLocaleDateString()}
                        </p>
                      )}
                      <div className="flex gap-1 mt-2 justify-center">
                        <button
                          onClick={() => downloadQR(qrData)}
                          className="text-blue-600 hover:text-blue-800 text-xs bg-blue-50 px-2 py-1 rounded"
                        >
                          Download
                        </button>
                        <button
                          onClick={() => deleteQRCode(qrData.productId)}
                          className="text-red-600 hover:text-red-800 text-xs bg-red-50 px-2 py-1 rounded"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {activeTab === 'image-search' && (
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Search Product by Image
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Upload a photo of a sherwani/product. The system will find the most similar
              product in your inventory based on image embeddings.
            </p>

            {/* Upload form */}
            <form
              onSubmit={handleSearchByImage}
              className="bg-white p-6 rounded-lg shadow border space-y-4"
            >
              <div>
                <label
                  htmlFor="search-image-input"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Product Image
                </label>
                <input
                  id="search-image-input"
                  type="file"
                  accept="image/*"
                  onChange={handleSearchImageChange}
                  className="w-full text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Tip: Try to click front/zoom/back images similar to how you store them.
                </p>
              </div>

              {searchPreview && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Selected Image
                  </p>
                  <img
                    src={searchPreview}
                    alt="Selected"
                    className="h-48 w-auto rounded border object-contain bg-gray-50"
                  />
                </div>
              )}

              {searchError && (
                <div className="p-3 bg-red-100 border border-red-300 rounded text-sm text-red-700">
                  {searchError}
                </div>
              )}

              <div className="flex gap-3 mt-4">
                <button
                  type="submit"
                  disabled={searchLoading || !searchImage}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
                >
                  {searchLoading ? 'Searching…' : 'Search'}
                </button>
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Clear
                </button>
              </div>
            </form>

            {/* Search result */}
            {searchResult && (
              <div className="mt-8">
                {searchResult.matches && searchResult.matches.length > 0 ? (
                  <div className="bg-white p-6 rounded-lg shadow border">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {searchResult.found ? 'Matching product found ✅' : 'Closest matches in your inventory'}
                    </h3>

                    {searchResult.message && (
                      <p className="text-sm text-gray-600 mb-4">
                        {searchResult.message}
                      </p>
                    )}

                    <div className="space-y-4">
                      {searchResult.matches.map((m) => (
                        <div
                          key={m.productId}
                          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border rounded-md p-3"
                        >
                          <div className="flex items-start gap-3">
                            {m.thumbnail && (
                              <img
                                src={m.thumbnail}
                                alt={m.name}
                                className="w-20 h-20 object-cover rounded border bg-gray-50"
                              />
                            )}
                            <div>
                              <p className="text-sm text-gray-500">
                                Product ID:{' '}
                                <span className="font-mono font-semibold">
                                  {m.productId}
                                </span>
                              </p>
                              <p className="text-base font-semibold text-gray-900">
                                {m.name}
                              </p>
                              <p className="text-sm text-gray-600">
                                Category: {m.category}
                              </p>
                              {typeof m.similarity === 'number' && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Similarity:{' '}
                                  <span className="font-mono">
                                    {(m.similarity * 100).toFixed(2)}%
                                  </span>
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-2">
                            <button
                              onClick={() => handleManageProduct(m.productId)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                            >
                              Manage this Product
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {!searchResult.found && (
                      <div className="mt-6 flex flex-wrap gap-3">
                        <button
                          onClick={() => router.push('/admin/products')}
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                        >
                          Add as New Product
                        </button>
                        <button
                          onClick={handleClearSearch}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
                        >
                          Try Another Image
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white p-6 rounded-lg shadow border">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No similar products found
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      The image does not match any product embeddings in your inventory.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => router.push('/admin/products')}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                      >
                        Add as New Product
                      </button>
                      <button
                        onClick={handleClearSearch}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
                      >
                        Try Another Image
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        )}

      </main>
    </div>
  );
}
