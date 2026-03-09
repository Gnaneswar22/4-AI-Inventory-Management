import { GoogleGenAI } from "@google/genai";
import { Product, Sale, StockPrediction } from "../types";

// This function prepares a context string for the LLM
export const prepareSystemPrompt = (products: Product[], sales: Sale[], predictions: StockPrediction[]) => {
  return `
    You are the "StockSense" Inventory Assistant. 
    You have access to the following real-time data from the Inventory Management System:

    CURRENT INVENTORY STATUS:
    ${JSON.stringify(products.map(p => ({
    name: p.name,
    stock: p.stockQuantity,
    minLevel: p.minStockLevel,
    price: p.price
  })))}

    RECENT SALES (Last 5 transactions):
    ${JSON.stringify(sales.slice(-5).map(s => ({
    product: s.productName,
    qty: s.quantity,
    total: s.totalPrice,
    customer: s.customerName,
    date: s.date
  })))}

    AI STOCK PREDICTIONS & HEALTH:
    ${JSON.stringify(predictions.map(p => ({
    product: p.productName,
    daysLeft: p.daysRemaining,
    status: p.status
  })))}

    INSTRUCTIONS:
    1. Answer user questions about stock levels, sales, and predictions accurately based ONLY on the data provided above.
    2. If a stock is "Critical" or "Low", warn the user.
    3. Be concise, professional, and helpful. 
    4. If asked to perform an action (like "add product"), explain that you are an analysis bot and they should use the dashboard buttons, but guide them on where to go.
    5. If the user asks a question unrelated to inventory, politely decline.
    6. Use **bold** for product names and key figures to make them stand out.
    7. Use bullet points (* ) for lists of items to ensure they are formatted correctly.
  `;
};

export const sendMessageToGemini = async (
  message: string,
  contextData: { products: Product[], sales: Sale[], predictions: StockPrediction[] }
): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const systemInstruction = prepareSystemPrompt(
      contextData.products,
      contextData.sales,
      contextData.predictions
    );

    const model = ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: message,
      config: {
        systemInstruction: systemInstruction,
      }
    });

    const result = await model;
    return result.text || "I processed that, but couldn't generate a text response.";

  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I'm having trouble connecting to the AI neural network right now. Please try again later.";
  }
};