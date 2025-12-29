import { useState, useEffect } from 'react';
import api from '@/utils/api';
import { useRouter } from 'next/router';

export default function FabricManagement() {
    const [fabrics, setFabrics] = useState([]);
    const [overview, setOverview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showStockModal, setShowStockModal] = useState(false);
    const [selectedFabric, setSelectedFabric] = useState(null);
    const [formData, setFormData] = useState(getInitialFormData());
    const [stockUpdate, setStockUpdate] = useState({ operation: 'add', quantity: 1 });
    const [filters, setFilters] = useState({
        type: 'all',
        status: 'all',
        search: ''
    });
    const router = useRouter();

    const fabricTypes = [
        'silk', 'cotton', 'linen', 'wool', 'synthetic',
        'velvet', 'georgette', 'chiffon', 'organza', 'net',
        'brocade', 'banarasi', 'kanjivaram', 'tussar', 'mulmul'
    ];

    const patterns = ['plain', 'printed', 'embroidered', 'woven', 'dyed', 'checkered'];

    function getInitialFormData() {
        return {
            fabricId: '',
            name: '',
            type: 'silk',
            description: '',
            color: '',
            width: 45,
            weight: 100,
            pattern: 'plain',
            currentStock: 0,
            lowStockAlert: 10,
            reorderPoint: 20,
            costPerMeter: 0,
            supplier: {
                name: '',
                contact: '',
                email: '',
                leadTime: 7
            }
        };
    }

    useEffect(() => {
        checkAuth();
        fetchFabrics();
        fetchOverview();
    }, [filters]);

    const checkAuth = async () => {
        const token = localStorage.getItem('ownerToken');
        if (!token) {
            router.push('/admin/login');
            return;
        }
    };

    const fetchFabrics = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('ownerToken');

            const queryParams = new URLSearchParams(filters).toString();
            const response = await api.get(`/api/fabrics?${queryParams}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setFabrics(response.data.fabrics);
        } catch (error) {
            console.error('Error fetching fabrics:', error);
            if (error.response?.status === 401) {
                localStorage.removeItem('ownerToken');
                router.push('/admin/login');
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchOverview = async () => {
        try {
            const token = localStorage.getItem('ownerToken');
            const response = await api.get('/api/fabrics/inventory/overview', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setOverview(response.data);
        } catch (error) {
            console.error('Error fetching fabric overview:', error);
        }
    };

    const handleAddFabric = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('ownerToken');
            await api.post('/api/fabrics', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            alert('Fabric added successfully!');
            setShowAddModal(false);
            setFormData(getInitialFormData());
            fetchFabrics();
            fetchOverview();
        } catch (error) {
            console.error('Error adding fabric:', error);
            alert(error.response?.data?.error || 'Error adding fabric');
        }
    };

    const handleUpdateStock = async () => {
        try {
            const token = localStorage.getItem('ownerToken');
            await api.patch(`/api/fabrics/${selectedFabric.fabricId}/stock`, stockUpdate, {
                headers: { Authorization: `Bearer ${token}` }
            });

            alert('Stock updated successfully!');
            setShowStockModal(false);
            setSelectedFabric(null);
            setStockUpdate({ operation: 'add', quantity: 1 });
            fetchFabrics();
            fetchOverview();
        } catch (error) {
            console.error('Error updating stock:', error);
            alert(error.response?.data?.error || 'Error updating stock');
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const openAddModal = () => {
        setFormData(getInitialFormData());
        setShowAddModal(true);
    };

    const openStockModal = (fabric) => {
        setSelectedFabric(fabric);
        setShowStockModal(true);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSupplierChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            supplier: {
                ...prev.supplier,
                [name]: value
            }
        }));
    };

    if (loading && fabrics.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading fabrics...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex justify-between items-center">
                        <h1 className="text-2xl font-bold text-gray-900">🧵 Fabric Inventory</h1>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => router.push('/admin/dashboard')}
                                className="text-sm text-gray-600 hover:text-gray-800"
                            >
                                ← Back to Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Overview Stats */}
                {overview && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                        <div className="bg-white p-6 rounded-lg shadow border">
                            <div className="flex items-center">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <span className="text-2xl">🧵</span>
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">Total Fabrics</p>
                                    <p className="text-2xl font-bold text-gray-900">{overview.totalFabrics}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow border">
                            <div className="flex items-center">
                                <div className="p-2 bg-green-100 rounded-lg">
                                    <span className="text-2xl">📏</span>
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">Total Meters</p>
                                    <p className="text-2xl font-bold text-gray-900">{overview.totalMeters}m</p>
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
                )}

                {/* Filters and Actions */}
                <div className="bg-white rounded-lg shadow border p-6 mb-6">
                    <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
                        <div className="flex flex-col sm:flex-row gap-4 flex-1">
                            <input
                                type="text"
                                placeholder="Search fabrics..."
                                value={filters.search}
                                onChange={(e) => handleFilterChange('search', e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />

                            <select
                                value={filters.type}
                                onChange={(e) => handleFilterChange('type', e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">All Types</option>
                                {fabricTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>

                            <select
                                value={filters.status}
                                onChange={(e) => handleFilterChange('status', e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">All Status</option>
                                <option value="available">Available</option>
                                <option value="low_stock">Low Stock</option>
                                <option value="out_of_stock">Out of Stock</option>
                            </select>
                        </div>

                        <button
                            onClick={openAddModal}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-semibold whitespace-nowrap"
                        >
                            + Add New Fabric
                        </button>
                    </div>
                </div>

                {/* Fabrics Grid */}
                <div className="bg-white rounded-lg shadow border">
                    <div className="p-6 border-b">
                        <h2 className="text-xl font-semibold">
                            Fabric Inventory ({fabrics.length})
                        </h2>
                    </div>

                    {fabrics.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">🧵</div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No Fabrics Found</h3>
                            <p className="text-gray-500 mb-4">Start by adding your first fabric inventory</p>
                            <button
                                onClick={openAddModal}
                                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                            >
                                Add Your First Fabric
                            </button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead>
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fabric</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost/Meter</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Value</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {fabrics.map((fabric) => (
                                        <tr key={fabric._id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {fabric.fabricId}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {fabric.name} {fabric.color && `- ${fabric.color}`}
                                                    </div>
                                                    <div className="text-xs text-gray-400">
                                                        {fabric.width}" width, {fabric.weight} GSM
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                                                {fabric.type}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${fabric.currentStock === 0 ? 'bg-red-100 text-red-800' :
                                                        fabric.currentStock <= fabric.lowStockAlert ? 'bg-orange-100 text-orange-800' :
                                                            'bg-green-100 text-green-800'
                                                    }`}>
                                                    {fabric.currentStock}m
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                ₹{fabric.costPerMeter}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                ₹{(fabric.currentStock * fabric.costPerMeter).toFixed(2)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full capitalize ${fabric.status === 'out_of_stock' ? 'bg-red-100 text-red-800' :
                                                        fabric.status === 'low_stock' ? 'bg-orange-100 text-orange-800' :
                                                            'bg-green-100 text-green-800'
                                                    }`}>
                                                    {fabric.status?.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => openStockModal(fabric)}
                                                        className="text-blue-600 hover:text-blue-900 bg-blue-50 px-3 py-1 rounded text-xs"
                                                    >
                                                        Update Stock
                                                    </button>
                                                    <button
                                                        onClick={() => router.push(`/admin/fabrics/${fabric.fabricId}`)}
                                                        className="text-green-600 hover:text-green-900 bg-green-50 px-3 py-1 rounded text-xs"
                                                    >
                                                        Details
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
            </main>

            {/* Add Fabric Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
                    <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-semibold">Add New Fabric</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-gray-700">
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleAddFabric} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Fabric ID *
                                    </label>
                                    <input
                                        type="text"
                                        name="fabricId"
                                        value={formData.fabricId}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Fabric Name *
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Type *
                                    </label>
                                    <select
                                        name="type"
                                        value={formData.type}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    >
                                        {fabricTypes.map(type => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Color
                                    </label>
                                    <input
                                        type="text"
                                        name="color"
                                        value={formData.color}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Width (inches) *
                                    </label>
                                    <input
                                        type="number"
                                        name="width"
                                        value={formData.width}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Weight (GSM) *
                                    </label>
                                    <input
                                        type="number"
                                        name="weight"
                                        value={formData.weight}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Pattern
                                    </label>
                                    <select
                                        name="pattern"
                                        value={formData.pattern}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {patterns.map(pattern => (
                                            <option key={pattern} value={pattern}>{pattern}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Cost per Meter (₹) *
                                    </label>
                                    <input
                                        type="number"
                                        name="costPerMeter"
                                        value={formData.costPerMeter}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Current Stock (meters) *
                                    </label>
                                    <input
                                        type="number"
                                        name="currentStock"
                                        value={formData.currentStock}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Low Stock Alert (meters)
                                    </label>
                                    <input
                                        type="number"
                                        name="lowStockAlert"
                                        value={formData.lowStockAlert}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            {/* Supplier Information */}
                            <div>
                                <h4 className="text-lg font-medium mb-4">Supplier Information</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Supplier Name
                                        </label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.supplier.name}
                                            onChange={handleSupplierChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Contact
                                        </label>
                                        <input
                                            type="text"
                                            name="contact"
                                            value={formData.supplier.contact}
                                            onChange={handleSupplierChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Description
                                </label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    rows="3"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div className="flex gap-3 pt-6 border-t">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                >
                                    Add Fabric
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Stock Update Modal */}
            {showStockModal && selectedFabric && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4">
                            Update Stock - {selectedFabric.name}
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Operation
                                </label>
                                <select
                                    value={stockUpdate.operation}
                                    onChange={(e) => setStockUpdate({ ...stockUpdate, operation: e.target.value })}
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
                                    onChange={(e) => setStockUpdate({ ...stockUpdate, quantity: parseFloat(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    min="0.1"
                                    step="0.1"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Current Stock: {selectedFabric.currentStock} meters
                                </label>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    New Stock: {
                                        stockUpdate.operation === 'add' ? (selectedFabric.currentStock + stockUpdate.quantity).toFixed(1) :
                                            stockUpdate.operation === 'subtract' ? Math.max(0, selectedFabric.currentStock - stockUpdate.quantity).toFixed(1) :
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
