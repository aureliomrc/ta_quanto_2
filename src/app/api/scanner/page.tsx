'use client';
import { useState, useRef } from 'react';

export default function ScannerFolheto() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [imagemCapturada, setImagemCapturada] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [produtosExtraidos, setProdutosExtraidos] = useState<any[]>([]);

  // Ativar Câmera do Celular
  const iniciarCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Câmera traseira
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert('Erro ao acessar a câmera: ' + err);
    }
  };

  // Tirar Foto
  const tirarFoto = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg');
    setImagemCapturada(dataUrl);
  };

  // Enviar para API Gemini
  const processarFolheto = async () => {
    if (!imagemCapturada) return;
    setCarregando(true);

    const blob = await (await fetch(imagemCapturada)).blob();
    const formData = new FormData();
    formData.append('imagem', blob, 'folheto.jpg');

    const res = await fetch('/api/scan-folheto', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    setProdutosExtraidos(data.produtos || []);
    setCarregando(false);
  };

  return (
    <div className="p-4 max-w-md mx-auto space-y-4">
      <h1 className="text-xl font-bold">Digitalizar Folheto de Ofertas</h1>

      {!imagemCapturada ? (
        <div className="space-y-2">
          <video ref={videoRef} autoPlay playsInline className="w-full h-64 bg-black rounded" />
          <button onClick={iniciarCamera} className="w-full bg-gray-200 p-2 rounded">Abrir Câmera</button>
          <button onClick={tirarFoto} className="w-full bg-blue-600 text-white p-2 rounded">Tirar Foto</button>
        </div>
      ) : (
        <div className="space-y-2">
          <img src={imagemCapturada} alt="Folheto" className="w-full h-64 object-cover rounded" />
          <button onClick={() => setImagemCapturada(null)} className="w-full bg-gray-400 text-white p-2 rounded">Refazer Foto</button>
          <button onClick={processarFolheto} className="w-full bg-green-600 text-white p-2 rounded" disabled={carregando}>
            {carregando ? 'IA Extraindo Dados...' : 'Extrair Ofertas com IA'}
          </button>
        </div>
      )}

      {produtosExtraidos.length > 0 && (
        <div className="mt-6 border p-4 rounded bg-white">
          <h2 className="font-semibold text-lg mb-2">Produtos Identificados:</h2>
          <ul className="divide-y">
            {produtosExtraidos.map((prod, idx) => (
              <li key={idx} className="py-2 flex justify-between">
                <span>{prod.nome}</span>
                <span className="font-bold">R$ {prod.preco?.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}