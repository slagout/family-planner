import React, { useState, useEffect, useRef } from 'react';
import {
  listItems, createItem, updateItem, deleteItem,
  exportCSV, importCSV, Section, InventoryItem,
} from '../services/inventoryApi';
import { readCSVFile, downloadTemplate } from '../services/csvImport';
import BarcodeScanner from './BarcodeScanner';
import type { BarcodeResult } from '../services/inventoryApi';

const SECTIONS: { key: Section; label: string; icon: string }[] = [
  { key: 'pantry',       label: 'Pantry',      icon: '🥫' },
  { key: 'freezer',      label: 'Freezer',     icon: '❄️' },
  { key: 'refrigerator', label: 'Refrigerator',icon: '🥗' },
  { key: 'bulk',         label: 'Bulk Cooking',icon: '🍳' },
];

const EMPTY_FORM: Partial<InventoryItem> = {
  name: '', batch_name: '', upc: '', category: '', quantity: 1, unit: '', expiration_date: '',
  freezer_bin: '', shelf: '', storage_location: '', notes: '',
  sous_vide_ready: false, is_dairy_free: false, portions: 1,
};

function daysUntilExpiry(date?: string): number | null {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
}

function ExpiryBadge({ date }: { date?: string }) {
  const days = daysUntilExpiry(date);
  if (days === null) return null;
  const cls = days < 0 ? 'bg-red-100 text-red-700'
    : days <= 3  ? 'bg-orange-100 text-orange-700'
    : days <= 7  ? 'bg-yellow-100 text-yellow-700'
    : 'bg-green-100 text-green-700';
  const label = days < 0 ? 'Expired' : days === 0 ? 'Today' : `${days}d`;
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{label}</span>;
}

