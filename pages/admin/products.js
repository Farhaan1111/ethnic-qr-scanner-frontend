import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useRouter } from 'next/router';

export default function ProductManagement() {
  const [products, setProducts] = useState([]);
  const [fabrics, setFabrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [formData, setFormData] = useState(getInitialFormData());
  const [filters, setFilters] = useState({
    category: 'all',
    status: 'all',
    search: ''
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0
  });
  const router = useRouter();

  // FAROOQUI Product Categories
  const farooquiCategories = [
    'Sherwani: Farma',
    'Sherwani: Velvet',
    'Sherwani: Georgette',
    'Sherwani: Diverse Fabric',
    'Open Indo: Georgette',
    'Open Indo: Diverse Fabric',
    'Semi Indo: Diverse Fabric',
    'Indo Western: Diverse Fabric',
    'Jodhpuri',
    'Kurta Jacket',
    'Kurta: Chicken',
    'Kurta: Pintex',
    'Suits: Party Wear',
    'Suits: Tuxedo'
  ];

  function getInitialFormData() {
    return {
      productId: '',
      name: '',
      description: '',
      category: 'Sherwani: Farma',
      images: [''],
      sellingPrice: '',
      compareAtPrice: '',
      costPrice: '',
      supplier: {
        name: '',
        contact: '',
        email: '',
        leadTime: 7
      },
      stock: 0,
      lowStockAlert: 5,
      reorderPoint: 10,
      fabricUsed: [],
      work: '',
      color: '',
      size: ['Free Size'],
      sizeStock: [],
      isActive: true,
      imageEmbeddings: []
    };
  }

  useEffect(() => {
    checkAuth();
    fetchProducts();
    fetchFabrics();
  }, [filters, pagination.currentPage]);

  const checkAuth = async () => {
    const token = localStorage.getItem('ownerToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('ownerToken');

      const queryParams = new URLSearchParams({
        ...filters,
        page: pagination.currentPage,
        limit: 20
      }).toString();

      const response = await api.get(`/api/products/admin/all?${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setProducts(response.data.products);
      setPagination({
        currentPage: response.data.currentPage,
        totalPages: response.data.totalPages,
        total: response.data.total
      });
    } catch (error) {
      console.error('Error fetching products:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('ownerToken');
        router.push('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchFabrics = async () => {
    try {
      const token = localStorage.getItem('ownerToken');
      const response = await api.get('/api/fabrics', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFabrics(response.data.fabrics || []);
    } catch (error) {
      console.error('Error fetching fabrics:', error);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('ownerToken');
      await api.post('/api/products', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert('Product added successfully!');
      setShowAddModal(false);
      setFormData(getInitialFormData());
      fetchProducts();
    } catch (error) {
      console.error('Error adding product:', error);
      alert(error.response?.data?.error || 'Error adding product');
    }
  };

  const handleEditProduct = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('ownerToken');
      await api.put(`/api/products/${selectedProduct.productId}`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert('Product updated successfully!');
      setShowEditModal(false);
      setSelectedProduct(null);
      setFormData(getInitialFormData());
      fetchProducts();
    } catch (error) {
      console.error('Error updating product:', error);
      alert(error.response?.data?.error || 'Error updating product');
    }
  };

  const handleDeleteProduct = async () => {
    try {
      const token = localStorage.getItem('ownerToken');
      await api.delete(`/api/products/${selectedProduct.productId}/hard`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert('Product permanently deleted (product, QR codes, and image search data removed).');
      setShowDeleteModal(false);
      setSelectedProduct(null);
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert(error.response?.data?.error || 'Error deleting product');
    }
  };

  const openAddModal = () => {
    setFormData(getInitialFormData());
    setShowAddModal(true);
  };

  const openEditModal = (product) => {
    setSelectedProduct(product);
    setFormData({
      ...product,
      supplier: typeof product.supplier === 'string'
        ? { name: product.supplier, contact: product.supplierContact || '' }
        : product.supplier,
      fabricUsed: product.fabricUsed || [],
      sizeStock: product.sizeStock || [],
      imageEmbeddings: product.imageEmbeddings || []
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (product) => {
    setSelectedProduct(product);
    setShowDeleteModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSizeStockChange = (index, value) => {
    const qty = Number(value) || 0;

    setFormData(prev => {
      const sizes = prev.size || [];
      const sizeLabel = sizes[index];
      if (!sizeLabel) return prev;

      // Clone existing sizeStock
      const currentSizeStock = Array.isArray(prev.sizeStock) ? [...prev.sizeStock] : [];
      const existingIndex = currentSizeStock.findIndex(s => s.size === sizeLabel);

      if (existingIndex >= 0) {
        currentSizeStock[existingIndex] = {
          ...currentSizeStock[existingIndex],
          stock: qty
        };
      } else {
        currentSizeStock.push({ size: sizeLabel, stock: qty });
      }

      // Recalculate total stock as sum of per-size stock
      const totalStock = currentSizeStock.reduce(
        (sum, s) => sum + (Number(s.stock) || 0),
        0
      );

      return {
        ...prev,
        sizeStock: currentSizeStock,
        stock: totalStock
      };
    });
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

  const handleArrayChange = (field, index, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const addArrayField = (field) => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const removeArrayField = (field, index) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const handleAddImageUrl = (url, embeddingPayload = null) => {
    setFormData(prev => {
      const updated = {
        ...prev,
        images: [...(prev.images || []), url]
      };

      // If we got an embedding from the upload API, store it
      if (
        embeddingPayload &&
        embeddingPayload.vector &&
        embeddingPayload.imagePath
      ) {
        const currentEmbeddings = Array.isArray(prev.imageEmbeddings)
          ? prev.imageEmbeddings
          : [];

        updated.imageEmbeddings = [
          ...currentEmbeddings,
          {
            imagePath: embeddingPayload.imagePath,
            vector: embeddingPayload.vector,
            model: embeddingPayload.model || 'clip-vit-b32'
          }
        ];
      }

      return updated;
    });
  };

  // Fabric Management Functions
  const addFabricToProduct = (fabricId, metersUsed) => {
    const fabric = fabrics.find(f => f.fabricId === fabricId);
    if (fabric && metersUsed > 0) {
      setFormData(prev => ({
        ...prev,
        fabricUsed: [...prev.fabricUsed, {
          fabricId: fabric.fabricId,
          fabricName: fabric.name,
          metersUsed: parseFloat(metersUsed),
          costPerMeter: fabric.costPerMeter,
          totalCost: parseFloat(metersUsed) * fabric.costPerMeter
        }]
      }));
    }
  };

  const removeFabricFromProduct = (index) => {
    setFormData(prev => ({
      ...prev,
      fabricUsed: prev.fabricUsed.filter((_, i) => i !== index)
    }));
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  // Add these functions in your ProductManagement component:

const handleAddVariant = (product) => {
  setFormData(prev => ({
    ...prev,
    variants: [...(prev.variants || []), {
      productId: product.productId,
      color: product.color,
      name: product.name,
      images: product.images || []
    }],
    variantColors: [...(prev.variantColors || []), {
      color: product.color,
      productId: product.productId
    }]
  }));
};

const handleRemoveVariant = (index) => {
  setFormData(prev => ({
    ...prev,
    variants: prev.variants.filter((_, i) => i !== index),
    variantColors: prev.variantColors.filter((_, i) => i !== index)
  }));
};

  if (loading && products.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">🛍️ FAROOQUI Product Management</h1>
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
        {/* Filters and Actions */}
        <div className="bg-white rounded-lg shadow border p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              {/* Search */}
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Category Filter */}
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                {farooquiCategories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="in_stock">In Stock</option>
                <option value="low_stock">Low Stock</option>
                <option value="out_of_stock">Out of Stock</option>
              </select>
            </div>

            <button
              onClick={openAddModal}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-semibold whitespace-nowrap"
            >
              + Add New Product
            </button>
          </div>
        </div>

        {/* Products Grid */}
        <div className="bg-white rounded-lg shadow border">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">
              Products ({pagination.total})
            </h2>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Products Found</h3>
              <p className="text-gray-500 mb-4">Get started by adding your first product</p>
              <button
                onClick={openAddModal}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Add Your First Product
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sizes</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {products.map((product) => (
                      <tr key={product._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            {product.images && product.images.length > 0 && (
                              <img
                                src={product.images[0]}
                                alt={product.name}
                                className="h-10 w-10 rounded object-cover mr-3"
                              />
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {product.productId}
                              </div>
                              <div className="text-sm text-gray-500 truncate max-w-xs">
                                {product.name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {product.category}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${product.stock === 0 ? 'bg-red-100 text-red-800' :
                            product.stock <= product.lowStockAlert ? 'bg-orange-100 text-orange-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                            {product.stock} units
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {product.size && product.size.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {product.size.map((sz) => {
                                // Find matching entry in sizeStock for this size label
                                const sizeEntry = (product.sizeStock || []).find(s => s.size === sz);
                                const count = sizeEntry?.stock || 0;

                                return (
                                  <span
                                    key={sz}
                                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                                  >
                                    {sz}: {count}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">No sizes</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹{product.sellingPrice}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full capitalize ${product.status === 'out_of_stock' ? 'bg-red-100 text-red-800' :
                            product.status === 'low_stock' ? 'bg-orange-100 text-orange-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                            {product.status?.replace('_', ' ') || 'in_stock'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex gap-2">
                            <button
                              onClick={() => openEditModal(product)}
                              className="text-blue-600 hover:text-blue-900 bg-blue-50 px-3 py-1 rounded text-xs"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => router.push(`/p/${product.productId}`)}
                              className="text-green-600 hover:text-green-900 bg-green-50 px-3 py-1 rounded text-xs"
                            >
                              View
                            </button>
                            <button
                              onClick={() => openDeleteModal(product)}
                              className="text-red-600 hover:text-red-900 bg-red-50 px-3 py-1 rounded text-xs"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t flex justify-between items-center">
                  <div className="text-sm text-gray-700">
                    Showing page {pagination.currentPage} of {pagination.totalPages}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                      disabled={pagination.currentPage === 1}
                      className="px-3 py-1 border rounded disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                      disabled={pagination.currentPage === pagination.totalPages}
                      className="px-3 py-1 border rounded disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Add Product Modal */}
      {showAddModal && (
        <ProductFormModal
          title="Add New Product"
          formData={formData}
          fabrics={fabrics}
          categories={farooquiCategories}
          onInputChange={handleInputChange}
          onSupplierChange={handleSupplierChange}
          onArrayChange={handleArrayChange}
          onAddArrayField={addArrayField}
          onRemoveArrayField={removeArrayField}
          onAddFabric={addFabricToProduct}
          onRemoveFabric={removeFabricFromProduct}
          onAddImageUrl={handleAddImageUrl}
          onAddVariant={handleAddVariant}        // ADD THIS
          onRemoveVariant={handleRemoveVariant}  // ADD THIS
          onSizeStockChange={handleSizeStockChange}
          onSubmit={handleAddProduct}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* Edit Product Modal */}
      {showEditModal && (
        <ProductFormModal
          title="Edit Product"
          formData={formData}
          fabrics={fabrics}
          categories={farooquiCategories}
          onInputChange={handleInputChange}
          onSupplierChange={handleSupplierChange}
          onArrayChange={handleArrayChange}
          onAddArrayField={addArrayField}
          onRemoveArrayField={removeArrayField}
          onAddFabric={addFabricToProduct}
          onRemoveFabric={removeFabricFromProduct}
          onSizeStockChange={handleSizeStockChange}
          onAddImageUrl={handleAddImageUrl}
          onAddVariant={handleAddVariant}        // ADD THIS
          onRemoveVariant={handleRemoveVariant}  // ADD THIS
          onSubmit={handleEditProduct}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Confirm Delete</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>{selectedProduct.name}</strong>?
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProduct}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Product Form Modal Component
function ProductFormModal({
  title,
  formData,
  fabrics,
  categories,
  onInputChange,
  onSupplierChange,
  onArrayChange,
  onAddArrayField,
  onRemoveArrayField,
  onAddFabric,
  onRemoveFabric,
  onSizeStockChange,
  onAddImageUrl,
  onAddVariant,      // NEW: Add this prop
  onRemoveVariant,   // NEW: Add this prop
  onSubmit,
  onClose
}) {
  const [selectedFabric, setSelectedFabric] = useState('');
  const [fabricMeters, setFabricMeters] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [variantSearch, setVariantSearch] = useState('');
  const [variantSearchResults, setVariantSearchResults] = useState([]);

  const handleAddFabricClick = () => {
    console.log('handleAddFabricClick called');
    console.log('Selected fabric:', selectedFabric);
    console.log('Fabric meters:', fabricMeters);

    if (!selectedFabric) {
      alert('Please select a fabric');
      return;
    }

    if (!fabricMeters || parseFloat(fabricMeters) <= 0) {
      alert('Please enter a valid number of meters (greater than 0)');
      return;
    }

    const fabric = fabrics.find(f => f.fabricId === selectedFabric);
    console.log('Found fabric:', fabric);

    if (!fabric) {
      alert('Selected fabric not found');
      return;
    }

    if (fabric.currentStock < parseFloat(fabricMeters)) {
      alert(`Not enough fabric stock! Available: ${fabric.currentStock}m, Requested: ${fabricMeters}m`);
      return;
    }

    // Check if fabric is already added
    const alreadyAdded = formData.fabricUsed.find(f => f.fabricId === selectedFabric);
    if (alreadyAdded) {
      alert('This fabric is already added to the product');
      return;
    }

    const fabricData = {
      fabricId: fabric.fabricId,
      fabricName: fabric.name,
      metersUsed: parseFloat(fabricMeters),
      costPerMeter: fabric.costPerMeter,
      totalCost: parseFloat(fabricMeters) * fabric.costPerMeter
    };

    console.log('Adding fabric:', fabricData);

    onAddFabric(selectedFabric, fabricMeters);
    setSelectedFabric('');
    setFabricMeters('');

    alert(`Fabric "${fabric.name}" added successfully!`);
  };

  const getSizeStockFor = (sizeLabel) => {
    const entry = (formData.sizeStock || []).find(s => s.size === sizeLabel);
    // Show empty string instead of 0 for cleaner UX if not set
    return entry ? entry.stock : '';
  };


// Add this function inside ProductFormModal
const searchVariantProducts = async () => {
  if (!variantSearch.trim()) {
    alert('Please enter search term');
    return;
  }
  
  try {
    const token = localStorage.getItem('ownerToken');
    const response = await api.get(`/api/products/search/for-variants?q=${variantSearch}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    // Filter out current product and already added variants
    const currentProductId = formData.productId;
    const existingVariantIds = formData.variants?.map(v => v.productId) || [];
    
    const filteredResults = response.data.filter(product => 
      product.productId !== currentProductId && 
      !existingVariantIds.includes(product.productId)
    );
    
    setVariantSearchResults(filteredResults);
  } catch (error) {
    console.error('Error searching variants:', error);
    alert('Error searching products');
  }
};

// Add function to add product as variant
const addProductAsVariant = (product) => {
    if (!product.color) {
      alert('Selected product must have a color field');
      return;
    }
    
    // Call the parent's function to update formData
    onAddVariant(product);
    
    // Clear search
    setVariantSearchResults([]);
    setVariantSearch('');
  };

// Add function to remove variant
const removeVariant = (index) => {
    onRemoveVariant(index);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const token = localStorage.getItem('ownerToken');
      const data = new FormData();
      data.append('image', file);

      const res = await api.post('/api/upload/product-image', data, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      // Expecting backend to return: { url, path, embedding }
      const { url, path, embedding } = res.data;
      console.log('Upload response:', res.data);

      onAddImageUrl(
        url,
        embedding
          ? {
            imagePath: path,            // /uploads/products/...
            vector: embedding.vector,   // [float, float, ...]
            model: embedding.model      // e.g. 'clip-vit-base-patch32'
          }
          : null
      );

      alert('Image uploaded and added to product successfully!');
    } catch (err) {
      console.error('Error uploading image:', err);
      alert(err.response?.data?.error || 'Error uploading image');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };



  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product ID *
              </label>
              <input
                type="text"
                name="productId"
                value={formData.productId}
                onChange={onInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={onInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={onInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
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
                onChange={onInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Fabric Usage */}
          <div>
            <h4 className="text-lg font-medium mb-4">Fabric Usage</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Fabric
                </label>
                <select
                  value={selectedFabric}
                  onChange={(e) => setSelectedFabric(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Choose a fabric</option>
                  {fabrics.map(fabric => (
                    <option key={fabric.fabricId} value={fabric.fabricId}>
                      {fabric.name} ({fabric.fabricId}) - {fabric.currentStock}m left
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meters Used
                </label>
                <input
                  type="number"
                  value={fabricMeters}
                  onChange={(e) => setFabricMeters(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.0"
                  step="0.1"
                  min="0.1"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleAddFabricClick}
                  className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700"
                >
                  Add Fabric
                </button>
              </div>
            </div>

            {/* Added Fabrics List */}
            {formData.fabricUsed.length > 0 && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Added Fabrics:
                </label>
                {formData.fabricUsed.map((fabric, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded border">
                    <div>
                      <span className="font-medium">{fabric.fabricName}</span>
                      <span className="text-sm text-gray-600 ml-2">({fabric.fabricId})</span>
                      <div className="text-sm text-gray-500">
                        {fabric.metersUsed}m • ₹{fabric.totalCost}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveFabric(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cost Price *
              </label>
              <input
                type="number"
                name="costPrice"
                value={formData.costPrice}
                onChange={onInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selling Price *
              </label>
              <input
                type="number"
                name="sellingPrice"
                value={formData.sellingPrice}
                onChange={onInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Compare Price
              </label>
              <input
                type="number"
                name="compareAtPrice"
                value={formData.compareAtPrice}
                onChange={onInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Inventory */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stock Quantity *
              </label>
              <input
                type="number"
                name="stock"
                value={formData.stock}
                onChange={onInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Low Stock Alert
              </label>
              <input
                type="number"
                name="lowStockAlert"
                value={formData.lowStockAlert}
                onChange={onInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reorder Point
              </label>
              <input
                type="number"
                name="reorderPoint"
                value={formData.reorderPoint}
                onChange={onInputChange}
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
                  onChange={onSupplierChange}
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
                  onChange={onSupplierChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.supplier.email}
                  onChange={onSupplierChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lead Time (days)
                </label>
                <input
                  type="number"
                  name="leadTime"
                  value={formData.supplier.leadTime}
                  onChange={onSupplierChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Additional Details */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Work/Embroidery
            </label>
            <input
              type="text"
              name="work"
              value={formData.work}
              onChange={onInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Sizes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Available Sizes & Initial Stock
            </label>
            <div className="space-y-2">
              {formData.size.map((size, index) => (
                <div key={index} className="flex gap-2 items-center">
                  {/* Size label */}
                  <input
                    type="text"
                    value={size}
                    onChange={(e) => onArrayChange('size', index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Size (e.g., 38, 40, 42, Free Size)"
                  />

                  {/* Size-wise stock input */}
                  <input
                    type="number"
                    min="0"
                    value={getSizeStockFor(size)}
                    onChange={(e) => onSizeStockChange(index, e.target.value)}
                    className="w-28 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Stock"
                  />

                  {formData.size.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onRemoveArrayField('size', index)}
                      className="px-3 py-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => onAddArrayField('size')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                + Add Size
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Total stock field will be auto-calculated from these size-wise stocks.
            </p>
          </div>

          {/* Images */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Images
            </label>

            {/* Upload from computer */}
            <div className="flex items-center gap-3 mb-3">
              <label className="inline-flex items-center px-4 py-2 rounded-md bg-gray-900 text-white text-sm font-medium cursor-pointer hover:bg-black">
                Upload from computer
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
              {uploadingImage && (
                <span className="text-xs text-gray-500">Uploading image…</span>
              )}
            </div>

            {/* Existing images as URLs (you can still edit manually) */}
            <div className="space-y-2">
              {formData.images.map((image, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <input
                    type="url"
                    value={image}
                    onChange={(e) => onArrayChange('images', index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://example.com/image.jpg"
                  />
                  {formData.images.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onRemoveArrayField('images', index)}
                      className="px-3 py-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200 text-xs"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => onAddArrayField('images')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
              >
                + Add Image URL Manually
              </button>
            </div>

            <p className="mt-1 text-xs text-gray-500">
              You can upload images from your system or paste direct URLs if already hosted.
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={onInputChange}
              rows="4"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          {/* Variants Management */}
          <div className="border-t pt-6">
            <h4 className="text-lg font-medium mb-4">Color Variants</h4>

            {/* Search and add existing products as variants */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add Existing Product as Variant
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search product ID or name..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                  onChange={(e) => setVariantSearch(e.target.value)}
                />
                <button
                  type="button"
                  onClick={searchVariantProducts}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Search
                </button>
              </div>

              {/* Search Results */}
              {variantSearchResults.length > 0 && (
                <div className="mt-3 space-y-2">
                  {variantSearchResults.map((prod) => (
                    <div key={prod.productId} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <span className="font-medium">{prod.productId}</span>
                        <span className="text-gray-600 ml-2">{prod.name}</span>
                        <span className="ml-2 text-sm text-gray-500">({prod.color})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => addProductAsVariant(prod)}
                        className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm"
                      >
                        Add as Variant
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Current Variants List */}
            {formData.variants && formData.variants.length > 0 && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Current Variants:
                </label>
                {formData.variants.map((variant, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                    <div className="flex items-center gap-3">
                      {variant.images && variant.images[0] && (
                        <img src={variant.images[0]} alt={variant.name} className="w-12 h-12 rounded object-cover" />
                      )}
                      <div>
                        <div className="font-medium">{variant.name}</div>
                        <div className="text-sm text-gray-600">
                          {variant.color} • {variant.productId}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeVariant(index)}
                      className="px-3 py-1 bg-red-100 text-red-800 rounded text-sm hover:bg-red-200"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {title.includes('Add') ? 'Add Product' : 'Update Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
