import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import api from '../../utils/api';
import OwnerAuth from '../../components/OwnerAuth';

export default function ProductPage() {
  const router = useRouter();
  const { productId } = router.query;
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const imageRef = useRef(null);
  const [inventoryAction, setInventoryAction] = useState({
    addQty: 1,
    sellQty: 1,
    loading: false,
    error: '',
    message: ''
  });
  const [variantManagement, setVariantManagement] = useState({
    showAddVariant: false,
    searchQuery: '',
    searchResults: [],
    searching: false,
    addingVariant: false,
    removingVariant: false
  });
  const [showAuth, setShowAuth] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  // Inline edit state for owner
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Check authentication status on component mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Fetch product when productId is available
  useEffect(() => {
    if (productId) {
      fetchProduct(productId);
    }
  }, [productId]);

  const handleZoom = (direction) => {
    setZoomLevel(prev => {
      const newZoom = direction === 'in' ? prev + 0.2 : prev - 0.2;
      return Math.min(Math.max(newZoom, 0.5), 3);
    });
  };

  const resetZoom = () => {
    setZoomLevel(1);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetZoom();
  };

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('ownerToken');
      if (token) {
        const response = await api.post('/api/auth/verify-token', {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setIsOwner(response.data.valid);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('ownerToken');
    }
  };

  const fetchProduct = async (id) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('ownerToken');
      const config = token ? {
        headers: { Authorization: `Bearer ${token}` }
      } : {};

      // Fetch main product
      const response = await api.get(`/api/products/${id}`, config);
      const productData = response.data;

      // If product has variants, fetch their details too
      if (productData.variants && productData.variants.length > 0) {
        // Variant data is already included in the response
        // But you could fetch additional details if needed
      }

      setProduct(productData);
      setError('');
    } catch (err) {
      console.error('Error fetching product:', err);
      setError(err.response?.data?.error || 'Product not found');
    } finally {
      setLoading(false);
    }
  };

  // When product loads, set default selected size
  useEffect(() => {
    if (product && product.size && product.size.length > 0) {
      setSelectedSize(product.size[0]);
    }
  }, [product]);

  const handleStockUpdate = async (operation) => {
    if (!isOwner) {
      alert('Please login as owner to manage inventory.');
      setShowAuth(true);
      return;
    }

    if (!selectedSize) {
      alert('Please select a size.');
      return;
    }

    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      alert('Quantity must be greater than 0.');
      return;
    }

    try {
      setInventoryLoading(true);
      const token = localStorage.getItem('ownerToken');

      const payload = {
        operation,          // "add" or "subtract"
        quantity: qty,
        size: selectedSize,
        reason: operation === 'add' ? 'production' : 'sale',
        notes:
          operation === 'add'
            ? `Produced ${qty} pcs of size ${selectedSize} from QR page`
            : `Sold ${qty} pcs of size ${selectedSize} from QR page`,
      };

      const res = await api.patch(
        `/api/inventory/${product.productId}/stock`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      alert(res.data.message || 'Stock updated successfully!');
      // Refresh product details (will show updated size counts)
      fetchProduct(product.productId);
    } catch (err) {
      console.error('Error updating stock:', err);
      const msg =
        err.response?.data?.error ||
        (err.response?.data?.shortages
          ? err.response.data.shortages.join('\n')
          : 'Error updating stock');
      alert(msg);
    } finally {
      setInventoryLoading(false);
    }
  };

  const handleOwnerLogin = (success) => {
    if (success) {
      setIsOwner(true);
      setShowAuth(false);
      // Refetch product with owner access
      if (productId) {
        fetchProduct(productId);
      }
    }
  };

  const handleOwnerLogout = () => {
    localStorage.removeItem('ownerToken');
    setIsOwner(false);
    // Refetch product without owner access
    if (productId) {
      fetchProduct(productId);
    }
  };

  // Initialize the edit form from the current product
  const initEditDataFromProduct = (prod) => {
    if (!prod) return null;
    return {
      name: prod.name || '',
      description: prod.description || '',
      category: prod.category || '',
      color: prod.color || '',
      work: prod.work || '',
      sellingPrice: prod.sellingPrice ?? '',
      compareAtPrice: prod.compareAtPrice ?? '',
      costPrice: prod.costPrice ?? '',
      lowStockAlert: prod.lowStockAlert ?? 0,
      idealStock: prod.idealStock ?? 0,
      status: prod.status || 'in_stock',
    };
  };

  const startEditing = () => {
    if (!product) return;
    const token = typeof window !== 'undefined'
      ? localStorage.getItem('ownerToken')
      : null;

    if (!token) {
      // force auth modal if not logged in
      setShowAuth(true);
      return;
    }

    setEditData(initEditDataFromProduct(product));
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditData(null);
  };

  const handleEditFieldChange = (field, value) => {
    setEditData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!product || !editData) return;

    try {
      setSavingEdit(true);
      const token = typeof window !== 'undefined'
        ? localStorage.getItem('ownerToken')
        : null;

      if (!token) {
        setShowAuth(true);
        setSavingEdit(false);
        return;
      }

      // ensure numeric fields are numbers
      const payload = {
        name: editData.name,
        description: editData.description,
        category: editData.category,
        color: editData.color,
        work: editData.work,
        sellingPrice: Number(editData.sellingPrice) || 0,
        compareAtPrice: Number(editData.compareAtPrice) || 0,
        costPrice: Number(editData.costPrice) || 0,
        lowStockAlert: Number(editData.lowStockAlert) || 0,
        idealStock: Number(editData.idealStock) || 0,
        status: editData.status,
      };

      const res = await api.put(
        `/api/products/${product.productId}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert(res.data.message || 'Product updated successfully!');

      // update local product data so UI reflects changes
      setProduct((prev) => (prev ? { ...prev, ...payload } : prev));

      setIsEditing(false);
      setEditData(null);
    } catch (err) {
      console.error('Error updating product from QR page:', err);
      alert(
        err?.response?.data?.error ||
        'Error updating product. Please try again.'
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const updateStock = async (mode) => {
    try {
      const token = localStorage.getItem('ownerToken');
      if (!token) {
        setShowAuth(true);
        return;
      }

      setInventoryAction(prev => ({
        ...prev,
        loading: true,
        error: '',
        message: ''
      }));

      const quantity = mode === "add"
        ? Number(inventoryAction.addQty)
        : Number(inventoryAction.sellQty);

      const payload = {
        operation: mode === "add" ? "add" : "subtract",
        quantity,
        reason: mode === "add" ? "production" : "sale",
        notes: mode === "add"
          ? "QR page: Produced product"
          : "QR page: Sold product"
      };

      const res = await api.patch(
        `/api/inventory/${product.productId}/stock`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setInventoryAction(prev => ({
        ...prev,
        loading: false,
        message: res.data.message || "Stock updated successfully"
      }));

      fetchProduct(product.productId); // refresh

    } catch (err) {
      setInventoryAction(prev => ({
        ...prev,
        loading: false,
        error: err.response?.data?.error || "Error updating stock"
      }));
    }
  };

  // Search for products to add as variants
  const searchVariants = async () => {
    if (!variantManagement.searchQuery.trim()) return;

    try {
      setVariantManagement(prev => ({ ...prev, searching: true }));
      const token = localStorage.getItem('ownerToken');

      const response = await api.get(`/api/products/search/variants?q=${variantManagement.searchQuery}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Filter out current product and already added variants
      const currentVariants = product.variantColors?.map(v => v.productId) || [];
      const filtered = response.data.filter(p =>
        p.productId !== product.productId &&
        !currentVariants.includes(p.productId)
      );

      setVariantManagement(prev => ({
        ...prev,
        searchResults: filtered,
        searching: false
      }));
    } catch (error) {
      console.error('Error searching variants:', error);
      setVariantManagement(prev => ({ ...prev, searching: false }));
    }
  };

  // Add variant to product
  const addVariant = async (variantProduct) => {
    try {
      setVariantManagement(prev => ({ ...prev, addingVariant: true }));
      const token = localStorage.getItem('ownerToken');

      const response = await api.post(`/api/products/${product.productId}/variants`, {
        variantProductId: variantProduct.productId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert('Variant added successfully!');

      // Update product with new variant data
      setProduct(prev => ({
        ...prev,
        variantColors: response.data.variantColors || prev.variantColors
      }));

      // Clear search
      setVariantManagement(prev => ({
        ...prev,
        searchResults: [],
        searchQuery: '',
        showAddVariant: false,
        addingVariant: false
      }));
    } catch (error) {
      console.error('Error adding variant:', error);
      alert(error.response?.data?.error || 'Error adding variant');
      setVariantManagement(prev => ({ ...prev, addingVariant: false }));
    }
  };

  // Remove variant from product
  const removeVariant = async (variantProductId) => {
    if (!confirm('Are you sure you want to remove this variant?')) return;

    try {
      setVariantManagement(prev => ({ ...prev, removingVariant: true }));
      const token = localStorage.getItem('ownerToken');

      const response = await api.delete(
        `/api/products/${product.productId}/variants/${variantProductId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      alert('Variant removed successfully!');

      // Update product with removed variant
      setProduct(prev => ({
        ...prev,
        variantColors: response.data.variantColors || prev.variantColors
      }));

      setVariantManagement(prev => ({ ...prev, removingVariant: false }));
    } catch (error) {
      console.error('Error removing variant:', error);
      alert(error.response?.data?.error || 'Error removing variant');
      setVariantManagement(prev => ({ ...prev, removingVariant: false }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto"></div>
          <p className="mt-4 text-amber-200">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-amber-100 mb-2">Product Not Found</h1>
          <p className="text-amber-200/80 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-gradient-to-r from-amber-700 to-amber-600 text-white rounded-lg hover:from-amber-600 hover:to-amber-500 transition-all duration-300"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (!product) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Header - Clean without owner button */}
      <header className="border-b border-amber-900/30 bg-gradient-to-r from-black via-gray-900 to-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
          {/* Logo and tagline - Centered */}
          <div className="flex items-center justify-center sm:justify-start">
            <div className="flex items-center gap-4 md:gap-6">
              <div className="h-16 w-16 sm:h-18 sm:w-18 md:h-20 md:w-20 flex items-center justify-center">
                <img
                  src="/farooqui-logo.png"
                  alt="FAROOQUI Logo"
                  className="h-14 w-14 sm:h-16 sm:w-16 md:h-20 md:w-20 object-contain filter drop-shadow-[0_0_8px_rgba(245,158,11,0.4)] sm:drop-shadow-[0_0_10px_rgba(245,158,11,0.4)] md:drop-shadow-[0_0_12px_rgba(245,158,11,0.4)]"
                />
              </div>
              <div className="border-l border-amber-700/30 pl-4 md:pl-6">
                <div className="text-base sm:text-lg md:text-xl font-serif italic tracking-wider text-amber-200/90 font-light leading-tight">
                  Mark of true
                </div>
                <div className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold tracking-wider text-amber-300 mt-1">
                  DISTINCTION
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Owner Access Button - Positioned below header, right corner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-4">
        <div className="flex justify-end">
          <div className="flex items-center gap-3">
            {isOwner && (
              <span className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-full bg-gradient-to-r from-amber-900/20 to-black/40 text-amber-100 border border-amber-600/30 backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                Owner Access
              </span>
            )}

            {isOwner ? (
              <button
                onClick={handleOwnerLogout}
                className="text-sm text-amber-200 hover:text-amber-50 font-medium px-4 py-2 rounded-lg hover:bg-amber-900/20 transition-all duration-300"
              >
                Sign Out
              </button>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="text-sm text-amber-100 hover:text-white bg-gradient-to-r from-amber-900/30 to-black/50 border border-amber-600/40 px-5 py-2.5 rounded-lg hover:border-amber-400/50 hover:bg-gradient-to-r hover:from-amber-800/50 hover:to-black/70 transition-all duration-300 font-medium tracking-wide"
              >
                🔐 Owner Portal
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Product Content - Mobile Responsive */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-10">
        <div className="bg-gradient-to-br from-gray-800/50 via-gray-900/70 to-black/70 rounded-xl sm:rounded-2xl shadow-xl sm:shadow-2xl overflow-hidden border border-amber-900/30 backdrop-blur-sm">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10 md:gap-12 p-4 sm:p-6 md:p-8 lg:p-10">
            {/* Product Images - Responsive */}
            <div className="space-y-4 sm:space-y-6">
              {/* Design Number - Responsive */}
              <div className="p-3 sm:p-4 bg-gradient-to-r from-amber-900/20 to-black/40 rounded-lg sm:rounded-xl border border-amber-700/30">
                <span className="text-xs sm:text-sm font-semibold text-amber-300/80 uppercase tracking-wider">
                  Design Number:
                </span>
                <span className="ml-1 sm:ml-2 text-amber-100 font-mono text-base sm:text-lg md:text-xl font-bold block sm:inline">
                  #{product.productId || product.sku || 'N/A'}
                </span>
                <p className="text-xs text-amber-200/60 mt-1 sm:mt-2">
                  Reference this design number when contacting for purchase
                </p>
              </div>

              <div
                className="aspect-square overflow-hidden rounded-lg sm:rounded-xl bg-gradient-to-br from-gray-800/70 to-black/70 border border-amber-900/40 shadow-lg sm:shadow-2xl cursor-pointer"
                onClick={() => setIsModalOpen(true)}
              >
                {product.images && product.images.length > 0 ? (
                  <img
                    src={product.images[currentImage]}
                    alt={product.name}
                    className="w-full h-full object-cover product-image transition-transform duration-700 hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-amber-400/30">
                    <div className="text-center">
                      <div className="text-3xl sm:text-4xl mb-2">👑</div>
                      <div className="text-amber-200/50 font-light text-sm sm:text-base">Image Coming Soon</div>
                    </div>
                  </div>
                )}
              </div>

              {product.images && product.images.length > 1 && (
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-4 gap-2 sm:gap-3">
                  {product.images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImage(index)}
                      className={`aspect-square overflow-hidden rounded-md sm:rounded-lg border-2 transition-all duration-300 ${currentImage === index
                        ? 'border-amber-600 shadow-md sm:shadow-lg ring-1 sm:ring-2 ring-amber-500/30'
                        : 'border-amber-900/40 hover:border-amber-700/60'
                        }`}
                    >
                      <img
                        src={image}
                        alt={`${product.name} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Details - Responsive */}
            <div className="space-y-4 sm:space-y-6 md:space-y-8">
              <div className="mb-2">
                <span className="inline-block px-3 py-1 sm:px-4 sm:py-1 bg-gradient-to-r from-amber-900/40 to-black/40 text-amber-200 rounded-full text-xs font-semibold tracking-wide border border-amber-700/40">
                  Premium Collection
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-amber-50 mb-4 sm:mb-6 leading-tight">
                {product.name}
              </h1>

              <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
                <span className="text-2xl sm:text-3xl font-bold text-amber-300">₹{product.sellingPrice}</span>
                {product.compareAtPrice && (
                  <>
                    <span className="text-lg sm:text-xl text-amber-200/60 line-through">₹{product.compareAtPrice}</span>
                    <span className="px-2 py-0.5 sm:px-3 sm:py-1 bg-gradient-to-r from-amber-700 to-amber-800 text-amber-50 text-xs sm:text-sm rounded-full font-semibold border border-amber-600/40">
                      Save ₹{product.compareAtPrice - product.sellingPrice}
                    </span>
                  </>
                )}
              </div>

              <div className="mb-6 sm:mb-8 md:mb-10">
                <p className="text-amber-100/80 leading-relaxed text-base sm:text-lg font-light">{product.description}</p>
              </div>

              {/* Product Specifications - Responsive */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8 md:mb-10">
                {product.category && (
                  <div className="p-3 sm:p-4 bg-gradient-to-br from-gray-800/40 to-black/40 rounded-lg sm:rounded-xl border border-amber-900/40">
                    <span className="text-xs font-semibold text-amber-300/80 uppercase tracking-wider block mb-1">
                      Category
                    </span>
                    <p className="text-amber-50 font-medium">{product.category}</p>
                  </div>
                )}
                {product.work && (
                  <div className="p-3 sm:p-4 bg-gradient-to-br from-gray-800/40 to-black/40 rounded-lg sm:rounded-xl border border-amber-900/40">
                    <span className="text-xs font-semibold text-amber-300/80 uppercase tracking-wider block mb-1">
                      Work/Embroidery
                    </span>
                    <p className="text-amber-50 font-medium">{product.work}</p>
                  </div>
                )}
                {product.color && (
                  <div className="p-3 sm:p-4 bg-gradient-to-br from-gray-800/40 to-black/40 rounded-lg sm:rounded-xl border border-amber-900/40">
                    <span className="text-xs font-semibold text-amber-300/80 uppercase tracking-wider block mb-1">
                      Color
                    </span>
                    <p className="text-amber-50 font-medium">{product.color}</p>
                  </div>
                )}
                {product.size && product.size.length > 0 && (
                  <div className="col-span-1 sm:col-span-2 p-3 sm:p-4 bg-gradient-to-br from-gray-800/40 to-black/40 rounded-lg sm:rounded-xl border border-amber-900/40">
                    <span className="text-xs font-semibold text-amber-300/80 uppercase tracking-wider block mb-2">
                      Available Sizes
                    </span>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {product.size.map((size) => (
                        <span
                          key={size}
                          className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-amber-900/30 to-black/50 text-amber-200 border border-amber-700/40 rounded-md sm:rounded-lg font-medium hover:from-amber-800/40 hover:border-amber-600/60 transition-all duration-300 text-sm sm:text-base"
                        >
                          {size}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {/* Color Variants Display - For ALL users */}
              {product.variantColors && product.variantColors.length > 0 ? (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-amber-100 mb-3">Available Colors</h3>
                  <div className="flex flex-wrap gap-3">
                    {product.variantColors.map((variant) => (
                      <button
                        key={variant.productId}
                        onClick={() => router.push(`/p/${variant.productId}`)}
                        className={`px-4 py-2 rounded-lg border-2 transition-all ${variant.productId === product.productId
                          ? 'border-amber-500 bg-amber-900/30'
                          : 'border-amber-700/40 hover:border-amber-500'}`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-full border border-amber-300/50"
                            style={{ backgroundColor: variant.color.toLowerCase() }}
                          />
                          <span className="text-amber-100">{variant.color}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : product.color && (
                // Show only current color if no variants
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-amber-100 mb-3">Color</h3>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full border border-amber-300/50"
                      style={{ backgroundColor: product.color.toLowerCase() }}
                    />
                    <span className="text-amber-100">{product.color}</span>
                  </div>
                </div>
              )}

              {/* Owner Panel - Enhanced with Fabric Information - Responsive */}
              {isOwner && (
                <div className="owner-panel p-4 sm:p-6 md:p-8 rounded-lg sm:rounded-xl mb-6 sm:mb-8 bg-gradient-to-br from-gray-900 via-black to-gray-900 border border-amber-900/40 shadow-lg sm:shadow-2xl">
                  <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                    <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-gradient-to-r from-amber-600 to-amber-400 flex items-center justify-center">
                      <span className="text-black font-bold text-sm sm:text-base">👑</span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-serif font-bold text-amber-100">
                      Owner Dashboard
                    </h3>
                  </div>

                  <div className="flex gap-2">
                    {!isEditing && (
                      <button
                        type="button"
                        onClick={startEditing}
                        className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm rounded-lg bg-gradient-to-r from-amber-700 to-amber-500 text-amber-50 border border-amber-400/60 hover:from-amber-600 hover:to-amber-400 transition-all duration-300 font-medium"
                      >
                        ✏️ Edit Product
                      </button>
                    )}

                    {isEditing && (
                      <>
                        <button
                          type="button"
                          onClick={cancelEditing}
                          className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm rounded-lg bg-gray-800/60 text-amber-100 border border-amber-700/50 hover:bg-gray-700/70 transition-all duration-300"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          form="owner-inline-edit-form"
                          disabled={savingEdit}
                          className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm rounded-lg bg-emerald-600 text-white border border-emerald-400/70 hover:bg-emerald-500 disabled:opacity-60 transition-all duration-300 font-semibold"
                        >
                          {savingEdit ? 'Saving…' : 'Save'}
                        </button>
                      </>
                    )}
                  </div>

                  {/* Variant Management Section */}
                  <div className="mt-6 pt-6 border-t border-amber-900/50">
                    <h4 className="text-base sm:text-md font-semibold text-amber-100 mb-3">
                      Color Variants Management
                    </h4>

                    {/* Current Variants */}
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-amber-200/70">Current Variants:</span>
                        <button
                          onClick={() => setVariantManagement(prev => ({ ...prev, showAddVariant: !prev.showAddVariant }))}
                          className="px-3 py-1 bg-amber-600 text-amber-50 rounded text-sm hover:bg-amber-700"
                        >
                          {variantManagement.showAddVariant ? 'Cancel' : '+ Add Variant'}
                        </button>
                      </div>

                      {product.variantColors && product.variantColors.length > 0 ? (
                        <div className="space-y-2">
                          {product.variantColors.map((variant, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-amber-900/20 rounded border border-amber-700/30">
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-6 h-6 rounded-full border border-amber-300/50"
                                  style={{ backgroundColor: variant.color.toLowerCase() }}
                                />
                                <div>
                                  <span className="text-amber-100 text-sm">{variant.color}</span>
                                  <div className="text-xs text-amber-400/70">{variant.productId}</div>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => router.push(`/p/${variant.productId}`)}
                                  className="px-2 py-1 text-xs bg-amber-800/30 text-amber-200 rounded hover:bg-amber-700/30"
                                >
                                  View
                                </button>
                                <button
                                  onClick={() => removeVariant(variant.productId)}
                                  disabled={variantManagement.removingVariant}
                                  className="px-2 py-1 text-xs bg-red-800/30 text-red-200 rounded hover:bg-red-700/30 disabled:opacity-50"
                                >
                                  {variantManagement.removingVariant ? 'Removing...' : 'Remove'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-amber-200/50 text-sm">No variants added yet.</p>
                      )}
                    </div>

                    {/* Add Variant Form */}
                    {variantManagement.showAddVariant && (
                      <div className="mt-4 p-4 bg-gray-900/50 rounded-lg border border-amber-900/30">
                        <h5 className="text-sm font-medium text-amber-100 mb-3">Add New Variant</h5>

                        <div className="flex gap-2 mb-3">
                          <input
                            type="text"
                            value={variantManagement.searchQuery}
                            onChange={(e) => setVariantManagement(prev => ({ ...prev, searchQuery: e.target.value }))}
                            placeholder="Search by Product ID, Name, or Color"
                            className="flex-1 px-3 py-2 bg-gray-800 border border-amber-900/50 rounded text-amber-100 text-sm"
                            onKeyPress={(e) => e.key === 'Enter' && searchVariants()}
                          />
                          <button
                            onClick={searchVariants}
                            disabled={variantManagement.searching}
                            className="px-4 py-2 bg-amber-600 text-white rounded text-sm hover:bg-amber-700 disabled:opacity-50"
                          >
                            {variantManagement.searching ? 'Searching...' : 'Search'}
                          </button>
                        </div>

                        {/* Search Results */}
                        {variantManagement.searchResults.length > 0 && (
                          <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                            <p className="text-xs text-amber-200/70">Search Results:</p>
                            {variantManagement.searchResults.map((result) => (
                              <div key={result.productId} className="flex items-center justify-between p-3 bg-gray-800/50 rounded border border-amber-900/30">
                                <div className="flex items-center gap-3">
                                  {result.images && result.images[0] && (
                                    <img src={result.images[0]} alt={result.name} className="w-10 h-10 rounded object-cover" />
                                  )}
                                  <div>
                                    <div className="text-sm font-medium text-amber-100">{result.name}</div>
                                    <div className="text-xs text-amber-400/70">
                                      {result.productId} • {result.color || 'No color'}
                                    </div>
                                  </div>
                                </div>
                                <button
                                  onClick={() => addVariant(result)}
                                  disabled={variantManagement.addingVariant}
                                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                                >
                                  {variantManagement.addingVariant ? 'Adding...' : 'Add'}
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {variantManagement.searchQuery && variantManagement.searchResults.length === 0 && !variantManagement.searching && (
                          <p className="text-amber-200/50 text-sm mt-2">No products found. Try a different search.</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Basic Product Info - Responsive */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <div className="p-2 sm:p-3 bg-gradient-to-r from-gray-800/50 to-black/50 rounded-lg border border-amber-900/40">
                      <span className="text-xs font-medium text-amber-200/70 block mb-1">
                        Cost Price
                      </span>
                      <p className="text-amber-50 font-semibold text-sm sm:text-base">₹{product.costPrice || 0}</p>
                    </div>
                    <div className="p-2 sm:p-3 bg-gradient-to-r from-gray-800/50 to-black/50 rounded-lg border border-amber-900/40">
                      <span className="text-xs font-medium text-amber-200/70 block mb-1">
                        Current Stock
                      </span>
                      <p className="text-amber-50 font-semibold text-sm sm:text-base">{product.stock || 0} units</p>
                    </div>
                    <div className="p-2 sm:p-3 bg-gradient-to-r from-gray-800/50 to-black/50 rounded-lg border border-amber-900/40">
                      <span className="text-xs font-medium text-amber-200/70 block mb-1">
                        Profit Margin
                      </span>
                      <p className="text-amber-400 font-semibold text-sm sm:text-base">
                        ₹{(product.sellingPrice || 0) - (product.costPrice || 0)}
                      </p>
                    </div>
                    <div className="p-2 sm:p-3 bg-gradient-to-r from-gray-800/50 to-black/50 rounded-lg border border-amber-900/40">
                      <span className="text-xs font-medium text-amber-200/70 block mb-1">
                        Status
                      </span>
                      <p className="text-amber-50 capitalize text-sm sm:text-base">{product.status || 'in_stock'}</p>
                    </div>
                  </div>

                  {/* Inline Edit Form */}
                  {isEditing && editData && (
                    <form
                      id="owner-inline-edit-form"
                      onSubmit={handleSaveEdit}
                      className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-amber-900/50 space-y-4 sm:space-y-5"
                    >
                      <h4 className="text-base sm:text-md font-semibold text-amber-100 mb-2">
                        Edit Product Details
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        {/* Name */}
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-amber-200/80 mb-1">
                            Product Name
                          </label>
                          <input
                            type="text"
                            value={editData.name}
                            onChange={(e) => handleEditFieldChange('name', e.target.value)}
                            className="w-full px-3 py-2 sm:px-4 sm:py-2 bg-gradient-to-r from-gray-800 to-black border border-amber-900/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-amber-100 text-sm"
                          />
                        </div>

                        {/* Category */}
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-amber-200/80 mb-1">
                            Category
                          </label>
                          <input
                            type="text"
                            value={editData.category}
                            onChange={(e) => handleEditFieldChange('category', e.target.value)}
                            className="w-full px-3 py-2 sm:px-4 sm:py-2 bg-gradient-to-r from-gray-800 to-black border border-amber-900/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-amber-100 text-sm"
                          />
                        </div>

                        {/* Selling Price */}
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-amber-200/80 mb-1">
                            Selling Price (₹)
                          </label>
                          <input
                            type="number"
                            value={editData.sellingPrice}
                            onChange={(e) => handleEditFieldChange('sellingPrice', e.target.value)}
                            className="w-full px-3 py-2 sm:px-4 sm:py-2 bg-gradient-to-r from-gray-800 to-black border border-amber-900/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-amber-100 text-sm"
                          />
                        </div>

                        {/* Compare At Price */}
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-amber-200/80 mb-1">
                            Compare At Price (MRP) (₹)
                          </label>
                          <input
                            type="number"
                            value={editData.compareAtPrice}
                            onChange={(e) =>
                              handleEditFieldChange('compareAtPrice', e.target.value)
                            }
                            className="w-full px-3 py-2 sm:px-4 sm:py-2 bg-gradient-to-r from-gray-800 to-black border border-amber-900/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-amber-100 text-sm"
                          />
                        </div>

                        {/* Cost Price */}
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-amber-200/80 mb-1">
                            Cost Price (₹)
                          </label>
                          <input
                            type="number"
                            value={editData.costPrice}
                            onChange={(e) => handleEditFieldChange('costPrice', e.target.value)}
                            className="w-full px-3 py-2 sm:px-4 sm:py-2 bg-gradient-to-r from-gray-800 to-black border border-amber-900/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-amber-100 text-sm"
                          />
                        </div>

                        {/* Color */}
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-amber-200/80 mb-1">
                            Color
                          </label>
                          <input
                            type="text"
                            value={editData.color}
                            onChange={(e) => handleEditFieldChange('color', e.target.value)}
                            className="w-full px-3 py-2 sm:px-4 sm:py-2 bg-gradient-to-r from-gray-800 to-black border border-amber-900/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-amber-100 text-sm"
                          />
                        </div>

                        {/* Low Stock Alert */}
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-amber-200/80 mb-1">
                            Low Stock Alert (qty)
                          </label>
                          <input
                            type="number"
                            value={editData.lowStockAlert}
                            onChange={(e) =>
                              handleEditFieldChange('lowStockAlert', e.target.value)
                            }
                            className="w-full px-3 py-2 sm:px-4 sm:py-2 bg-gradient-to-r from-gray-800 to-black border border-amber-900/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-amber-100 text-sm"
                          />
                        </div>

                        {/* Ideal Stock */}
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-amber-200/80 mb-1">
                            Ideal Stock (target qty)
                          </label>
                          <input
                            type="number"
                            value={editData.idealStock}
                            onChange={(e) =>
                              handleEditFieldChange('idealStock', e.target.value)
                            }
                            className="w-full px-3 py-2 sm:px-4 sm:py-2 bg-gradient-to-r from-gray-800 to-black border border-amber-900/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-amber-100 text-sm"
                          />
                        </div>

                        {/* Status */}
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-amber-200/80 mb-1">
                            Status
                          </label>
                          <select
                            value={editData.status}
                            onChange={(e) => handleEditFieldChange('status', e.target.value)}
                            className="w-full px-3 py-2 sm:px-4 sm:py-2 bg-gradient-to-r from-gray-800 to-black border border-amber-900/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-amber-100 text-sm"
                          >
                            <option value="in_stock">In Stock</option>
                            <option value="low_stock">Low Stock</option>
                            <option value="out_of_stock">Out of Stock</option>
                          </select>
                        </div>
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-amber-200/80 mb-1">
                          Description
                        </label>
                        <textarea
                          rows={3}
                          value={editData.description}
                          onChange={(e) =>
                            handleEditFieldChange('description', e.target.value)
                          }
                          className="w-full px-3 py-2 sm:px-4 sm:py-2 bg-gradient-to-r from-gray-800 to-black border border-amber-900/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-amber-100 text-sm"
                        />
                      </div>
                    </form>
                  )}

                  {/* Quick Inventory Update (per size) - Responsive */}
                  {product.size && product.size.length > 0 && (
                    <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-amber-900/50">
                      <h4 className="text-base sm:text-md font-semibold text-amber-100 mb-3 sm:mb-4">
                        Inventory Management
                      </h4>

                      <div className="flex flex-col gap-3 sm:gap-4">
                        {/* Size selector */}
                        <div className="flex-1">
                          <label className="block text-xs sm:text-sm font-medium text-amber-200/80 mb-1 sm:mb-2">
                            Select Size
                          </label>
                          <select
                            value={selectedSize}
                            onChange={(e) => setSelectedSize(e.target.value)}
                            className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-gradient-to-r from-gray-800 to-black border border-amber-900/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-amber-100 text-sm sm:text-base"
                          >
                            {product.size.map((size) => (
                              <option key={size} value={size}>
                                {size}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-end">
                          {/* Quantity input */}
                          <div className="flex-1">
                            <label className="block text-xs sm:text-sm font-medium text-amber-200/80 mb-1 sm:mb-2">
                              Quantity
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={quantity}
                              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                              className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-gradient-to-r from-gray-800 to-black border border-amber-900/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-amber-100 text-sm sm:text-base"
                            />
                          </div>

                          {/* Buttons */}
                          <div className="flex gap-2 sm:gap-3">
                            <button
                              type="button"
                              disabled={inventoryLoading}
                              onClick={() => handleStockUpdate('add')}
                              className="flex-1 px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-amber-700 to-amber-600 text-white rounded-lg hover:from-amber-600 hover:to-amber-500 disabled:opacity-50 transition-all duration-300 font-medium text-sm sm:text-base"
                            >
                              {inventoryLoading ? 'Updating...' : '+ Add'}
                            </button>
                            <button
                              type="button"
                              disabled={inventoryLoading}
                              onClick={() => handleStockUpdate('subtract')}
                              className="flex-1 px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-gray-800 to-black border border-amber-900/50 text-amber-100 rounded-lg hover:bg-gradient-to-r hover:from-gray-700 hover:to-gray-800 disabled:opacity-50 transition-all duration-300 font-medium text-sm sm:text-base"
                            >
                              {inventoryLoading ? 'Updating...' : '− Reduce'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Fabric Information - Responsive */}
                  {product.fabricUsed && product.fabricUsed.length > 0 && (
                    <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-amber-900/50">
                      <h4 className="text-base sm:text-md font-semibold text-amber-100 mb-3 sm:mb-4">
                        Fabric Usage Details
                      </h4>
                      <div className="space-y-2 sm:space-y-3">
                        {product.fabricUsed.map((fabric, index) => (
                          <div key={index} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 sm:p-4 bg-gradient-to-r from-gray-800/30 to-black/30 rounded-lg border border-amber-900/30 hover:border-amber-800/50 transition-all duration-300 gap-2 sm:gap-0">
                            <div className="flex-1">
                              <span className="font-medium text-amber-100 text-sm sm:text-base">{fabric.fabricName}</span>
                              <span className="text-xs sm:text-sm text-amber-300/70 ml-2">({fabric.fabricId})</span>
                              <div className="text-xs sm:text-sm text-amber-300/60 mt-1">
                                {fabric.metersUsed}m used • ₹{fabric.totalCost} fabric cost
                              </div>
                            </div>
                            <button
                              onClick={() => router.push(`/admin/fabrics/${fabric.fabricId}`)}
                              className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-amber-800/30 to-black/30 border border-amber-700/30 text-amber-200 rounded-lg hover:border-amber-500/50 hover:text-amber-100 transition-all duration-300 text-xs sm:text-sm"
                            >
                              View Details
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Supplier Information - Responsive */}
                  {product.supplier && (
                    <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-amber-900/50">
                      <h4 className="text-base sm:text-md font-semibold text-amber-100 mb-3 sm:mb-4">
                        Supplier Information
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        {typeof product.supplier === 'object' ? (
                          <>
                            <div className="p-2 sm:p-3 bg-gradient-to-r from-gray-800/30 to-black/30 rounded-lg">
                              <span className="text-xs font-medium text-amber-200/70 block mb-1">
                                Supplier
                              </span>
                              <p className="text-amber-100 text-sm sm:text-base">{product.supplier.name || 'N/A'}</p>
                            </div>
                            {product.supplier.contact && (
                              <div className="p-2 sm:p-3 bg-gradient-to-r from-gray-800/30 to-black/30 rounded-lg">
                                <span className="text-xs font-medium text-amber-200/70 block mb-1">
                                  Contact
                                </span>
                                <p className="text-amber-100 text-sm sm:text-base">{product.supplier.contact}</p>
                              </div>
                            )}
                            {product.supplier.leadTime && (
                              <div className="p-2 sm:p-3 bg-gradient-to-r from-gray-800/30 to-black/30 rounded-lg">
                                <span className="text-xs font-medium text-amber-200/70 block mb-1">
                                  Lead Time
                                </span>
                                <p className="text-amber-100 text-sm sm:text-base">{product.supplier.leadTime} days</p>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="col-span-1 sm:col-span-2 p-3 sm:p-4 bg-gradient-to-r from-gray-800/30 to-black/30 rounded-lg">
                            <span className="text-xs font-medium text-amber-200/70 block mb-2">
                              Supplier
                            </span>
                            <p className="text-amber-100 text-base sm:text-lg">{product.supplier}</p>
                            {product.supplierContact && (
                              <>
                                <span className="text-xs font-medium text-amber-200/70 block mt-2 sm:mt-3 mb-1">
                                  Contact
                                </span>
                                <p className="text-amber-100 text-sm sm:text-base">{product.supplierContact}</p>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons - Responsive */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-6 sm:pt-8 border-t border-amber-900/30">
                <button className="flex-1 bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700 text-white py-3 sm:py-4 px-6 sm:px-8 rounded-xl hover:from-amber-600 hover:via-amber-500 hover:to-amber-600 transition-all duration-300 font-serif font-bold text-base sm:text-lg tracking-wide shadow-xl sm:shadow-2xl hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] sm:hover:shadow-[0_0_30px_rgba(245,158,11,0.3)]">
                  Contact for Purchase
                </button>
                {isOwner && (
                  <button
                    onClick={() => router.push(`/admin/inventory`)}
                    className="px-6 py-3 sm:px-8 sm:py-4 bg-gradient-to-r from-gray-900 to-black border border-amber-900/50 text-amber-100 rounded-xl hover:border-amber-600/50 hover:bg-gradient-to-r hover:from-gray-800 hover:to-black transition-all duration-300 font-medium text-sm sm:text-base"
                  >
                    Manage Inventory
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Image Modal - Responsive */}
      {isModalOpen && product.images && product.images[currentImage] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-lg p-2 sm:p-4">
          <div className="relative w-full max-w-4xl lg:max-w-6xl max-h-[90vh] mx-auto">
            {/* Close button - Responsive */}
            <button
              onClick={closeModal}
              className="absolute -top-8 sm:-top-10 right-0 text-amber-200 hover:text-amber-100 text-xl sm:text-2xl z-10"
            >
              ✕
            </button>

            {/* Zoom controls - Responsive */}
            <div className="absolute top-2 sm:top-4 left-2 sm:left-4 flex flex-wrap gap-1 sm:gap-2 z-10">
              <button
                onClick={() => handleZoom('in')}
                disabled={zoomLevel >= 3}
                className="px-2 py-1.5 sm:px-3 sm:py-2 bg-gradient-to-r from-amber-900/50 to-black/50 text-amber-200 rounded-lg border border-amber-700/50 hover:border-amber-500/70 disabled:opacity-40 text-sm sm:text-base"
              >
                +
              </button>
              <button
                onClick={() => handleZoom('out')}
                disabled={zoomLevel <= 0.5}
                className="px-2 py-1.5 sm:px-3 sm:py-2 bg-gradient-to-r from-amber-900/50 to-black/50 text-amber-200 rounded-lg border border-amber-700/50 hover:border-amber-500/70 disabled:opacity-40 text-sm sm:text-base"
              >
                -
              </button>
              <button
                onClick={resetZoom}
                className="px-2 py-1.5 sm:px-3 sm:py-2 bg-gradient-to-r from-amber-900/50 to-black/50 text-amber-200 rounded-lg border border-amber-700/50 hover:border-amber-500/70 text-sm sm:text-base"
              >
                Reset
              </button>
              <span className="px-2 py-1.5 sm:px-3 sm:py-2 bg-gradient-to-r from-amber-900/50 to-black/50 text-amber-200 rounded-lg border border-amber-700/50 text-sm sm:text-base">
                {Math.round(zoomLevel * 100)}%
              </span>
            </div>

            {/* Image container */}
            <div className="overflow-auto max-h-[75vh] sm:max-h-[80vh]">
              <img
                ref={imageRef}
                src={product.images[currentImage]}
                alt={product.name}
                className="w-full h-auto transition-transform duration-300"
                style={{ transform: `scale(${zoomLevel})` }}
              />
            </div>

            {/* Image navigation for multiple images */}
            {product.images.length > 1 && (
              <div className="absolute bottom-2 sm:bottom-4 left-1/2 transform -translate-x-1/2 flex gap-1.5 sm:gap-2 z-10">
                {product.images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImage(index)}
                    className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${currentImage === index
                      ? 'bg-amber-400'
                      : 'bg-amber-200/50 hover:bg-amber-300'
                      }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Owner Authentication Modal */}
      {showAuth && (
        <OwnerAuth
          onLogin={handleOwnerLogin}
          onClose={() => setShowAuth(false)}
        />
      )}
    </div>
  );
}
