import { useEffect, useState } from 'react';
import { X, Plus, Building2, Home, TrendingUp, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { Property, Unit, Tenant, Contract } from '../types';
import ExportButtons from '../components/ExportButtons';

export default function Properties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [editUnit, setEditUnit] = useState<Unit | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => {
    if (properties.length > 0 && !selectedProperty) setSelectedProperty(properties[0]);
  }, [properties]);

  async function fetchAll() {
    setLoading(true);
    const [p, c] = await Promise.all([
      api.get('/properties'),
      api.get('/contracts'),
    ]);
    setProperties(p.data);
    setContracts(c.data);
    setLoading(false);
  }

  async function deleteProperty(id: string) {
    if (!confirm('確定刪除此據點？所有倉庫資料也將一併刪除。')) return;
    await api.delete(`/properties/${id}`);
    setSelectedProperty(null);
    fetchAll();
  }

  const units = selectedProperty?.units ?? [];
  const totalUnits = properties.reduce((s, p) => s + p.units.length, 0);
  const occupiedUnits = properties.reduce((s, p) => s + p.units.filter((u) => u.status === 'OCCUPIED').length, 0);
  const totalRent = properties.reduce((s, p) => s + p.units.filter((u) => u.status === 'OCCUPIED').reduce((ss, u) => ss + Number(u.monthlyRent), 0), 0);

  return (
    <div className="px-6 py-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-800">倉儲管理</h1>
          <p className="text-xs text-gray-400 mt-0.5">管理據點與倉庫資訊</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButtons type="warehouses" />
          <button onClick={() => setShowAddProperty(true)} className="btn-primary text-sm flex items-center gap-1.5">
            <Plus className="w-4 h-4" />新增據點
          </button>
        </div>
      </div>

      {/* Overall stats */}
      {totalUnits > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-4 h-4 text-brand" />
              <span className="text-xs text-gray-400">據點 / 倉庫</span>
            </div>
            <div className="text-lg font-bold text-gray-800">{properties.length} 棟 / {totalUnits} 間</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Home className="w-4 h-4 text-green-500" />
              <span className="text-xs text-gray-400">出租率</span>
            </div>
            <div className="text-lg font-bold text-gray-800">
              {totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0}%
              <span className="text-xs text-gray-400 font-normal ml-1">{occupiedUnits}/{totalUnits} 間</span>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-gray-400">月租金總額</span>
            </div>
            <div className="text-lg font-bold text-brand">NT${totalRent.toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="flex gap-2 mb-5">
        <button onClick={() => navigate('/tenants')} className="flex items-center gap-1.5 text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 hover:border-brand hover:text-brand transition-colors">
          <Users className="w-3.5 h-3.5" />管理租客
        </button>
        <button onClick={() => navigate('/contracts')} className="flex items-center gap-1.5 text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 hover:border-brand hover:text-brand transition-colors">
          管理合約
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">載入中...</div>
      ) : properties.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 text-center py-16">
          <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <div className="text-gray-500 font-medium mb-1">尚未建立任何據點</div>
          <div className="text-xs text-gray-400 mb-4">新增第一個據點以開始管理您的倉庫</div>
          <button onClick={() => setShowAddProperty(true)} className="btn-primary text-sm">新增據點</button>
        </div>
      ) : (
        <div className="space-y-4">
          {properties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              contracts={contracts}
              isSelected={selectedProperty?.id === property.id}
              onSelect={() => setSelectedProperty(property)}
              onDelete={() => deleteProperty(property.id)}
              onAddUnit={() => { setSelectedProperty(property); setShowAddUnit(true); }}
              onEditUnit={(unit) => { setSelectedProperty(property); setEditUnit(unit); }}
              onRefresh={fetchAll}
            />
          ))}
        </div>
      )}

      {showAddProperty && <AddPropertyModal onClose={() => setShowAddProperty(false)} onSaved={fetchAll} />}
      {showAddUnit && selectedProperty && (
        <AddUnitModal
          propertyId={selectedProperty.id}
          onClose={() => setShowAddUnit(false)}
          onSaved={() => { setShowAddUnit(false); fetchAll(); }}
        />
      )}
      {editUnit && (
        <EditUnitModal
          unit={editUnit}
          onClose={() => setEditUnit(null)}
          onSaved={() => { setEditUnit(null); fetchAll(); }}
        />
      )}
    </div>
  );
}

