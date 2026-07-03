import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Gemini client on the server
  const apiKey = process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("WARNING: GEMINI_API_KEY environment variable is not set. Please set it in Settings > Secrets.");
  }

  const ai = new GoogleGenAI({
    apiKey: apiKey || "MOCK_KEY_IF_UNDEFINED",
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API endpoint for chatbot and game ending analysis
  app.post("/api/coach/chat", async (req: express.Request, res: express.Response) => {
    try {
      if (!apiKey) {
        return res.json({
          text: "I'm ready to coach you! (Note: Please set your GEMINI_API_KEY in the Secrets panel in Settings to enable real AI feedback.)\n\nFor now, focus on your center development! #opening-principles"
        });
      }

      const { message, history, coachProfile, userProfile, gameHistory, isGameEnd, gameResult } = req.body;

      // Extract details from user profile
      const userLevel = userProfile?.skillLevel || 1;
      const userElo = userProfile?.eloRating || "1200 Elo";
      const totalGames = userProfile?.careerHistoryLength || 0;
      
      // Build a comprehensive system instruction incorporating user's skill, history, and weaknesses.
      let systemInstruction = `You are GM Coach ${coachProfile.name}, a legendary virtual chess coach.
Your playstyle is "${coachProfile.style}" and your rating is ${coachProfile.rating} Elo.
Your style title is "${coachProfile.title}".
Your coaching philosophy: "${coachProfile.description}"

You must respond in an engaging, encouraging, and highly instructive chess coach persona. Speak directly to the player.

Student's Current Profile:
- Current Skill Level: Level ${userLevel} of 20
- Estimated Elo Rating: ${userElo}
- Completed Career Games: ${totalGames}

Tailor your vocabulary, tactical depth, and instructional guidance to their current skill level:
- For beginner skill levels (Level 1-5), focus on basic concepts like material values, hanging pieces, and basic mating nets. Keep explanations simple and encouraging.
- For intermediate skill levels (Level 6-12), discuss open files, pawn structures, key squares, and dynamic combinations.
- For expert/master levels (Level 13+), delve into deep strategical plans, quiet positional play, tactical intermediate moves (zwischenzugs), and subtle endgame conversions.
`;

      if (isGameEnd) {
        systemInstruction += `
The active game has just concluded! The final outcome for the player was: ${gameResult.toUpperCase()}.
Here is the sequence of chess moves played during the entire game: ${JSON.stringify(gameHistory)}.

Analyze this move sequence carefully. Provide a highly personalized, constructive, and educational coach review of their play:
1. Praise good moves or ideas if they won, or give sympathetic advice if they lost or drew.
2. Critique their opening, tactical vigilance, or endgame play.
3. Call out specific ideas they should look out for next time.

CRITICAL MANDATE: You MUST end your response on its own final line with exactly one of the following category hashtag tags, based on the primary lesson of how they played in this game:
- #opening-principles (for opening mistakes or good initial development)
- #blunder-tactics (for missed mates, hung pieces, or tactical oversight)
- #middlegame-strategy (for planning, piece activity, or space advantage issues)
- #endgame-finesse (for converting won endgames, pawn promotion, or king activity)
- #positional-play (for pawn structures, control of files, or space maneuvering)

Ensure the tag is prefixed by a space or on a new line, and contains only one of the five listed hashtags exactly.
`;
      } else {
        systemInstruction += `
The active game move history is: ${JSON.stringify(gameHistory || [])}.
The user is asking you: "${message}"

Keep your response educational, structured, and under 150 words. Do not give away complete puzzle solutions unless asked directly. Use markdown list items or bold text to emphasize critical concepts. Do not output raw JSON or code snippets. Keep it purely as standard markdown text.
`;
      }

      // Prepare conversation history
      const contents = [];
      if (history && history.length > 0) {
        // Filter out initial system-like messages to prevent context dilution, keeping last 8 messages
        const recentHistory = history.slice(-8);
        for (const msg of recentHistory) {
          const role = msg.sender === 'user' ? 'user' : 'model';
          contents.push({
            role,
            parts: [{ text: msg.text }]
          });
        }
      }

      // Add the current user query as the final turn
      contents.push({
        role: 'user',
        parts: [{ text: message || "Analyze the current board state." }]
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });

      const replyText = response.text || "I was unable to formulate a strategy. Keep your defense solid!";
      res.json({ text: replyText });
    } catch (error: any) {
      console.error("Gemini API error:", error);
      res.status(500).json({ error: error?.message || "Internal Server Error" });
    }
  });

  // Serve static assets / Vite files
  if (process.env.NODE_ENV !== "production") {
    // Dynamic import to avoid loading Vite inside production bundle
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: express.Request, res: express.Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
