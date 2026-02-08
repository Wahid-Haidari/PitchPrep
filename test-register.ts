/**
 * Test script for user registration
 * Run with: npx tsx test-register.ts
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function testRegistration() {
  const baseUrl = "http://localhost:3000";
  
  console.log("=" .repeat(80));
  console.log("TESTING USER REGISTRATION");
  console.log("=" .repeat(80));
  
  // Test data
  const testUser = {
    name: "Test User",
    email: `test${Date.now()}@example.com`, // Unique email
    password: "testpass123",
  };

  console.log("\n📝 Registering new user...");
  console.log("Name:", testUser.name);
  console.log("Email:", testUser.email);
  
  const registerResponse = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(testUser),
  });

  if (!registerResponse.ok) {
    const error = await registerResponse.json();
    console.error("❌ Registration failed:", error);
    return;
  }

  const result = await registerResponse.json();
  console.log("\n✅ Registration successful!");
  console.log("\nUser data:");
  console.log(JSON.stringify(result.user, null, 2));
  
  // Test that user role is enforced
  if (result.user.role !== "user") {
    console.error("\n❌ ERROR: Expected role 'user' but got:", result.user.role);
    return;
  }
  
  console.log("\n✅ User role correctly set to 'user' (not admin)");
  
  // Test login with new account
  console.log("\n🔑 Testing login with new account...");
  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testUser.email,
      password: testUser.password,
      role: "user",
    }),
  });

  if (!loginResponse.ok) {
    console.error("❌ Login failed:", await loginResponse.text());
    return;
  }

  console.log("✅ Login successful!");
  
  console.log("\n" + "=" .repeat(80));
  console.log("✅ ALL TESTS PASSED");
  console.log("=" .repeat(80));
  console.log("\nYou can now:");
  console.log("1. Visit http://localhost:3000/register to test the UI");
  console.log("2. Login with the test account:");
  console.log("   Email:", testUser.email);
  console.log("   Password:", testUser.password);
}

testRegistration().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});