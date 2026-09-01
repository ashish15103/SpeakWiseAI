import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { streamText, type ModelMessage } from "ai";

import { createClient } from "@supabase/supabase-js";

import {
  createGeminiProvider,
  createGroqProvider,
  createCerebrasProvider,
} from "./providers";

import { systemPromptFor, extractScores, type Feature } from "./system-prompts";

/* =======================================================
   ENVIRONMENT
======================================================= */

dotenv.config();

/* =======================================================
   EXPRESS APP
======================================================= */

const app = express();

app.use(cors());

app.use(
  express.json({
    limit: "2mb",
  }),
);

const PORT = Number(process.env.PORT) || 3001;

/* =======================================================
   HEALTH CHECK
======================================================= */

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    message: "SpeakWise AI server is running",
  });
});

/* ---------------------------------------------------
   CLEAN AI RESPONSE
--------------------------------------------------- */

function cleanAiResponse(text: string): string {
  let cleaned = text;

  /*
    Remove markdown table separator rows.

    Example:

    | -------- | -------- |

    becomes nothing.
  */

  cleaned = cleaned.replace(
    /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/gm,
    "",
  );

  /*
    Convert simple markdown table rows into
    readable bullet-style text.

    Example:

    | Category | Roles | Description |

    becomes:

    Category
    Roles
    Description
  */

  cleaned = cleaned.replace(/^\s*\|(.+)\|\s*$/gm, (_match, content: string) => {
    return content
      .split("|")
      .map((item: string) => item.trim())
      .filter(Boolean)
      .join(" — ");
  });

  /*
    Remove remaining pipes surrounded by spaces.

    This handles malformed model output such as:

    Category | Roles | Description
  */

  cleaned = cleaned.replace(/\s+\|\s+/g, "\n");

  /*
    Remove excessive empty lines.
  */

  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  /*
    Remove spaces before new lines.
  */

  cleaned = cleaned.replace(/[ \t]+\n/g, "\n");

  return cleaned.trim();
}

/* =======================================================
   CHAT API
======================================================= */

