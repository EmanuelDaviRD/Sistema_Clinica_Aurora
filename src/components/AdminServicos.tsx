import React, { useState, useEffect } from 'react';
import { Trash2, Edit, Plus, FileText, Activity, HeartPulse } from 'lucide-react';

export const AdminServicos: React.FC<{ token: string | null }> = ({ token }) => {
  const [subTab, setSubTab] = useState<'checkups' | 'exames_imagem' | 'exames_lab'>('checkups');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({ nome: '', preco: '', instrucoes_preparo: '', descricao: '' });
  const [editingId, setEditingId] = useState<number | null>(null);

  const getEndpoint = () => {
    if (subTab === 'checkups') return '/api/checkups';
    if (subTab === 'exames_imagem') return '/api/exames/imagem';
    return '/api/exames/laboratorial';
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(getEndpoint(), { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setItems(data);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, [subTab]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `${getEndpoint()}/${editingId}` : getEndpoint();
      const payload = { ...formData };
      
      if (subTab !== 'checkups' && payload.preco) {
        payload.preco = parseFloat(payload.preco);
      }

      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      setIsModalOpen(false);
      fetchItems();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Deseja realmente excluir este serviço?')) return;
    try {
      await fetch(`${getEndpoint()}/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchItems();
    } catch (error) {
      console.error(error);
    }
  };

  const openForm = (item?: any) => {
    if (item) {
      setEditingId(item.id);
      setFormData({
        nome: item.nome,
        preco: item.preco?.toString() || '',
        instrucoes_preparo: item.instrucoes_preparo || '',
        descricao: item.descricao || ''
      });
    } else {
      setEditingId(null);
      setFormData({ nome: '', preco: '', instrucoes_preparo: '', descricao: '' });
    }
    setIsModalOpen(true);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs p-6">
      <div className="flex border-b pb-4 mb-4 gap-4">
        <button onClick={() => setSubTab('checkups')} className={`px-4 py-2 text-sm font-bold rounded-lg ${subTab === 'checkups' ? 'bg-[#0A2B2A] text-white' : 'bg-slate-100 text-slate-600'}`}>Check-ups</button>
        <button onClick={() => setSubTab('exames_imagem')} className={`px-4 py-2 text-sm font-bold rounded-lg ${subTab === 'exames_imagem' ? 'bg-[#0A2B2A] text-white' : 'bg-slate-100 text-slate-600'}`}>Exames Imagem</button>
        <button onClick={() => setSubTab('exames_lab')} className={`px-4 py-2 text-sm font-bold rounded-lg ${subTab === 'exames_lab' ? 'bg-[#0A2B2A] text-white' : 'bg-slate-100 text-slate-600'}`}>Exames Laboratoriais</button>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold uppercase text-[#0A2B2A] tracking-wider">Catálogo</h3>
        <button onClick={() => openForm()} className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2"><Plus className="w-4 h-4"/> Novo</button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500 py-10 text-center">Carregando...</p>
      ) : (
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="text-[#0A2B2A] border-b-2 border-slate-100">
            <tr>
              <th className="py-2.5">Nome</th>
              <th className="py-2.5">Preço</th>
              <th className="py-2.5">Instruções</th>
              <th className="py-2.5 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map(item => (
              <tr key={item.id} className="hover:bg-slate-50/50">
                <td className="py-3 font-semibold text-slate-800">{item.nome}</td>
                <td className="py-3 font-mono">{item.preco}</td>
                <td className="py-3 max-w-[200px] truncate">{item.instrucoes_preparo || '-'}</td>
                <td className="py-3 flex justify-center gap-2">
                  <button onClick={() => openForm(item)} className="text-blue-500 bg-blue-50 p-1.5 rounded-lg"><Edit className="w-4 h-4"/></button>
                  <button onClick={() => handleDelete(item.id)} className="text-red-500 bg-red-50 p-1.5 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-[#0A2B2A] mb-4">{editingId ? 'Editar' : 'Novo'} Serviço</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600">Nome</label>
                <input required type="text" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600">Preço</label>
                <input type="text" value={formData.preco} onChange={e => setFormData({...formData, preco: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600">Descrição (JSON ou Texto)</label>
                <textarea value={formData.descricao} onChange={e => setFormData({...formData, descricao: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 h-20" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600">Instruções de Preparo</label>
                <textarea value={formData.instrucoes_preparo} onChange={e => setFormData({...formData, instrucoes_preparo: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 h-20" />
              </div>
              <div className="flex gap-2 justify-end mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-xs font-bold text-white bg-emerald-500 rounded-lg">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
