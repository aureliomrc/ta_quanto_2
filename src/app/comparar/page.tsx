'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface ItemHistorico {
  id: string;
  data: string;
  mercado: string;
  total: number;
  itens: {
    produto: string;
    quantidade: number;
    precoUnitario: number;
  }[];
}

export default function HistoricoPage() {
  const [historico, setHistorico] = useState<ItemHistorico[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const buscarHistorico = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/historico', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setHistorico(Array.isArray(data) ? data : data.historico || []);
        }
      } catch (err) {
        console.error('Erro ao buscar histórico:', err);
      } finally {
        setCarregando(false);
      }
    };

    buscarHistorico();
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 p-4 max-w-md mx-auto flex flex-col justify-between pb-24 font-sans">
      <div className="space-y-4">
        <header className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <span className="text-2xl">📜</span>
          <h1 className="text-lg font-black text-emerald-700 uppercase tracking-tight">
            Histórico de Escaneamentos
          </h1>
        </header>

        {carregando ? (
          <p className="text-xs font-bold text-slate-500 text-center py-8">Carregando histórico...</p>
        ) : historico.length === 0 ? (
          <div className="bg-white p-6 rounded-2xl text-center border border-slate-200 text-slate-500 text-xs">
            Nenhum escaneamento registrado até o momento.
          </div>
        ) : (
          <div className="space-y-3">
            {historico.map((entry) => (
              /* Estrutura de Cascata/Sanfona usando HTML details/summary */
              <details
                key={entry.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm group"
              >
                <summary className="p-4 font-bold text-xs text-slate-800 cursor-pointer flex justify-between items-center bg-white hover:bg-slate-50 select-none">
                  <div>
                    <p className="font-black text-sm text-slate-900">{entry.mercado}</p>
                    <p className="text-[10px] text-slate-400 font-normal">{entry.data}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-black text-emerald-700 text-sm">
                      R$ {entry.total?.toFixed(2)}
                    </span>
                    <span className="text-slate-400 text-[10px] group-open:rotate-180 transition-transform">
                      ▼
                    </span>
                  </div>
                </summary>

                {/* Conteúdo expandido da cascata */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">
                    Itens Identificados
                  </p>
                  {entry.itens?.map((item, iIdx) => (
                    <div key={iIdx} className="flex justify-between items-center text-xs">
                      <span className="text-slate-700 font-medium">
                        {item.quantidade}x {item.produto}
                      </span>
                      <span className="font-bold text-slate-900">
                        R$ {(item.precoUnitario * item.quantidade).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        )}
      </div>

      {/* Menu Fixo do Rodapé */}
      <nav className="bg-white border-t border-slate-200 px-6 py-3 flex justify-around items-center fixed bottom-0 left-0 right-0 z-10 shadow-lg">
        <Link
          href="/listas"
          className="flex flex-col items-center text-slate-400 text-xs font-bold hover:text-emerald-600"
        >
          <span className="text-base">📋</span> Listas
        </Link>
        <Link
          href="/comparar"
          className="flex flex-col items-center text-slate-400 text-xs font-bold hover:text-emerald-600"
        >
          <span className="text-base">📊</span> Cotação
        </Link>
        <Link
          href="/historico"
          className="flex flex-col items-center text-emerald-600 text-xs font-bold"
        >
          <span className="text-base">📜</span> Histórico
        </Link>
      </nav>
    </div>
  );
}