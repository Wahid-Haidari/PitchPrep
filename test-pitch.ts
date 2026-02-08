/**
 * Test script for pitch generation
 * Run with: npx tsx test-pitch.ts
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function testPitchGeneration() {
  const baseUrl = "http://localhost:3000";
  
  console.log("=" .repeat(80));
  console.log("TESTING PITCH GENERATION API");
  console.log("=" .repeat(80));
  
  // 1. Login first to get auth token
  console.log("\n1. Logging in...");
  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "user@gmail.com",
      password: "12345",
    }),
  });

  if (!loginResponse.ok) {
    console.error("❌ Login failed:", await loginResponse.text());
    return;
  }

  const cookies = loginResponse.headers.get("set-cookie");
  console.log("✅ Login successful");

  // 2. Generate pitch
  console.log("\n2. Generating pitch for Google...\n");
  const pitchResponse = await fetch(`${baseUrl}/api/pitch/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookies || "",
    },
    body: JSON.stringify({
      companyName: "Google",
    }),
  });

  if (!pitchResponse.ok) {
    console.error("❌ Pitch generation failed:", await pitchResponse.text());
    return;
  }

  const result = await pitchResponse.json();
  
  console.log("=" .repeat(80));
  console.log("PITCH GENERATION RESULT (JSON)");
  console.log("=" .repeat(80));
  console.log(JSON.stringify(result, null, 2));
  
  console.log("\n" + "=" .repeat(80));
  console.log("FORMATTED OUTPUT");
  console.log("=" .repeat(80));
  
  console.log("\n🎯 ELEVATOR PITCH (30 seconds):");
  console.log("-".repeat(80));
  console.log(result.careerFairCard.pitch);
  
  console.log("\n\n📊 MATCH SCORE: " + result.matchScore + "/120");
  console.log("-".repeat(80));
  
  if (result.scoreBreakdown) {
    console.log("\n📈 SCORE BREAKDOWN:");
    console.log(`  • Location:      ${result.scoreBreakdown.location.score}/20 - ${result.scoreBreakdown.location.reason}`);
    console.log(`  • Work Auth:     ${result.scoreBreakdown.workAuthorization.score}/20 - ${result.scoreBreakdown.workAuthorization.reason}`);
    console.log(`  • Major:         ${result.scoreBreakdown.major.score}/20 - ${result.scoreBreakdown.major.reason}`);
    console.log(`  • Job Type:      ${result.scoreBreakdown.jobType.score}/20 - ${result.scoreBreakdown.jobType.reason}`);
    console.log(`  • Skills:        ${result.scoreBreakdown.skills.score}/20 - ${result.scoreBreakdown.skills.reason}`);
    console.log(`  • Resume:        ${result.scoreBreakdown.resume.score}/20 - ${result.scoreBreakdown.resume.reason}`);
  }
  
  console.log("\n\n💡 INTERESTING FACTS:");
  console.log("-".repeat(80));
  result.careerFairCard.wowFacts.forEach((fact: any, i: number) => {
    console.log(`${i + 1}. ${fact.fact}`);
  });
  
  console.log("\n\n❓ SMART QUESTIONS TO ASK:");
  console.log("-".repeat(80));
  result.careerFairCard.smartQuestions.forEach((q: string, i: number) => {
    console.log(`${i + 1}. ${q}`);
  });
  
  console.log("\n\n🎯 TOP MATCHED ROLES:");
  console.log("-".repeat(80));
  result.careerFairCard.topRoles.forEach((role: string, i: number) => {
    console.log(`${i + 1}. ${role}`);
  });
  
  console.log("\n\n✅ Test completed successfully!");
}

testPitchGeneration().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