export default function InventoryView() {
  const [activeSection, setActiveSection] = useState<Section>('pantry');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [expiringFilter, setExpiringFilter] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState<Partial<InventoryItem>>(EMPTY_FORM);
  const [showScanner, setShowScanner] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, expiringFilter]);

  async function load() {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (expiringFilter) params.expiring = '7';
      const data = await listItems(activeSection, params);
      setItems(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditItem(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(item: InventoryItem) {
    setEditItem(item);
    setForm({ ...item });
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editItem) {
        await updateItem(activeSection, editItem.id, form);
      } else {
        await createItem(activeSection, form);
      }
      setShowForm(false);
      load();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this item?')) return;
    await deleteItem(activeSection, id);
    load();
  }

  async function handleExport() {
    const csv = await exportCSV(activeSection);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${activeSection}-export.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportStatus('Importing…');
    try {
      const rows = await readCSVFile(file);
      const result = await importCSV(activeSection, rows);
      setImportStatus(`✅ Imported ${result.inserted} items${result.errors.length ? ` (${result.errors.length} errors)` : ''}`);
      load();
    } catch {
      setImportStatus('❌ Import failed');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
      setTimeout(() => setImportStatus(null), 4000);
    }
  }

  function handleBarcodeDetect(result: BarcodeResult) {
    setShowScanner(false);
    setForm(prev => ({ ...prev, upc: result.upc, name: result.name, category: result.category || prev.category, kroger_item_id: result.kroger_item_id }));
    setShowForm(true);
  }

  const isBulk = activeSection === 'bulk';
  const filtered = items.filter(item => {
    if (!search) return true;
    const label = isBulk ? item.batch_name : item.name;
    return (label ?? '').toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">🏡 Inventory</h1>

      {/* Section tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 overflow-x-auto">
        {SECTIONS.map(s => (
          <button
            key={s.key}
            onClick={() => { setActiveSection(s.key); setSearch(''); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeSection === s.key ? 'bg-white shadow text-green-700' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <span>{s.icon}</span>{s.label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="search" placeholder="Search items…"
          value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-40 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:outline-none"
        />
        <button
          onClick={() => setExpiringFilter(v => !v)}
          className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
            expiringFilter ? 'bg-orange-100 border-orange-400 text-orange-700' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
        >
          ⏰ Expiring soon
        </button>
        <button onClick={() => setShowScanner(true)} className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">📷 Scan</button>
        <button onClick={openCreate} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">+ Add</button>
        <button onClick={handleExport} className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">⬇ Export</button>
        <button onClick={() => downloadTemplate(activeSection)} className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">📄 Template</button>
        <label className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer">
          ⬆ Import
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
        </label>
      </div>

      {importStatus && (
        <div className="mb-4 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">{importStatus}</div>
      )}

      {/* Items list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">{SECTIONS.find(s => s.key === activeSection)?.icon}</p>
          <p className="font-medium">No items yet</p>
          <p className="text-sm mt-1">Add items manually or import a CSV</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => (
            <div key={item.id} className="flex items-start gap-3 bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-800 truncate">
                    {isBulk ? item.batch_name : item.name}
                  </span>
                  {item.category && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{item.category}</span>
                  )}
                  <ExpiryBadge date={item.expiration_date} />
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-sm text-gray-500">
                  {!isBulk && item.quantity != null && (
                    <span>{item.quantity} {item.unit || 'units'}</span>
                  )}
                  {isBulk && item.portions != null && (
                    <span>{item.portions} portions</span>
                  )}
                  {item.upc && <span className="font-mono text-xs">UPC: {item.upc}</span>}
                  {item.freezer_bin && <span>Bin: {item.freezer_bin}</span>}
                  {item.shelf && <span>Shelf: {item.shelf}</span>}
                  {item.storage_location && <span>📦 {item.storage_location}</span>}
                  {item.sous_vide_ready && <span className="text-blue-600">✓ Sous vide ready</span>}
                  {item.is_dairy_free && <span className="text-purple-600">✓ Dairy-free</span>}
                </div>
                {item.notes && <p className="mt-1 text-xs text-gray-400 truncate">{item.notes}</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => openEdit(item)} className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50">Edit</button>
                <button onClick={() => handleDelete(item.id)} className="text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white">
              <h2 className="text-lg font-semibold">{editItem ? 'Edit Item' : `Add to ${SECTIONS.find(s=>s.key===activeSection)?.label}`}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              {isBulk ? (
                <>
                  <Field label="Batch Name *">
                    <input required value={form.batch_name||''} onChange={e=>setForm(f=>({...f,batch_name:e.target.value}))}
                      className={fieldCls} placeholder="Sunday Meal Prep" />
                  </Field>
                  <Field label="Recipe Name">
                    <input value={form.recipe_name||''} onChange={e=>setForm(f=>({...f,recipe_name:e.target.value}))}
                      className={fieldCls} />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Prep Date"><input type="date" value={form.prep_date||''} onChange={e=>setForm(f=>({...f,prep_date:e.target.value}))} className={fieldCls} /></Field>
                    <Field label="Freeze Date"><input type="date" value={form.freeze_date||''} onChange={e=>setForm(f=>({...f,freeze_date:e.target.value}))} className={fieldCls} /></Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Portions"><input type="number" min={1} value={form.portions||1} onChange={e=>setForm(f=>({...f,portions:+e.target.value}))} className={fieldCls} /></Field>
                    <Field label="Meal Plan Date"><input type="date" value={form.meal_plan_date||''} onChange={e=>setForm(f=>({...f,meal_plan_date:e.target.value}))} className={fieldCls} /></Field>
                  </div>
                  <Field label="Storage Location">
                    <input value={form.storage_location||''} onChange={e=>setForm(f=>({...f,storage_location:e.target.value}))} className={fieldCls} placeholder="Bin-2, Container 3…" />
                  </Field>
                  <Field label="Reheat Instructions">
                    <textarea value={form.reheat_instructions||''} onChange={e=>setForm(f=>({...f,reheat_instructions:e.target.value}))} className={fieldCls} rows={2} />
                  </Field>
                </>
              ) : (
                <>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Field label="Item Name *">
                        <input required value={form.name||''} onChange={e=>setForm(f=>({...f,name:e.target.value}))} className={fieldCls} placeholder="Chicken Breast" />
                      </Field>
                    </div>
                    <button type="button" onClick={() => setShowScanner(true)}
                      className="mt-5 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">📷</button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="UPC">
                      <input value={form.upc||''} onChange={e=>setForm(f=>({...f,upc:e.target.value}))} className={fieldCls} placeholder="0001234567890" />
                    </Field>
                    <Field label="Category">
                      <input value={form.category||''} onChange={e=>setForm(f=>({...f,category:e.target.value}))} className={fieldCls} /></Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Quantity">
                      <input type="number" step="0.01" min={0} value={form.quantity||0} onChange={e=>setForm(f=>({...f,quantity:+e.target.value}))} className={fieldCls} />
                    </Field>
                    <Field label="Unit">
                      <input value={form.unit||''} onChange={e=>setForm(f=>({...f,unit:e.target.value}))} className={fieldCls} placeholder="kg, bags, pcs…" />
                    </Field>
                  </div>
                  <Field label="Expiration Date">
                    <input type="date" value={form.expiration_date||''} onChange={e=>setForm(f=>({...f,expiration_date:e.target.value}))} className={fieldCls} />
                  </Field>
                  {activeSection === 'freezer' && (
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Freezer Bin">
                        <input value={form.freezer_bin||''} onChange={e=>setForm(f=>({...f,freezer_bin:e.target.value}))} className={fieldCls} placeholder="Bin-1" />
                      </Field>
                      <Field label="">
                        <label className="flex items-center gap-2 mt-6 cursor-pointer">
                          <input type="checkbox" checked={!!form.sous_vide_ready} onChange={e=>setForm(f=>({...f,sous_vide_ready:e.target.checked}))} className="rounded" />
                          <span className="text-sm text-gray-700">Sous vide ready</span>
                        </label>
                      </Field>
                    </div>
                  )}
                  {activeSection === 'refrigerator' && (
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Shelf">
                        <input value={form.shelf||''} onChange={e=>setForm(f=>({...f,shelf:e.target.value}))} className={fieldCls} placeholder="Top shelf" />
                      </Field>
                      <Field label="">
                        <label className="flex items-center gap-2 mt-6 cursor-pointer">
                          <input type="checkbox" checked={!!form.is_dairy_free} onChange={e=>setForm(f=>({...f,is_dairy_free:e.target.checked}))} className="rounded" />
                          <span className="text-sm text-gray-700">Dairy-free</span>
                        </label>
                      </Field>
                    </div>
                  )}
                  {activeSection === 'pantry' && (
                    <Field label="Location">
                      <input value={form.location||''} onChange={e=>setForm(f=>({...f,location:e.target.value}))} className={fieldCls} placeholder="Pantry Shelf A" />
                    </Field>
                  )}
                </>
              )}
              <Field label="Notes">
                <textarea value={form.notes||''} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} className={fieldCls} rows={2} />
              </Field>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit"
                  className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                  {editItem ? 'Save changes' : 'Add item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showScanner && (
        <BarcodeScanner onDetect={handleBarcodeDetect} onClose={() => setShowScanner(false)} />
      )}
    </div>
  );
}

const fieldCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:outline-none';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      {label && <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>}
      {children}
    </div>
  );
}
