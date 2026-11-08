import { get, set } from 'idb-keyval';
import { StoreItem } from '../types';

const INVENTORY_KEY = 'wardrobe_inventory_v3';

export function getDefaultInventory(): StoreItem[] {
  return [
    // ── Women's Tops ──────────────────────────────────────────────────────────
    {
      id: 'w-top-001',
      name: 'Ivory Silk Blouse',
      gender: 'Women',
      category: 'Tops',
      price: 2499,
      rating: 4.8,
      imageUrl: 'https://images.unsplash.com/photo-1594938298603-c8148c4b4c8e?w=400&q=80',
      description: 'Fluid silk-look blouse with a relaxed drape and button-front placket.',
      color: 'Ivory',
      pattern: 'Solid',
      dataset: 'DeepFashion',
      variants: [{ size: 'S' }, { size: 'M' }, { size: 'L' }],
    },
    {
      id: 'w-top-002',
      name: 'Lavender Crop Top',
      gender: 'Women',
      category: 'Tops',
      price: 1299,
      rating: 4.6,
      imageUrl: 'https://images.unsplash.com/photo-1581044777550-4cfa60707c03?w=400&q=80',
      description: 'Soft jersey crop top with a square neckline, perfect for layering.',
      color: 'Lavender',
      pattern: 'Solid',
      dataset: 'DeepFashion',
      variants: [{ size: 'XS' }, { size: 'S' }, { size: 'M' }],
    },
    {
      id: 'w-top-003',
      name: 'Striped Linen Shirt',
      gender: 'Women',
      category: 'Tops',
      price: 1899,
      rating: 4.5,
      imageUrl: 'https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=400&q=80',
      description: 'Relaxed linen shirt with navy and white stripes. Breathable summer essential.',
      color: 'Navy/White',
      pattern: 'Striped',
      dataset: 'DeepFashion',
    },

    // ── Women's Bottoms ──────────────────────────────────────────────────────
    {
      id: 'w-bot-001',
      name: 'High-Waist Wide Leg Trousers',
      gender: 'Women',
      category: 'Bottoms',
      price: 2999,
      rating: 4.9,
      imageUrl: 'https://images.unsplash.com/photo-1594938298603-c8148c4b4c8e?w=400&q=80',
      description: 'Tailored wide-leg trousers in a sand crepe finish. Old-money aesthetic.',
      color: 'Sand',
      pattern: 'Solid',
      dataset: 'DeepFashion',
      variants: [{ size: 'S' }, { size: 'M' }, { size: 'L' }],
    },
    {
      id: 'w-bot-002',
      name: 'Denim Mini Skirt',
      gender: 'Women',
      category: 'Bottoms',
      price: 1599,
      rating: 4.4,
      imageUrl: 'https://images.unsplash.com/photo-1535639818669-c059d2f038e6?w=400&q=80',
      description: 'Classic light-wash denim mini skirt with raw hem detail.',
      color: 'Light Blue',
      pattern: 'Denim',
      dataset: 'DeepFashion',
    },

    // ── Women's Dresses ──────────────────────────────────────────────────────
    {
      id: 'w-drs-001',
      name: 'Sage Wrap Midi Dress',
      gender: 'Women',
      category: 'Dresses',
      price: 3499,
      rating: 4.9,
      imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&q=80',
      description: 'Effortless wrap midi in sage green satin-touch fabric. Perfect for any occasion.',
      color: 'Sage Green',
      pattern: 'Solid',
      dataset: 'DeepFashion',
      variants: [{ size: 'XS' }, { size: 'S' }, { size: 'M' }, { size: 'L' }],
    },
    {
      id: 'w-drs-002',
      name: 'Floral Maxi Dress',
      gender: 'Women',
      category: 'Dresses',
      price: 2799,
      rating: 4.7,
      imageUrl: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400&q=80',
      description: 'Flowy maxi dress with a vibrant botanical print. V-neckline and tiered skirt.',
      color: 'Multi',
      pattern: 'Floral',
      dataset: 'DeepFashion',
    },
    {
      id: 'w-drs-003',
      name: 'LBD – Sleeveless Sheath',
      gender: 'Women',
      category: 'Dresses',
      price: 3199,
      rating: 4.8,
      imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&q=80',
      description: 'A timeless little black dress in a sleek sheath silhouette.',
      color: 'Black',
      pattern: 'Solid',
      dataset: 'My Archive',
    },

    // ── Women's Footwear ─────────────────────────────────────────────────────
    {
      id: 'w-fwt-001',
      name: 'Nude Block Heel Mules',
      gender: 'Women',
      category: 'Footwear',
      price: 3999,
      rating: 4.6,
      imageUrl: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&q=80',
      description: 'Polished mules with a sturdy block heel. Versatile neutral tone.',
      color: 'Nude',
      pattern: 'Solid',
      dataset: 'DeepFashion',
    },
    {
      id: 'w-fwt-002',
      name: 'White Leather Sneakers',
      gender: 'Women',
      category: 'Footwear',
      price: 4499,
      rating: 4.8,
      imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80',
      description: 'Clean-line leather sneakers with a cushioned sole. A wardrobe staple.',
      color: 'White',
      pattern: 'Solid',
      dataset: 'DeepFashion',
    },

    // ── Women's Accessories ──────────────────────────────────────────────────
    {
      id: 'w-acc-001',
      name: 'Tortoise Shell Sunglasses',
      gender: 'Women',
      category: 'Accessories',
      price: 1199,
      rating: 4.7,
      imageUrl: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&q=80',
      description: 'Oversized square frames in a classic tortoiseshell pattern.',
      color: 'Brown/Amber',
      pattern: 'Tortoise',
      dataset: 'My Archive',
    },

    // ── Men's Tops ──────────────────────────────────────────────────────────
    {
      id: 'm-top-001',
      name: 'White Oxford Dress Shirt',
      gender: 'Men',
      category: 'Tops',
      price: 2199,
      rating: 4.8,
      imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80',
      description: 'Crisp cotton Oxford shirt. Classic collar and button-down front.',
      color: 'White',
      pattern: 'Solid',
      dataset: 'DeepFashion',
      variants: [{ size: 'S' }, { size: 'M' }, { size: 'L' }, { size: 'XL' }],
    },
    {
      id: 'm-top-002',
      name: 'Navy Slim-Fit T-Shirt',
      gender: 'Men',
      category: 'Tops',
      price: 999,
      rating: 4.5,
      imageUrl: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400&q=80',
      description: 'Premium cotton crewneck tee in a modern slim fit. A daily essential.',
      color: 'Navy',
      pattern: 'Solid',
      dataset: 'DeepFashion',
    },
    {
      id: 'm-top-003',
      name: 'Olive Overshirt Jacket',
      gender: 'Men',
      category: 'Tops',
      price: 3499,
      rating: 4.7,
      imageUrl: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&q=80',
      description: 'Relaxed overshirt in a heavy olive twill. Wear open as a layer.',
      color: 'Olive',
      pattern: 'Solid',
      dataset: 'My Archive',
    },

    // ── Men's Bottoms ────────────────────────────────────────────────────────
    {
      id: 'm-bot-001',
      name: 'Charcoal Slim Chinos',
      gender: 'Men',
      category: 'Bottoms',
      price: 2599,
      rating: 4.6,
      imageUrl: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400&q=80',
      description: 'Stretch-cotton slim chinos. Versatile charcoal shade goes with everything.',
      color: 'Charcoal',
      pattern: 'Solid',
      dataset: 'DeepFashion',
      variants: [{ size: '30x30' }, { size: '32x32' }, { size: '34x32' }],
    },
    {
      id: 'm-bot-002',
      name: 'Indigo Raw-Denim Jeans',
      gender: 'Men',
      category: 'Bottoms',
      price: 3299,
      rating: 4.8,
      imageUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&q=80',
      description: 'Selvedge indigo denim with a classic straight cut. Gets better with wear.',
      color: 'Indigo',
      pattern: 'Denim',
      dataset: 'DeepFashion',
    },

    // ── Men's Footwear ───────────────────────────────────────────────────────
    {
      id: 'm-fwt-001',
      name: 'Tan Leather Derby Shoes',
      gender: 'Men',
      category: 'Footwear',
      price: 5999,
      rating: 4.9,
      imageUrl: 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=400&q=80',
      description: 'Full-grain leather derbies in a warm tan. Goodyear welt construction.',
      color: 'Tan',
      pattern: 'Solid',
      dataset: 'DeepFashion',
    },
    {
      id: 'm-fwt-002',
      name: 'White Chunky Sneakers',
      gender: 'Men',
      category: 'Footwear',
      price: 4999,
      rating: 4.7,
      imageUrl: 'https://images.unsplash.com/photo-1584735175315-9d5df23861e6?w=400&q=80',
      description: 'Streetwear-inspired chunky sneakers with layered midsole.',
      color: 'White',
      pattern: 'Solid',
      dataset: 'My Archive',
    },

    // ── Men's Accessories ────────────────────────────────────────────────────
    {
      id: 'm-acc-001',
      name: 'Camel Wool Scarf',
      gender: 'Men',
      category: 'Accessories',
      price: 1799,
      rating: 4.6,
      imageUrl: 'https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=400&q=80',
      description: 'Soft merino-blend scarf in a classic camel tone. 180cm length.',
      color: 'Camel',
      pattern: 'Solid',
      dataset: 'My Archive',
    },
  ];
}

export async function getStoreInventory(): Promise<StoreItem[]> {
  try {
    const saved = await get<StoreItem[]>(INVENTORY_KEY);
    if (saved && saved.length > 0) return saved;
  } catch (e) {
    console.warn('IDB read error:', e);
  }
  const defaults = getDefaultInventory();
  await saveStoreInventory(defaults);
  return defaults;
}

export async function saveStoreInventory(inventory: StoreItem[]): Promise<void> {
  try {
    await set(INVENTORY_KEY, inventory);
  } catch (e) {
    console.error('IDB write error:', e);
  }
}
