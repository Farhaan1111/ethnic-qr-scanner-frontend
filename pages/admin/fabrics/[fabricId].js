import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import api from '../../utils/api';

export default function FabricDetails() {
  const router = useRouter();
  const { fabricId } = router.query;
  
  const [fabric, setFabric] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockUpdate, setStockUpdate] = useState({ operation: 'add', quantity: 1 });

  useEffect(() => {
    if (fabricId) {
      checkAuth();
      fetchFabricDetails();
      fetchTransactions();
    }
  }, [fabricId]);

  const checkAuth = async () => {
    const token = localStorage.getItem('ownerToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }
  };

  const fetchFabricDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('ownerToken');
      const response = await api.get(`/api/fabrics/${fabricId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFabric(response.data);
    } catch (error) {
      console.error('Error fetching fabric details:', error);
      if (error.response?.status === 404) {
        alert('Fabric not found');
        router.push('/admin/fabrics');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const token = localStorage.getItem('ownerToken');
      const response = await api.get(`/api/fabrics/${fabricId}/transactions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTransactions(response.data.transactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const handleUpdateStock = async () => {
    try {
      const token = localStorage.getItem('ownerToken');
      await api.patch(`/api/fabrics/${fabricId}/stock`, stockUpdate, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert('Stock updated successfully!');
      setShowStockModal(false);
      setStockUpdate({ operation: 'add', quantity: 1 });
      fetchFabricDetails();
      fetchTransactions();
    } catch (error) {
      console.error('Error updating stock:', error);
      alert(error.response?.data?.error || 'Error updating stock');
    }
  };

  const recordFabricUsage = async (productId, productName, metersUsed) => {
    try {
      const token = localStorage.getItem('ownerToken');
      await api.post(`/api/fabrics/${fabricId}/usage`, {
        productId,
        productName,
        metersUsed
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert(`Fabric usage recorded: ${metersUsed}m for ${productName}`);
      fetchFabricDetails();
      fetchTransactions();
    } catch (error) {
      console.error('Error recording fabric usage:', error);
      alert(error.response?.data?.error || 'Error recording usage');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading fabric details...</p>
        </div>
      </div>
    );
  }

  if (!fabric) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Fabric Not Found</h1>
          <p className="text-gray-600 mb-4">The fabric you're looking for doesn't exist.</p>
          <button
            onClick={() => router.push('/admin/fabrics')}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Fabrics
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <button
                onClick={() => router.push('/admin/fabrics')}
                className="text-sm text-gray-600 hover:text-gray-800 mb-2"
              >
                ← Back to Fabrics
              </button>
              <h1 className="text-2xl font-bold text-gray-900">🧵 {fabric.name}</h1>
              <p className="text-gray-600">Fabric ID: {fabric.fabricId}</p>
            </div>
            <div className="flex items-center gap-4">
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full capitalize ${
                fabric.status === 'out_of_stock' ? 'bg-red-100 text-red-800' :
                fabric.status === 'low_stock' ? 'bg-orange-100 text-orange-800' :
                'bg-green-100 text-green-800'
              }`}>
                {fabric.status?.replace('_', ' ')}
              </span>
              <button
                onClick={() => setShowStockModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
              >
                Update Stock
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {['details', 'transactions', 'usage'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Details Tab */}
        {activeTab === 'details' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Fabric Information */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow border p-6">
                <h2 className="text-xl font-semibold mb-6">Fabric Information</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Fabric ID</label>
                    <p className="text-gray-900 font-mono">{fabric.fabricId}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                    <p className="text-gray-900">{fabric.name}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                    <p className="text-gray-900 capitalize">{fabric.type}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                    <p className="text-gray-900">{fabric.color || 'Not specified'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Width</label>
                    <p className="text-gray-900">{fabric.width} inches</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Weight</label>
                    <p className="text-gray-900">{fabric.weight} GSM</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Pattern</label>
                    <p className="text-gray-900 capitalize">{fabric.pattern}</p>
                  </div>

                  {fabric.description && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                      <p className="text-gray-900">{fabric.description}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Supplier Information */}
              {fabric.supplier && fabric.supplier.name && (
                <div className="bg-white rounded-lg shadow border p-6 mt-6">
                  <h2 className="text-xl font-semibold mb-6">Supplier Information</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Supplier Name</label>
                      <p className="text-gray-900">{fabric.supplier.name}</p>
                    </div>

                    {fabric.supplier.contact && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Contact</label>
                        <p className="text-gray-900">{fabric.supplier.contact}</p>
                      </div>
                    )}

                    {fabric.supplier.email && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                        <p className="text-gray-900">{fabric.supplier.email}</p>
                      </div>
                    )}

                    {fabric.supplier.leadTime && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Lead Time</label>
                        <p className="text-gray-900">{fabric.supplier.leadTime} days</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Stock Information */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow border p-6">
                <h2 className="text-xl font-semibold mb-6">Stock Information</h2>
                
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900 mb-2">
                      {fabric.currentStock}m
                    </div>
                    <div className="text-sm text-gray-600">Current Stock</div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900">
                        ₹{fabric.costPerMeter}
                      </div>
                      <div className="text-xs text-gray-600">Cost/Meter</div>
                    </div>

                    <div className="text-center">
                      <div className="text-lg font-semibold text-green-600">
                        ₹{(fabric.currentStock * fabric.costPerMeter).toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-600">Total Value</div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Low Stock Alert</span>
                      <span className="font-medium">{fabric.lowStockAlert}m</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Reorder Point</span>
                      <span className="font-medium">{fabric.reorderPoint}m</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-lg shadow border p-6">
                <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
                
                <div className="space-y-3">
                  <button
                    onClick={() => setShowStockModal(true)}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 text-sm"
                  >
                    Update Stock
                  </button>
                  
                  <button
                    onClick={() => {
                      const productName = prompt('Enter product name:');
                      const metersUsed = parseFloat(prompt('Enter meters used:'));
                      if (productName && metersUsed) {
                        recordFabricUsage('manual', productName, metersUsed);
                      }
                    }}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 text-sm"
                  >
                    Record Usage
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div className="bg-white rounded-lg shadow border">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Transaction History</h2>
            </div>

            {transactions.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Transactions</h3>
                <p className="text-gray-500">Transaction history will appear here</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock Before</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock After</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {transactions.map((transaction) => (
                      <tr key={transaction._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(transaction.transactionDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full capitalize ${
                            transaction.type === 'purchase' ? 'bg-green-100 text-green-800' :
                            transaction.type === 'usage' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {transaction.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {transaction.quantity}m
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {transaction.previousStock}m
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {transaction.newStock}m
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹{transaction.totalValue?.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {transaction.notes}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Usage Tab */}
        {activeTab === 'usage' && (
          <div className="bg-white rounded-lg shadow border">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Fabric Usage in Products</h2>
            </div>

            {fabric.usedInProducts && fabric.usedInProducts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Meters Used</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date Used</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {fabric.usedInProducts.map((usage, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {usage.productId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {usage.productName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                          {usage.productCategory}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {usage.metersUsed}m
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(usage.usedAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {usage.productId !== 'manual' && (
                            <button
                              onClick={() => router.push(`/p/${usage.productId}`)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              View Product
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Usage Recorded</h3>
                <p className="text-gray-500 mb-4">This fabric hasn't been used in any products yet</p>
                <button
                  onClick={() => {
                    const productName = prompt('Enter product name:');
                    const metersUsed = parseFloat(prompt('Enter meters used:'));
                    if (productName && metersUsed) {
                      recordFabricUsage('manual', productName, metersUsed);
                    }
                  }}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  Record First Usage
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Stock Update Modal */}
      {showStockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              Update Stock - {fabric.name}
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
                  <option value="subtract">Use Stock</option>
                  <option value="set">Set Exact Quantity</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity (meters)
                </label>
                <input
                  type="number"
                  value={stockUpdate.quantity}
                  onChange={(e) => setStockUpdate({...stockUpdate, quantity: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  min="0.1"
                  step="0.1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Stock: {fabric.currentStock} meters
                </label>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Stock: {
                    stockUpdate.operation === 'add' ? (fabric.currentStock + stockUpdate.quantity).toFixed(1) :
                    stockUpdate.operation === 'subtract' ? Math.max(0, fabric.currentStock - stockUpdate.quantity).toFixed(1) :
                    stockUpdate.quantity.toFixed(1)
                  } meters
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowStockModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateStock}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Update Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
