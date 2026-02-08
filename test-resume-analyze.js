// Quick test script for resume analysis
// Run with: node test-resume-analyze.js

const resumeText = `
ALEX CHEN
alex.chen@university.edu | (555) 123-4567 | linkedin.com/in/alexchen | github.com/alexchen

EDUCATION
State University - B.S. Computer Science & Business Administration
GPA: 3.8/4.0 | Expected May 2026
Relevant Coursework: Machine Learning, Distributed Systems, Data Structures, Business Strategy, Financial Accounting

EXPERIENCE
Software Engineering Intern - TechStartup Inc. | Summer 2025
- Developed a dashboard for the marketing team to track campaign performance
`;

async function testAnalyze() {
  try {
    // You'll need to get your auth token first by logging in
    const token = "YOUR_TOKEN_HERE"; // Replace with actual token from browser localStorage
    
    const response = await fetch("http://localhost:3000/api/users/resume/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ resumeText }),
    });

    const data = await response.json();
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error:", error);
  }
}

testAnalyze();
