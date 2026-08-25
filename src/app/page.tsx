import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-md p-6 space-y-6 text-center">
        <h1 className="text-3xl font-bold text-gray-800">Comparador de Preços</h1>
        <p className="text-gray-600">Economize nas compras de supermercado com ofertas via Crowdsourcing.</p>
        
        <div className="flex flex-col gap-3">
          <Link href="/cadastro" className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition">
            Criar Conta
          </Link>
          <Link href="/login" className="w-full py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-100 transition">
            Já tenho uma conta
          </Link>
          <Link href="/scanner" className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition">
            Escanear Folheto (IA)
          </Link>
        </div>
      </div>
    </main>
  );
}