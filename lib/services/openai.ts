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
  console.log(`\n📚 Fetching employer context for: ${companyName}`);
  
  const response = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.2, // Lower temperature for more factual, consistent results
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a career research assistant. Provide FACTUAL, SPECIFIC information about companies for students preparing for career fairs.

CRITICAL RULES:
1. Return ONLY verified, factual information from your training data
2. If you don't know something specific, use general industry knowledge but be honest
3. Be SPECIFIC - avoid vague statements like "cutting-edge" or "industry leader"
4. Focus on information relevant to NEW GRADUATES and ENTRY-LEVEL candidates

REQUIRED OUTPUT (valid JSON):
{
  "companyName": "Official company name",
  "whatTheyDo": "2-3 sentences: core business, products/services, target market. Be specific.",
  "recentProjectsAndProducts": ["Specific product/project 1", "Specific product/project 2", "Specific initiative 3", "..."],
  "valuedSkills": ["Specific technical skill 1", "Specific technical skill 2", "Soft skill 1", "..."],
  "typicalRoles": ["Exact entry-level role title 1", "Exact entry-level role title 2", "..."],
  "cultureMission": "2-3 sentences about work culture, values, mission. Focus on what matters to new grads (mentorship, growth, work-life balance).",
  "industryCategory": "One of: Tech, Finance, Healthcare, Consulting, Energy, Education, Government, Retail, Manufacturing, Media, Real Estate, Transportation, Nonprofit, Legal, Agriculture, Other",
  "headquarters": "City, State/Country",
  "wowFacts": [
    {"fact": "Specific impressive fact or achievement", "source": "General source (e.g., 'Company website', 'Industry reports')", "sourceUrl": "#"},
    {"fact": "Another specific fact", "source": "General source", "sourceUrl": "#"},
    {"fact": "Third specific fact", "source": "General source", "sourceUrl": "#"}
  ]
}

EXAMPLES OF GOOD vs BAD:
❌ BAD: "Google is a technology leader" 
✅ GOOD: "Google develops search, cloud computing (GCP), Android OS, and AI products like Gemini"

❌ BAD: "Great culture and benefits"
✅ GOOD: "Known for 20% time policy (Gmail, AdSense originated from this), strong mentorship programs, and extensive learning resources"

❌ BAD: "Hiring software engineers"
✅ GOOD: "Software Engineer - New Grad, Product Manager - APM Program, Data Scientist - Entry Level"`,
      },
      {
        role: "user",
        content: `Research and provide detailed, factual information about: ${companyName}

Focus on:
1. What they actually do (products, services, business model)
2. Specific projects, products, or initiatives (not generic "innovation")
3. Concrete skills they look for in new graduates (programming languages, frameworks, specific tools)
4. Exact entry-level role titles they typically post
5. Verifiable facts that would impress a student (size, growth, impact, awards)

Be specific and avoid marketing language.`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from OpenAI");
  }

  console.log(`✅ Employer context fetched successfully`);
  const context = JSON.parse(content) as EmployerContext;
  console.log(`   - Industry: ${context.industryCategory}`);
  console.log(`   - Typical Roles: ${context.typicalRoles?.slice(0, 3).join(", ")}`);
  console.log(`   - Valued Skills: ${context.valuedSkills?.slice(0, 5).join(", ")}`);
  
  return context;
}

/**
 * Generate a personalized elevator pitch.
 */
export async function generatePitch(
  userProfile: UserProfileData,
  companyName: string,
  employerContext?: EmployerContext
): Promise<PitchResult> {
  const systemPrompt = `You are an expert career coach helping a student prepare for a career fair. You must be CONSISTENT and DETERMINISTIC in your responses.

CRITICAL RULES:
1. Return ONLY valid JSON - no markdown, no explanations, no extra text
2. Base scoring STRICTLY on the data provided - do not assume or invent information
3. Be SPECIFIC and ACTIONABLE - avoid generic advice
4. Use the EXACT format specified - no additional fields

ELEVATOR PITCH REQUIREMENTS:
- Length: EXACTLY 75-95 words (count carefully)
- Structure: "Hi, I'm [name]. [Background/major]. [Specific skills that match company]. [Why interested in THIS company]. [Ask for next steps]."
- Tone: Professional but conversational, enthusiastic but not desperate
- Must mention: User's major, 2-3 specific skills that match the role, and ONE specific reason why this company
- NO generic phrases like "passionate about technology", "eager to learn", "team player"

INTERESTING FACTS:
- Must be SPECIFIC and VERIFIABLE about the company
- Format: "[Specific fact/achievement]. [Why it matters to a new grad]."
- Example: "Google's 20% time policy led to Gmail and AdSense. This shows they value employee-driven innovation."
- NO generic facts like "Great company culture" or "Industry leader"

SMART QUESTIONS:
- Must be INSIGHTFUL and show research, not basic questions anyone could ask
- Format: Open-ended, related to the user's specific role interest
- Example: "How does your team balance technical debt with feature development in your sprint planning?"
- NO questions like "What's the culture like?" or "What are the benefits?"

TOP MATCHED ROLES:
- Use the EXACT role titles from employer context if provided
- If not provided, use standard industry titles (Software Engineer, Data Analyst, etc.)
- Prioritize based on user's major and skills

