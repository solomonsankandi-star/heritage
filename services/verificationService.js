// In: services/verificationService.js

const { GoogleGenerativeAI } = require("@google/generative-ai");

// Ensure you have your Gemini API key in the .env file
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Verifies a historical fact using the Gemini API and Wikipedia as a source.
 * @param {string} factText The historical fact to verify.
 * @param {string} townName The specific town context for the fact-check.
 * @returns {Promise<boolean>} A promise that resolves to true if the fact is verified, otherwise false.
 */
async function verifyHistoricalFact(factText, townName) {
  if (!factText || factText.trim() === '' || !townName) {
    return false;
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
    
    // --- THE FIX IS HERE: The prompt is now context-specific ---
    // It instructs the AI to check the fact in relation to the specific town.
    const prompt = `
      Please act as a historical fact-checker. Your only source of information is Wikipedia.
      Analyze the following statement about the history of ${townName}, Namibia.
      Respond with "Yes" if the statement is verifiably true according to Wikipedia, specifically in relation to that town.
      Respond with "No" if the statement is verifiably false, cannot be confirmed, or is not related to ${townName}.
      Do not provide any explanation or additional text, only "Yes" or "No".

      Statement: "${factText}"
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();

    return text.toLowerCase() === 'yes';

  } catch (error)
  {
    console.error("Gemini API Error during fact verification:", error);
    // In case of an API error, we default to not verifying the fact
    return false;
  }
}

module.exports = { verifyHistoricalFact };