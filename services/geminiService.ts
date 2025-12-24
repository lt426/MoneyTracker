
import { GoogleGenAI } from "@google/genai";
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

  // Create a new GoogleGenAI instance right before making an API call to ensure it always uses the most up-to-date API key.
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
