import { z } from 'zod';
import { generateObject } from 'ai';
import { gateway } from '@specific-dev/framework';
import type { App } from '../index.js';

// Response shape returned to the app. Mirrors MealPortionSuggestions on the client.
const PortionSchema = z.object({
  description: z.string(),
  portions: z.object({
    protein: z.number().int(),
    veggies: z.number().int(),
    fruits: z.number().int(),
    wholeGrains: z.number().int(),
    nutsSeeds: z.number().int(),
    fats: z.number().int(),
    water: z.number().int(),
  }),
});

const SYSTEM_PROMPT = `You are a professional nutrition analyst for a portion tracking app. Carefully examine the meal photo and identify every food item visible.

Return a JSON object with:
- "description": A clear 1-2 sentence description of the meal, naming the specific foods you see (e.g. "A plate of grilled salmon with steamed broccoli, mango slices, and brown rice.").
- "portions": Integer portion counts for each food group. Count each serving-sized amount as 1 portion.

FOOD GROUP RULES — classify every food item into exactly one group:

"protein": Meat (chicken, beef, lamb, pork), fish, seafood, eggs, legumes (lentils, chickpeas, beans), tofu, tempeh, Greek yogurt.

"veggies": ONLY vegetables — broccoli, spinach, carrots, tomatoes, cucumber, peppers, onions, lettuce, zucchini, mushrooms, peas, corn, cabbage, cauliflower, eggplant. DO NOT include fruits here.

"fruits": ALL fruits — mango, banana, apple, orange, berries, grapes, watermelon, pineapple, papaya, kiwi, peach, plum, cherry, melon, dates, figs, lychee, pomegranate, passion fruit, guava. Mango is ALWAYS a fruit, never a vegetable.

"wholeGrains": Bread, rice, pasta, oats, quinoa, barley, cereals, naan, roti, tortilla, couscous.

"nutsSeeds": Almonds, walnuts, cashews, pistachios, peanuts, sunflower seeds, chia seeds, flaxseeds, nut butters, tahini.

"fats": Avocado, olive oil, butter, ghee, cheese, cream, coconut, mayonnaise, full-fat dressings.

"water": Plain water, herbal tea, sparkling water. NOT juice, soda, or other drinks.

IMPORTANT:
- If you see a mango → count it under "fruits", never "veggies"
- If you see avocado → count it under "fats", never "veggies"
- If you cannot identify a food item clearly, make your best professional judgment
- Count 0 for any food group not visible in the image
- Each palm-sized serving = 1 portion`;

export function registerAnalyzeMealPhotoRoute(app: App) {
  app.post('/analyze-meal-photo', async (request, reply) => {
    const { imageBase64 } = (request.body ?? {}) as { imageBase64?: string };

    if (!imageBase64) {
      return reply.code(400).send({ error: 'imageBase64 is required' });
    }

    app.logger.info('Analysing meal photo');

    try {
      const { object } = await generateObject({
        model: gateway('openai/gpt-4o'),
        schema: PortionSchema,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', image: Buffer.from(imageBase64, 'base64'), mimeType: 'image/jpeg' },
              { type: 'text', text: 'Analyse this meal and return the structured result.' },
            ],
          },
        ],
      });

      return object;
    } catch (err) {
      app.logger.error({ err }, 'Meal photo analysis failed');
      return reply.code(502).send({ error: 'AI analysis failed. Please try again.' });
    }
  });
}
