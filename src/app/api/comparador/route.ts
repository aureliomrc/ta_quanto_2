import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: 'Nenhuma imagem foi enviada.' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Chave GEMINI_API_KEY não encontrada no servidor.' }, { status: 500 });
    }

    // Extrai o MimeType real da imagem (png, jpeg, webp)
    const mimeTypeMatch = imageBase64.match(/^data:(image\/\w+);base64,/);
    const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    // Modelo definido conforme o seu padrão funcional
    const nomeModelo = 'gemini-3.6-flash';

    const model = genAI.getGenerativeModel({
      model: nomeModelo,
    });

    const prompt = `Analise a imagem deste folheto/encarte de ofertas e extraia todos os produtos com seus respetivos preços. 
    Retorne EXCLUSIVAMENTE um array em formato JSON estrito, sem textos explicativos ou blocos adicionais, com o seguinte padrão:
    [{"produto": "Nome do Produto", "preco": 10.90}]`;

    const imageParts = [
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType,
        },
      },
    ];

    const result = await model.generateContent([prompt, ...imageParts]);
    const responseText = result.response.text();

    // Remove eventuais formatações Markdown da resposta da IA
    const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

    const produtos = JSON.parse(cleanedText);

    return NextResponse.json({ result: produtos });
  } catch (error: any) {
    console.error('Erro detalhado da API Gemini:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro ao processar imagem com a IA.' },
      { status: 500 }
    );
  }
}