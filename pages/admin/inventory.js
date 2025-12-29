import { useState, useEffect } from 'react';
import api from '@/utils/api';
import { useRouter } from 'next/router';

export default function InventoryDashboard() {
  const [overview, setOverview] = useState(null);
  const [products, setProducts] = useState([]);
  const [lowStockAlerts, setLowStockAlerts] = useState({ critical: [], warnings: [] });
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [stockUpdate, setStockUpdate] = useState({ operation: 'add', quantity: 1 });
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    checkAuth();
    fetchInventoryData();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('ownerToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }
  };

  const fetchInventoryData = async () => {
    try {
      setError('');
      const token = localStorage.getItem('ownerToken');
      
      console.log('🔄 Fetching inventory data...');
      
      const [overviewRes, productsRes, alertsRes] = await Promise.all([
        api.get('/api/inventory/overview', {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(err => {
          console.error('Overview error:', err);
          return { data: null };
        }),
        api.get('/api/inventory/products', {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(err => {
          console.error('Products error:', err);
          return { data: [] };
        }),
        api.get('/api/inventory/alerts/low-stock', {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(err => {
          console.error('Alerts error:', err);
          return { data: { critical: [], warnings: [] } };
        })
      ]);

      console.log('📊 Data received:', {
        overview: overviewRes.data,
        products: productsRes.data,
        alerts: alertsRes.data
      });

      setOverview(overviewRes.data);
      setProducts(productsRes.data || []);
      setLowStockAlerts(alertsRes.data || { critical: [], warnings: [] });
      
    } catch (error) {
      console.error('❌ Error fetching inventory data:', error);
      setError('Failed to load inventory data: ' + error.message);
      if (error.response?.status === 401) {
        localStorage.removeItem('ownerToken');
        router.push('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const updateStock = async (productId) => {
    try {
      const token = localStorage.getItem('ownerToken');
      await api.patch(`/api/inventory/${productId}/stock`, stockUpdate, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Stock updated successfully!');
      setSelectedProduct(null);
      setStockUpdate({ operation: 'add', quantity: 1 });
      fetchInventoryData(); // Refresh data
    } catch (error) {
      console.error('Error updating stock:', error);
      alert('Error updating stock: ' + error.message);
    }
  };

  const quickStockUpdate = async (productId, operation, quantity = 1) => {
    try {
      const token = localStorage.getItem('ownerToken');
      await api.patch(`/api/inventory/${productId}/stock`, {
        operation,
        quantity,
        reason: 'quick_update'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      fetchInventoryData(); // Refresh data
    } catch (error) {
      console.error('Error in quick stock update:', error);
      alert('Error updating stock: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading inventory data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">📦 Inventory Management</h1>
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                ← Back to Dashboard
              </button>
              <button
                onClick={fetchInventoryData}
                className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <strong>Error: </strong> {error}
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {['overview', 'products', 'alerts'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab === 'alerts' ? `Alerts ${lowStockAlerts.critical.length + lowStockAlerts.warnings.length > 0 ? `(${lowStockAlerts.critical.length + lowStockAlerts.warnings.length})` : ''}` : tab}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && overview && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow border">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <span className="text-2xl">📊</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Products</p>
                    <p className="text-2xl font-bold text-gray-900">{overview.totalProducts}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow border">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <span className="text-2xl">📦</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Items</p>
                    <p className="text-2xl font-bold text-gray-900">{overview.totalItems}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow border">
                <div className="flex items-center">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <span className="text-2xl">⚠️</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Out of Stock</p>
                    <p className="text-2xl font-bold text-red-600">{overview.outOfStock}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow border">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <span className="text-2xl">🔔</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Low Stock</p>
                    <p className="text-2xl font-bold text-orange-600">{overview.lowStock}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Products List */}
            <div className="bg-white rounded-lg shadow border p-6">
              <h2 className="text-xl font-semibold mb-4">All Products</h2>
              {products.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">📭</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Products Found</h3>
                  <p className="text-gray-500 mb-4">Add some products to see them here</p>
                  <button
                    onClick={() => window.location.href = '/admin/dashboard'}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Go to Dashboard
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {products.map((product) => (
                        <tr key={product._id || product.productId}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{product.productId}</div>
                            <div className="text-sm text-gray-500">{product.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium">{product.stock || 0} units</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              (product.stock || 0) === 0 ? 'bg-red-100 text-red-800' :
                              (product.stock || 0) <= (product.lowStockAlert || 5) ? 'bg-orange-100 text-orange-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {(product.stock || 0) === 0 ? 'Out of Stock' :
                               (product.stock || 0) <= (product.lowStockAlert || 5) ? 'Low Stock' :
                               'In Stock'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => setSelectedProduct(product)}
                              className="text-blue-600 hover:text-blue-900 mr-3"
                            >
                              Update
                            </button>
                            <button
                              onClick={() => quickStockUpdate(product.productId, 'add', 1)}
                              className="text-green-600 hover:text-green-900 mr-2"
                            >
                              +1
                            </button>
                            <button
                              onClick={() => quickStockUpdate(product.productId, 'subtract', 1)}
                              className="text-red-600 hover:text-red-900"
                            >
                              -1
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="bg-white rounded-lg shadow border">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">All Products ({products.length})</h2>
            </div>
            {products.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📭</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Products Found</h3>
                <p className="text-gray-500">Add products to manage inventory</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {products.map((product) => (
                      <tr key={product._id || product.productId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {product.productId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {product.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                          {product.category}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            (product.stock || 0) === 0 ? 'bg-red-100 text-red-800' :
                            (product.stock || 0) <= (product.lowStockAlert || 5) ? 'bg-orange-100 text-orange-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {product.stock || 0} units
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹{product.costPrice || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹{product.sellingPrice || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => setSelectedProduct(product)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            Update Stock
                          </button>
                          <div className="inline-flex gap-1">
                            <button
                              onClick={() => quickStockUpdate(product.productId, 'add', 1)}
                              className="text-green-600 hover:text-green-800 text-xs bg-green-50 px-2 py-1 rounded"
                            >
                              +1
                            </button>
                            <button
                              onClick={() => quickStockUpdate(product.productId, 'subtract', 1)}
                              className="text-red-600 hover:text-red-800 text-xs bg-red-50 px-2 py-1 rounded"
                            >
                              -1
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Alerts Tab */}
        {activeTab === 'alerts' && (
          <div className="space-y-6">
            {/* Critical Alerts */}
            {lowStockAlerts.critical.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-red-800 mb-4 flex items-center">
                  <span className="text-2xl mr-2">🚨</span>
                  Critical Stock Alerts ({lowStockAlerts.critical.length})
                </h2>
                <div className="space-y-3">
                  {lowStockAlerts.critical.map(product => (
                    <div key={product._id || product.productId} className="flex justify-between items-center p-3 bg-white rounded border">
                      <div>
                        <div className="font-medium text-red-700">{product.productId} - {product.name}</div>
                        <div className="text-sm text-red-600">Out of Stock - 0 units remaining</div>
                      </div>
                      <button
                        onClick={() => setSelectedProduct(product)}
                        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                      >
                        Restock
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warning Alerts */}
            {lowStockAlerts.warnings.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-orange-800 mb-4 flex items-center">
                  <span className="text-2xl mr-2">⚠️</span>
                  Low Stock Warnings ({lowStockAlerts.warnings.length})
                </h2>
                <div className="space-y-3">
                  {lowStockAlerts.warnings.map(product => (
                    <div key={product._id || product.productId} className="flex justify-between items-center p-3 bg-white rounded border">
                      <div>
                        <div className="font-medium text-orange-700">{product.productId} - {product.name}</div>
                        <div className="text-sm text-orange-600">
                          Low Stock - {product.stock} units remaining (Alert at: {product.lowStockAlert || 5})
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedProduct(product)}
                        className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700"
                      >
                        Add Stock
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {lowStockAlerts.critical.length === 0 && lowStockAlerts.warnings.length === 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-12 text-center">
                <div className="text-6xl mb-4">✅</div>
                <h3 className="text-xl font-semibold text-green-800 mb-2">All Good!</h3>
                <p className="text-green-600">No stock alerts at the moment.</p>
              </div>
            )}
          </div>
        )}

        {/* Stock Update Modal */}
        {selectedProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">
                Update Stock - {selectedProduct.name}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Operation
                  </label>
                  <select
                    value={stockUpdate.operation}
                    onChange={(e) => setStockUpdate({...stockUpdate, operation: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="add">Add Stock</option>
                    <option value="subtract">Subtract Stock</option>
                    <option value="set">Set Exact Quantity</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity
                  </label>
                  <input
                    type="number"
                    value={stockUpdate.quantity}
                    onChange={(e) => setStockUpdate({...stockUpdate, quantity: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Stock: {selectedProduct.stock || 0} units
                  </label>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Stock: {
                      stockUpdate.operation === 'add' ? (selectedProduct.stock || 0) + stockUpdate.quantity :
                      stockUpdate.operation === 'subtract' ? Math.max(0, (selectedProduct.stock || 0) - stockUpdate.quantity) :
                      stockUpdate.quantity
                    } units
                  </label>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => updateStock(selectedProduct.productId)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Update Stock
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}