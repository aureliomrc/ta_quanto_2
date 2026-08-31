'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface Oferta {
  id: string;
  produto: string;
  preco: number;
  mercado: string;
  regiao: string;
  createdAt: string;
}

export default function HistoricoComparacaoPage() {
  const [ofertas, setOfertas] = useState<Oferta[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const buscarOfertas = async () => {
      try {
        const res = await fetch('/api/historico');
        if (res.ok) {
          const data = await res.json();
          setOfertas(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Erro ao carregar histórico:', err);
      } finally {
        setCarregando(false);
      }
    };

    buscarOfertas();
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 p-4 max-w-md mx-auto flex flex-col justify-between pb-24 font-sans">
      <div className="space-y-4">
        <header className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <span className="text-2xl">📊</span>
          <h1 className="text-lg font-black text-emerald-700 uppercase tracking-tight">
            COMPARAÇÃO/HISTÓRICO
          </h1>
        </header>

        {carregando ? (
          <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center text-xs font-bold text-slate-500 shadow-sm">
            Carregando ofertas salvas...
          </div>
        ) : ofertas.length === 0 ? (
          <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center text-xs font-bold text-slate-400 shadow-sm">
            Nenhuma oferta bipada no banco de dados ainda.
          </div>
        ) : (
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Ofertas Bipadas Recentes
            </h2>
            <div className="divide-y divide-slate-100 space-y-1">
              {ofertas.map((item) => (
                <div key={item.id} className="pt-2 flex justify-between items-center text-xs">
                  <div>
                    <p className="font-bold text-slate-800">{item.produto}</p>
                    <p className="text-[10px] text-slate-400">
                      {item.mercado} ({item.regiao}) • {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <span className="font-black text-emerald-700 text-sm">
                    R$ {Number(item.preco).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <nav className="bg-white border-t border-slate-200 px-6 py-3 flex justify-around items-center fixed bottom-0 left-0 right-0 z-10">
        <Link href="/listas" className="flex flex-col items-center text-slate-400 text-xs font-bold">
          <span>📋</span> Listas
        </Link>
        <Link href="/comparar" className="flex flex-col items-center text-slate-400 text-xs font-bold">
          <span>🏷️</span> Cotação
        </Link>
        <Link href="/historico" className="flex flex-col items-center text-emerald-600 text-xs font-bold">
          <span>📊</span> Comparação/Histórico
        </Link>
      </nav>
    </div>
  );
}