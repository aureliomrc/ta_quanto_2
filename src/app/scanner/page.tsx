'use client';
import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ScannerPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [imagem, setImagem] = useState<string | null>(null);
  const [mercado, setMercado] = useState('');
  const [regiao, setRegiao] = useState('SUDESTE');
  const [carregando, setCarregando] = useState(false);
  const [cameraAtiva, setCameraAtiva] = useState(false);

  // Ativar Câmera
  const abrirCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraAtiva(true);
      }
    } catch (err) {
      alert('Não foi possível acessar a câmera do aparelho.');
    }
  };

  // Capturar Foto
  const tirarFoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    setImagem(canvas.toDataURL('image/jpeg'));
    setCameraAtiva(false);
  };

  // Processar com Gemini e Salvar no Histórico
  const processarEGuardar = async () => {
    if (!imagem || !mercado.trim()) {
      alert('Por favor, informe o nome do mercado e tire uma foto do folheto.');
      return;
    }

    setCarregando(true);
    try {
      const blob = await (await fetch(imagem)).blob();
      const formData = new FormData();
      formData.append('imagem', blob, 'folheto.jpg');
      formData.append('mercado', mercado);
      formData.append('regiao', regiao);

      const res = await fetch('/api/scan-folheto', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        alert('Folheto processado e ofertas salvas no histórico com sucesso!');
        router.push('/historico');
      } else {
        alert('Falha ao extrair dados do folheto.');
      }
    } catch (err) {
      alert('Erro ao enviar a imagem.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f6f9] flex flex-col justify-between pb-20">
      <header className="bg-white border-b px-4 py-3 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2 text-lg font-black text-[#008744]">
          <span>📷</span> LEITOR DE FOLHETO (IA)
        </div>
      </header>

      <main className="flex-1 max-w-lg w-full mx-auto p-4 space-y-4">
        {/* Formulário de Dados do Mercado */}
        <div className="bg-white p-4 rounded-2xl border space-y-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Nome Fantasia do Mercado</label>
            <input
              type="text"
              placeholder="Ex: Supermercado Carrefour, Extra..."
              value={mercado}
              onChange={e => setMercado(e.target.value)}
              className="w-full border p-2.5 text-xs rounded-xl focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Região do Folheto</label>
            <select
              value={regiao}
              onChange={e => setRegiao(e.target.value)}
              className="w-full border p-2.5 text-xs rounded-xl focus:outline-none bg-white"
            >
              <option value="SUL">SUL</option>
              <option value="SUDESTE">SUDESTE</option>
              <option value="NORTE">NORTE</option>
              <option value="NORDESTE">NORDESTE</option>
              <option value="CENTRO_OESTE">CENTRO_OESTE</option>
            </select>
          </div>
        </div>

        {/* Visor / Preview */}
        <div className="bg-black rounded-2xl overflow-hidden relative min-h-[250px] flex items-center justify-center">
          {!imagem && !cameraAtiva && (
            <button onClick={abrirCamera} className="bg-[#008744] text-white font-bold text-xs px-4 py-3 rounded-xl">
              Abrir Câmera do Celular
            </button>
          )}

          {cameraAtiva && (
            <div className="w-full text-center space-y-2">
              <video ref={videoRef} autoPlay playsInline className="w-full h-64 object-cover" />
              <button onClick={tirarFoto} className="bg-red-600 text-white font-bold text-xs px-6 py-2 rounded-full my-2">
                Tirar Foto 📸
              </button>
            </div>
          )}

          {imagem && (
            <div className="w-full space-y-2">
              <img src={imagem} alt="Folheto" className="w-full h-64 object-cover" />
              <button onClick={() => setImagem(null)} className="w-full bg-gray-700 text-white text-xs py-2 font-bold">
                Tirar Outra Foto
              </button>
            </div>
          )}
        </div>

        {/* Botão de envio */}
        {imagem && (
          <button
            onClick={processarEGuardar}
            disabled={carregando}
            className="w-full bg-[#008744] hover:bg-[#007038] text-white font-bold py-3.5 rounded-2xl shadow-md transition text-xs"
          >
            {carregando ? 'Gemini IA Analisando Folheto...' : 'Extrair Produtos e Salvar no Histórico'}
          </button>
        )}
      </main>

      {/* Navegação Inferior */}
      <nav className="bg-white border-t border-gray-200 px-6 py-3 flex justify-around items-center fixed bottom-0 left-0 right-0 z-10">
        <Link href="/listas" className="flex flex-col items-center text-gray-400 hover:text-[#008744]">
          <span className="text-xl">📋</span>
          <span className="text-xs font-bold mt-1">Listas</span>
        </Link>
        <Link href="/scanner" className="flex flex-col items-center text-[#008744]">
          <span className="text-xl">📷</span>
          <span className="text-xs font-bold mt-1">Comparar (Folheto)</span>
        </Link>
        <Link href="/historico" className="flex flex-col items-center text-gray-400 hover:text-[#008744]">
          <span className="text-xl">📜</span>
          <span className="text-xs font-bold mt-1">Histórico</span>
        </Link>
      </nav>
    </div>
  );
}