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
  const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("WARNING: GEMINI_API_KEY or VITE_GEMINI_API_KEY environment variable is not set. Please set it in Settings > Secrets.");
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
      const coachMemory = userProfile?.coachMemory || "";
      
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
`;

      if (coachMemory) {
        systemInstruction += `
YOUR LONG-TERM TRAINING JOURNAL ABOUT THIS STUDENT (Do NOT repeat this text verbatim, but use it as context to tailor your attitude, recall past lessons, refer to their specific flaws, or praise their improvements):
"${coachMemory}"
`;
      }

      systemInstruction += `
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

  // Background endpoint to consolidate and update the coach's long-term memory summary of the student
  app.post("/api/coach/summarize-memory", async (req: express.Request, res: express.Response) => {
    try {
      if (!apiKey) {
        return res.json({ coachMemory: "The coach is observing your center development." });
      }

      const { currentHistory, previousMemory, userProfile, gameHistory, coachProfile } = req.body;

      const userLevel = userProfile?.skillLevel || 1;
      const userElo = userProfile?.eloRating || "1200 Elo";

      // Build a text block representing the recent discussion to feed to Gemini
      let recentChatText = "";
      if (currentHistory && currentHistory.length > 0) {
        // Grab last 10 messages for rich summarization context
        recentChatText = currentHistory.slice(-10).map((msg: any) => `${msg.sender === 'user' ? 'Student' : 'Coach'}: ${msg.text}`).join("\n");
      }

      const summaryPrompt = `You are GM Coach ${coachProfile?.name || 'Garry'}'s training journal compiler.
Your task is to compile and update a highly compressed "Training Journal / Student Progress Summary" for the virtual chess coach to read and remember.
To prevent token waste, your output MUST be extremely concise, objective, written in the third person, and strictly UNDER 80 words total. Do not add any greeting, intro, or formatting.

Previous Training Journal Memory:
"${previousMemory || "No memory recorded yet."}"

Recent Session Chat Messages:
${recentChatText}

Active Game History Moves:
${JSON.stringify(gameHistory || [])}

Student Level:
- Level ${userLevel} of 20
- Rating: ${userElo}

Synthesize the old journal entry with the new session details to produce an updated, highly descriptive single-paragraph training profile (max 80 words) tracking:
1. Spotted strengths or favorite openings (e.g., active play, rapid development).
2. Spotted weaknesses, blindspots, or typical mistakes (e.g., missed bishop forks, lack of castling).
3. Specific goals or concepts recently taught (e.g., opening center control, pawn chains).

Keep it strictly dense and literal. Do not say "In this session" or "We discussed". Just output the compiled profile paragraph.
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: summaryPrompt,
        config: {
          temperature: 0.3,
        }
      });

      const updatedMemory = response.text?.trim() || previousMemory || "";
      res.json({ coachMemory: updatedMemory });
    } catch (error: any) {
      console.error("Failed to compile student memory:", error);
      res.status(500).json({ error: error?.message || "Internal Server Error" });
    }
  });

  // Dynamic AI-analyzed video recommendation generator
  app.post("/api/coach/analyze-recommendations", async (req: express.Request, res: express.Response) => {
    try {
      const { recentGames, chatHistory, coachProfile, userProfile } = req.body;
      const totalGamesPlayed = userProfile?.totalGamesPlayed || 3;

      if (!apiKey) {
        // Fallback recommendations if Gemini key is missing
        return res.json({
          lastAnalyzedGameCount: totalGamesPlayed,
          weaknesses: ['tactical-blunders', 'opening-traps'],
          videos: [
            {
              weakness: 'tactical-blunders',
              label: 'Tactical Blunders',
              title: "Garry's Tactical Advisory",
              embedUrl: 'https://www.youtube.com/embed/0BshT_wX9Xo',
              description: 'I noticed some hanging pieces in your recent games. Watch this masterclass to reinforce your tactical board vision checklists.',
              author: 'GothamChess'
            },
            {
              weakness: 'opening-traps',
              label: 'Opening Principles',
              title: "Garry's Opening Blueprints",
              embedUrl: 'https://www.youtube.com/embed/gL6Xrcf00XQ',
              description: 'Your openings are too passive. Secure control of the center early and develop with concrete, active threats.',
              author: 'GothamChess'
            }
          ],
          updatedAt: new Date().toISOString()
        });
      }

      const userLevel = userProfile?.skillLevel || 1;
      const userElo = userProfile?.eloRating || "1200 Elo";

      // Format matches for prompt
      const matchesSummary = (recentGames || []).map((g: any, idx: number) => {
        return `Game ${idx + 1}: Outcome: ${(g.result || 'unknown').toUpperCase()}, Moves Count: ${g.movesCount || 30}, AI Opponent Difficulty: Level ${g.skillLevel || 1}`;
      }).join("\n");

      // Format chat history
      const chatSummary = chatHistory && chatHistory.length > 0
        ? chatHistory.slice(-15).map((m: any) => `${m.sender === 'user' ? 'Student' : 'Coach'}: ${m.text}`).join("\n")
        : "No previous chat history recorded.";

      const prompt = `You are GM Coach ${coachProfile?.name || 'Garry'}, the legendary virtual chess mentor.
Analyze this student's performance over their last 3 games and their recent interactions with you to pinpoint their underlying tactical, positional, or opening weaknesses.

Student's Profiles:
- Difficulty Level: ${userLevel} of 20
- Rating: ${userElo}
- Completed Games: ${totalGamesPlayed}

Student's Last 3 Matches:
${matchesSummary}

Student's Recent Chats/Interactions with Coach Garry:
${chatSummary}

Your mission:
1. Identify the primary structural, strategic, or tactical vulnerabilities shown in these games and chats. For example, did they lose quickly (opening mistakes)? Did they lose long games (endgame issues)? Did they discuss specific issues in the chat?
2. Select exactly 3 video recommendations from our verified YouTube library of high-quality chess videos to address these specific weaknesses.
3. For each selected video, you MUST customize the "title" and write a highly personalized, deep, coaching "description" explaining EXACTLY why you have selected this video for them based on their recent moves, blunders, or chat topics. Keep your style highly professional, encouraging, yet critically instructional (Coach Garry's direct style).

Verified Chess YouTube Library (use these exact URLs only to ensure the videos work flawlessly):
- embedUrl: "https://www.youtube.com/embed/0BshT_wX9Xo" (Topic: Stopping Blunders, finding tactics, spotting hanging pieces and forks)
- embedUrl: "https://www.youtube.com/embed/gL6Xrcf00XQ" (Topic: Ultimate Opening Guide, center control, king safety, basic opening principles)
- embedUrl: "https://www.youtube.com/embed/V6S6t_Sby5Q" (Topic: Middlegame Strategy, finding outposts, planning, space advantage)
- embedUrl: "https://www.youtube.com/embed/D3_qXb9A2X8" (Topic: Endgame Techniques, converting pawn majorities, king activity, checkmating nets)
- embedUrl: "https://www.youtube.com/embed/S_8p6N8809k" (Topic: Positional Chess, open files, outpost control, pawn structures)
- embedUrl: "https://www.youtube.com/embed/fA9E9E-6qI4" (Topic: Spotting tactical motifs, pins, skewers, forks, back-ranks)
- embedUrl: "https://www.youtube.com/embed/tSAnVj1o5U4" (Topic: 10 Chess Habits to Avoid, bad move triggers, time management)

You MUST respond with a JSON object ONLY, adhering strictly to the JSON schema below. Do not wrap the JSON in markdown code blocks like \`\`\`json. The output must be pure, parsable JSON.

Response JSON Schema:
{
  "lastAnalyzedGameCount": ${totalGamesPlayed},
  "weaknesses": ["tactical-blunders", "opening-traps", "middlegame-planning", "endgame-technique", "positional-weaknesses"],
  "videos": [
    {
      "weakness": "one-of-the-above-keys",
      "label": "Short category label (e.g. Opening Traps)",
      "title": "Custom coaching title addressing their weakness directly",
      "embedUrl": "the exact selected embedUrl from the verified list",
      "description": "Personalized coaching message explaining why this was selected based on their 3 games and chats. Max 3 sentences.",
      "author": "GothamChess"
    }
  ],
  "updatedAt": "Current ISO timestamp"
}
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          temperature: 0.4,
          responseMimeType: "application/json"
        }
      });

      const textResponse = response.text || "{}";
      let cleanedText = textResponse.trim();
      if (cleanedText.startsWith("```json")) {
        cleanedText = cleanedText.substring(7);
      }
      if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText.substring(3);
      }
      if (cleanedText.endsWith("```")) {
        cleanedText = cleanedText.substring(0, cleanedText.length - 3);
      }
      cleanedText = cleanedText.trim();

      const stateResult = JSON.parse(cleanedText);
      res.json(stateResult);
    } catch (error: any) {
      console.error("Failed to generate dynamic recommendations:", error);
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
