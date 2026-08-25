'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ListasPage() {
  const router = useRouter();
  const [listas, setListas] = useState([
    { id: '1', nome: 'COMPRAS DO MÊS', itensCount: 7 }
  ]);
  const [novaLista, setNovaLista] = useState('');

  const handleCriar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaLista.trim()) return;
    setListas([...listas, { id: Date.now().toString(), nome: novaLista.toUpperCase(), itensCount: 0 }]);
    setNovaLista('');
  };

  return (
    <div className="min-h-screen bg-[#f4f6f9] flex flex-col justify-between">
      {/* Topo Header */}
      <header className="bg-white border-b px-4 py-3 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2 text-lg font-black text-[#008744]">
          <span>🛒</span> TÁ QUANTO?
        </div>
        <div className="flex items-center gap-3">
          <span className="bg-emerald-100 text-[#008744] text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
            👤 1
          </span>
          <button 
            onClick={() => { localStorage.removeItem('token'); router.push('/login'); }}
            className="text-xs font-bold text-red-500 hover:underline"
          >
            Sair
          </button>
        </div>
      </header>

      {/* Conteúdo Central */}
      <main className="flex-1 max-w-lg w-full mx-auto p-4 space-y-6">
        {/* Card Criar Lista */}
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 space-y-3">
          <div className="flex items-center gap-2 font-bold text-sm text-gray-700">
            <span className="text-lg">+</span> Nova Lista de Compras
          </div>
          <form onSubmit={handleCriar} className="flex gap-2">
            <input
              type="text"
              placeholder="EX: MENSAL, CHURRASCO..."
              value={novaLista}
              onChange={e => setNovaLista(e.target.value)}
              className="flex-1 border border-gray-200 rounded-2xl px-4 py-2.5 text-xs font-semibold focus:outline-none"
            />
            <button
              type="submit"
              className="bg-[#1877f2] hover:bg-[#166fe5] text-white text-xs font-bold px-5 py-2.5 rounded-2xl transition"
            >
              + Criar
            </button>
          </form>
        </div>

        {/* Seção Suas Listas */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-gray-400 tracking-wider">
              SUAS LISTAS ({listas.length})
            </span>
            <button className="text-xs font-bold text-[#1877f2] flex items-center gap-1">
              🔄 Sincronizar
            </button>
          </div>

          {/* Cards das Listas */}
          {listas.map(lista => (
            <div
              key={lista.id}
              className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center cursor-pointer hover:border-gray-200 transition"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">📁</span>
                <span className="font-extrabold text-sm text-gray-800">{lista.nome}</span>
                <span className="bg-blue-50 text-[#1877f2] text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {lista.itensCount} itens
                </span>
              </div>
              <span className="text-gray-400 text-xs">▼</span>
            </div>
          ))}
        </div>
      </main>

      {/* Navegação Inferior */}
      <nav className="bg-white border-t border-gray-200 px-6 py-3 flex justify-around items-center">
        <Link href="/listas" className="flex flex-col items-center text-[#008744]">
          <span className="text-xl">📋</span>
          <span className="text-xs font-bold mt-1">Listas</span>
        </Link>
        <Link href="/scanner" className="flex flex-col items-center text-gray-400 hover:text-[#008744]">
          <span className="text-xl">📊</span>
          <span className="text-xs font-bold mt-1">Comparar</span>
        </Link>
        <div className="flex flex-col items-center text-gray-400 cursor-not-allowed">
          <span className="text-xl">📜</span>
          <span className="text-xs font-bold mt-1">Cupons</span>
        </div>
      </nav>
    </div>
  );
}