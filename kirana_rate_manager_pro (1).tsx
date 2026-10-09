import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { 
  ChevronDown, Plus, Edit2, Trash2, Store, Package, 
  IndianRupee, Tag, Save, X, Box, Layers, TrendingUp, 
  Search, Check, Menu, Settings, AlertTriangle, Home 
} from 'lucide-react';

const firebaseConfig = {
  apiKey: "AIzaSyATRUHIIGOKbAggh7kvRqRLjjcvzUMKDrA",
  authDomain: "rate-tracker-d1143.firebaseapp.com",
  projectId: "rate-tracker-d1143",
  storageBucket: "rate-tracker-d1143.firebasestorage.app",
  messagingSenderId: "1061139446887",
  appId: "1:1061139446887:web:1d2c033f6c744f2d7b28c2",
  measurementId: "G-EJLSMNBHL9"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const getSmartIcon = (name) => {
  if (!name) return '📦';
  const n = name.toLowerCase();
  if (/biscuit|cookie|parle|oreo|marie|good day|britannia/i.test(n)) return '🍪';
  if (/daal|dal|arhar|moong|masoor|urad|chana|pulse/i.test(n)) return '🫘'; 
  if (/chawal|rice|basmati|paddy/i.test(n)) return '🍚';
  if (/tel|oil|mustard|fortune|sunflower|refine|sarso/i.test(n)) return '🛢️';
  if (/aata|atta|maida|suji|wheat|flour|besan|sattu/i.test(n)) return '🌾';
  if (/sabun|surf|wash|detergent|rin|tide|wheel|soap|nirma/i.test(n)) return '🧼';
  if (/namkeen|chips|kurkure|lays|bhujia|mixture|haldiram/i.test(n)) return '🍟';
  if (/masala|haldi|mirch|dhaniya|spice|jeera|pepper|garam/i.test(n)) return '🌶️';
  if (/chini|salt|sugar|namak|gud|jaggery/i.test(n)) return '🧂';
  if (/tea|coffee|chai|patti|taj mahal|red label/i.test(n)) return '☕';
  if (/milk|paneer|dahi|ghee|butter|amul|sudha/i.test(n)) return '🥛';
  if (/seed|beej|khadh|fertilizer|urea|potash|khad|dap/i.test(n)) return '🌱';
  if (/shampoo|conditioner|hair/i.test(n)) return '🧴';
  if (/paste|colgate|pepsodent|brush|tooth/i.test(n)) return '🪥';
  if (/maggie|noodles|pasta|chowmein|yippee/i.test(n)) return '🍜';
  if (/water|pani|bisleri|aquafina/i.test(n)) return '💧';
  if (/dry fruit|kaju|badam|kishmish|almond|akhrot/i.test(n)) return '🥜';
  if (/cold drink|sprite|coke|pepsi|thums up|mazaa|frooti/i.test(n)) return '🥤';
  if (/chocolate|dairy milk|kitkat|munch|5 star/i.test(n)) return '🍫';
  return '📦'; 
};

const INITIAL_BULK_UNITS = ['Carton', 'Bag', 'Tin', 'Box', 'Jar', 'Sack', 'Bundle', 'Peti', 'Bora'];
const INITIAL_RETAIL_UNITS = ['Pkt', 'Pcs', 'Kg', 'Ltr', 'Gm', 'Ml', 'Bottle', 'Dozen'];

export default function StoreRateManager() {
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState(null);

  const [activeSidebar, setActiveSidebar] = useState('home'); 
  const [activeHomeTab, setActiveHomeTab] = useState('inventory'); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [storeSettings, setStoreSettings] = useState({
    title: 'Ankit Khadh Beej Bhandar',
    subtitle: '& Mahalakshmi Store',
    location: 'Bibhutipur, Samastipur',
    bulkUnits: INITIAL_BULK_UNITS,
    retailUnits: INITIAL_RETAIL_UNITS
  });
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [products, setProducts] = useState([]);

  const [activeCategoryId, setActiveCategoryId] = useState(null); 
  const [activeBrandId, setActiveBrandId] = useState(null);       
  const [expandedProducts, setExpandedProducts] = useState({});
  const [settingsExpandedCats, setSettingsExpandedCats] = useState({});
  const [settingsExpandedBrands, setSettingsExpandedBrands] = useState({});

  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(''); 
  const [activeParentId, setActiveParentId] = useState(null);
  
  const [isAddingCustomBulk, setIsAddingCustomBulk] = useState(false);
  const [isAddingCustomRetail, setIsAddingCustomRetail] = useState(false);
  const [customBulkInput, setCustomBulkInput] = useState('');
  const [customRetailInput, setCustomRetailInput] = useState('');

  const [formData, setFormData] = useState({
    name: '', bulkType: 'Carton', unitType: 'Pkt', unitsPerBulk: 1, 
    purchasePrice: '', sellingPrice: '', newSellingPrice: ''
  });
  const [editingId, setEditingId] = useState(null);

  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, type: '', id: '', name: '' });

  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Auth Error:", err);
        setAuthError(err.message);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const settingsRef = doc(db, 'store_data', 'settings');
    const categoriesRef = collection(db, 'store_categories');
    const brandsRef = collection(db, 'store_brands');
    const productsRef = collection(db, 'store_products');

    const unsubSettings = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) setStoreSettings(docSnap.data());
    });

    const unsubCats = onSnapshot(categoriesRef, (snapshot) => {
      setCategories(snapshot.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.name.localeCompare(b.name)));
    });

    const unsubBrands = onSnapshot(brandsRef, (snapshot) => {
      setBrands(snapshot.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.name.localeCompare(b.name)));
    });

    const unsubProducts = onSnapshot(productsRef, (snapshot) => {
      setProducts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.name.localeCompare(b.name)));
    });

    return () => { unsubSettings(); unsubCats(); unsubBrands(); unsubProducts(); };
  }, [user]);

  const handleSidebarNav = (route) => {
    setActiveSidebar(route);
    setIsSidebarOpen(false);
  };

  const toggleProductDetails = (id) => setExpandedProducts(prev => ({ ...prev, [id]: !prev[id] }));

  const saveSettings = async (newSettings) => {
    if (!user) return;
    setStoreSettings(newSettings);
    await setDoc(doc(db, 'store_data', 'settings'), newSettings);
  };

  const openModal = (type, parentId = null, itemToEdit = null) => {
    setModalType(type);
    setActiveParentId(parentId);
    setIsAddingCustomBulk(false);
    setIsAddingCustomRetail(false);
    
    if (itemToEdit) {
      if (type === 'category' || type === 'brand') {
        setFormData({ name: itemToEdit.name });
      } else {
        setFormData({
          name: itemToEdit.name,
          bulkType: itemToEdit.bulkType || storeSettings.bulkUnits[0],
          unitType: itemToEdit.unitType || storeSettings.retailUnits[0],
          unitsPerBulk: itemToEdit.unitsPerBulk || 1,
          purchasePrice: itemToEdit.purchasePrice || '',
          sellingPrice: itemToEdit.sellingPrice || '',
          newSellingPrice: itemToEdit.newSellingPrice || ''
        });
      }
      setEditingId(itemToEdit.id);
    } else {
      setFormData({ 
        name: '', bulkType: storeSettings.bulkUnits[0], unitType: storeSettings.retailUnits[0], unitsPerBulk: 1, 
        purchasePrice: '', sellingPrice: '', newSellingPrice: '' 
      });
      setEditingId(null);
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  const handleBulkUnitSelect = (e) => {
    if (e.target.value === 'ADD_CUSTOM') { setIsAddingCustomBulk(true); setCustomBulkInput(''); } 
    else setFormData({ ...formData, bulkType: e.target.value });
  };

  const handleRetailUnitSelect = (e) => {
    if (e.target.value === 'ADD_CUSTOM') { setIsAddingCustomRetail(true); setCustomRetailInput(''); } 
    else setFormData({ ...formData, unitType: e.target.value });
  };

  const saveCustomBulkUnit = async () => {
    if (customBulkInput.trim() && user) {
      const newUnit = customBulkInput.trim();
      const updatedUnits = storeSettings.bulkUnits.includes(newUnit) ? storeSettings.bulkUnits : [...storeSettings.bulkUnits, newUnit];
      await saveSettings({ ...storeSettings, bulkUnits: updatedUnits });
      setFormData({ ...formData, bulkType: newUnit });
    }
    setIsAddingCustomBulk(false);
  };

  const saveCustomRetailUnit = async () => {
    if (customRetailInput.trim() && user) {
      const newUnit = customRetailInput.trim();
      const updatedUnits = storeSettings.retailUnits.includes(newUnit) ? storeSettings.retailUnits : [...storeSettings.retailUnits, newUnit];
      await saveSettings({ ...storeSettings, retailUnits: updatedUnits });
      setFormData({ ...formData, unitType: newUnit });
    }
    setIsAddingCustomRetail(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || isAddingCustomBulk || isAddingCustomRetail || !user) return;
    
    // INSTANT CLOSE MODAL TO PREVENT DUPLICATE CLICKS & RETURN TO DASHBOARD
    closeModal(); 

    const docId = editingId || (window.crypto && crypto.randomUUID ? crypto.randomUUID() : doc(collection(db, 'store_categories')).id);

    try {
      if (modalType === 'category') {
        await setDoc(doc(db, 'store_categories', docId), { name: formData.name });
      } 
      else if (modalType === 'brand') {
        await setDoc(doc(db, 'store_brands', docId), { name: formData.name, categoryId: activeParentId });
      } 
      else if (modalType === 'product' || modalType === 'editProduct') {
        const payload = {
          name: formData.name,
          bulkType: formData.bulkType,
          unitType: formData.unitType,
          unitsPerBulk: Number(formData.unitsPerBulk) || 1,
          purchasePrice: Number(formData.purchasePrice) || 0,
          sellingPrice: Number(formData.sellingPrice) || 0,
          newSellingPrice: Number(formData.newSellingPrice) || 0,
        };
        if (!editingId) payload.brandId = activeParentId;
        await setDoc(doc(db, 'store_products', docId), payload, { merge: true });
      }
    } catch (err) {
      console.error("Save error:", err);
    }
  };

  const executeDelete = async () => {
    if (!user) return;
    const { type, id } = deleteConfirm;
    
    try {
      if (type === 'category') {
        const categoryBrands = brands.filter(b => b.categoryId === id);
        for (const brand of categoryBrands) {
          const brandProducts = products.filter(p => p.brandId === brand.id);
          for (const prod of brandProducts) await deleteDoc(doc(db, 'store_products', prod.id));
          await deleteDoc(doc(db, 'store_brands', brand.id));
        }
        await deleteDoc(doc(db, 'store_categories', id));
        if (activeCategoryId === id) { setActiveCategoryId(null); setActiveBrandId(null); }
      }
      else if (type === 'brand') {
        const brandProducts = products.filter(p => p.brandId === id);
        for (const prod of brandProducts) await deleteDoc(doc(db, 'store_products', prod.id));
        await deleteDoc(doc(db, 'store_brands', id));
        if (activeBrandId === id) setActiveBrandId(null);
      }
      else if (type === 'product') {
        await deleteDoc(doc(db, 'store_products', id));
      }
      setDeleteConfirm({ show: false, type: '', id: '', name: '' });
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const getProductPath = (brandId) => {
    const brand = brands.find(b => b.id === brandId);
    const cat = categories.find(c => c.id === brand?.categoryId);
    return `${cat?.name || 'Unknown'} > ${brand?.name || 'Unknown'}`;
  };

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    const lowerQuery = searchQuery.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(lowerQuery) || 
      getProductPath(p.brandId).toLowerCase().includes(lowerQuery)
    );
  }, [products, searchQuery, categories, brands]);

  const previewUnitPurchase = formData.unitsPerBulk > 0 && formData.purchasePrice ? (Number(formData.purchasePrice) / Number(formData.unitsPerBulk)).toFixed(2) : '0.00';
  const previewUnitSelling = formData.unitsPerBulk > 0 && formData.sellingPrice ? (Number(formData.sellingPrice) / Number(formData.unitsPerBulk)).toFixed(2) : '0.00';
  const previewNewUnitSelling = formData.unitsPerBulk > 0 && formData.newSellingPrice ? (Number(formData.newSellingPrice) / Number(formData.unitsPerBulk)).toFixed(2) : '0.00';

  const renderProductRatesCard = (product) => {
    const unitPurchase = (product.purchasePrice / product.unitsPerBulk).toFixed(2);
    const unitSelling = (product.sellingPrice / product.unitsPerBulk).toFixed(2);
    const newUnitSelling = product.newSellingPrice ? (product.newSellingPrice / product.unitsPerBulk).toFixed(2) : null;
    const hasNewPrice = product.newSellingPrice && product.newSellingPrice !== product.sellingPrice && product.newSellingPrice > 0;

    return (
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#1A1A1A] rounded-b-xl border-t border-[#333]">
        <div className="bg-[#242424] border border-[#333] rounded-xl p-3">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">Purchase Price</p>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-lg font-black text-white leading-none">₹{product.purchasePrice}</p>
              <p className="text-xs text-gray-400 mt-1">per {product.bulkType}</p>
            </div>
            <div className="text-right border-l border-[#444] pl-3">
              <p className="text-sm font-bold text-gray-200">₹{unitPurchase}</p>
              <p className="text-[10px] text-gray-400">per {product.unitType}</p>
            </div>
          </div>
        </div>

        <div className={`rounded-xl p-3 relative border ${hasNewPrice ? 'bg-[#3D2C1D] border-[#FF9F43]' : 'bg-[#1C3A2D] border-[#28C76F]'}`}>
          {hasNewPrice && <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-md animate-pulse shadow-md">NEW</div>}
          
          <div className="flex justify-between items-end">
            <div className="flex-1">
              <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${hasNewPrice ? 'text-[#FF9F43] flex items-center gap-1' : 'text-[#28C76F]'}`}>
                {hasNewPrice && <TrendingUp className="w-3 h-3"/>} Selling Price
              </p>
              <div className="flex justify-between items-end">
                <div>
                  {hasNewPrice ? (
                    <>
                      <p className="text-[10px] text-gray-400 line-through mb-1">Old: ₹{product.sellingPrice}</p>
                      <p className="text-xl font-black text-white leading-none">₹{product.newSellingPrice}</p>
                    </>
                  ) : (
                    <p className="text-xl font-black text-white leading-none">₹{product.sellingPrice}</p>
                  )}
                  <p className={`text-xs mt-1 ${hasNewPrice ? 'text-[#FFD3A5]' : 'text-[#87F2B3]'}`}>per {product.bulkType}</p>
                </div>
                <div className={`text-right border-l pl-3 ${hasNewPrice ? 'border-[#FF9F43]/30' : 'border-[#28C76F]/30'}`}>
                  <p className={`text-sm font-black rounded px-1.5 py-0.5 ${hasNewPrice ? 'text-[#FF9F43] bg-[#FF9F43]/10' : 'text-[#28C76F] bg-[#28C76F]/10'}`}>
                    ₹{hasNewPrice ? newUnitSelling : unitSelling}
                  </p>
                  <p className={`text-[10px] font-medium mt-1 ${hasNewPrice ? 'text-[#FF9F43]' : 'text-[#28C76F]'}`}>per {product.unitType}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (authError) {
    return (
      <div className="min-h-screen bg-[#121212] flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Authentication Failed</h2>
        <p className="text-gray-400 max-w-md">
          Please ensure <strong>Anonymous Authentication</strong> is enabled in your Firebase Console.<br/><br/>
          Error: {authError}
        </p>
      </div>
    );
  }

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center bg-[#121212]"><p className="text-[#28C76F] animate-pulse font-bold text-lg">Connecting...</p></div>;
  }

  return (
    <div className="min-h-screen bg-[#121212] text-gray-200 font-sans pb-24 selection:bg-[#28C76F]/30 flex">
      {/* SIDEBAR OVERLAY */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/80 z-40 backdrop-blur-sm transition-opacity" onClick={() => setIsSidebarOpen(false)}></div>
      )}
      
      {/* SIDEBAR DRAWER */}
      <div className={`fixed inset-y-0 left-0 w-72 bg-[#1E1E1E] border-r border-[#333] shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-[#333] flex justify-between items-center bg-[#181818]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#28C76F]/10 rounded-lg text-[#28C76F]">
              <Menu className="w-6 h-6" />
            </div>
            <h2 className="font-bold text-lg text-white leading-tight tracking-wider uppercase">Menu</h2>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-[#333] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <nav className="p-4 space-y-2">
          <button onClick={() => handleSidebarNav('home')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all ${activeSidebar === 'home' ? 'bg-[#28C76F]/10 text-[#28C76F] shadow-sm' : 'text-gray-400 hover:bg-[#2A2A2A] hover:text-white'}`}>
            <Home className="w-5 h-5" /> Home Dashboard
          </button>
          <div className="pt-2 border-t border-[#333]">
            <button onClick={() => handleSidebarNav('settings')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all ${activeSidebar === 'settings' ? 'bg-[#28C76F]/10 text-[#28C76F] shadow-sm' : 'text-gray-400 hover:bg-[#2A2A2A] hover:text-white'}`}>
              <Settings className="w-5 h-5" /> Store Settings
            </button>
          </div>
        </nav>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto overflow-x-hidden">
        
        {/* HEADER */}
        <header className="bg-gradient-to-br from-[#1A3626] to-[#0D1F16] border-b border-[#28C76F]/20 text-white sticky top-0 z-30 shadow-md">
          <div className="max-w-5xl mx-auto px-4 py-4 sm:px-6 flex justify-between items-center">
            <div className="flex items-center gap-3">
               <button onClick={() => setIsSidebarOpen(true)} className="p-1 -ml-1 text-white hover:text-gray-300 transition-colors focus:outline-none">
                 <Menu className="w-7 h-7" />
               </button>
               <div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight">
                    {storeSettings.title}
                  </h1>
                  <div className="flex items-center gap-1.5 mt-1 text-[#28C76F] opacity-90">
                    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest">{storeSettings.subtitle}</span>
                  </div>
               </div>
            </div>
            <div className="flex items-center gap-3">
               <span className="flex items-center gap-1.5 px-2.5 py-1 bg-[#28C76F]/20 border border-[#28C76F]/40 rounded-full text-[10px] font-bold text-[#28C76F]">
                 <span className="w-1.5 h-1.5 bg-[#28C76F] rounded-full animate-pulse"></span> LIVE
               </span>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 max-w-5xl mx-auto w-full pb-20">
          
          {/* TOP TABS NAVIGATION */}
          {activeSidebar === 'home' && (
             <div className="flex bg-[#1E1E1E] p-1.5 rounded-xl mb-6 shadow-sm border border-[#333]">
                <button 
                  onClick={() => { setActiveHomeTab('inventory'); setActiveCategoryId(null); setActiveBrandId(null); }}
                  className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${activeHomeTab === 'inventory' ? 'bg-[#28C76F] text-black shadow-md' : 'text-gray-400 hover:text-white hover:bg-[#2A2A2A]'}`}
                >
                  Inventory
                </button>
                <button 
                  onClick={() => setActiveHomeTab('selling_price')}
                  className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${activeHomeTab === 'selling_price' ? 'bg-[#28C76F] text-black shadow-md' : 'text-gray-400 hover:text-white hover:bg-[#2A2A2A]'}`}
                >
                  Selling Prices
                </button>
             </div>
          )}

          {/* TAB 1: INVENTORY MANAGER */}
          {activeSidebar === 'home' && activeHomeTab === 'inventory' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* LEVEL 1: CATEGORIES GRID */}
              {!activeCategoryId && (
                <>
                  <div className="flex gap-4 mb-4">
                     <button onClick={() => openModal('category')} className="flex-1 bg-[#28C76F]/20 text-[#28C76F] border border-[#28C76F]/30 hover:bg-[#28C76F] hover:text-black py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all">
                       <Plus className="w-5 h-5" /> Category
                     </button>
                  </div>
                  
                  {categories.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 bg-[#1E1E1E] rounded-2xl border border-[#333] flex flex-col items-center">
                      <Layers className="w-12 h-12 mb-3 opacity-20" />
                      <p>Inventory is Empty. Add a category.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {categories.map((cat) => {
                        const itemsCount = brands.filter(b => b.categoryId === cat.id).length;
                        return (
                          <div 
                            key={cat.id} 
                            onClick={() => setActiveCategoryId(cat.id)}
                            className="bg-[#1A1A1A] border border-[#333] hover:border-[#28C76F]/50 rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:bg-[#222] group shadow-sm"
                          >
                            <div className="w-16 h-16 bg-[#252525] rounded-2xl flex items-center justify-center text-4xl mb-4 shadow-inner group-hover:scale-110 transition-transform duration-300 border border-[#333]">
                              {getSmartIcon(cat.name)}
                            </div>
                            <h3 className="font-bold text-white text-base truncate w-full px-2 uppercase tracking-wide">{cat.name}</h3>
                            <p className="text-xs text-gray-500 mt-1 font-medium">{itemsCount} Brands</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* LEVEL 2: BRANDS GRID */}
              {activeCategoryId && !activeBrandId && (
                <div className="animate-in slide-in-from-right-4 fade-in duration-200">
                  <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => setActiveCategoryId(null)} className="p-2.5 bg-[#2A2A2A] text-gray-300 rounded-xl hover:bg-[#333] hover:text-white transition-colors border border-[#444]">
                       <ChevronDown className="w-5 h-5 rotate-90" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-[#28C76F] font-bold text-lg uppercase tracking-wider truncate">
                         {categories.find(c => c.id === activeCategoryId)?.name}
                      </h2>
                      <p className="text-xs text-gray-500 font-medium">Select a brand</p>
                    </div>
                  </div>

                  <div className="flex gap-4 mb-6">
                    <button onClick={() => openModal('brand', activeCategoryId)} className="flex-1 bg-[#28C76F]/20 text-[#28C76F] border border-[#28C76F]/30 hover:bg-[#28C76F] hover:text-black py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all">
                      <Plus className="w-5 h-5" /> Brand
                    </button>
                  </div>

                  {brands.filter(b => b.categoryId === activeCategoryId).length === 0 ? (
                    <div className="text-center py-12 text-gray-500 bg-[#1E1E1E] rounded-2xl border border-[#333]">
                      <p>No Brands here. Add one to continue.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {brands.filter(b => b.categoryId === activeCategoryId).map((brand) => {
                        const itemsCount = products.filter(p => p.brandId === brand.id).length;
                        return (
                          <div 
                            key={brand.id} 
                            onClick={() => setActiveBrandId(brand.id)}
                            className="bg-[#1A1A1A] border border-[#333] hover:border-[#28C76F]/50 rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:bg-[#222] group shadow-sm"
                          >
                            <div className="w-14 h-14 bg-[#252525] rounded-xl flex items-center justify-center mb-4 shadow-inner group-hover:scale-110 transition-transform duration-300 border border-[#333]">
                              <Tag className="w-6 h-6 text-[#28C76F]/70" />
                            </div>
                            <h3 className="font-bold text-white text-base truncate w-full px-2">{brand.name}</h3>
                            <p className="text-xs text-gray-500 mt-1 font-medium">{itemsCount} Products</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* LEVEL 3: PRODUCTS LIST */}
              {activeBrandId && (
                <div className="animate-in slide-in-from-right-4 fade-in duration-200">
                  <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => setActiveBrandId(null)} className="p-2.5 bg-[#2A2A2A] text-gray-300 rounded-xl hover:bg-[#333] hover:text-white transition-colors border border-[#444]">
                       <ChevronDown className="w-5 h-5 rotate-90" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest">{categories.find(c => c.id === activeCategoryId)?.name}</p>
                      <h2 className="text-[#28C76F] font-bold text-lg truncate">
                         {brands.find(b => b.id === activeBrandId)?.name}
                      </h2>
                    </div>
                  </div>
                  
                  <div className="flex gap-4 mb-6">
                    <button onClick={() => openModal('product', activeBrandId)} className="flex-1 bg-[#28C76F] text-black border border-[#28C76F] hover:bg-[#20A65A] py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all shadow-[0_0_15px_rgba(40,199,111,0.2)]">
                      <Plus className="w-5 h-5" /> Product
                    </button>
                  </div>

                  <div className="space-y-3">
                    {products.filter(p => p.brandId === activeBrandId).length === 0 ? (
                      <div className="text-center py-8 text-gray-500 bg-[#1E1E1E] rounded-xl border border-[#333]">
                        <p>No products yet. Click + Product to add.</p>
                      </div>
                    ) : (
                      products.filter(p => p.brandId === activeBrandId).map(product => {
                         const isExpanded = expandedProducts[product.id];
                         return (
                          <div key={product.id} className={`bg-[#1A1A1A] rounded-xl border transition-all duration-200 overflow-hidden ${isExpanded ? 'border-[#28C76F] shadow-[0_0_15px_rgba(40,199,111,0.1)]' : 'border-[#333] hover:border-[#444]'}`}>
                            <div className="p-4 flex justify-between items-center cursor-pointer" onClick={() => toggleProductDetails(product.id)}>
                               <div className="flex items-center gap-4 flex-1 min-w-0">
                                  <div className="text-3xl shrink-0 items-center justify-center">{getSmartIcon(product.name)}</div>
                                  <div className="min-w-0">
                                    <h3 className="font-bold text-white text-base truncate">{product.name}</h3>
                                    <span className="inline-flex mt-1.5 items-center gap-1.5 bg-[#252525] text-gray-400 text-[10px] font-medium px-2 py-0.5 rounded-md border border-[#333]">
                                      <Box className="w-3 h-3" /> 1 {product.bulkType} = {product.unitsPerBulk} {product.unitType}
                                    </span>
                                  </div>
                               </div>
                               <div className="flex items-center gap-3 shrink-0 ml-2">
                                  {!isExpanded && (
                                    <div className="text-right">
                                      <p className="text-sm font-bold text-white">₹{product.newSellingPrice || product.sellingPrice}</p>
                                      <p className="text-[10px] text-[#28C76F]">/{product.bulkType}</p>
                                    </div>
                                  )}
                                  <div className={`p-1.5 rounded-md transition-transform ${isExpanded ? 'bg-[#333] rotate-180' : 'bg-[#2A2A2A]'}`}>
                                    <ChevronDown className="w-4 h-4 text-gray-400" />
                                  </div>
                               </div>
                            </div>
                            
                            {isExpanded && (
                              <div className="animate-in slide-in-from-top-2 fade-in duration-200">
                                {renderProductRatesCard(product)}
                                <div className="p-3 bg-[#181818] border-t border-[#333] flex justify-end">
                                  <button onClick={() => openModal('editProduct', null, product)} className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#333] text-white text-xs font-bold rounded-lg flex items-center gap-2 border border-[#444] transition-colors">
                                    <Edit2 className="w-3.5 h-3.5" /> Edit Details
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                         )
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSidebar === 'home' && activeHomeTab === 'selling_price' && (
            <div className="space-y-5 animate-in fade-in duration-300">
              <div className="bg-[#1A1A1A] p-2 sm:p-3 rounded-2xl shadow-lg border border-[#333] sticky top-20 z-10">
                <div className="relative">
                  <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Search products or brands..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-[#121212] border border-[#333] rounded-xl text-sm font-medium text-white placeholder:text-gray-500 focus:outline-none focus:border-[#28C76F] focus:ring-1 focus:ring-[#28C76F] transition-all"
                  />
                </div>
              </div>

              <div className="space-y-3">
                {filteredProducts.length === 0 ? (
                  <div className="text-center mt-12 text-gray-500 flex flex-col items-center p-8 bg-[#1A1A1A] rounded-2xl border border-[#333]">
                    <Search className="w-10 h-10 mb-3 opacity-20" />
                    <h2 className="text-base font-medium">No matching products found.</h2>
                  </div>
                ) : (
                  filteredProducts.map(product => {
                    const path = getProductPath(product.brandId);
                    const isExpanded = expandedProducts[product.id];
                    const hasNewPrice = product.newSellingPrice && product.newSellingPrice !== product.sellingPrice && product.newSellingPrice > 0;
                    
                    return (
                      <div key={product.id} className={`bg-[#1A1A1A] rounded-xl border transition-all duration-200 overflow-hidden ${isExpanded ? 'border-[#28C76F] shadow-[0_0_15px_rgba(40,199,111,0.1)]' : 'border-[#333] hover:border-[#444]'}`}>
                        <div className="p-4 flex justify-between items-center cursor-pointer" onClick={() => toggleProductDetails(product.id)}>
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <span className="text-3xl shrink-0 items-center justify-center">{getSmartIcon(product.name)}</span>
                            <div className="min-w-0">
                              <h3 className="font-bold text-white text-base truncate">{product.name}</h3>
                              <p className="text-[10px] text-gray-500 mt-0.5 truncate">{path}</p>
                              <span className="inline-flex mt-1.5 items-center gap-1.5 bg-[#252525] text-gray-400 text-[10px] font-medium px-2 py-0.5 rounded-md border border-[#333]">
                                <Box className="w-3 h-3" /> 1 {product.bulkType} = {product.unitsPerBulk} {product.unitType}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 ml-2">
                            {!isExpanded && (
                              <div className="text-right">
                                <p className={`text-sm font-bold ${hasNewPrice ? 'text-[#FF9F43]' : 'text-white'}`}>
                                  ₹{product.newSellingPrice || product.sellingPrice}
                                </p>
                                <p className={`text-[10px] font-medium ${hasNewPrice ? 'text-[#FFD3A5]' : 'text-[#28C76F]'}`}>/{product.bulkType}</p>
                              </div>
                            )}
                            <button className={`p-1.5 rounded-md transition-transform ${isExpanded ? 'bg-[#333] rotate-180' : 'bg-[#2A2A2A]'}`}>
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="animate-in slide-in-from-top-2 fade-in duration-200">
                            {renderProductRatesCard(product)}
                            <div className="p-3 bg-[#181818] border-t border-[#333] flex justify-end">
                              <button onClick={() => openModal('editProduct', null, product)} className="px-4 py-2 bg-[#28C76F]/10 hover:bg-[#28C76F]/20 text-[#28C76F] border border-[#28C76F]/30 text-xs font-bold rounded-lg flex items-center gap-2 transition-colors">
                                <Edit2 className="w-3.5 h-3.5" /> Edit Rates
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {activeSidebar === 'settings' && (
            <div className="space-y-6 animate-in fade-in duration-300 max-w-3xl mx-auto">
              
              <div className="flex items-center gap-3 mb-4">
                <Settings className="w-7 h-7 text-gray-400"/>
                <h1 className="text-xl font-bold text-white">Settings</h1>
              </div>

              {/* Store Identity Settings */}
              <div className="bg-[#1A1A1A] rounded-2xl border border-[#333] overflow-hidden">
                <div className="bg-[#222] p-4 border-b border-[#333] flex items-center gap-3">
                  <Store className="w-5 h-5 text-gray-400" />
                  <h2 className="font-bold text-white text-sm uppercase tracking-wider">Store Profile</h2>
                </div>
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1.5">Main Store Name</label>
                      <input type="text" value={storeSettings.title} onChange={(e) => saveSettings({...storeSettings, title: e.target.value})} className="w-full px-3 py-2.5 bg-[#121212] border border-[#444] rounded-lg focus:border-[#28C76F] focus:outline-none text-white text-sm font-medium transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1.5">Subtitle (e.g. & Mahalakshmi Store)</label>
                      <input type="text" value={storeSettings.subtitle} onChange={(e) => saveSettings({...storeSettings, subtitle: e.target.value})} className="w-full px-3 py-2.5 bg-[#121212] border border-[#444] rounded-lg focus:border-[#28C76F] focus:outline-none text-white text-sm font-medium transition-colors" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-400 mb-1.5">Location</label>
                      <input type="text" value={storeSettings.location} onChange={(e) => saveSettings({...storeSettings, location: e.target.value})} className="w-full px-3 py-2.5 bg-[#121212] border border-[#444] rounded-lg focus:border-[#28C76F] focus:outline-none text-white text-sm font-medium transition-colors" />
                    </div>
                  </div>
                  <div className="p-3 bg-[#1C3A2D] text-[#28C76F] rounded-lg text-xs font-medium flex items-center gap-2 border border-[#28C76F]/30">
                    <Check className="w-4 h-4"/> Changes sync to cloud automatically.
                  </div>
                </div>
              </div>

              {/* Danger Zone: Delete Management */}
              <div className="bg-[#1A1A1A] rounded-2xl border border-red-900/50 overflow-hidden mt-6">
                <div className="bg-[#3D1D1D] p-4 border-b border-red-900/50 flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <div>
                    <h2 className="font-bold text-red-500 text-sm uppercase tracking-wider">Danger Zone</h2>
                    <p className="text-[10px] text-red-400/80 mt-0.5">Delete items safely from here.</p>
                  </div>
                </div>
                
                <div className="p-3 sm:p-4 space-y-3 bg-[#181818]">
                  {categories.map((category) => (
                    <div key={category.id} className="bg-[#222] border border-[#333] rounded-xl overflow-hidden">
                      <div className="p-3 flex justify-between items-center cursor-pointer hover:bg-[#2A2A2A]" onClick={() => setSettingsExpandedCats(prev => ({ ...prev, [category.id]: !prev[category.id] }))}>
                        <div className="flex items-center gap-3">
                          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${!settingsExpandedCats[category.id] ? '-rotate-90' : ''}`} />
                          <span className="font-bold text-white text-sm">{category.name} <span className="text-[10px] text-gray-500 bg-[#333] px-2 py-0.5 rounded-full ml-2">Category</span></span>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ show: true, type: 'category', id: category.id, name: category.name }); }} className="px-3 py-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors text-xs font-bold border border-red-500/20">
                          Delete
                        </button>
                      </div>

                      {settingsExpandedCats[category.id] && (
                        <div className="pl-8 pr-3 py-2 space-y-2 border-t border-[#333] bg-[#1A1A1A]">
                          {brands.filter(b => b.categoryId === category.id).map(brand => (
                            <div key={brand.id} className="border border-[#333] rounded-lg overflow-hidden">
                              <div className="p-2.5 flex justify-between items-center bg-[#252525] cursor-pointer" onClick={() => setSettingsExpandedBrands(prev => ({ ...prev, [brand.id]: !prev[brand.id] }))}>
                                <div className="flex items-center gap-2">
                                  <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform ${!settingsExpandedBrands[brand.id] ? '-rotate-90' : ''}`} />
                                  <span className="font-medium text-gray-200 text-sm">{brand.name}</span>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ show: true, type: 'brand', id: brand.id, name: brand.name }); }} className="px-2.5 py-1 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded transition-colors text-xs border border-red-500/20">
                                  Del
                                </button>
                              </div>

                              {settingsExpandedBrands[brand.id] && (
                                <div className="pl-6 pr-2 py-1.5 space-y-1 border-t border-[#333]">
                                  {products.filter(p => p.brandId === brand.id).map(product => (
                                    <div key={product.id} className="flex justify-between items-center p-2 border-b border-[#333] last:border-0 hover:bg-[#252525] rounded-md transition-colors">
                                      <span className="text-xs text-gray-400">{product.name}</span>
                                      <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ show: true, type: 'product', id: product.id, name: product.name }); }} className="p-1 text-red-400 hover:text-red-500 transition-colors" title="Delete Product">
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                  {products.filter(p => p.brandId === brand.id).length === 0 && <p className="text-[10px] text-gray-600 italic p-2">No products</p>}
                                </div>
                              )}
                            </div>
                          ))}
                          {brands.filter(b => b.categoryId === category.id).length === 0 && <p className="text-xs text-gray-600 italic py-1">No brands inside</p>}
                        </div>
                      )}
                    </div>
                  ))}
                  {categories.length === 0 && <p className="p-4 text-center text-gray-500 text-sm bg-[#222] rounded-xl border border-[#333]">No items available to delete.</p>}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A1A1A] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-[#333] animate-in zoom-in-95 duration-200">
            <div className="bg-[#222] px-5 py-4 border-b border-[#333] flex justify-between items-center sticky top-0 z-10">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                {modalType === 'category' && <><Layers className="w-5 h-5 text-[#28C76F]"/> Add Category</>}
                {modalType === 'brand' && <><Tag className="w-5 h-5 text-[#28C76F]"/> Add Brand</>}
                {(modalType === 'product' || modalType === 'editProduct') && <><Package className="w-5 h-5 text-[#28C76F]"/> {modalType === 'product' ? 'Add Item & Rates' : 'Update Details'}</>}
              </h3>
              <button type="button" onClick={closeModal} className="p-1.5 bg-[#333] text-gray-400 hover:bg-[#444] hover:text-white transition-colors rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5 space-y-5">
              
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  {modalType === 'category' ? 'Category Name (e.g. Rice, Biscuit)' : 
                   modalType === 'brand' ? 'Brand Name (e.g. India Gate, Britannia)' : 
                   'Product Name'}
                </label>
                <input type="text" required autoFocus placeholder="Enter name..." value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 bg-[#121212] border border-[#444] rounded-xl focus:border-[#28C76F] text-white text-base font-medium focus:outline-none transition-colors" />
              </div>

              {(modalType === 'product' || modalType === 'editProduct') && (
                <div className="space-y-5">
                  {/* Packaging Setup */}
                  <div className="bg-[#222] p-4 rounded-xl border border-[#444] space-y-4">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-[#333] pb-2">
                      <Box className="w-3.5 h-3.5 text-gray-300"/> Packaging Setup
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] text-gray-400 mb-1">Bulk Unit (Thok)</label>
                        {!isAddingCustomBulk ? (
                          <select value={formData.bulkType} onChange={handleBulkUnitSelect} className="w-full px-3 py-2 bg-[#121212] border border-[#444] rounded-lg text-sm text-white focus:outline-none focus:border-[#28C76F]">
                            {storeSettings.bulkUnits.main?.map ? null : storeSettings.bulkUnits.map(unit => <option key={unit} value={unit}>{unit}</option>)}
                            <option value="ADD_CUSTOM" className="text-[#28C76F]">+ Custom...</option>
                          </select>
                        ) : (
                          <div className="flex bg-[#121212] border border-[#28C76F] rounded-lg overflow-hidden">
                            <input type="text" autoFocus placeholder="Name..." value={customBulkInput} onChange={(e) => setCustomBulkInput(e.target.value)} className="w-full px-2 py-2 bg-transparent text-sm text-white focus:outline-none" />
                            <button onClick={saveCustomBulkUnit} type="button" className="bg-[#28C76F]/20 px-3 text-[#28C76F]"><Check className="w-4 h-4"/></button>
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-[10px] text-gray-400 mb-1">Retail Unit (Khudra)</label>
                        {!isAddingCustomRetail ? (
                          <select value={formData.unitType} onChange={handleRetailUnitSelect} className="w-full px-3 py-2 bg-[#121212] border border-[#444] rounded-lg text-sm text-white focus:outline-none focus:border-[#28C76F]">
                            {storeSettings.retailUnits.map(unit => <option key={unit} value={unit}>{unit}</option>)}
                            <option value="ADD_CUSTOM" className="text-[#28C76F]">+ Custom...</option>
                          </select>
                        ) : (
                          <div className="flex bg-[#121212] border border-[#28C76F] rounded-lg overflow-hidden">
                            <input type="text" autoFocus placeholder="Name..." value={customRetailInput} onChange={(e) => setCustomRetailInput(e.target.value)} className="w-full px-2 py-2 bg-transparent text-sm text-white focus:outline-none" />
                            <button onClick={saveCustomRetailUnit} type="button" className="bg-[#28C76F]/20 px-3 text-[#28C76F]"><Check className="w-4 h-4"/></button>
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-[10px] text-gray-400 mb-1">Qty per 1 {formData.bulkType}</label>
                        <input type="number" required min="0.01" step="0.01" value={formData.unitsPerBulk} onChange={(e) => setFormData({...formData, unitsPerBulk: e.target.value})} className="w-full px-3 py-2 bg-[#121212] border border-[#444] text-white rounded-lg text-sm focus:outline-none focus:border-[#28C76F]" />
                      </div>
                    </div>
                  </div>

                  {/* Pricing Setup */}
                  <div className="space-y-4 bg-[#222] p-4 rounded-xl border border-[#333]">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-[#333] pb-2 flex items-center gap-1.5">
                      <IndianRupee className="w-3.5 h-3.5"/> Pricing Settings
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] text-gray-400 mb-1">Purchase / {formData.bulkType}</label>
                        <div className="relative">
                          <IndianRupee className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                          <input type="number" required min="0" step="0.01" value={formData.purchasePrice} onChange={(e) => setFormData({...formData, purchasePrice: e.target.value})} className="w-full pl-9 pr-3 py-2.5 bg-[#121212] border border-[#444] rounded-lg focus:outline-none focus:border-blue-500 font-bold text-white" />
                        </div>
                        <div className="mt-1.5 text-[10px] text-gray-500 bg-[#2A2A2A] inline-block px-2 py-0.5 rounded border border-[#333]">Auto: ₹{previewUnitPurchase} / {formData.unitType}</div>
                      </div>
                      <div>
                        <label className="block text-[10px] text-[#28C76F] mb-1">Sell / {formData.bulkType}</label>
                        <div className="relative">
                          <IndianRupee className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#28C76F]/70" />
                          <input type="number" required min="0" step="0.01" value={formData.sellingPrice} onChange={(e) => setFormData({...formData, sellingPrice: e.target.value})} className="w-full pl-9 pr-3 py-2.5 bg-[#1C3A2D] border border-[#28C76F]/50 rounded-lg focus:outline-none focus:border-[#28C76F] font-bold text-white" />
                        </div>
                        <div className="mt-1.5 text-[10px] text-[#28C76F] bg-[#1C3A2D] inline-block px-2 py-0.5 rounded border border-[#28C76F]/20">Auto: ₹{previewUnitSelling} / {formData.unitType}</div>
                      </div>
                    </div>

                    {/* New Rate Highlighter */}
                    {modalType === 'editProduct' && (
                      <div className="bg-[#3D2C1D] p-4 rounded-xl border border-[#FF9F43]/40 mt-4 relative">
                        <label className="block text-xs font-bold text-[#FF9F43] mb-2 flex items-center gap-1.5">
                          <TrendingUp className="w-4 h-4"/> New Selling Price (Optional)
                        </label>
                        <div className="relative">
                          <IndianRupee className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#FF9F43]/70" />
                          <input type="number" min="0" step="0.01" placeholder="Leave empty if unchanged" value={formData.newSellingPrice} onChange={(e) => setFormData({...formData, newSellingPrice: e.target.value})} className="w-full pl-9 pr-3 py-2.5 bg-[#1E1E1E] border border-[#FF9F43]/40 rounded-lg focus:outline-none focus:border-[#FF9F43] font-bold text-white placeholder:text-gray-600 placeholder:font-normal" />
                        </div>
                        {formData.newSellingPrice && (
                          <div className="mt-2 text-xs text-[#FFD3A5] font-medium bg-[#FF9F43]/10 inline-block px-2 py-1 rounded border border-[#FF9F43]/20">
                            New Auto Sell: ₹{previewNewUnitSelling} / {formData.unitType}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-4 flex gap-3 mt-4 border-t border-[#333]">
                <button type="submit" disabled={isAddingCustomBulk || isAddingCustomRetail} className="w-full py-3.5 bg-[#28C76F] text-black rounded-xl font-bold hover:bg-[#20A65A] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-[0_0_15px_rgba(40,199,111,0.2)]">
                   {editingId ? 'Save Details' : `Save ${modalType}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-[#1A1A1A] rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center border border-[#333] animate-in zoom-in-95 duration-200">
            <div className="mx-auto w-12 h-12 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Delete "{deleteConfirm.name}"?</h2>
            <p className="text-sm text-gray-400 mb-6">
              This will permanently delete this {deleteConfirm.type} and all items inside it from the cloud.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm({ show: false, type: '', id: '', name: '' })} className="flex-1 py-2.5 bg-[#333] text-white font-medium rounded-lg hover:bg-[#444] transition-colors">Cancel</button>
              <button onClick={executeDelete} className="flex-1 py-2.5 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}