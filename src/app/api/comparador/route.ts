import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { imageBase64 } = await req.json();

    // Atualizado para a versão 3.6 Flash
    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });

    const prompt = 'Extraia todos os produtos e preços no formato JSON: [{"produto": "", "preco": 0.00}]';

    const imageParts = [
      {
        inlineData: {
          data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
          mimeType: 'image/jpeg',
        },
      },
    ];

    const result = await model.generateContent([prompt, ...imageParts]);
    const responseText = result.response.text();

    return NextResponse.json({ result: JSON.parse(responseText) });
  } catch (error: any) {
    console.error('Erro na leitura do folheto:', error);
    return NextResponse.json({ error: 'Erro ao processar imagem do folheto.' }, { status: 500 });
  }
}