import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

/**
 * Fetch employer context using ChatGPT.
 * Returns structured data about the company for pitch generation.
 */
export async function fetchEmployerContext(companyName: string): Promise<EmployerContext> {
  const response = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.7,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a career research assistant. Given a company name, provide structured information for a job seeker preparing for a career fair. Return a JSON object with these exact fields:
{
  "companyName": "string — official company name",
  "whatTheyDo": "string — 2-3 sentence summary of what the company does",
  "recentProjectsAndProducts": ["string — list of 3-5 notable recent projects, products, or initiatives"],
  "valuedSkills": ["string — list of 5-8 technical and soft skills they typically value"],
  "typicalRoles": ["string — list of 4-6 roles they commonly hire for at entry/new-grad level"],
  "cultureMission": "string — 2-3 sentences about company culture and mission",
  "industryCategory": "string — one of: Tech, Finance, Healthcare, Consulting, Other",
  "headquarters": "string — city, state",
  "wowFacts": [{"fact": "string", "source": "string", "sourceUrl": "string"} — 3 impressive facts with sources]
}
Be factual and specific. Use real, verifiable information. If uncertain about a fact, say so.`,
      },
      {
        role: "user",
        content: `Research the company: ${companyName}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from OpenAI");
  }

  return JSON.parse(content) as EmployerContext;
}

/**
 * Generate a personalized elevator pitch.
 */
export async function generatePitch(
  userProfile: UserProfileData,
  companyName: string,
  employerContext?: EmployerContext
): Promise<PitchResult> {
  const systemPrompt = `You are an expert career coach. Generate a personalized elevator pitch and analysis for a job seeker.

CONSTRAINTS:
- Return ONLY valid JSON matching the exact schema provided
- No extra keys, no URLs, no fabricated "recent projects" unless explicitly known
- elevatorPitch30s: ~75-95 words, natural conversational tone, no buzzwords
- interestingFacts: exactly 3, short and safe (no fake links)
- smartQuestions: exactly 3, specific to company + role track
- topMatchedRoles: exactly 3 relevant roles
- Each score category: 0-20 integer, with 1 short sentence reason
- matchScore: sum of all 6 category scores (0-120 total)
- If uncertain about company details, keep facts general but truthful`;

  // Build company context section
  let companyContext = `COMPANY:\n- Company Name: ${companyName}`;
  if (employerContext) {
    companyContext += `
- What They Do: ${employerContext.whatTheyDo}
- Industry: ${employerContext.industryCategory}
- Location: ${employerContext.headquarters}
- Valued Skills: ${employerContext.valuedSkills?.join(", ")}
- Typical Roles: ${employerContext.typicalRoles?.join(", ")}
- Culture & Mission: ${employerContext.cultureMission}
- Recent Projects: ${employerContext.recentProjectsAndProducts?.join(", ")}`;
  }

  const userPrompt = `USER INFORMATION & PREFERENCES:
- Location Preference: ${userProfile.location || "Not specified"}
- Work Authorization: ${userProfile.workAuthorization || "Not specified"}
- Major: ${userProfile.major}
- Job Type Preference: ${userProfile.jobTypePreference || "Not specified"}
- Skills: ${userProfile.skills?.join(", ") || "Not specified"}
- Resume (truncated): ${userProfile.resumeText?.substring(0, 1500) || "Not provided"}

${companyContext}

REQUIRED OUTPUT FORMAT (JSON):
{
  "companyName": "string",
  "elevatorPitch30s": "string",
  "interestingFacts": ["string", "string", "string"],
  "smartQuestions": ["string", "string", "string"],
  "topMatchedRoles": ["string", "string", "string"],
  "scoreBreakdown": {
    "location": { "score": 0, "reason": "string" },
    "workAuthorization": { "score": 0, "reason": "string" },
    "major": { "score": 0, "reason": "string" },
    "jobType": { "score": 0, "reason": "string" },
    "skills": { "score": 0, "reason": "string" },
    "resume": { "score": 0, "reason": "string" }
  },
  "matchScore": 0
}`;

  // Log the prompts for debugging
  console.log("\n" + "=".repeat(80));
  console.log("📤 OPENAI API REQUEST - SYSTEM PROMPT");
  console.log("=".repeat(80));
  console.log(systemPrompt);
  console.log("\n" + "=".repeat(80));
  console.log("📤 OPENAI API REQUEST - USER PROMPT");
  console.log("=".repeat(80));
  console.log(userPrompt);
  console.log("=".repeat(80) + "\n");

  const response = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.8,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userPrompt,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from OpenAI");
  }

  // Log the response for debugging
  console.log("\n" + "=".repeat(80));
  console.log("📥 OPENAI API RESPONSE - RAW JSON");
  console.log("=".repeat(80));
  console.log(content);
  console.log("=".repeat(80) + "\n");

  return JSON.parse(content) as PitchResult;
}

/**
 * Generate resume improvement suggestions.
 */
export async function generateResumeSuggestions(
  resumeText: string,
  jobDescription: string
): Promise<ResumeSuggestionResult[]> {
  const response = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.7,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are an expert resume reviewer. Analyze the resume against the job description and provide specific, actionable improvement suggestions.

Return JSON:
{
  "suggestions": [
    {
      "type": "add-metrics" | "reorder-skills" | "rewrite-bullet" | "highlight-experience",
      "title": "string — short title for the suggestion",
      "description": "string — why this matters and what to change",
      "before": "string | null — the original text (if applicable)",
      "after": "string | null — the improved version (if applicable)",
      "priority": "high" | "medium" | "low"
    }
  ]
}

Provide 4-6 suggestions, ordered by priority. Be specific — reference actual content from the resume.`,
      },
      {
        role: "user",
        content: `RESUME:\n${resumeText}\n\nJOB DESCRIPTION:\n${jobDescription}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from OpenAI");
  }

  const parsed = JSON.parse(content);
  return parsed.suggestions as ResumeSuggestionResult[];
}

// --- Types ---

export interface EmployerContext {
  companyName: string;
  whatTheyDo: string;
  recentProjectsAndProducts: string[];
  valuedSkills: string[];
  typicalRoles: string[];
  cultureMission: string;
  industryCategory: string;
  headquarters: string;
  wowFacts: { fact: string; source: string; sourceUrl: string }[];
}

export interface UserProfileData {
  name: string;
  email: string;
  school: string;
  major: string;
  graduationYear: string;
  preferredRoles: string[];
  preferredIndustries: string[];
  location: string;
  workAuthorization?: string;
  jobTypePreference?: string;
  skills?: string[];
  background: string;
  resumeText: string;
}

export interface PitchResult {
  companyName: string;
  elevatorPitch30s: string;
  interestingFacts: string[];
  smartQuestions: string[];
  topMatchedRoles: string[];
  scoreBreakdown: {
    location: { score: number; reason: string };
    workAuthorization: { score: number; reason: string };
    major: { score: number; reason: string };
    jobType: { score: number; reason: string };
    skills: { score: number; reason: string };
    resume: { score: number; reason: string };
  };
  matchScore: number;
}

export interface ResumeSuggestionResult {
  type: "add-metrics" | "reorder-skills" | "rewrite-bullet" | "highlight-experience";
  title: string;
  description: string;
  before?: string;
  after?: string;
  priority: "high" | "medium" | "low";
}
