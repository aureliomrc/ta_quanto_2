'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function HistoricoPage() {
  const [ofertas, setOfertas] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/historico')
      .then(res => res.json())
      .then(data => setOfertas(data.ofertas || []));
  }, []);

  return (
    <div className="min-h-screen bg-[#f4f6f9] flex flex-col justify-between pb-20">
      <header className="bg-white border-b px-4 py-3 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2 text-lg font-black text-[#008744]">
          <span>📜</span> HISTÓRICO DE OFERTAS
        </div>
      </header>

      <main className="flex-1 max-w-lg w-full mx-auto p-4 space-y-4">
        {ofertas.length === 0 ? (
          <div className="bg-white p-6 rounded-2xl text-center text-gray-500 text-xs">
            Nenhum folheto escaneado até o momento.
          </div>
        ) : (
          ofertas.map(item => (
            <div key={item.id} className="bg-white p-4 rounded-2xl border shadow-sm flex justify-between items-center">
              <div>
                <h4 className="font-extrabold text-sm text-gray-800">{item.produto}</h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">
                  🏪 {item.mercado} | 📍 {item.regiao}
                </p>
              </div>
              <span className="text-sm font-black text-[#008744]">
                R$ {item.preco?.toFixed(2)}
              </span>
            </div>
          ))
        )}
      </main>

      {/* Navegação Inferior */}
      <nav className="bg-white border-t border-gray-200 px-6 py-3 flex justify-around items-center fixed bottom-0 left-0 right-0 z-10">
        <Link href="/listas" className="flex flex-col items-center text-gray-400 hover:text-[#008744]">
          <span className="text-xl">📋</span>
          <span className="text-xs font-bold mt-1">Listas</span>
        </Link>
        <Link href="/scanner" className="flex flex-col items-center text-gray-400 hover:text-[#008744]">
          <span className="text-xl">📷</span>
          <span className="text-xs font-bold mt-1">Comparar (Folheto)</span>
        </Link>
        <Link href="/historico" className="flex flex-col items-center text-[#008744]">
          <span className="text-xl">📜</span>
          <span className="text-xs font-bold mt-1">Histórico</span>
        </Link>
      </nav>
    </div>
  );
}