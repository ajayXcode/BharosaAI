import { SarvamAIClient } from "sarvamai";

const apiKey = process.env.SARVAM_API_KEY;
if (!apiKey) {
  console.error("SARVAM_API_KEY is missing. Add it to .env and rerun with --env-file=.env");
  process.exit(1);
}

const client = new SarvamAIClient({ apiSubscriptionKey: apiKey });

const response = await client.chat.completions({
  model: "sarvam-105b-conversations",
  messages: [
    {
      role: "user",
      content: "In one short sentence, what does Bharosa AI do for a loan borrower?",
    },
  ],
});

console.log(response.choices[0]?.message?.content ?? JSON.stringify(response));
