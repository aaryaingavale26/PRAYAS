/**
 * FastAPI Backend API Client
 * Centralized interface for connecting to Member 2's FastAPI and RAG backend
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

/**
 * Health Check for FastAPI backend
 */
export async function checkBackendHealth() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500); // 2.5s timeout

    const res = await fetch(`${API_BASE_URL}/health`, {
      method: "GET",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return {
        online: true,
        status: "connected",
        message: data.message || "FastAPI backend is online & operational",
        url: API_BASE_URL,
      };
    }
    return {
      online: false,
      status: "degraded",
      message: `Backend returned status ${res.status}`,
      url: API_BASE_URL,
    };
  } catch (err) {
    return {
      online: false,
      status: "offline",
      message: "FastAPI backend not detected at " + API_BASE_URL + " (Running with local mock AI)",
      url: API_BASE_URL,
    };
  }
}

/**
 * Generate an AI-assisted answer for a job application prompt using RAG
 * Endpoint: POST /api/rag/query or POST /api/generate-answer
 */
export async function generateJobAnswer({ question, context = "", passportPreferences = null }) {
  if (!question || !question.trim()) {
    throw new Error("Application question is required.");
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(`${API_BASE_URL}/api/rag/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        question: question.trim(),
        context,
        preferences: passportPreferences,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return {
        answer: data.answer || data.response || "No response generated from backend.",
        sourceDocs: data.sources || ["Uploaded Candidate Portfolio"],
        confidenceScore: data.confidence || 0.94,
        isLiveBackend: true,
      };
    }
  } catch (backendErr) {
    console.info("FastAPI backend query failed or offline. Generating client-side RAG response.", backendErr.message);
  }

  // Fallback intelligent response generator for demo continuity
  await new Promise((resolve) => setTimeout(resolve, 800)); // realistic typing delay
  return getSimulatedRAGAnswer(question, passportPreferences);
}

/**
 * Intelligent client-side fallback answer generator for hackathon presentations
 */
function getSimulatedRAGAnswer(question, passportPreferences) {
  const q = question.toLowerCase();
  let answer = "";
  const sources = ["Rahul_Sharma_Frontend_Resume.pdf", "Accessibility_Passport_v3"];

  if (q.includes("why") || q.includes("fit") || q.includes("interest")) {
    answer =
      "Based on my 4+ years of frontend engineering experience and commitment to web accessibility (WCAG 2.2 AAA), I bring both technical proficiency in React/Next.js and a deep understanding of user-centric, inclusive design. I have successfully reduced accessibility barriers and streamlined UI workflows across mission-critical web platforms.";
  } else if (q.includes("challenge") || q.includes("project") || q.includes("difficult")) {
    answer =
      "In my recent project, I redesigned a high-traffic job portal form flow that suffered from severe keyboard tab-traps and low-contrast elements. By implementing accessible focus management, ARIA landmarks, and high-visibility outlines, we increased application completion rates by 38% while ensuring full screen-reader compatibility.";
  } else if (q.includes("accommodat") || q.includes("disabilit") || q.includes("need")) {
    answer =
      "I utilize assistive technologies including speech dictation and high-contrast navigation. To perform at my best, I request real-time captions or written documentation for remote meetings and accessible development environments.";
  } else {
    answer =
      `Regarding your inquiry ("${question}"): Drawing from my background in frontend engineering and accessible web systems, I deliver reliable, well-tested solutions with strong cross-functional communication and proactive attention to detail.`;
  }

  // If simplified language preference is active, keep bulleted and plain
  if (passportPreferences?.simplifiedLanguage) {
    answer = `• Key Strength: Extensive experience in modern web engineering & accessibility.\n• Proven Impact: Built inclusive web tools with high reliability.\n• Alignment: Ready to contribute immediately with clear communication.`;
  }

  return {
    answer,
    sourceDocs: sources,
    confidenceScore: 0.96,
    isLiveBackend: false,
  };
}
