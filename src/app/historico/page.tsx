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
    precoComparativo?: number; // Preço do mesmo item em outro mercado
  }[];
}

export default function HistoricoPage() {
  const [historico, setHistorico] = useState<ItemHistorico[]>([]);
  const [carregando, setCarregando] = useState(true);

  // Scanner de Câmera
  const [scannerAtivo, setScannerAtivo] = useState(false);

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

  const iniciarScannerDesktop = async () => {
    try {
      setScannerAtivo(true);
      // Solicita permissão da câmera no Desktop e Mobile
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      const videoElement = document.getElementById('webcam-preview') as HTMLVideoElement;
      if (videoElement) {
        videoElement.srcObject = stream;
      }
    } catch (err) {
      alert('Não foi possível acessar a câmera do dispositivo.');
      setScannerAtivo(false);
    }
  };

  const pararScanner = () => {
    const videoElement = document.getElementById('webcam-preview') as HTMLVideoElement;
    if (videoElement && videoElement.srcObject) {
      const stream = videoElement.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }
    setScannerAtivo(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 max-w-md mx-auto flex flex-col justify-between pb-24 font-sans">
      <div className="space-y-4">
        <header className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📜</span>
            <h1 className="text-lg font-black text-emerald-700 uppercase tracking-tight">
              Histórico de Escaneamentos
            </h1>
          </div>
          <button
            onClick={iniciarScannerDesktop}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs"
          >
            📷 Escanear
          </button>
        </header>

        {/* Modal/Area da Câmera para Desktop e Mobile */}
        {scannerAtivo && (
          <div className="bg-black p-3 rounded-2xl relative flex flex-col items-center">
            <video
              id="webcam-preview"
              autoPlay
              playsInline
              className="w-full h-48 object-cover rounded-xl"
            />
            <button
              onClick={pararScanner}
              className="mt-2 bg-red-600 text-white font-bold text-xs py-1 px-4 rounded-lg"
            >
              Fechar Câmera
            </button>
          </div>
        )}

        {carregando ? (
          <p className="text-xs font-bold text-slate-500 text-center py-8">Carregando histórico...</p>
        ) : historico.length === 0 ? (
          <div className="bg-white p-6 rounded-2xl text-center border border-slate-200 text-slate-500 text-xs">
            Nenhum escaneamento registrado até o momento.
          </div>
        ) : (
          <div className="space-y-3">
            {historico.map((entry) => (
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

                {/* Detalhamento dos Itens com Comparação Integrada */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">
                    Itens e Comparação de Preços
                  </p>
                  {entry.itens?.map((item, iIdx) => (
                    <div
                      key={iIdx}
                      className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1"
                    >
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-800 font-bold">
                          {item.quantidade}x {item.produto}
                        </span>
                        <span className="font-black text-slate-900">
                          R$ {(item.precoUnitario * item.quantidade).toFixed(2)}
                        </span>
                      </div>

                      {/* Bloco de Comparação de Preço Integrado */}
                      <div className="flex justify-between items-center text-[10px] pt-1 border-t border-slate-100">
                        <span className="text-slate-500 font-medium">Preço pago:</span>
                        <span className="font-bold text-emerald-700">
                          R$ {item.precoUnitario?.toFixed(2)} un.
                        </span>
                      </div>
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