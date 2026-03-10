import { Router } from 'express';
import OpenAI from 'openai';

const router = Router();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.post('/symptom-guidance', async (req, res) => {
  try {
    const { bodyParts, symptoms, duration, severity } = req.body ?? {};

    if (!Array.isArray(bodyParts) || bodyParts.length === 0) {
      return res.status(400).send('bodyParts is required');
    }
    if (typeof symptoms !== 'string' || symptoms.trim().length < 5) {
      return res.status(400).send('symptoms is required');
    }
    if (typeof duration !== 'string' || !duration) {
      return res.status(400).send('duration is required');
    }
    if (typeof severity !== 'string' || !severity) {
      return res.status(400).send('severity is required');
    }

    const bodyPartLabels: Record<string, string> = {
      head: 'Head',
      chest: 'Chest',
      stomach: 'Stomach',
      'left-arm': 'Left Arm',
      'right-arm': 'Right Arm',
    };

    const selected = bodyParts
      .map((id: string) => bodyPartLabels[id] || id)
      .join(', ');

    const system = `
You are a health information assistant inside a symptom checker.
Rules:
- General guidance only. Not a diagnosis.
- Be conservative and safety-focused.
- If chest pain, shortness of breath, fainting, confusion, severe headache, or neurological symptoms are present, emphasize urgent evaluation.
- Do NOT provide medical diagnosis.
Return ONLY valid JSON matching the schema.
`;

    const schema = `
Return JSON exactly in this shape:
{
  "urgencyLevel": "Emergency" | "Urgent" | "Soon" | "Self-care",
  "urgencyTitle": string,
  "urgencyMessage": string,
  "possibleCauses": [{ "name": string, "likelihood": "Common"|"Possible"|"Less Likely", "reasoning": string }],
  "selfCareTips": string[],
  "redFlags": string[],
  "nextSteps": string[],
  "disclaimer": string
}
Limits: max 3 causes, 5 tips, 5 red flags, 4 nextSteps.
`;

    const user = `
User symptom input:
- Where it hurts: ${selected}
- Duration: ${duration}
- Severity: ${severity}
- Description: ${symptoms}

${schema}
`;

    const response = await client.responses.create({
      model: 'gpt-4.1-mini',
      input: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.4,
    });

    const text = response.output_text?.trim() || '';
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    const jsonStr =
      firstBrace !== -1 && lastBrace !== -1 ? text.slice(firstBrace, lastBrace + 1) : text;

    const result = JSON.parse(jsonStr);

    return res.json({ result });
  } catch (err) {
    console.error('AI symptom guidance error:', err);
    return res.status(500).send('AI guidance failed');
  }
});

export default router;