function PropertyCard({
  property, contracts, isSelected, onSelect, onDelete, onAddUnit, onEditUnit, onRefresh
}: {
  property: Property;
  contracts: Contract[];
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onAddUnit: () => void;
  onEditUnit: (unit: Unit) => void;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const units = property.units;
  const occupied = units.filter((u) => u.status === 'OCCUPIED').length;
  const totalRent = units.filter((u) => u.status === 'OCCUPIED').reduce((s, u) => s + Number(u.monthlyRent), 0);

  async function deleteUnit(unitId: string) {
    if (!confirm('確定刪除此倉庫？')) return;
    await api.delete(`/units/${unitId}`);
    onRefresh();
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Property header */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-warm/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Building2 className="w-4 h-4 text-brand" />
          </div>
          <div>
            <div className="font-semibold text-gray-800">{property.name}</div>
            <div className="text-xs text-gray-400 mt-0.5">{property.address}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 text-right">
          <div>
            <div className="text-xs text-gray-400">入住 {occupied}/{units.length} 間</div>
            {totalRent > 0 && <div className="text-xs font-medium text-brand">NT${totalRent.toLocaleString()}/月</div>}
          </div>
          <div className="flex gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); onAddUnit(); }}
              className="text-xs px-2 py-1 bg-brand text-white rounded-lg hover:bg-brand-dark transition-colors"
            >
              + 倉庫
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="text-xs px-2 py-1 text-red-400 border border-red-100 rounded-lg hover:bg-red-50 transition-colors"
            >
              刪除
            </button>
          </div>
          <span className={`text-gray-400 text-sm transition-transform ${expanded ? 'rotate-180' : ''}`}>▾</span>
        </div>
      </div>

      {/* Units */}
      {expanded && (
        <div className="border-t border-gray-100">
          {units.length === 0 ? (
            <div className="px-5 py-6 text-center text-gray-400 text-sm">
              尚無倉庫，<button onClick={onAddUnit} className="text-brand hover:underline">新增第一個倉庫</button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {units.map((unit) => {
                const activeContract = contracts.find((c) => c.unitId === unit.id && c.status === 'ACTIVE');
                return (
                  <div key={unit.id} className="flex items-center justify-between px-5 py-3 hover:bg-warm/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${unit.status === 'OCCUPIED' ? 'bg-green-400' : 'bg-gray-300'}`} />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-700 text-sm">{unit.unitNumber}</span>
                          {unit.floor && <span className="text-xs text-gray-400">{unit.floor}F</span>}
                          {unit.tempControl && <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">{unit.tempControl}</span>}
                          {unit.areaPing != null && <span className="text-xs text-gray-400">{Number(unit.areaPing)} 坪</span>}
                          {unit.palletSlots != null && <span className="text-xs text-gray-400">{unit.palletSlots} 棧板位</span>}
                          {unit.hasElectricMeter && <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600">獨立電錶</span>}
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${unit.status === 'OCCUPIED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {unit.status === 'OCCUPIED' ? '已出租' : '空置'}
                          </span>
                        </div>
                        {activeContract?.tenant && (
                          <div className="text-xs text-gray-400 mt-0.5">
                            租客：{activeContract.tenant.name} · {activeContract.tenant.phone}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-semibold text-gray-700 text-sm">NT${Number(unit.monthlyRent).toLocaleString()}</div>
                        {activeContract && (
                          <div className="text-xs text-gray-400">到期 {new Date(activeContract.endDate).toLocaleDateString('zh-TW')}</div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => onEditUnit(unit)} className="text-xs px-2 py-1 border border-gray-200 rounded-lg text-gray-500 hover:border-brand hover:text-brand transition-colors">
                          編輯
                        </button>
                        <button onClick={() => deleteUnit(unit.id)} className="text-xs px-2 py-1 border border-red-100 rounded-lg text-red-400 hover:bg-red-50 transition-colors">
                          刪除
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-5 w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function AddPropertyModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: '', address: '', description: '' });
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await api.post('/properties', form);
    onSaved(); onClose();
  }
  return (
    <Modal title="新增據點" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div><label className="block text-sm font-medium mb-1">據點名稱 <span className="text-red-400">*</span></label><input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
        <div><label className="block text-sm font-medium mb-1">地址 <span className="text-red-400">*</span></label><input className="input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} required /></div>
        <div><label className="block text-sm font-medium mb-1">說明</label><textarea className="input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} /></div>
        <div className="flex gap-2"><button type="button" onClick={onClose} className="btn-secondary flex-1">取消</button><button type="submit" className="btn-primary flex-1">新增</button></div>
      </form>
    </Modal>
  );
}

// 倉庫表單共用欄位
function WarehouseFields({ form, setForm }: { form: any; setForm: (f: any) => void }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <div><label className="block text-sm font-medium mb-1">樓層</label><input type="number" className="input" value={form.floor} onChange={e => setForm({ ...form, floor: e.target.value })} /></div>
        <div><label className="block text-sm font-medium mb-1">面積（坪）</label><input type="number" step="0.01" className="input" value={form.areaPing} onChange={e => setForm({ ...form, areaPing: e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-sm font-medium mb-1">溫控類型</label>
          <select className="input" value={form.tempControl} onChange={e => setForm({ ...form, tempControl: e.target.value })}>
            <option value="">未指定</option>
            <option value="常溫">常溫</option>
            <option value="冷藏">冷藏</option>
            <option value="冷凍">冷凍</option>
            <option value="恆溫恆濕">恆溫恆濕</option>
          </select>
        </div>
        <div><label className="block text-sm font-medium mb-1">棧板位數</label><input type="number" className="input" value={form.palletSlots} onChange={e => setForm({ ...form, palletSlots: e.target.value })} /></div>
      </div>
      <div><label className="block text-sm font-medium mb-1">用途／類型</label><input className="input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} placeholder="一般倉、危險品、保稅倉…" /></div>
      <div className="rounded-xl bg-warm/60 p-3 space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
          <input type="checkbox" className="w-4 h-4" checked={!!form.hasElectricMeter} onChange={e => setForm({ ...form, hasElectricMeter: e.target.checked })} />
          獨立電錶（此倉庫收電費）
        </label>
        {form.hasElectricMeter && (
          <div className="grid grid-cols-2 gap-2">
            <div><label className="block text-xs text-gray-500 mb-1">電費單價（元/度）</label><input type="number" step="0.01" className="input" value={form.electricUnitPrice} onChange={e => setForm({ ...form, electricUnitPrice: e.target.value })} placeholder="例：5" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">目前電錶度數</label><input type="number" step="0.01" className="input" value={form.electricLastReading} onChange={e => setForm({ ...form, electricLastReading: e.target.value })} placeholder="抄表起始值" /></div>
          </div>
        )}
        <p className="text-xs text-gray-400">勾選後，水電帳單可用「獨立電錶（抄表）」模式逐戶計費；未勾選的倉庫不會列入電費抄表。</p>
      </div>
    </>
  );
}

function AddUnitModal({ propertyId, onClose, onSaved }: { propertyId: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ unitNumber: '', floor: '', type: '', monthlyRent: '', areaPing: '', tempControl: '', palletSlots: '', hasElectricMeter: false, electricUnitPrice: '', electricLastReading: '' });
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await api.post(`/properties/${propertyId}/units`, form);
    onSaved(); onClose();
  }
  return (
    <Modal title="新增倉庫" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div><label className="block text-sm font-medium mb-1">倉庫編號 <span className="text-red-400">*</span></label><input className="input" value={form.unitNumber} onChange={e => setForm({ ...form, unitNumber: e.target.value })} required /></div>
        <WarehouseFields form={form} setForm={setForm} />
        <div><label className="block text-sm font-medium mb-1">月租金 <span className="text-red-400">*</span></label><input type="number" className="input" value={form.monthlyRent} onChange={e => setForm({ ...form, monthlyRent: e.target.value })} required /></div>
        <div className="flex gap-2"><button type="button" onClick={onClose} className="btn-secondary flex-1">取消</button><button type="submit" className="btn-primary flex-1">新增</button></div>
      </form>
    </Modal>
  );
}

function EditUnitModal({ unit, onClose, onSaved }: { unit: Unit; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    unitNumber: unit.unitNumber,
    floor: unit.floor ? String(unit.floor) : '',
    type: unit.type ?? '',
    monthlyRent: String(unit.monthlyRent),
    areaPing: unit.areaPing != null ? String(unit.areaPing) : '',
    tempControl: unit.tempControl ?? '',
    palletSlots: unit.palletSlots != null ? String(unit.palletSlots) : '',
    hasElectricMeter: !!unit.hasElectricMeter,
    electricUnitPrice: unit.electricUnitPrice != null ? String(unit.electricUnitPrice) : '',
    electricLastReading: unit.electricLastReading != null ? String(unit.electricLastReading) : '',
  });
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await api.put(`/units/${unit.id}`, form);
    onSaved(); onClose();
  }
  return (
    <Modal title="編輯倉庫" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div><label className="block text-sm font-medium mb-1">倉庫編號</label><input className="input" value={form.unitNumber} onChange={e => setForm({ ...form, unitNumber: e.target.value })} required /></div>
        <WarehouseFields form={form} setForm={setForm} />
        <div><label className="block text-sm font-medium mb-1">月租金</label><input type="number" className="input" value={form.monthlyRent} onChange={e => setForm({ ...form, monthlyRent: e.target.value })} required /></div>
        <div className="flex gap-2"><button type="button" onClick={onClose} className="btn-secondary flex-1">取消</button><button type="submit" className="btn-primary flex-1">儲存</button></div>
      </form>
    </Modal>
  );
}
