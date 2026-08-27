'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

export default function LeitorFolhetoPage() {
  const [mercado, setMercado] = useState('Assaí');
  const [regiao, setRegiao] = useState('SUDESTE');
  const [imagemBase64, setImagemBase64] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [cameraAtiva, setCameraAtiva] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Inicia a câmera
  const ligarCamera = async () => {
    try {
      setMensagem('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraAtiva(true);
    } catch (err: any) {
      console.error(err);
      setMensagem('❌ Não foi possível acessar a câmera. Verifique as permissões.');
    }
  };

  // Parar a câmera e desligar a luz do hardware
  const desligarCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraAtiva(false);
  };

  // Garante o desligamento ao sair da página
  useEffect(() => {
    return () => {
      desligarCamera();
    };
  }, []);

  // Captura o frame do vídeo e converte em imagem Base64
  const tirarFoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setImagemBase64(dataUrl);
        desligarCamera();
      }
    }
  };

  const handleEnviar = async () => {
    if (!imagemBase64) return;
    setCarregando(true);
    setMensagem('Analisando imagem com a IA...');

    try {
      const res = await fetch('/api/scan-folheto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagemBase64, mercado, regiao }),
      });

      const data = await res.json();

      if (res.ok) {
        setMensagem(`✅ Sucesso! ${data.totalProcessados || 0} oferta(s) salva(s).`);
        setImagemBase64(null);
      } else {
        setMensagem(`❌ Erro: ${data.error || 'Falha ao processar.'}`);
      }
    } catch (err) {
      setMensagem('❌ Erro de conexão.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 max-w-md mx-auto flex flex-col justify-between pb-24 font-sans">
      <div className="space-y-4">
        <header className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <span className="text-2xl">📷</span>
          <h1 className="text-lg font-black text-emerald-700 uppercase">LEITOR DE FOLHETO (IA)</h1>
        </header>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 shadow-sm">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Mercado</label>
            <input
              type="text"
              value={mercado}
              onChange={(e) => setMercado(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Região</label>
            <select
              value={regiao}
              onChange={(e) => setRegiao(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white"
            >
              <option value="SUDESTE">SUDESTE</option>
              <option value="SUL">SUL</option>
              <option value="NORDESTE">NORDESTE</option>
              <option value="CENTRO-OESTE">CENTRO-OESTE</option>
              <option value="NORTE">NORTE</option>
            </select>
          </div>
        </div>

        {/* CONTAINER DO VÍDEO / PRÉ-VISUALIZAÇÃO */}
        <div className="bg-black rounded-2xl p-3 flex flex-col items-center justify-center min-h-[260px] shadow-lg border border-slate-800 relative overflow-hidden">
          <canvas ref={canvasRef} className="hidden" />

          {imagemBase64 ? (
            <div className="w-full space-y-3 text-center">
              <img src={imagemBase64} alt="Foto Capturada" className="max-h-56 mx-auto rounded-xl object-contain" />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setImagemBase64(null);
                    ligarCamera();
                  }}
                  className="flex-1 bg-slate-700 text-white py-2.5 rounded-xl font-bold text-xs"
                >
                  Refazer
                </button>
                <button
                  type="button"
                  onClick={handleEnviar}
                  disabled={carregando}
                  className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-bold text-xs disabled:opacity-50"
                >
                  {carregando ? 'Enviando...' : 'Analisar Preços'}
                </button>
              </div>
            </div>
          ) : cameraAtiva ? (
            <div className="w-full flex flex-col items-center space-y-3">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full max-h-56 rounded-xl object-cover border border-slate-700"
              />
              <div className="flex gap-2 w-full">
                <button
                  type="button"
                  onClick={desligarCamera}
                  className="flex-1 bg-slate-700 text-white py-2.5 rounded-xl font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={tirarFoto}
                  className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-bold text-xs"
                >
                  📸 Capturar Foto
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={ligarCamera}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 px-8 rounded-2xl text-sm shadow-xl active:scale-95 transition-all"
            >
              📷 Abrir Câmera
            </button>
          )}
        </div>

        {mensagem && (
          <div className="bg-white p-3 rounded-xl border text-center text-xs font-bold text-slate-800 shadow-sm">
            {mensagem}
          </div>
        )}
      </div>

      <nav className="bg-white border-t border-slate-200 px-6 py-3 flex justify-around items-center fixed bottom-0 left-0 right-0 z-10">
        <Link href="/listas" className="flex flex-col items-center text-slate-400 text-xs font-bold">
          <span>📋</span> Listas
        </Link>
        <Link href="/scanner" className="flex flex-col items-center text-emerald-600 text-xs font-bold">
          <span>📷</span> Comparar
        </Link>
        <Link href="/historico" className="flex flex-col items-center text-slate-400 text-xs font-bold">
          <span>📜</span> Histórico
        </Link>
      </nav>
    </div>
  );
}