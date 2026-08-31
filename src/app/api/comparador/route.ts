import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: 'Nenhuma imagem foi enviada' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Analise a imagem deste folheto de supermercado e retorne APENAS um array JSON válido, sem formatação markdown ou textos adicionais, contendo os produtos e preços. 
    Exemplo de resposta esperada: [{"produto": "Arroz 5kg", "preco": 24.90}]`;

    const base64Clean = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const imageParts = [
      {
        inlineData: {
          data: base64Clean,
          mimeType: 'image/jpeg',
        },
      },
    ];

    const result = await model.generateContent([prompt, ...imageParts]);
    let responseText = result.response.text();

    // Limpa tags de código markdown caso a IA retorne
    responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

    const produtos = JSON.parse(responseText);

    return NextResponse.json({ result: produtos });
  } catch (error: any) {
    console.error('Erro na leitura do folheto:', error);
    return NextResponse.json({ error: 'Falha ao processar folheto com a IA.' }, { status: 500 });
  }
}