
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Camera, RefreshCw, Upload, Sparkles, AlertCircle, Trash2, History, Image as ImageIcon, ShoppingBag, Plus, CheckCircle2, X, ChevronRight, Wind, Layers, ShoppingCart, ArrowLeft, Search, Mic, MicOff, Pencil, Palette, Ruler, Hammer, Shirt, Zap, Moon, Sun } from 'lucide-react';
import { get, set } from 'idb-keyval';
import { getStoreInventory, saveStoreInventory, getDefaultInventory } from './services/storeService';
import { analyzeClothing, virtualTryOn } from './services/geminiService';
import { HistoryItem, StoreItem, Variant } from './types';

const STORAGE_KEY = 'wardrobe_history_v2';
const THEME_KEY = 'atelier_theme_v1';

type GenderType = 'Men' | 'Women';
type CategoryType = 'Tops' | 'Bottoms' | 'Dresses' | 'Footwear' | 'Accessories';

const STYLE_MODIFIERS = {
  Fabric: ['Silk Charmeuse', 'Heavy Denim', 'Cashmere', 'Linen', 'Velvet', 'Leather', 'Chunky Knit', 'Corduroy', 'Satin'],
  Fit: ['Modern Slim Fit', 'Oversized', 'Tailored', 'Cropped', 'Relaxed', 'High-Waisted', 'Asymmetric'],
  Aesthetic: ['Cyberpunk', 'Old Money', 'Minimalism', 'Avant-Garde', 'Boho-Chic', 'Streetwear', 'Noir', 'Preppy']
};

const generateId = () => Math.random().toString(36).substring(2, 11) + Date.now().toString(36);

