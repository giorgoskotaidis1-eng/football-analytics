export interface AppRouteContext {
  path: string;
  title: string;
  purpose: string;
  guidance: string;
}

export interface AppTaskContext {
  intent: string;
  route: string;
  guidance: string;
}

export const APP_CONTEXT = {
  name: "Football Analytics",
  purpose:
    "A football analytics platform for coaches, analysts, and scouts to manage players, matches, reports, video analysis, scouting work, staff messages, and AI assistance.",
  routes: [
    {
      path: "/dashboard",
      title: "Dashboard",
      purpose:
        "Workspace overview with quick access to the user's analytics activity and important football data.",
      guidance:
        "Use Dashboard when the user wants a general overview or asks where to start.",
    },
    {
      path: "/assistant",
      title: "AI Assistant",
      purpose:
        "Chat with the AI assistant, ask football analytics questions, and upload screenshots or photos for visual analysis.",
      guidance:
        "Use Assistant when the user wants AI help, wants to upload a screenshot, or wants an explanation of football data.",
    },
    {
      path: "/players",
      title: "Players",
      purpose:
        "Browse, manage, and analyse player profiles, player statistics, roles, and performance information.",
      guidance:
        "Send users to Players when they want to find a player, analyse a player, compare player qualities, or review player stats.",
    },
    {
      path: "/matches",
      title: "Matches",
      purpose:
        "Browse match records, match details, lineups, events, performance metrics, and tactical data.",
      guidance:
        "Send users to Matches when they want to analyse a match, review match events, lineups, score, xG, or possession data.",
    },
    {
      path: "/reports",
      title: "Reports",
      purpose:
        "Create, view, and manage tactical, opposition, player, and scouting reports.",
      guidance:
        "Send users to Reports when they want to create or review a scouting report, opposition report, or tactical analysis document.",
    },
    {
      path: "/scouting",
      title: "Scouting",
      purpose:
        "Search, evaluate, shortlist, and compare players for recruitment and squad fit.",
      guidance:
        "Send users to Scouting when they ask about recruitment, player fit, shortlists, or comparing targets.",
    },
    {
      path: "/messages",
      title: "Staff Messages",
      purpose:
        "Human-to-human internal messages between staff members.",
      guidance:
        "Send users to Messages only when they want to contact staff. Make clear this is separate from the AI Assistant.",
    },
    {
      path: "/settings",
      title: "Settings",
      purpose:
        "Manage account preferences, profile settings, and application configuration.",
      guidance:
        "Send users to Settings when they ask about account, profile, preferences, or app configuration.",
    },
  ] satisfies AppRouteContext[],
  commonTasks: [
    {
      intent: "Create a scouting report",
      route: "/reports",
      guidance:
        "Go to Reports, choose create/new report, then fill in the player, team, match, and analysis sections.",
    },
    {
      intent: "Analyse a player",
      route: "/players",
      guidance:
        "Go to Players, open the player profile, then review statistics, role, strengths, weaknesses, and match actions.",
    },
    {
      intent: "Analyse a match",
      route: "/matches",
      guidance:
        "Go to Matches, open the relevant match, then review score, events, lineups, xG, possession, and tactical notes.",
    },
    {
      intent: "Upload a screenshot for AI analysis",
      route: "/assistant",
      guidance:
        "Go to Assistant, attach a JPG, PNG, or WebP image, then ask what you want the AI to analyse.",
    },
    {
      intent: "Contact staff",
      route: "/messages",
      guidance:
        "Go to Staff Messages and create a staff message thread. This is not the AI assistant.",
    },
    {
      intent: "Find where something is in the app",
      route: "/assistant",
      guidance:
        "Ask the AI Assistant and it should guide the user to the correct page and explain the steps clearly.",
    },
  ] satisfies AppTaskContext[],
} as const;

export function buildAssistantSystemPrompt(): string {
  return `You are the AI assistant inside the Football Analytics application.

Your jobs:
1. Answer football analytics questions clearly and practically.
2. Analyse uploaded screenshots, photos, statistics tables, dashboards, tactical images, heatmaps, lineups, reports, and match frames.
3. Guide users inside the application when they ask where to find something or how to complete a task.

Application context:
${JSON.stringify(APP_CONTEXT, null, 2)}

In-app guidance rules:
- If the user asks where to do something, name the correct page and route, then give simple steps.
- If the user seems lost, guide them to the most relevant feature.
- Do not pretend you clicked or navigated for the user unless the frontend explicitly supports that action.
- Keep guidance practical, e.g. "Go to /reports, then create a new report".

Image analysis rules:
- If one or more images are attached, inspect them carefully.
- Identify what is visible before drawing conclusions.
- Extract useful football data when possible.
- Explain the tactical or analytical meaning in plain football language.
- If the image is blurry, cropped, or incomplete, say what is missing.

Tone:
- Professional, clear, concise.
- Use football terminology correctly.
- If you do not know something, say so instead of guessing.
- Never reveal, store, or repeat passwords, API keys, tokens, or sensitive credentials.`;
}
