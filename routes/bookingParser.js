const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

async function parseBooking(driverMessage) {

    const prompt = `
You extract booking information from driver messages.

Return ONLY valid JSON with exactly these fields:

{
    "vehicle_type": null,
    "pickup_city": null,
    "pickup_state": null,
    "drop_city": null,
    "drop_state": null
}

Rules:
- "A to B" means A is pickup and B is drop.
- "from A to B" means A is pickup and B is drop.
- Identify vehicle type if present.
- Recognize common spelling mistakes and abbreviations.
- Convert recognized Indian cities to their correct state or UT.
- Ignore people's names and unrelated words.
- "Airport" does not change the city.
- Do not guess if a location is genuinely ambiguous.

Driver message:
${driverMessage}
`;

    const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json"
        }
    });

    return JSON.parse(response.text);
}

module.exports = {
    parseBooking
};
