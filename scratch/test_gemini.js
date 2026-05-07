const apiKey = "AIzaSyAvafZO9fW9O_7eyHKs6Y78F7ohBDvlie4";

const targetLanguages = ['en', 'th', 'id', 'vi', 'tl', 'es', 'fr', 'de', 'it', 'pt'];
const fields = [{ key: 'name', value: '瑪格麗特' }];

const prompt = `
  You are a professional translator for a global food ordering platform.
  Translate the following fields into these languages: ${targetLanguages.join(', ')}.
  
  Fields:
  ${fields.map(f => `${f.key}: "${f.value}"`).join('\n')}
  
  Return ONLY a valid JSON object where keys are the field keys, and values are objects mapping language codes to translations.
  
  Example output:
  {
    "name": { "en": "Pizza", "th": "..." },
    "description": { "en": "Good pizza", "th": "..." }
  }
`;

fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      response_mime_type: "application/json",
    }
  })
})
.then(res => res.json())
.then(data => {
  console.log("Raw Response:");
  console.log(JSON.stringify(data, null, 2));
  
  const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  console.log("\nResult Text:", resultText);
})
.catch(console.error);
