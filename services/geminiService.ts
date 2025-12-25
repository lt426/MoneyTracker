
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, Category, Budget } from '../types';

export async function getFinancialInsights(
  transactions: Transaction[],
  categories: Category[],
  budgets: Budget[]
): Promise<string> {
  if (transactions.length === 0) return "Add some transactions to get AI-powered insights!";

  const categoryMap = categories.reduce((acc, cat) => ({ ...acc, [cat.id]: cat.name }), {});
  
  const summary = transactions.map(t => ({
    amount: t.amount,
    type: t.type,
    category: categoryMap[t.categoryId] || 'Unknown',
    date: t.timestamp.split('T')[0]
  }));

  const budgetSummary = budgets.map(b => ({
    category: categoryMap[b.categoryId],
    limit: b.amount
  }));

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Based on my recent financial activity, provide a short (max 150 words), friendly, and actionable insight. 
      Transactions: ${JSON.stringify(summary.slice(-20))}
      Budgets: ${JSON.stringify(budgetSummary)}`,
      config: {
        systemInstruction: "You are a friendly personal finance expert. Provide concise, encouraging, and helpful advice based on the user's spending habits. If they are under budget, praise them. If over, suggest one small way to save.",
        temperature: 0.7,
      },
    });

    return response.text || "I'm analyzing your spending... Stay tuned for insights!";
  } catch (error) {
    console.error("Gemini Insights Error:", error);
    return "Insights are currently unavailable, but your progress looks great!";
  }
}

export async function processReceipt(
  base64Image: string,
  mimeType: string,
  availableCategories: Category[]
) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const categoryNames = availableCategories.map(c => `${c.id}:${c.name}`).join(', ');

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          inlineData: {
            data: base64Image,
            mimeType: mimeType
          }
        },
        {
          text: `Analyze this receipt. 
          1. Detect the purchase date.
          2. List all significant items or groups of items. 
          3. For each item/group, suggest the best matching category ID from this list: [${categoryNames}].
          Return a JSON object with a 'date' field and an 'items' array. Each item should have 'amount', 'note', and 'categoryId'.`
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            date: { type: Type.STRING, description: "The date of purchase in YYYY-MM-DD format." },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  amount: { type: Type.NUMBER, description: "The item price or subtotal." },
                  note: { type: Type.STRING, description: "The item name or category description." },
                  categoryId: { type: Type.STRING, description: "The ID of the best matching category." }
                },
                required: ["amount", "note", "categoryId"]
              }
            }
          },
          required: ["date", "items"]
        },
        systemInstruction: "You are a receipt scanning expert. If a receipt has multiple different types of items (e.g., groceries and electronics), break them down. If it's a simple receipt, return the total as a single item. Be precise with numbers. If the date is missing, use today's date."
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Gemini OCR Error:", error);
    throw new Error("Failed to scan receipt. Please try again or enter manually.");
  }
}
