'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface ItemFolheto {
  id: string;
  produto: string;
  preco: number;
}

interface Historico {
  id: string;
  mercado: string;
  regiao: string;
  createdAt: string;
  itens: ItemFolheto[];
}

export default function HistoricoComparacaoPage() {
  const [historico, setHistorico] = useState<Historico[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const buscarHistorico = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setCarregando(false);
        return;
      }

      try {
        const res = await fetch('/api/historico', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setHistorico(data);
        }
      } catch (err) {
        console.error('Erro ao carregar histórico:', err);
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
            HISTÓRICO E COMPARAÇÃO
          </h1>
        </header>

        {carregando ? (
          <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center text-xs font-bold text-slate-500 shadow-sm">
            Carregando histórico de ofertas...
          </div>
        ) : historico.length === 0 ? (
          <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center text-xs font-bold text-slate-400 shadow-sm">
            Nenhum folheto bipado ainda. Use a tela de Cotação para registrar ofertas!
          </div>
        ) : (
          <div className="space-y-3">
            {historico.map((h) => (
              <div key={h.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <div>
                    <h3 className="font-bold text-xs text-slate-800">{h.mercado}</h3>
                    <p className="text-[10px] text-slate-400">
                      {h.regiao} • {new Date(h.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <span className="bg-emerald-50 text-emerald-700 font-bold text-[10px] px-2.5 py-1 rounded-full border border-emerald-200">
                    {h.itens?.length || 0} itens bipados
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {h.itens?.map((item) => (
                    <div key={item.id} className="py-1.5 flex justify-between text-xs text-slate-700">
                      <span>{item.produto}</span>
                      <span className="font-bold text-emerald-600">
                        R$ {Number(item.preco).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
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
          <span>📜</span> Histórico
        </Link>
      </nav>
    </div>
  );
}