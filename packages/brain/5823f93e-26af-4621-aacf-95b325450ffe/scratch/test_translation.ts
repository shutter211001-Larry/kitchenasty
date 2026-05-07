import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

async function testTranslation() {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('API KEY NOT FOUND');
        return;
    }

    const targetLanguages = ['en', 'ja', 'ko', 'th'];
    const fields = [{ key: 'name', value: '豬肉' }];

    const prompt = `
    You are a professional translator for a global food ordering platform.
    Translate the following fields into these languages: ${targetLanguages.join(', ')}.
    
    Fields:
    ${fields.map(f => `${f.key}: "${f.value}"`).join('\n')}
    
    Return ONLY a valid JSON object where keys are the field keys, and values are objects mapping language codes to translations.
    
    Example output:
    {
      "name": { "en": "Pizza", "th": "..." }
    }
  `;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    response_mime_type: "application/json",
                }
            })
        });

        const data: any = await response.json();
        console.log('RAW DATA:', JSON.stringify(data, null, 2));
        const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        console.log('RESULT TEXT:', resultText);
    } catch (error) {
        console.error('FAILED:', error);
    }
}

testTranslation();
