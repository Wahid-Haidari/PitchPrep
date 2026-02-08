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
  companyContext: EmployerContext,
  companyName: string
): Promise<PitchResult> {
  const response = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.8,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are an expert career coach. Generate a personalized elevator pitch for a job seeker to deliver at a career fair booth.

CONSTRAINTS:
- The pitch must be 20-25 seconds when spoken (roughly 50-70 words)
- Conversational and confident tone — sounds like a real person, not a script
- NO buzzwords, NO generic phrases like "I'm passionate about synergies"
- Reference SPECIFIC things about the company (recent projects, products, mission)
- Highlight the STRONGEST overlaps between the user's profile and the company's needs
- The pitch should feel natural, like the person rehearsed it but it flows spontaneously

Also generate:
- 3 smart questions to ask at the booth
- A follow-up email template
- Top 3 matching roles (from the company's typical roles)
- Match score (0-100) with reasoning

Return JSON:
{
  "pitch": "string — the 20-25 second elevator pitch",
  "matchScore": number,
  "matchReasoning": "string — 2 sentences explaining the match",
  "smartQuestions": ["string — 3 thoughtful questions"],
  "followUpMessage": "string — short follow-up email template",
  "topMatchedRoles": ["string — top 3 roles that match"],
  "wowFacts": [{"fact": "string", "source": "string", "sourceUrl": "string"} — 3 facts to mention]
}`,
      },
      {
        role: "user",
        content: `USER PROFILE:
Name: ${userProfile.name}
Major: ${userProfile.major}
School: ${userProfile.school}
Graduation Year: ${userProfile.graduationYear}
Preferred Roles: ${userProfile.preferredRoles.join(", ")}
Preferred Industries: ${userProfile.preferredIndustries.join(", ")}
Skills/Background: ${userProfile.background}
Resume Summary: ${userProfile.resumeText?.substring(0, 1500) || "Not provided"}

COMPANY CONTEXT (${companyName}):
What they do: ${companyContext.whatTheyDo}
Recent projects: ${companyContext.recentProjectsAndProducts.join("; ")}
Skills they value: ${companyContext.valuedSkills.join(", ")}
Typical roles: ${companyContext.typicalRoles.join(", ")}
Culture/Mission: ${companyContext.cultureMission}
Wow facts: ${companyContext.wowFacts.map((f) => f.fact).join("; ")}

Generate a personalized pitch for this user to deliver at the ${companyName} booth.`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from OpenAI");
  }

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
  background: string;
  resumeText: string;
}

export interface PitchResult {
  pitch: string;
  matchScore: number;
  matchReasoning: string;
  smartQuestions: string[];
  followUpMessage: string;
  topMatchedRoles: string[];
  wowFacts: { fact: string; source: string; sourceUrl: string }[];
}

export interface ResumeSuggestionResult {
  type: "add-metrics" | "reorder-skills" | "rewrite-bullet" | "highlight-experience";
  title: string;
  description: string;
  before?: string;
  after?: string;
  priority: "high" | "medium" | "low";
}
