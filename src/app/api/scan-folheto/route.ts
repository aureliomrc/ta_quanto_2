import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('imagem') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'Nenhuma imagem enviada' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64Image = Buffer.from(bytes).toString('base64');

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [
        {
          inlineData: {
            mimeType: file.type,
            data: base64Image,
          },
        },
        `Analise este folheto de ofertas de supermercado e extraia os produtos e seus respectivos preços.
        Retorne ESTRITAMENTE um JSON válido no seguinte formato sem marcações de código markdown:
        {
          "produtos": [
            { "nome": "Arroz Tipo 1 5kg", "preco": 24.90 }
          ]
        }`
      ],
    });

    const text = response.text || '{}';
    const jsonLimpo = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const dadosExtraidos = JSON.parse(jsonLimpo);

    return NextResponse.json(dadosExtraidos);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Falha no processamento da IA' }, { status: 500 });
  }
}