const App: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [styledImage, setStyledImage] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([]);
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [inventory, setInventory] = useState<StoreItem[]>([]);
  const [isArchiveOpen, setIsArchiveOpen] = useState<boolean>(false);

  const [activeGender, setActiveGender] = useState<GenderType | null>(null);
  const [activeCategory, setActiveCategory] = useState<CategoryType | null>(null);
  const [activeDataset, setActiveDataset] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StoreItem | null>(null);
  const [detectedItems, setDetectedItems] = useState<any[]>([]);
  const [itemForm, setItemForm] = useState<{
    name: string;
    gender: GenderType;
    category: CategoryType;
    price: string;
    description: string;
    imageUrl: string;
    color: string;
    pattern: string;
    dataset: string;
    variants: Variant[];
  }>({
    name: '',
    gender: 'Women',
    category: 'Tops',
    price: '',
    description: '',
    imageUrl: '',
    color: '',
    pattern: '',
    dataset: 'My Archive',
    variants: []
  });

  const [newVariant, setNewVariant] = useState<Variant>({ color: '', size: '' });

  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const itemFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem(THEME_KEY, 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem(THEME_KEY, 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const loadArchive = async () => {
      try {
        const idbHistory = await get<HistoryItem[]>(STORAGE_KEY);
        if (idbHistory) {
          setHistory(idbHistory);
        } else {
          const legacyHistory = localStorage.getItem(STORAGE_KEY);
          if (legacyHistory) {
            const parsed = JSON.parse(legacyHistory);
            setHistory(parsed);
            await set(STORAGE_KEY, parsed);
            localStorage.removeItem(STORAGE_KEY);
          }
        }
      } catch (e) {
        console.error('Persistence load error (History):', e);
      }

      try {
        const inv = await getStoreInventory();
        setInventory(inv);
      } catch (e) {
        console.error('Persistence load error (Inventory):', e);
      }
    };

    loadArchive();

    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (isCameraOpen && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(err => console.error("Video play error:", err));
    }
  }, [isCameraOpen, cameraStream]);

  const handlePanStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (zoomLevel > 1) setIsPanning(true);
  };

  const handlePanMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isPanning || zoomLevel <= 1) return;
    if ('movementX' in e) {
      setPanOffset(prev => ({
        x: prev.x + (e as React.MouseEvent).movementX,
        y: prev.y + (e as React.MouseEvent).movementY
      }));
    }
  };

  const handlePanEnd = () => setIsPanning(false);

  const resetZoom = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const saveHistory = async (newHistory: HistoryItem[]) => {
    setHistory(newHistory);
    try {
      await set(STORAGE_KEY, newHistory);
    } catch (e) {
      console.error('History save error:', e);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setOriginalImage(event.target?.result as string);
        setStyledImage(null);
        setZoomLevel(1);
        setPanOffset({ x: 0, y: 0 });
        setSuggestion(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleItemImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setItemForm(prev => ({ ...prev, imageUrl: event.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAIAnalyze = async () => {
    if (!itemForm.imageUrl) return;
    setIsAnalyzing(true);
    try {
      const results = await analyzeClothing(itemForm.imageUrl);
      setDetectedItems(results);
      if (results.length > 0) {
        const data = results[0];
        setItemForm(prev => ({
          ...prev,
          name: `${data.color} ${data.style} ${data.type}`.trim(),
          gender: (data.category?.charAt(0).toUpperCase() + data.category?.slice(1).toLowerCase()) as GenderType || 'Women',
          category:
            data.type?.toLowerCase().includes('shirt') || data.type?.toLowerCase().includes('top') ? 'Tops' :
            data.type?.toLowerCase().includes('pant') || data.type?.toLowerCase().includes('jean') ? 'Bottoms' :
            data.type?.toLowerCase().includes('dress') ? 'Dresses' :
            data.type?.toLowerCase().includes('shoe') || data.type?.toLowerCase().includes('boot') ? 'Footwear' : 'Accessories',
          description: data.description || `${data.style} ${data.type} suitable for ${data.occasion} in ${data.season}.`,
          color: data.color || '',
          pattern: data.pattern || '',
        }));
      }
    } catch (err) {
      console.error("AI Analysis failed:", err);
      setError("AI analysis failed. Check your VITE_GEMINI_API_KEY in .env.local");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleBatchArchive = async () => {
    if (detectedItems.length === 0) return;
    const newItems: StoreItem[] = detectedItems.map((data, index) => ({
      id: `ai-${Date.now()}-${index}`,
      name: `${data.color} ${data.style} ${data.type}`.trim(),
      gender: (data.category?.charAt(0).toUpperCase() + data.category?.slice(1).toLowerCase()) as GenderType || 'Women',
      category: (data.type?.toLowerCase().includes('shirt') || data.type?.toLowerCase().includes('top')) ? 'Tops' :
                (data.type?.toLowerCase().includes('pant') || data.type?.toLowerCase().includes('jean')) ? 'Bottoms' :
                data.type?.toLowerCase().includes('dress') ? 'Dresses' :
                (data.type?.toLowerCase().includes('shoe') || data.type?.toLowerCase().includes('boot')) ? 'Footwear' : 'Accessories',
      price: 0,
      rating: 5,
      description: data.description || `${data.style} ${data.type} for ${data.occasion}.`,
      imageUrl: itemForm.imageUrl,
      color: data.color,
      pattern: data.pattern,
      dataset: 'AI Analysis'
    }));
    const updatedInventory = [...inventory, ...newItems];
    setInventory(updatedInventory);
    await saveStoreInventory(updatedInventory);
    setIsItemModalOpen(false);
    setDetectedItems([]);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      setCameraStream(stream);
      setIsCameraOpen(true);
      setError(null);
    } catch (err) {
      setError("Failed to access camera. Please ensure permissions are granted.");
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setOriginalImage(dataUrl);
        setStyledImage(null);
        setZoomLevel(1);
        setPanOffset({ x: 0, y: 0 });
        setSuggestion(null);
        stopCamera();
      }
    }
  };

  const toggleModifier = (mod: string) => {
    setSelectedModifiers(prev =>
      prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]
    );
  };

  const toggleItemSelection = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedItemIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const openAddModal = () => {
    setEditingItem(null);
    setDetectedItems([]);
    setItemForm({
      name: '', gender: 'Women', category: 'Tops', price: '',
      description: '', imageUrl: '', color: '', pattern: '',
      dataset: 'DeepFashion', variants: []
    });
    setIsItemModalOpen(true);
  };

  const openEditModal = (item: StoreItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingItem(item);
    setItemForm({
      name: item.name, gender: item.gender, category: item.category,
      price: item.price.toString(), description: item.description,
      imageUrl: item.imageUrl, color: item.color || '',
      pattern: item.pattern || '', dataset: item.dataset || 'DeepFashion',
      variants: item.variants || []
    });
    setIsItemModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.name || !itemForm.imageUrl) return;
    let updatedInventory: StoreItem[];
    if (editingItem) {
      updatedInventory = inventory.map(item =>
        item.id === editingItem.id
          ? { ...item, ...itemForm, price: parseFloat(itemForm.price) || 0 }
          : item
      );
    } else {
      const item: StoreItem = {
        id: generateId(), name: itemForm.name, gender: itemForm.gender,
        category: itemForm.category, price: parseFloat(itemForm.price) || 0,
        rating: 5.0, imageUrl: itemForm.imageUrl, description: itemForm.description,
        color: itemForm.color, pattern: itemForm.pattern,
        dataset: itemForm.dataset, variants: itemForm.variants
      };
      updatedInventory = [...inventory, item];
    }
    setInventory(updatedInventory);
    await saveStoreInventory(updatedInventory);
    setIsItemModalOpen(false);
    setEditingItem(null);
  };

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    setInventory(prev => {
      const updated = prev.filter(item => item.id !== id);
      saveStoreInventory(updated).catch(err => console.error("Storage sync error:", err));
      return updated;
    });
    setSelectedItemIds(prev => prev.filter(i => i !== id));
    if (editingItem?.id === id) { setEditingItem(null); setIsItemModalOpen(false); }
  };

  const addVariant = () => {
    if (newVariant.color || newVariant.size) {
      setItemForm(prev => ({ ...prev, variants: [...prev.variants, newVariant] }));
      setNewVariant({ color: '', size: '' });
    }
  };

  const removeVariant = (index: number) => {
    setItemForm(prev => ({ ...prev, variants: prev.variants.filter((_, i) => i !== index) }));
  };

  const handleSyncRegistry = async () => {
    const defaultItems = getDefaultInventory();
    const currentIds = new Set(inventory.map(i => i.id));
    const newItems = defaultItems.filter(i => !currentIds.has(i.id));
    if (newItems.length > 0) {
      const updatedInventory = [...inventory, ...newItems];
      setInventory(updatedInventory);
      await saveStoreInventory(updatedInventory);
      alert(`${newItems.length} new curated pieces added to your inventory.`);
    } else {
      alert("Your inventory is already up to date.");
    }
  };

  const handleStyleMe = async () => {
    if (!originalImage) return;
    setIsLoading(true);
    setError(null);
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    try {
      const selectedItems = inventory.filter(item => selectedItemIds.includes(item.id));
      let finalPrompt = "";
      const modifierString = selectedModifiers.length > 0 ? `Refined with: ${selectedModifiers.join(', ')}.` : "";

      if (selectedItems.length > 0) {
        const wearList = selectedItems.map(i => `the ${i.name} (${i.description}, Color: ${i.color || 'N/A'})`).join(', ');
        finalPrompt = `Replace clothing with: ${wearList}. Style: ${prompt || 'Professional e-commerce styling'}. ${modifierString}`;
      } else {
        finalPrompt = `Styling Context: ${prompt || "A high-fashion manifestation"}. ${modifierString}`;
      }

      if (selectedItems.length === 0 && !selectedItems[0]?.imageUrl) {
        throw new Error("Please select at least one garment from the archive to try on.");
      }

      const resultImageUrl = await virtualTryOn(originalImage, selectedItems[0]?.imageUrl);

      setStyledImage(resultImageUrl);
      setSuggestion("Virtual try-on complete. Your AI-styled look is ready.");

      const hItem: HistoryItem = {
        id: generateId(), originalUrl: originalImage,
        styledUrl: resultImageUrl, prompt: finalPrompt,
        suggestion: "Virtual try-on complete. Your AI-styled look is ready.",
        matchedItemIds: [...selectedItemIds], timestamp: Date.now()
      };
      await saveHistory([hItem, ...history]);
    } catch (err: any) {
      setError(err.message || "The AI Stylist encountered an error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteHistoryItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await saveHistory(history.filter(item => item.id !== id));
  };

  const clearAllHistory = async () => {
    if (window.confirm("This will permanently clear your entire style history. Are you sure?")) {
      await saveHistory([]);
    }
  };

  const loadFromHistory = (item: HistoryItem) => {
    setOriginalImage(item.originalUrl);
    setStyledImage(item.styledUrl);
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    setSuggestion(item.suggestion);
    setSelectedItemIds(item.matchedItemIds || []);
    setIsArchiveOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { setError("Voice recognition not supported in this browser."); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = navigator.language || 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => { setIsListening(true); setError(null); };
    recognition.onresult = (event: any) => setSearchQuery(event.results[0][0].transcript);
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      if (activeGender && item.gender !== activeGender) return false;
      if (activeCategory && item.category !== activeCategory) return false;
      if (activeDataset && item.dataset !== activeDataset) return false;
      const q = searchQuery.toLowerCase();
      if (searchQuery) {
        return (
          item.name.toLowerCase().includes(q) ||
          (item.description || '').toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.gender.toLowerCase().includes(q) ||
          (item.dataset || '').toLowerCase().includes(q) ||
          (item.color || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [inventory, activeGender, activeCategory, activeDataset, searchQuery]);

  const currentSelectionItems = inventory.filter(item => selectedItemIds.includes(item.id));

  const alternativeVisions = useMemo(() => {
    if (selectedItemIds.length === 0) return [];
    const baseItem = currentSelectionItems[currentSelectionItems.length - 1];
    if (!baseItem) return [];
    return inventory.filter(item =>
      !selectedItemIds.includes(item.id) &&
      item.category === baseItem.category &&
      (item.color && baseItem.color ? item.color.toLowerCase() !== baseItem.color.toLowerCase() : true)
    ).slice(0, 4);
  }, [selectedItemIds, inventory, currentSelectionItems]);

  const renderItemCard = (item: StoreItem) => {
    const isSelected = selectedItemIds.includes(item.id);
    return (
      <div
        key={item.id}
        className={`group flex flex-col bg-white dark:bg-slate-900 border border-purple-50 dark:border-slate-800 rounded-[2rem] overflow-hidden transition-all duration-500 relative shadow-sm hover:shadow-xl ${isSelected ? 'border-purple-400 dark:border-purple-500 ring-4 ring-purple-100 dark:ring-purple-900/30 scale-105' : ''}`}
      >
        <div className="relative aspect-[3/4] overflow-hidden bg-slate-50 dark:bg-slate-950">
          <img src={item.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt={item.name} />
          <div className="absolute inset-0 bg-black/5 dark:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
            <button
              onClick={(e) => toggleItemSelection(item.id, e)}
              className={`pointer-events-auto px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg transform ${isSelected ? 'bg-rose-500 text-white hover:bg-rose-600' : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-black dark:hover:bg-slate-200'}`}
            >
              {isSelected ? 'Remove' : 'Add to Outfit'}
            </button>
          </div>
          <div className="absolute top-4 right-4 flex flex-col gap-2 z-50 pointer-events-none">
            <div className="flex flex-col gap-2 pointer-events-auto">
              <button onClick={(e) => openEditModal(item, e)} className="p-2 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md text-slate-400 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 rounded-full transition-all border border-purple-100 dark:border-slate-700 shadow-sm" title="Edit Piece"><Pencil className="w-3.5 h-3.5" /></button>
              <button onClick={(e) => handleDelete(item.id, e)} className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-[9px] font-bold uppercase tracking-widest rounded-full shadow-lg transition-all flex items-center gap-1.5 border border-rose-400/20" title="Delete"><Trash2 className="w-3 h-3" /> Delete</button>
            </div>
          </div>
          {isSelected && <div className="absolute top-4 left-4 bg-purple-600 p-2 rounded-full shadow-lg z-10"><CheckCircle2 className="w-4 h-4 text-white" /></div>}
          {item.dataset && (
            <div className="absolute bottom-4 left-4 bg-slate-900/80 dark:bg-white/80 backdrop-blur-md px-2 py-1 rounded-md shadow-lg z-10">
              <span className="text-[7px] font-black text-white dark:text-slate-900 uppercase tracking-widest">{item.dataset}</span>
            </div>
          )}
        </div>
        <div className="p-6 flex flex-col gap-1 bg-white dark:bg-slate-900">
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 line-clamp-1">{item.name}</h4>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 line-clamp-1 font-medium italic mb-2">{item.description}</p>
          <div className="flex flex-wrap gap-1 mb-2">
            {item.color && <span className="text-[7px] font-bold uppercase border border-purple-100 dark:border-purple-900/30 px-1.5 py-0.5 rounded text-purple-500 dark:text-purple-400">{item.color}</span>}
            {item.pattern && <span className="text-[7px] font-bold uppercase border border-slate-100 dark:border-slate-800 px-1.5 py-0.5 rounded text-slate-400 dark:text-slate-600">{item.pattern}</span>}
            {item.variants && item.variants.map((v, i) => (
              <span key={i} className="text-[7px] font-bold uppercase border border-slate-100 dark:border-slate-800 px-1.5 py-0.5 rounded text-slate-400 dark:text-slate-600">{v.color || v.size}</span>
            ))}
          </div>
          <div className="flex items-center justify-between mt-auto">
            <span className="text-sm font-bold text-purple-600 dark:text-purple-400">₹{item.price.toFixed(2)}</span>
            <span className="text-[8px] font-black uppercase text-slate-300 dark:text-slate-700 tracking-[0.2em]">{item.category}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderArchive = () => {
    if (searchQuery && !activeGender) {
      return (
        <div className="space-y-12 animate-in fade-in duration-500">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-purple-50 dark:border-slate-800 pb-10">
            <div>
              <h2 className="text-4xl font-serif font-bold text-slate-900 dark:text-slate-100 italic">Neural Discovery</h2>
              <p className="text-[10px] text-purple-400 dark:text-purple-500 font-bold uppercase tracking-widest mt-1">Filtering matches for "{searchQuery}"</p>
            </div>
            <button onClick={() => setSearchQuery('')} className="px-6 py-2.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-rose-100 dark:hover:bg-rose-950/40 transition-all border border-rose-100 dark:border-rose-900/30 flex items-center gap-2">Clear Filter <X className="w-3 h-3" /></button>
          </div>
          {filteredInventory.length === 0 ? (
            <div className="h-96 flex flex-col items-center justify-center text-slate-300 dark:text-slate-800 opacity-50">
              <Search className="w-16 h-16 mb-6" />
              <p className="text-xs font-bold uppercase tracking-widest">No matching artifacts found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">{filteredInventory.map(renderItemCard)}</div>
          )}
        </div>
      );
    }

    if (!activeGender) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto w-full">
          {(['Women', 'Men'] as GenderType[]).map(gender => (
            <button key={gender} onClick={() => setActiveGender(gender)} className="group relative h-96 rounded-[3rem] overflow-hidden border border-purple-100 dark:border-slate-800 shadow-xl transition-all hover:scale-[1.02] hover:shadow-2xl">
              <img src={inventory.find(i => i.gender === gender)?.imageUrl} className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-1000 opacity-70 dark:opacity-40 group-hover:opacity-100 dark:group-hover:opacity-70" alt={gender} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
              <div className="absolute bottom-10 left-10 text-left">
                <h3 className="text-4xl font-serif font-bold text-white tracking-tight italic">{gender}'s Wear</h3>
                <p className="text-[10px] text-white/70 font-bold uppercase tracking-[0.4em] mt-3">{inventory.filter(i => i.gender === gender).length} Pieces Available</p>
              </div>
              <div className="absolute top-10 right-10 p-4 bg-white/20 backdrop-blur-md text-white rounded-full opacity-0 group-hover:opacity-100 transition-all"><ChevronRight className="w-6 h-6" /></div>
            </button>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-12 animate-in fade-in duration-500">
        <div className="flex flex-col gap-8 border-b border-purple-50 dark:border-slate-800 pb-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <button onClick={() => { setActiveGender(null); setActiveCategory(null); setActiveDataset(null); }} className="p-3 hover:bg-purple-50 dark:hover:bg-slate-800 rounded-full transition-colors text-purple-600 dark:text-purple-400"><ArrowLeft className="w-6 h-6" /></button>
              <div>
                <h2 className="text-4xl font-serif font-bold text-slate-900 dark:text-slate-100 tracking-tight">{activeGender}'s Collection</h2>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] text-purple-400 font-bold uppercase tracking-[0.3em]">Lumina Atelier</span>
                  <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-700" />
                  <span className="text-[10px] text-slate-400 dark:text-slate-600 font-bold uppercase tracking-[0.3em]">{activeCategory || 'All Categories'}</span>
                  {activeDataset && (<><ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-700" /><span className="text-[10px] text-purple-500 dark:text-purple-400 font-bold uppercase tracking-[0.3em]">{activeDataset}</span></>)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={handleSyncRegistry} className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-all shadow-sm border border-purple-100 dark:border-purple-900/30" title="Sync Latest Dataset"><RefreshCw className="w-4 h-4" /></button>
              <div className="flex bg-white dark:bg-slate-900 p-2 rounded-full border border-purple-50 dark:border-slate-800 shadow-sm overflow-x-auto max-w-full">
                <button onClick={() => setActiveCategory(null)} className={`px-6 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${!activeCategory ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'text-slate-400 dark:text-slate-500 hover:text-purple-600 dark:hover:text-purple-400'}`}>All</button>
                {(['Tops', 'Bottoms', 'Dresses', 'Footwear', 'Accessories'] as CategoryType[]).map(cat => {
                  if (activeGender === 'Men' && cat === 'Dresses') return null;
                  return <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-6 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeCategory === cat ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'text-slate-400 dark:text-slate-500 hover:text-purple-600 dark:hover:text-purple-400'}`}>{cat}</button>;
                })}
              </div>
              <button onClick={openAddModal} className="p-3 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 transition-all"><Plus className="w-6 h-6" /></button>
            </div>
          </div>
          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest ml-4 min-w-fit">Datasets:</span>
            <button onClick={() => setActiveDataset(null)} className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${!activeDataset ? 'bg-purple-600 border-purple-600 text-white' : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:border-purple-400'}`}>All Sources</button>
            {Array.from(new Set(inventory.filter(i => i.gender === activeGender).map(i => i.dataset).filter(Boolean))).map(ds => (
              <button key={ds} onClick={() => setActiveDataset(ds as string)} className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${activeDataset === ds ? 'bg-purple-600 border-purple-600 text-white shadow-md' : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:border-purple-400'}`}>{ds}</button>
            ))}
          </div>
        </div>

        {filteredInventory.length === 0 ? (
          <div className="h-96 flex flex-col items-center justify-center text-slate-300 dark:text-slate-800 opacity-50">
            <ShoppingBag className="w-16 h-16 mb-6" />
            <p className="text-xs font-bold uppercase tracking-widest">No artifacts matched your intent</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">{filteredInventory.map(renderItemCard)}</div>
        )}
      </div>
    );
  };

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${isDarkMode ? 'dark' : ''}`}>
      {/* Header */}
      <header className="flex flex-col lg:flex-row items-center justify-between px-10 py-6 border-b border-purple-100 dark:border-slate-800 bg-white/70 dark:bg-slate-950/70 backdrop-blur-2xl sticky top-0 z-40 shadow-sm gap-6">
        <div className="flex items-center gap-4 min-w-fit">
          <div className="p-3 bg-gradient-to-tr from-purple-600 to-indigo-500 rounded-2xl shadow-lg shadow-purple-200 dark:shadow-purple-900/20"><Wind className="w-6 h-6 text-white" /></div>
          <div><h1 className="text-2xl font-serif font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-none">Lumina Atelier</h1><p className="text-[9px] text-purple-500 dark:text-purple-400 font-bold uppercase tracking-[0.3em] mt-1.5 ml-0.5">Neural Archive Exploration</p></div>
        </div>

        <div className="flex-1 max-w-2xl w-full">
          <div className="relative group">
            <div className="absolute left-6 top-1/2 -translate-y-1/2"><Search className={`w-4 h-4 transition-colors ${searchQuery ? 'text-purple-600' : 'text-slate-400 dark:text-slate-600'}`} /></div>
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by silhouette, texture, or category..." className="w-full bg-slate-100/50 dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-full py-4 pl-14 pr-14 text-sm outline-none focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-purple-50 dark:focus:ring-purple-900/10 focus:border-purple-200 dark:focus:border-purple-800 transition-all font-medium placeholder:text-slate-400 dark:placeholder:text-slate-600 placeholder:italic dark:text-slate-200" />
            <button onClick={startVoiceSearch} className={`absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full transition-all ${isListening ? 'bg-rose-500 text-white shadow-lg animate-pulse' : 'text-slate-400 dark:text-slate-600 hover:bg-purple-100 dark:hover:bg-slate-800 hover:text-purple-600 dark:hover:text-purple-400'}`} title="Voice Search">{isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}</button>
          </div>
        </div>

        <div className="flex gap-4 min-w-fit items-center">
          <button onClick={toggleTheme} className="p-3 bg-white dark:bg-slate-900 border border-purple-100 dark:border-slate-800 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm" title={isDarkMode ? 'Light Mode' : 'Dark Mode'}>{isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}</button>
          <button onClick={() => setIsArchiveOpen(true)} className="px-6 py-2.5 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 bg-white dark:bg-slate-900 rounded-full transition-all flex items-center gap-2.5 border border-purple-100 dark:border-slate-800 shadow-sm uppercase tracking-widest"><History className="w-4 h-4" /> Memoirs ({history.length})</button>
          <button onClick={() => { setOriginalImage(null); setStyledImage(null); setZoomLevel(1); setPanOffset({ x: 0, y: 0 }); setSelectedItemIds([]); setSelectedModifiers([]); setPrompt(''); setSearchQuery(''); setActiveGender(null); }} className="px-6 py-2.5 text-[10px] font-bold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 hover:bg-black dark:hover:bg-white rounded-full transition-all shadow-md uppercase tracking-widest">Clear Scene</button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 lg:p-12 flex flex-col gap-24">
        {/* Mirror Section */}
        <section className="flex flex-col lg:flex-row gap-16">
          {/* Left: Image Display */}
          <div className="flex-1 flex flex-col gap-8">
            {!originalImage ? (
              <div className="aspect-[4/5] lg:aspect-auto flex-1 border border-purple-100 dark:border-slate-800 rounded-[3rem] flex flex-col items-center justify-center bg-white/40 dark:bg-slate-900/20 p-12 shadow-inner relative overflow-hidden transition-colors min-h-[500px]">
                <div className="flex flex-col items-center gap-10 w-full max-w-sm text-center">
                  <div className="p-12 bg-purple-50 dark:bg-purple-900/10 rounded-full shadow-sm"><ImageIcon className="w-16 h-16 text-purple-200 dark:text-purple-800" /></div>
                  <div><h2 className="text-4xl font-serif font-medium text-slate-800 dark:text-slate-200 tracking-tight leading-snug">Neural Mirror</h2><p className="text-slate-400 dark:text-slate-600 mt-4 text-sm font-medium italic">Grant us your silhouette to begin the curation</p></div>
                  <div className="flex flex-col gap-4 w-full">
                    <button onClick={() => fileInputRef.current?.click()} className="w-full py-5 bg-white dark:bg-slate-900 border border-purple-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px] uppercase tracking-widest rounded-3xl flex items-center justify-center gap-3 hover:bg-purple-50 dark:hover:bg-slate-800 transition-all shadow-sm"><Upload className="w-4 h-4 text-purple-400" /> Import Photo</button>
                    <button onClick={startCamera} className="w-full py-5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-[10px] uppercase tracking-widest rounded-3xl flex items-center justify-center gap-3 hover:bg-black dark:hover:bg-white transition-all shadow-lg"><Camera className="w-4 h-4" /> Open Lens</button>
                  </div>
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
              </div>
            ) : (
              <div
                className="flex-1 relative rounded-[3rem] overflow-hidden bg-slate-50 dark:bg-slate-950 border border-white dark:border-slate-800 shadow-2xl min-h-[650px] group/mirror"
                onMouseDown={handlePanStart}
                onMouseMove={handlePanMove}
                onMouseUp={handlePanEnd}
                onMouseLeave={handlePanEnd}
              >
                <div
                  className={`w-full h-full transition-transform duration-300 ease-out ${zoomLevel > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'}`}
                  style={{ transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`, transformOrigin: 'center center' }}
                >
                  <img src={styledImage || originalImage} className="w-full h-full object-contain pointer-events-none" alt="Current Form" />
                </div>

                {/* Zoom Controls */}
                <div className="absolute top-6 left-6 flex flex-col gap-2 z-30 opacity-0 group-hover/mirror:opacity-100 transition-opacity duration-300">
                  <button onClick={() => setZoomLevel(prev => Math.min(prev + 0.25, 3))} className="p-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-slate-600 dark:text-slate-400 rounded-2xl border border-purple-100 dark:border-slate-800 shadow-xl hover:bg-purple-50 dark:hover:bg-slate-800 hover:text-purple-600 transition-all" title="Zoom In"><Plus className="w-5 h-5" /></button>
                  <button onClick={() => setZoomLevel(prev => { const next = Math.max(prev - 0.25, 1); if (next === 1) setPanOffset({ x: 0, y: 0 }); return next; })} className="p-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-slate-600 dark:text-slate-400 rounded-2xl border border-purple-100 dark:border-slate-800 shadow-xl hover:bg-purple-50 dark:hover:bg-slate-800 hover:text-purple-600 transition-all" title="Zoom Out"><div className="w-5 h-0.5 bg-current rounded-full" /></button>
                  <button onClick={resetZoom} className="p-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-slate-600 dark:text-slate-400 rounded-2xl border border-purple-100 dark:border-slate-800 shadow-xl hover:bg-purple-50 dark:hover:bg-slate-800 hover:text-purple-600 transition-all" title="Reset Zoom"><RefreshCw className="w-5 h-5" /></button>
                </div>

                {isLoading && (
                  <div className="absolute inset-0 bg-white/90 dark:bg-slate-950/90 backdrop-blur-3xl flex flex-col items-center justify-center text-slate-900 dark:text-slate-100 p-8 text-center z-50 animate-in fade-in duration-500">
                    <div className="relative mb-12"><div className="w-32 h-32 border-2 border-purple-100 dark:border-slate-800 border-t-purple-600 dark:border-t-purple-400 rounded-full animate-spin"></div><Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 text-purple-400 animate-pulse" /></div>
                    <h3 className="text-4xl font-serif font-semibold italic tracking-tighter mb-4">Neural Tailoring in Progress</h3>
                    <p className="text-purple-400 dark:text-purple-500 font-bold uppercase tracking-[0.4em] text-[10px] animate-pulse">Fitting selections to your silhouette...</p>
                  </div>
                )}
                <button onClick={() => { setOriginalImage(null); setStyledImage(null); }} className="absolute bottom-10 left-1/2 -translate-x-1/2 px-8 py-4 bg-white/90 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest rounded-full backdrop-blur-md border border-purple-100 dark:border-slate-800 shadow-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-500 transition-all flex items-center gap-2">Discard Silhouette</button>
              </div>
            )}
          </div>

          {/* Right: Controls Panel */}
          <div className="w-full lg:w-[460px] flex flex-col gap-10">
            {/* Selected Ensemble */}
            <div className="p-8 bg-white dark:bg-slate-900 border border-purple-100 dark:border-slate-800 rounded-[2.5rem] flex flex-col gap-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black text-purple-400 uppercase tracking-[0.3em] flex items-center gap-2"><ShoppingCart className="w-4 h-4" /> Curated Ensemble</h3>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-600">{selectedItemIds.length} Artifacts</span>
              </div>
              {selectedItemIds.length === 0 ? (
                <p className="text-xs italic text-slate-400 dark:text-slate-700 p-8 text-center border-2 border-dashed border-slate-50 dark:border-slate-800 rounded-3xl">Ensemble is vacant. Explore the archive below.</p>
              ) : (
                <div className="flex flex-row items-center justify-center -space-x-12 py-8">
                  {currentSelectionItems.map((item, idx) => (
                    <div key={item.id} className="relative group transition-transform hover:translate-y-[-16px] hover:scale-110 cursor-pointer" style={{ zIndex: idx }}>
                      <img src={item.imageUrl} className="w-32 h-44 object-cover rounded-2xl shadow-2xl border-4 border-white dark:border-slate-800" alt={item.name} />
                      <button onClick={() => toggleItemSelection(item.id)} className="absolute -top-3 -right-3 bg-rose-500 text-white p-2.5 rounded-full shadow-lg"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Alternative Visions */}
            {alternativeVisions.length > 0 && (
              <div className="p-8 bg-purple-50/30 dark:bg-purple-950/10 border border-purple-100/50 dark:border-purple-900/20 rounded-[2.5rem] flex flex-col gap-5 animate-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-[9px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-[0.3em] flex items-center gap-2"><Zap className="w-3.5 h-3.5" /> Alternative Visions</h3>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {alternativeVisions.map((item) => (
                    <button key={item.id} onClick={() => toggleItemSelection(item.id)} className="relative aspect-square rounded-2xl overflow-hidden border border-purple-100 dark:border-purple-800 hover:ring-2 hover:ring-purple-400 transition-all group">
                      <img src={item.imageUrl} className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all" alt={item.name} />
                      <div className="absolute bottom-1 right-1 bg-white dark:bg-slate-900 rounded-full p-1 shadow-sm"><Plus className="w-2.5 h-2.5 text-purple-600" /></div>
                    </button>
                  ))}
                </div>
                <p className="text-[8px] text-purple-400 font-medium italic">Chromatically diverse alternatives found...</p>
              </div>
            )}

            {/* Style Controls */}
            <div className="p-10 bg-white dark:bg-slate-900 border border-purple-50 dark:border-slate-800 rounded-[3.5rem] shadow-xl flex flex-col gap-8 relative overflow-hidden transition-colors">
              <div className="space-y-6 relative z-10">
                <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em]">Manifestation Intent</label>
                <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="E.g. 'A rainy morning in Milan'..." className="w-full h-24 bg-transparent border-b border-purple-100 dark:border-slate-800 py-2 text-slate-900 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-700 focus:border-purple-400 dark:focus:border-purple-600 outline-none transition-all resize-none font-serif text-lg italic leading-relaxed" />
              </div>

              {/* Modifiers */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-[10px] font-black text-purple-400 uppercase tracking-widest"><Hammer className="w-3.5 h-3.5" /> Refinement Options</div>
                <div className="space-y-4">
                  {(Object.keys(STYLE_MODIFIERS) as Array<keyof typeof STYLE_MODIFIERS>).map((category) => (
                    <div key={category} className="space-y-2">
                      <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em]">
                        {category === 'Fabric' && <Layers className="w-3 h-3" />}
                        {category === 'Fit' && <Ruler className="w-3 h-3" />}
                        {category === 'Aesthetic' && <Zap className="w-3 h-3" />}
                        {category}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {STYLE_MODIFIERS[category].map(mod => {
                          const isSelected = selectedModifiers.includes(mod);
                          return (
                            <button key={mod} onClick={() => toggleModifier(mod)} className={`px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest border transition-all ${isSelected ? 'bg-purple-600 border-purple-600 text-white shadow-md' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-purple-200 dark:hover:border-purple-800 hover:bg-white dark:hover:bg-slate-700'}`}>{mod}</button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleStyleMe}
                disabled={!originalImage || isLoading || (selectedItemIds.length === 0 && !prompt && selectedModifiers.length === 0)}
                className={`w-full py-8 rounded-[2rem] font-serif font-semibold text-2xl tracking-tight flex items-center justify-center gap-5 transition-all transform active:scale-95 ${!originalImage || isLoading || (selectedItemIds.length === 0 && !prompt && selectedModifiers.length === 0) ? 'bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-700 cursor-not-allowed' : 'bg-slate-900 dark:bg-white hover:bg-black dark:hover:bg-slate-100 text-white dark:text-slate-900 shadow-2xl shadow-purple-100 dark:shadow-none'}`}
              >
                {isLoading ? <RefreshCw className="w-8 h-8 animate-spin" /> : <><Sparkles className="w-7 h-7 text-purple-400" />Invoke Couture</>}
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-4 p-6 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-[2rem] text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase tracking-widest">
                <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
              </div>
            )}

            {suggestion && !isLoading && (
              <div className="p-12 bg-white dark:bg-slate-900 border border-purple-50 dark:border-slate-800 rounded-[3.5rem] shadow-sm italic animate-in slide-in-from-right-12 duration-1000">
                <h3 className="text-[10px] font-black text-purple-400 uppercase mb-6 tracking-[0.3em] flex items-center gap-2"><Wind className="w-4 h-4" /> Atelier Critique</h3>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-lg font-serif">"{suggestion}"</p>
              </div>
            )}
          </div>
        </section>

        {/* Archive Section */}
        <section className="space-y-20 pt-16 border-t border-purple-50 dark:border-slate-800">
          <div className="flex flex-col items-center gap-8 text-center">
            <div className="p-6 bg-white dark:bg-slate-900 rounded-full text-slate-900 dark:text-slate-100 shadow-2xl border border-purple-50 dark:border-slate-800"><ShoppingBag className="w-8 h-8" /></div>
            <div>
              <h2 className="text-6xl font-serif font-bold text-slate-900 dark:text-slate-100 tracking-tighter italic leading-tight">The Atelier Archive</h2>
              <p className="text-purple-400 dark:text-purple-500 text-[10px] font-bold uppercase tracking-[0.6em] mt-5">Hand-curated pieces from global neural fashion realms</p>
            </div>
          </div>
          <div className="min-h-[800px] flex flex-col">{renderArchive()}</div>
        </section>
      </main>

      {/* Add/Edit Item Modal */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md" onClick={() => setIsItemModalOpen(false)}></div>
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl p-10 flex flex-col gap-8 animate-in zoom-in duration-300 border border-purple-50 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-slate-100 italic">{editingItem ? 'Refine Artifact' : 'Curate New Piece'}</h2>
                <p className="text-[10px] text-purple-400 dark:text-purple-500 font-bold uppercase tracking-widest mt-1">Expanding the Atelier Archive</p>
              </div>
              <button onClick={() => setIsItemModalOpen(false)} className="p-3 hover:bg-purple-50 dark:hover:bg-slate-800 rounded-full text-slate-400 dark:text-slate-600"><X className="w-6 h-6" /></button>
            </div>

            <form onSubmit={handleSaveItem} className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">Name</label>
                  <input type="text" required value={itemForm.name} onChange={e => setItemForm({...itemForm, name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-purple-100 dark:border-slate-800 rounded-2xl px-5 py-3 outline-none focus:border-purple-300 dark:focus:border-purple-600 transition-all text-sm dark:text-slate-200" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">Gender</label>
                    <select value={itemForm.gender} onChange={e => setItemForm({...itemForm, gender: e.target.value as GenderType})} className="w-full bg-slate-50 dark:bg-slate-950 border border-purple-100 dark:border-slate-800 rounded-2xl px-5 py-3 text-sm outline-none dark:text-slate-200">
                      <option>Women</option><option>Men</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">Category</label>
                    <select value={itemForm.category} onChange={e => setItemForm({...itemForm, category: e.target.value as CategoryType})} className="w-full bg-slate-50 dark:bg-slate-950 border border-purple-100 dark:border-slate-800 rounded-2xl px-5 py-3 text-sm outline-none dark:text-slate-200">
                      <option>Tops</option><option>Bottoms</option><option>Dresses</option><option>Footwear</option><option>Accessories</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">Valuation (₹)</label>
                  <input type="number" step="0.01" value={itemForm.price} onChange={e => setItemForm({...itemForm, price: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-purple-100 dark:border-slate-800 rounded-2xl px-5 py-3 text-sm outline-none dark:text-slate-200" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">Description</label>
                  <textarea value={itemForm.description} onChange={e => setItemForm({...itemForm, description: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-purple-100 dark:border-slate-800 rounded-2xl px-5 py-3 text-sm outline-none h-24 resize-none dark:text-slate-200" />
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">Image Source</label>
                  <div className="flex gap-2">
                    <input type="url" value={itemForm.imageUrl} onChange={e => setItemForm({...itemForm, imageUrl: e.target.value})} placeholder="Paste URL..." className="flex-1 bg-slate-50 dark:bg-slate-950 border border-purple-100 dark:border-slate-800 rounded-2xl px-5 py-3 text-sm outline-none dark:text-slate-200" />
                    <button type="button" onClick={() => itemFileInputRef.current?.click()} className="px-4 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-2xl border border-purple-100 dark:border-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-all flex items-center justify-center" title="Upload from Device"><Upload className="w-4 h-4" /></button>
                  </div>
                  <input type="file" ref={itemFileInputRef} className="hidden" accept="image/*" onChange={handleItemImageUpload} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">Color</label>
                    <input type="text" value={itemForm.color} onChange={e => setItemForm({...itemForm, color: e.target.value})} placeholder="e.g. Red" className="w-full bg-slate-50 dark:bg-slate-950 border border-purple-100 dark:border-slate-800 rounded-2xl px-5 py-3 text-sm outline-none dark:text-slate-200" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">Pattern</label>
                    <input type="text" value={itemForm.pattern} onChange={e => setItemForm({...itemForm, pattern: e.target.value})} placeholder="e.g. Solid" className="w-full bg-slate-50 dark:bg-slate-950 border border-purple-100 dark:border-slate-800 rounded-2xl px-5 py-3 text-sm outline-none dark:text-slate-200" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">Dataset Source</label>
                  <input type="text" value={itemForm.dataset} onChange={e => setItemForm({...itemForm, dataset: e.target.value})} placeholder="e.g. DeepFashion" className="w-full bg-slate-50 dark:bg-slate-950 border border-purple-100 dark:border-slate-800 rounded-2xl px-5 py-3 text-sm outline-none dark:text-slate-200" />
                </div>

                {/* Variants */}
                <div className="space-y-4 p-6 bg-slate-50/50 dark:bg-slate-950/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                  <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest flex items-center gap-2"><Layers className="w-3.5 h-3.5" /> Variants</h3>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Palette className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 dark:text-slate-600" />
                      <input placeholder="Color" value={newVariant.color} onChange={e => setNewVariant({...newVariant, color: e.target.value})} className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-[10px] outline-none dark:text-slate-200" />
                    </div>
                    <div className="relative flex-1">
                      <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 dark:text-slate-600" />
                      <input placeholder="Size" value={newVariant.size} onChange={e => setNewVariant({...newVariant, size: e.target.value})} className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-[10px] outline-none dark:text-slate-200" />
                    </div>
                    <button type="button" onClick={addVariant} className="p-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl hover:bg-black dark:hover:bg-slate-200 transition-all"><Plus className="w-4 h-4" /></button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {itemForm.variants.map((v, i) => (
                      <div key={i} className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-full border border-slate-100 dark:border-slate-800 text-[9px] font-bold text-slate-600 dark:text-slate-400 shadow-sm">
                        {v.color && <span>{v.color}</span>}
                        {v.color && v.size && <span className="text-slate-200 dark:text-slate-800">|</span>}
                        {v.size && <span>{v.size}</span>}
                        <button type="button" onClick={() => removeVariant(i)} className="text-rose-400 hover:text-rose-600"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Image Preview with AI Analyze */}
                <div className="aspect-[3/4] bg-slate-50 dark:bg-slate-950 rounded-3xl overflow-hidden border border-purple-100 dark:border-slate-800 relative group">
                  {itemForm.imageUrl ? (
                    <>
                      <img src={itemForm.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                      <button type="button" onClick={handleAIAnalyze} disabled={isAnalyzing} className="absolute bottom-4 inset-x-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/40 shadow-xl opacity-0 group-hover:opacity-100 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                        {isAnalyzing ? <><RefreshCw className="w-3 h-3 animate-spin" /> Analyzing Couture...</> : <><Sparkles className="w-3 h-3" /> AI Magic Tag</>}
                      </button>
                    </>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-200 dark:text-slate-800 uppercase text-[9px] font-black tracking-widest">Awaiting Visualization</div>
                  )}
                </div>
              </div>

              {/* Detected Items */}
              {detectedItems.length > 0 && (
                <div className="md:col-span-2 space-y-4 p-6 bg-purple-50/50 dark:bg-purple-950/10 rounded-3xl border border-purple-100 dark:border-purple-900/20">
                  <h3 className="text-[10px] font-black text-purple-500 dark:text-purple-400 uppercase tracking-widest flex items-center gap-2"><Sparkles className="w-3.5 h-3.5" /> AI Detected {detectedItems.length} Garment{detectedItems.length > 1 ? 's' : ''}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-[200px] overflow-y-auto pr-2">
                    {detectedItems.map((data, index) => (
                      <div key={index} className="group relative bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 transition-all hover:border-purple-300 dark:hover:border-purple-600 flex flex-col items-center text-center">
                        <Shirt className="w-8 h-8 text-purple-200 dark:text-purple-800 mb-2 group-hover:scale-110 transition-transform" />
                        <div className="text-[9px] font-bold text-slate-600 dark:text-slate-400 line-clamp-1">{data.color} {data.type}</div>
                        <div className="text-[7px] text-slate-400 dark:text-slate-600 italic uppercase mt-1">{data.style}</div>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setDetectedItems(prev => prev.filter((_, i) => i !== index)); }} className="absolute -top-2 -right-2 p-1.5 bg-rose-500 text-white rounded-full shadow-lg"><X className="w-3 h-3" /></button>
                        <button type="button" onClick={() => setItemForm(prev => ({ ...prev, name: `${data.color} ${data.style} ${data.type}`.trim(), color: data.color, pattern: data.pattern, description: data.description || '' }))} className="absolute inset-x-0 bottom-0 py-2 bg-purple-500/0 hover:bg-purple-500/10 text-transparent hover:text-purple-600 text-[8px] font-black uppercase rounded-b-2xl transition-all">Sync Form</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detectedItems.length > 1 && !editingItem && (
                <button type="button" onClick={handleBatchArchive} className="md:col-span-2 w-full py-4 bg-purple-50 dark:bg-purple-900/10 text-purple-600 dark:text-purple-400 font-bold rounded-2xl uppercase tracking-widest border border-purple-100 dark:border-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/20 transition-all flex items-center justify-center gap-3 shadow-md">
                  <Layers className="w-5 h-5" /> Archive All {detectedItems.length} Detected Items
                </button>
              )}

              <div className="md:col-span-2 flex flex-col gap-4">
                <button type="submit" className="w-full py-5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold rounded-2xl uppercase tracking-widest hover:bg-black dark:hover:bg-white transition-all shadow-xl">
                  {editingItem ? 'Update Provenance' : 'Archive to Inventory'}
                </button>
                {editingItem && (
                  <button type="button" onClick={() => { handleDelete(editingItem.id); setIsItemModalOpen(false); }} className="w-full py-4 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 font-bold rounded-2xl uppercase tracking-widest border border-rose-100 dark:border-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-950/40 transition-all flex items-center justify-center gap-2">
                    <Trash2 className="w-4 h-4" /> Permanently Retire
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Camera Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/95 dark:bg-black/95 backdrop-blur-3xl" onClick={stopCamera}></div>
          <div className="relative w-full max-w-2xl bg-black rounded-[4rem] overflow-hidden shadow-2xl border border-white/10">
            <video ref={videoRef} autoPlay playsInline muted className="w-full aspect-[4/5] object-cover" />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute top-10 right-10 z-10"><button onClick={stopCamera} className="p-4 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all"><X className="w-6 h-6" /></button></div>
            <div className="absolute bottom-16 inset-x-0 flex flex-col items-center gap-8">
              <button onClick={capturePhoto} className="group relative p-1 bg-white rounded-full transition-all transform active:scale-95 shadow-[0_0_60px_rgba(255,255,255,0.2)]">
                <div className="p-9 bg-white border-[4px] border-slate-900 rounded-full group-hover:scale-95 transition-all"><Camera className="w-12 h-12 text-slate-900" /></div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Sidebar */}
      {isArchiveOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-purple-900/10 dark:bg-black/60 backdrop-blur-lg" onClick={() => setIsArchiveOpen(false)}></div>
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 h-full shadow-2xl border-l border-purple-50 dark:border-slate-800 flex flex-col transition-colors">
            <div className="p-12 border-b border-purple-50 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 sticky top-0 z-10 transition-colors">
              <div className="flex items-center gap-5">
                <History className="w-7 h-7 text-slate-900 dark:text-slate-100" />
                <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-slate-100 tracking-tight italic">Memoirs of Style</h2>
              </div>
              <div className="flex items-center gap-4">
                {history.length > 0 && <button onClick={clearAllHistory} className="p-3 text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-full transition-all" title="Clear All"><Trash2 className="w-6 h-6" /></button>}
                <button onClick={() => setIsArchiveOpen(false)} className="p-4 hover:bg-purple-50 dark:hover:bg-slate-800 rounded-full text-slate-400 dark:text-slate-600 transition-colors"><X className="w-8 h-8" /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-12 space-y-12">
              {history.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-20 text-center">
                  <ImageIcon className="w-24 h-24 mb-10 text-purple-300 dark:text-slate-700" />
                  <p className="text-sm font-black uppercase tracking-[0.5em] text-slate-500">Archive Empty</p>
                </div>
              ) : (
                history.map(item => (
                  <div key={item.id} className="group relative rounded-[3.5rem] overflow-hidden border border-purple-50 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-600 transition-all bg-white dark:bg-slate-800 shadow-sm hover:shadow-2xl">
                    <div className="relative aspect-[4/5] w-full overflow-hidden cursor-pointer" onClick={() => loadFromHistory(item)}>
                      <img src={item.styledUrl} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt="Memoir" />
                      <button onClick={(e) => deleteHistoryItem(item.id, e)} className="absolute top-6 right-6 p-4 bg-white/95 dark:bg-rose-500 text-slate-400 dark:text-white hover:text-rose-500 dark:hover:bg-rose-600 rounded-full shadow-lg transition-all z-20 transform hover:scale-110 border border-slate-100 dark:border-rose-400/20" title="Delete"><Trash2 className="w-6 h-6" /></button>
                    </div>
                    <div className="p-10 cursor-pointer" onClick={() => loadFromHistory(item)}>
                      <p className="text-[10px] font-black text-purple-400 dark:text-purple-500 uppercase tracking-[0.3em] mb-4">{new Date(item.timestamp).toLocaleDateString()}</p>
                      <p className="text-xl font-serif font-medium text-slate-900 dark:text-slate-100 line-clamp-2 italic leading-relaxed">"{item.prompt || 'A Silent Manifestation'}"</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <footer className="p-16 bg-white/40 dark:bg-slate-950/40 border-t border-purple-50 dark:border-slate-800 text-center space-y-8 transition-colors">
        <div className="flex justify-center items-center gap-12 opacity-30 grayscale hover:grayscale-0 transition-all">
          <span className="text-[13px] font-black uppercase tracking-[0.6em] text-slate-500 dark:text-slate-400">Men</span>
          <div className="w-2 h-2 bg-purple-200 dark:bg-purple-900 rounded-full"></div>
          <span className="text-[13px] font-black uppercase tracking-[0.6em] text-slate-500 dark:text-slate-400">Women</span>
        </div>
        <div className="space-y-2">
          <p className="text-[12px] text-slate-400 dark:text-slate-600 uppercase tracking-[1.2em] font-black">Lumina Atelier © 2025</p>
          <p className="text-[10px] text-purple-300 dark:text-purple-800 uppercase tracking-[0.6em] font-bold">Bespoke Neural Couture • Powered by Google Gemini</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
