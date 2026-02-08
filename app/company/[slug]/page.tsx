"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { companyApi, pitchApi } from "@/lib/api-client";
import { Company } from "@/lib/types";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { CategoryBadge, ScoreBadge } from "@/components/ui/Badge";

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  
  console.log(`🎬 [Company Page] Component mounted/updated with slug: ${slug}`);
  
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    async function fetchCompanyAndGenerate() {
      try {
        console.log(`🔍 [Company Page] Starting fetch for slug: ${slug}`);
        setLoading(true);
        setError(null);
        const response = await companyApi.get(slug);
        let comp = response.company;
        console.log(`✅ [Company Page] Fetched company:`, comp);
        setCompany(comp);

        // ALWAYS generate fresh pitch when visiting company page
        console.log(`🚀 [Company Page] Generating fresh pitch for ${comp.name} (id: ${comp.id})`);
        setGenerating(true);
        try {
          // Pass companyId so it saves to MongoDB
          const result = await pitchApi.generate(comp.name, comp.id);
          comp = {
            ...comp,
            careerFairCard: result.careerFairCard,
            matchScore: result.matchScore,
            matchReasoning: result.matchReasoning,
            generated: true,
          };
          setCompany(comp);
          console.log("✅ Pitch generated and saved:", result);
        } catch (genErr: any) {
          console.error("❌ Pitch generation error:", genErr);
          setError(genErr.message || "Failed to generate pitch. Please complete your profile first.");
          // Not fatal — page still shows company info without AI content
        } finally {
          setGenerating(false);
        }
      } catch (err) {
        console.error("Error fetching company:", err);
        setError("Company not found");
      } finally {
        setLoading(false);
      }
    }

    if (slug) {
      fetchCompanyAndGenerate();
    }
  }, [slug]);

  if (loading) {
    return (
      <Container className="py-20 text-center">
        <div className="text-lg text-muted">Loading company details...</div>
      </Container>
    );
  }

  if (error || !company) {
    return (
      <Container className="py-20 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-2">Company Not Found</h1>
        <p className="text-muted mb-6">We couldn&apos;t find a company with that URL.</p>
        <Link href="/app">
          <Button>← Back to Dashboard</Button>
        </Link>
      </Container>
    );
  }

  return (
    <Container className="py-8 max-w-4xl">
      {/* Back button */}
      <div className="mb-6">
        <Link href="/app" className="text-sm text-primary hover:underline flex items-center gap-1">
          ← Back to Dashboard
        </Link>
      </div>

      {/* Company Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-foreground mb-2">{company.name}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
              <span className="flex items-center gap-1.5">
                📍 {company.location}
              </span>
              <span>•</span>
              <a 
                href={company.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline flex items-center gap-1"
              >
                🌐 Visit website
              </a>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <CategoryBadge category={company.category} />
            <ScoreBadge score={company.matchScore} />
            {company.hiringNow && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Related to my interest
              </span>
            )}
          </div>
        </div>

        {/* About Section */}
        {company.aboutInfo && (
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
            <h2 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              🏢 About {company.name}
            </h2>
            <p className="text-sm text-foreground leading-relaxed">{company.aboutInfo}</p>
          </Card>
        )}
      </div>

      {/* Key Information Grid */}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        {/* Job Description */}
        {company.jobDescription && (
          <Card>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              💼 Target Role
            </h3>
            <p className="text-sm text-foreground font-medium bg-secondary rounded-lg px-3 py-2">
              {company.jobDescription}
            </p>
          </Card>
        )}

        {/* Top Roles */}
        {company.topRoles && company.topRoles.length > 0 && (
          <Card>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              🎯 Available Positions
            </h3>
            <div className="flex flex-wrap gap-2">
              {company.topRoles.map((role, idx) => (
                <span 
                  key={idx}
                  className="text-xs font-medium bg-secondary text-foreground rounded-full px-3 py-1.5"
                >
                  {role}
                </span>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Match Analysis */}
      {company.matchReasoning && (
        <Card className="mb-8 bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-lg font-bold">
              {company.matchScore}%
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-foreground mb-2">
                Why This Is a Great Match for You
              </h3>
              <p className="text-sm text-foreground leading-relaxed">
                {company.matchReasoning}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Personal Notes */}
      {company.notes && company.notes.trim() !== "" && (
        <Card className="mb-8 bg-amber-50 border-amber-100">
          <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            📝 Your Notes
          </h3>
          <p className="text-sm text-foreground italic">
            &quot;{company.notes}&quot;
          </p>
        </Card>
      )}

      {/* Career Fair Preparation */}
      <div className="mt-8">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            🎯 Career Fair Preparation
          </h2>
          {company.careerFairCard && (
            <div className="text-xs text-muted italic flex items-center gap-1">
              <span>✨</span>
              <span>AI-generated using your profile</span>
            </div>
          )}
        </div>

        {generating && (
          <Card className="text-center py-12">
            <div className="animate-pulse text-4xl mb-3">✨</div>
            <p className="text-sm text-muted mb-2">Generating personalized insights with AI...</p>
            <p className="text-xs text-muted">This may take 10-15 seconds</p>
          </Card>
        )}

        {!generating && company.careerFairCard && (
          <div className="space-y-5">
            {/* Elevator Pitch */}
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  🎤 Your 30-Second Pitch
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(company.careerFairCard!.pitch);
                  }}
                >
                  📋 Copy
                </Button>
              </div>
              <p className="text-sm text-foreground leading-relaxed bg-primary-light rounded-lg p-4 border border-primary/10">
                {company.careerFairCard.pitch}
              </p>
            </Card>

            {/* Key Talking Points */}
            <Card>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                🌟 Key Talking Points
              </h3>
              <ul className="space-y-3">
                {company.careerFairCard.wowFacts.map((fact, index) => (
                  <li key={index} className="flex items-start gap-3 text-sm">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600 text-xs font-semibold">
                      {index + 1}
                    </span>
                    <p className="text-foreground">{fact.fact}</p>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Top Roles to Ask About */}
            <Card>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                💼 Top Roles to Ask About
              </h3>
              <div className="flex flex-wrap gap-2">
                {company.careerFairCard.topRoles.map((role) => (
                  <span key={role} className="rounded-lg bg-secondary px-3 py-1.5 text-sm font-medium text-foreground">
                    {role}
                  </span>
                ))}
              </div>
            </Card>

            {/* Smart Questions */}
            <Card>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                ❓ Smart Questions to Ask
              </h3>
              <ol className="space-y-2">
                {company.careerFairCard.smartQuestions.map((q, index) => (
                  <li key={index} className="flex items-start gap-3 text-sm">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 text-xs font-semibold">
                      {index + 1}
                    </span>
                    <p className="text-foreground">{q}</p>
                  </li>
                ))}
              </ol>
            </Card>

            {/* Follow-Up Message */}
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  ✉️ Follow-Up Message
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(company.careerFairCard!.followUpMessage);
                  }}
                >
                  📋 Copy
                </Button>
              </div>
              <p className="text-sm text-foreground leading-relaxed bg-emerald-50 rounded-lg p-4 border border-emerald-100">
                {company.careerFairCard.followUpMessage}
              </p>
            </Card>
          </div>
        )}
      </div>
    </Container>
  );
}
