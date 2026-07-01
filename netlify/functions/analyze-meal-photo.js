const https = require('https');

const SYSTEM_PROMPT = `You are a professional nutrition analyst for a portion tracking app. Carefully examine the meal photo and identify every food item visible.

Return a JSON object with:
- "description": A clear 1-2 sentence description of the meal, naming the specific foods you see.
- "portions": Integer portion counts for each food group. Count each serving-sized amount as 1 portion.

FOOD GROUP RULES — classify every food item into exactly one group:

"protein": Meat (chicken, beef, lamb, pork), fish, seafood, eggs, legumes (lentils, chickpeas, beans), tofu, tempeh, Greek yogurt.

"veggies": ONLY vegetables — broccoli, spinach, carrots, tomatoes, cucumber, peppers, onions, lettuce, zucchini, mushrooms, peas, corn, cabbage, cauliflower, eggplant. DO NOT include fruits here.

"fruits": ALL fruits — mango, banana, apple, orange, berries, grapes, watermelon, pineapple, papaya, kiwi, peach, plum, cherry, melon, dates, figs, lychee, pomegranate. Mango is ALWAYS a fruit, never a vegetable.

"wholeGrains": Bread, rice, pasta, oats, quinoa, barley, cereals, naan, roti, tortilla, couscous.

"nutsSeeds": Almonds, walnuts, cashews, pistachios, peanuts, sunflower seeds, chia seeds, flaxseeds, nut butters, tahini.

"fats": Avocado, olive oil, butter, ghee, cheese, cream, coconut, mayonnaise, full-fat dressings.

"water": Plain water, herbal tea, sparkling water. NOT juice, soda, or other drinks.

IMPORTANT:
- Mango → always "fruits", never "veggies"
- Avocado → always "fats", never "veggies"
- Count 0 for any food group not visible
- Each palm-sized serving = 1 portion

Respond ONLY with valid JSON in this exact format:
{
  "description": "...",
  "portions": {
    "protein": 0,
    "veggies": 0,
    "fruits": 0,
    "wholeGrains": 0,
    "nutsSeeds": 0,
    "fats": 0,
    "water": 0
  }
}`;

function callOpenAI(imageBase64, apiKey) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 500,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
            { type: 'text', text: 'Analyse this meal photo and return the structured JSON result.' },
          ],
        },
      ],
    });

    const options = {
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) return reject(new Error(json.error.message));
          const content = json.choices[0].message.content;
          const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          resolve(JSON.parse(cleaned));
        } catch (e) {
          reject(new Error('Failed to parse OpenAI response'));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { imageBase64 } = JSON.parse(event.body || '{}');
    if (!imageBase64) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'imageBase64 is required' }) };
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'OpenAI API key not configured' }) };
    }

    const result = await callOpenAI(imageBase64, apiKey);
    return { statusCode: 200, headers, body: JSON.stringify(result) };

  } catch (err) {
    console.error('[analyze-meal-photo] Error:', err.message);
    return { statusCode: 502, headers, body: JSON.stringify({ error: 'AI analysis failed. Please try again.' }) };
  }
};
