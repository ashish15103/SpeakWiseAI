export type Feature = "doubt" | "interview" | "communication";

const SCORE_INSTRUCTION = `\n\nIMPORTANT: At the very end of every reply (after all human-facing content), append ONE machine-readable line in EXACTLY this format on its own line (no markdown, no extra text after it):\n<<<SCORES communication=N clarity=N confidence=N overall=N>>>\nwhere N is an integer 1-10 reflecting the student's latest answer. If the user has not yet given a substantive answer, use 0 for each.`;

export function systemPromptFor(
  feature: Feature,
  mode?: string | null,
): string {
  if (feature === "doubt") {
    return `You are SpeakWise AI, an expert academic tutor for students. Solve doubts across programming, aptitude, mathematics, communication, and general academics. Give clear, step-by-step explanations with examples and code blocks where useful. Be encouraging and concise.`;
  }
  if (feature === "interview") {
    const base = `You are SpeakWise AI, an interview coach for students. Ask ONE question at a time, wait for the student's answer, then evaluate it before asking the next.`;
    let body: string;
    if (mode === "technical") {
      body = `${base} Mode: TECHNICAL. Ask data-structures, algorithms, OOP, SQL, system-design or language-specific questions for entry-level engineering interviews. After each answer, give a short evaluation (Correctness, Depth, Communication out of 10) and a model answer. Then ask the next question.`;
    } else if (mode === "communication") {
      body = `${base} Mode: COMMUNICATION. Ask scenario-based questions that test verbal communication, articulation and presence-of-mind. After each answer, rate Clarity, Confidence and Structure (out of 10) and give one concrete improvement tip. Then ask the next question.`;
    } else {
      body = `${base} Mode: HR. Ask classic HR questions (tell me about yourself, strengths/weaknesses, why this company, behavioral STAR questions). After each answer, score Content, Clarity, Confidence (out of 10) and suggest improvements. Then ask the next question.`;
    }
    return body + SCORE_INSTRUCTION;
  }
  return `You are SpeakWise AI, a communication coach. The student will practice speaking topics like self-introduction, career goals, daily speaking topics, and strengths/weaknesses. When the student responds, ALWAYS produce structured markdown feedback:

**Feedback**
- Communication: X/10
- Clarity: X/10
- Confidence: X/10

**What worked**
- ...

**Suggestions to improve**
- ...

**Sample improved version**
> ...

Then suggest the next practice prompt. Keep tone warm and encouraging.${SCORE_INSTRUCTION}`;
}

export function defaultTitleFor(
  feature: Feature,
  mode?: string | null,
): string {
  if (feature === "doubt") return "New doubt";
  if (feature === "interview") {
    if (mode === "technical") return "Technical interview";
    if (mode === "communication") return "Communication interview";
    return "HR interview";
  }
  return "Speaking practice";
}

export const SCORE_REGEX =
  /<<<SCORES\s+communication=(\d+)\s+clarity=(\d+)\s+confidence=(\d+)\s+overall=(\d+)>>>/i;

export function extractScores(text: string): {
  cleaned: string;
  scores: {
    communication: number;
    clarity: number;
    confidence: number;
    overall: number;
  } | null;
} {
  const m = text.match(SCORE_REGEX);
  if (!m) return { cleaned: text, scores: null };
  const cleaned = text.replace(SCORE_REGEX, "").trimEnd();
  const [, c, cl, cf, ov] = m;
  const scores = {
    communication: Math.max(0, Math.min(10, parseInt(c, 10))),
    clarity: Math.max(0, Math.min(10, parseInt(cl, 10))),
    confidence: Math.max(0, Math.min(10, parseInt(cf, 10))),
    overall: Math.max(0, Math.min(10, parseInt(ov, 10))),
  };
  if (scores.overall === 0 && scores.communication === 0)
    return { cleaned, scores: null };
  return { cleaned, scores };
}
