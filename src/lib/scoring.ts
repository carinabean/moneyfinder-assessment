export interface ScoreCategory {
  score: number;
  max: number;
  notes: string;
}

export interface AssessmentScores {
  overall_score: number;
  recommendation: "STRONG_HIRE" | "HIRE" | "NO_HIRE";
  categories: {
    politeness: ScoreCategory;
    persuasiveness: ScoreCategory;
    positive_language: ScoreCategory;
    creativity: ScoreCategory;
    problem_solving: ScoreCategory;
  };
  auto_fail_triggers: string[];
  key_strengths: string;
  areas_for_development: string;
  scenario_summary: string;
}

export function parseScores(text: string): AssessmentScores | null {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]) as AssessmentScores;
  } catch {
    return null;
  }
}