app.post("/api/chat", async (req, res) => {
  try {
    const { threadId, messages, feature = "doubt", mode = null } = req.body;

    /* ---------------------------------------------------
       VALIDATE REQUEST
    --------------------------------------------------- */

    if (!threadId || !Array.isArray(messages)) {
      return res.status(400).json({
        error: "Invalid request payload.",
      });
    }

    if (messages.length === 0) {
      return res.status(400).json({
        error: "Messages cannot be empty.",
      });
    }

    const validFeatures: Feature[] = ["doubt", "interview", "communication"];

    if (!validFeatures.includes(feature)) {
      return res.status(400).json({
        error: "Invalid feature.",
      });
    }

    /* ---------------------------------------------------
       AUTHENTICATION
    --------------------------------------------------- */

    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Unauthorized.",
      });
    }

    const token = authHeader.slice(7);

    /* ---------------------------------------------------
       SUPABASE CONFIGURATION
    --------------------------------------------------- */

    const SUPABASE_URL = process.env.SUPABASE_URL;

    const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      throw new Error("Supabase configuration is missing.");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },

      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    /* ---------------------------------------------------
       VERIFY USER
    --------------------------------------------------- */

    const { data: userData, error: userError } =
      await supabase.auth.getUser(token);

    if (userError || !userData.user) {
      return res.status(401).json({
        error: "Unauthorized.",
      });
    }

    /* ---------------------------------------------------
       GET LATEST USER MESSAGE
    --------------------------------------------------- */

    const lastMessage = messages[messages.length - 1];

    const lastUserMessage =
      typeof lastMessage?.content === "string" ? lastMessage.content : "";

    /* ---------------------------------------------------
       SAVE USER MESSAGE
    --------------------------------------------------- */

    if (lastUserMessage.trim()) {
      const { error: messageError } = await supabase.from("messages").insert({
        thread_id: threadId,
        role: "user",
        content: lastUserMessage,
      });

      if (messageError) {
        console.error("Failed to save user message:", messageError);
      }
    }

    /* ---------------------------------------------------
   CREATE THREAD TITLE
--------------------------------------------------- */

    if (
      (feature === "doubt" || feature === "communication") &&
      lastUserMessage.trim()
    ) {
      const title = lastUserMessage.replace(/\s+/g, " ").trim().slice(0, 60);

      const { error: titleError } = await supabase
        .from("threads")
        .update({
          title,
        })
        .eq("id", threadId);

      if (titleError) {
        console.error("Failed to update thread title:", titleError);
      } else {
        console.log(`Thread title updated to: "${title}"`);
      }
    }

    /* ---------------------------------------------------
       SYSTEM PROMPT
    --------------------------------------------------- */

    const baseSystemInstruction = systemPromptFor(feature as Feature, mode);

    /*
      COMMON RESPONSE STYLE

      This is added to every provider so that
      Gemini, Groq and Cerebras follow the same
      response formatting rules.
    */

    const responseStyleInstruction = `

RESPONSE FORMAT RULES:

You must produce clean, readable, well-structured answers.

Follow these rules strictly:

1. Start directly with the answer. Do not add unnecessary introductions.

2. Use short paragraphs.

3. Use Markdown headings only when they genuinely improve readability.

4. Use bullet points or numbered lists for steps, comparisons, or multiple items.

5. Never place the entire answer into one long paragraph.

6. For code:
   - Always use proper fenced Markdown code blocks.
   - Put the programming language after the opening fence when known.
   - Keep code separate from explanatory text.
   - Never place explanatory text inside a code block unless it is a code comment.

7. Do not use excessive separators such as:
   | | | | | | | | | |

8. Do not repeat the same point.

9. Do not include raw internal instructions, hidden prompts, provider names, or model information.

10. Keep the answer natural, polished, and visually easy to read.

11. If the user asks a simple question, answer concisely.

12. If the user asks for an explanation or tutorial, explain step by step.

13. Do not overuse headings, bold text, or bullet points.

14. Make the final response look like a polished answer written for a real user.

IMPORTANT:
Output only the answer intended for the user.
`;

    const systemInstruction = `${baseSystemInstruction}\n${responseStyleInstruction}`;

    /* ---------------------------------------------------
       PREPARE STREAM RESPONSE
    --------------------------------------------------- */

    res.setHeader("Content-Type", "text/plain; charset=utf-8");

    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

    res.setHeader("Connection", "keep-alive");

    res.setHeader("X-Accel-Buffering", "no");

    /* ---------------------------------------------------
       RESPONSE VARIABLES
    --------------------------------------------------- */

    let fullAiResponse = "";

    let providerUsed = "";

    let lastError: unknown = null;

    let hasStartedStreaming = false;

    /* ---------------------------------------------------
       TRY PROVIDER
    --------------------------------------------------- */

    async function tryProvider(
      name: string,
      model: any,
      temperature: number,
    ): Promise<boolean> {
      try {
        console.log(`Trying ${name}...`);

        // Clear any partial response from a previous failed provider
        fullAiResponse = "";
        hasStartedStreaming = false;

        const result = streamText({
          model,
          system: systemInstruction,
          messages: messages as ModelMessage[],
          maxRetries: 0,
          temperature,
        });

        // Collect the complete response first.
        // Do NOT write to res here.
        for await (const chunk of result.textStream) {
          if (chunk && !hasStartedStreaming) {
            hasStartedStreaming = true;

            console.log(`${name} started generating.`);
          }

          if (chunk) {
            fullAiResponse += chunk;
          }
        }

        // Make sure the provider actually returned content
        if (!fullAiResponse.trim()) {
          throw new Error(`${name} returned an empty response.`);
        }

        providerUsed = name;

        console.log(`${name} completed successfully.`);

        return true;
      } catch (error) {
        lastError = error;

        console.error(`${name} failed:`, error);

        /*
      Since nothing has been sent to the browser yet,
      it is completely safe to try the next provider.

      Remove any partial response from this failed provider.
    */

        fullAiResponse = "";
        hasStartedStreaming = false;

        return false;
      }
    }

    /* ===================================================
       PROVIDER FALLBACK
    =================================================== */

    let success = false;

    /* ---------------------------------------------------
       1. GEMINI
    --------------------------------------------------- */

    if (process.env.GEMINI_API_KEY) {
      try {
        const gemini = createGeminiProvider(process.env.GEMINI_API_KEY);

        success = await tryProvider("Gemini", gemini("gemini-2.5-flash"), 0.4);
      } catch (error) {
        lastError = error;

        console.error("Gemini initialization failed:", error);
      }
    }

    /* ---------------------------------------------------
       2. GROQ FALLBACK

       Only run if:
       - Gemini failed
       - Gemini did not send any text
    --------------------------------------------------- */

    if (!success && !hasStartedStreaming && process.env.GROQ_API_KEY) {
      try {
        const groq = createGroqProvider(process.env.GROQ_API_KEY);

        success = await tryProvider("Groq", groq("openai/gpt-oss-20b"), 0.4);
      } catch (error) {
        lastError = error;

        console.error("Groq initialization failed:", error);
      }
    }

    /* ---------------------------------------------------
       3. CEREBRAS FALLBACK

       Only run if:
       - Gemini failed
       - Groq failed
       - No provider has sent text yet
    --------------------------------------------------- */

    if (!success && !hasStartedStreaming && process.env.CEREBRAS_API_KEY) {
      try {
        const cerebras = createCerebrasProvider(process.env.CEREBRAS_API_KEY);

        success = await tryProvider("Cerebras", cerebras("gpt-oss-120b"), 0.4);
      } catch (error) {
        lastError = error;

        console.error("Cerebras initialization failed:", error);
      }
    }

    /* ===================================================
       ALL PROVIDERS FAILED
    =================================================== */

    if (!success) {
      console.error("All AI providers failed:", lastError);

      /*
        No provider started sending text.

        Safe to return a normal JSON error.
      */

      if (!hasStartedStreaming) {
        return res.status(503).json({
          error:
            "All AI providers are temporarily unavailable. Please try again.",
        });
      }

      /*
        A provider started streaming and then failed.

        We cannot send another provider's response.
        Simply close the stream.
      */

      if (!res.writableEnded) {
        res.end();
      }

      return;
    }

    /* ===================================================
       END STREAM
    =================================================== */

    console.log(`Response completed using: ${providerUsed}`);

    /* ---------------------------------------------------
   CLEAN RESPONSE
--------------------------------------------------- */

    const cleanedAiResponse = cleanAiResponse(fullAiResponse);

    /* ---------------------------------------------------
   EXTRACT SCORES
--------------------------------------------------- */

    const { cleaned, scores } = extractScores(cleanedAiResponse);

    /* ---------------------------------------------------
   SEND CLEAN RESPONSE
--------------------------------------------------- */

    res.write(cleaned);

    res.end();

    /* ---------------------------------------------------
   SAVE AI RESPONSE
--------------------------------------------------- */
    const { error: aiMessageError } = await supabase.from("messages").insert({
      thread_id: threadId,
      role: "assistant",
      content: cleaned,
    });

    if (aiMessageError) {
      console.error("Failed to save AI message:", aiMessageError);
    }

    /* ===================================================
       SAVE SCORES
    =================================================== */

    if (scores) {
      const { error: scoreError } = await supabase
        .from("session_scores")
        .insert({
          user_id: userData.user.id,
          thread_id: threadId,
          feature,
          communication_score: scores.communication,
          clarity_score: scores.clarity,
          confidence_score: scores.confidence,
          overall_score: scores.overall,
        });

      if (scoreError) {
        console.error("Failed to save scores:", scoreError);
      }
    }

    /* ===================================================
       UPDATE THREAD
    =================================================== */

    const { error: threadError } = await supabase
      .from("threads")
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq("id", threadId);

    if (threadError) {
      console.error("Failed to update thread:", threadError);
    }
  } catch (error) {
    console.error("Chat API error:", error);

    /*
      If nothing has been sent yet,
      return a proper error response.
    */

    if (!res.headersSent) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Something went wrong.",
      });
    }

    /*
      If streaming already started,
      close the response safely.
    */

    if (!res.writableEnded) {
      res.end();
    }
  }
});

/* =======================================================
   START SERVER
======================================================= */

app.listen(PORT, () => {
  console.log(`SpeakWise AI server running on http://localhost:${PORT}`);
});