SCORING RULES (be REALISTIC and DIFFERENTIATE between companies):
- Location (0-20): 
  * 20 = Exact city match OR remote-first company
  * 15 = Same metro area or nearby city
  * 10 = Same state/region, willing to relocate
  * 5 = Different region but student is flexible
  * 0 = Company doesn't hire in student's location
  
- Work Authorization (0-20): 
  * 20 = US Citizen or Green Card holder
  * 15 = Has valid work visa (H1B, OPT)
  * 10 = Needs sponsorship AND company actively sponsors (check company size/policy)
  * 5 = Needs sponsorship BUT company rarely sponsors
  * 0 = Company explicitly doesn't sponsor
  
- Major (0-20): 
  * 20 = Perfect match (CS→SWE, Data Science→Data Scientist)
  * 18 = Closely related (Math→SWE, Stats→Data Science)
  * 15 = Related field with relevant coursework (Physics→SWE)
  * 12 = Transferable skills (Business→Product Manager)
  * 8 = Unrelated but student shows interest/projects
  * 3 = Very different, limited overlap
  
- Job Type (0-20): 
  * 20 = Exact match (wants internship, company offers internship)
  * 18 = Slightly flexible (wants full-time, open to contract)
  * 15 = Student says "any" or "open"
  * 10 = Mismatch but student might adapt
  * 5 = Strong mismatch
  
- Skills (0-20): Count student skills that match company's valued skills:
  * 20 = 5+ matching skills (Python, Java, SQL, React, AWS all match)
  * 17 = 4 matching skills
  * 14 = 3 matching skills  
  * 11 = 2 matching skills
  * 7 = 1 matching skill
  * 3 = No direct matches but transferable skills
  * 0 = No relevant skills at all
  
- Resume (0-20): Quality and relevance of experience:
  * 20 = Multiple relevant internships at similar companies
  * 17 = 2+ internships in related field
  * 14 = 1 relevant internship + strong projects
  * 11 = 1 internship, less relevant
  * 8 = Strong projects but no professional experience
  * 5 = Some coursework projects
  * 2 = Minimal experience, mostly coursework
  * 0 = No resume provided

IMPORTANT: 
- Be REALISTIC - not every company is a perfect match
- Use the COMPANY'S SPECIFIC context (location, valued skills, typical roles) to inform scoring
- Consider company size and culture fit
- Differentiate between companies - don't give the same scores to Google and a startup

Total matchScore = sum of all 6 scores (0-120)`;

  // Build company context section
  let companyContext = `COMPANY:\n- Company Name: ${companyName}`;
  if (employerContext) {
    companyContext += `
- What They Do: ${employerContext.whatTheyDo}
- Industry: ${employerContext.industryCategory}
- Headquarters: ${employerContext.headquarters}
- Valued Skills: ${employerContext.valuedSkills?.join(", ")}
- Typical Roles They Hire: ${employerContext.typicalRoles?.join(", ")}
- Culture & Mission: ${employerContext.cultureMission}
- Recent Notable Projects: ${employerContext.recentProjectsAndProducts?.join(" | ")}`;
  }

  const userPrompt = `Generate a personalized career fair pitch for this student:

STUDENT PROFILE:
- Name: ${userProfile.name || "the student"}
- School: ${userProfile.school || "Not specified"}
- Major: ${userProfile.major || "Not specified"}
- Graduation: ${userProfile.graduationYear || "Not specified"}
- Location Preference: ${userProfile.location || "Open to any location"}
- Work Authorization: ${userProfile.workAuthorization || "Not specified"}
- Job Type Preference: ${userProfile.jobTypePreference || "Open to any"}
- Skills: ${userProfile.skills?.join(", ") || "No specific skills listed"}
- Background/Experience: ${userProfile.background || "Not provided"}
- Resume Highlights: ${userProfile.resumeText?.substring(0, 1000) || "No resume provided"}

${companyContext}

TASK: Create a personalized pitch that:
1. Highlights SPECIFIC skills from the student's profile that match the company's valued skills
2. References SPECIFIC projects/initiatives from the company's recent work
3. Shows clear alignment between student's goals and company's roles
4. Includes actionable questions that demonstrate research and interest
5. **Scores should reflect REALISTIC fit** - consider:
   - How well student's skills match THIS SPECIFIC COMPANY's valued skills
   - Geographic fit (${userProfile.location} vs ${employerContext?.headquarters || companyName})
   - Company size/culture (large tech companies vs startups have different needs)
   - Visa sponsorship likelihood for THIS SPECIFIC COMPANY
   - How competitive the student would be for THIS SPECIFIC COMPANY's roles

OUTPUT (valid JSON only):
{
  "companyName": "string",
  "elevatorPitch30s": "string (75-95 words, structured intro)",
  "interestingFacts": ["specific fact 1", "specific fact 2", "specific fact 3"],
  "smartQuestions": ["insightful question 1", "insightful question 2", "insightful question 3"],
  "topMatchedRoles": ["exact role title 1", "exact role title 2", "exact role title 3"],
  "scoreBreakdown": {
    "location": { "score": number, "reason": "brief explanation" },
    "workAuthorization": { "score": number, "reason": "brief explanation" },
    "major": { "score": number, "reason": "brief explanation" },
    "jobType": { "score": number, "reason": "brief explanation" },
    "skills": { "score": number, "reason": "brief explanation" },
    "resume": { "score": number, "reason": "brief explanation" }
  },
  "matchScore": number
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
    temperature: 0.5, // Increased for more variation between companies
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
