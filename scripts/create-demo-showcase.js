const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const ownerEmail = process.env.DEMO_OWNER_EMAIL || "paokjim97@gmail.com";
  const matchSlug = "demo-showcase-match";

  const owner =
    (await prisma.user.findUnique({ where: { email: ownerEmail } })) ||
    (await prisma.user.findFirst({ orderBy: { id: "asc" } }));

  if (!owner) {
    throw new Error("No user found in database. Create a user first.");
  }

  // Create or reuse two demo teams
  const homeTeam =
    (await prisma.team.findFirst({ where: { name: "Demo FC" } })) ||
    (await prisma.team.create({
      data: {
        name: "Demo FC",
        league: "Showcase League",
        createdById: owner.id,
      },
    }));

  const awayTeam =
    (await prisma.team.findFirst({ where: { name: "Showcase United" } })) ||
    (await prisma.team.create({
      data: {
        name: "Showcase United",
        league: "Showcase League",
        createdById: owner.id,
      },
    }));

  // Ensure owner has active membership on both teams
  await prisma.userTeam.upsert({
    where: { userId_teamId: { userId: owner.id, teamId: homeTeam.id } },
    update: { status: "active" },
    create: { userId: owner.id, teamId: homeTeam.id, role: "head_coach", status: "active" },
  });
  await prisma.userTeam.upsert({
    where: { userId_teamId: { userId: owner.id, teamId: awayTeam.id } },
    update: { status: "active" },
    create: { userId: owner.id, teamId: awayTeam.id, role: "analyst", status: "active" },
  });

  // Two demo players with showcase stats
  const p1 = await prisma.player.upsert({
    where: { slug: "demo-andreas-kostas" },
    update: {
      name: "Andreas Kostas",
      position: "Forward",
      teamId: homeTeam.id,
      number: 9,
      goals: 18,
      assists: 7,
      xg: 16.4,
      xag: 4.2,
      shotsPer90: 4.8,
      keyPassesPer90: 1.9,
      pressuresPer90: 12.3,
      progressivePassesPer90: 3.1,
      carriesIntoFinalThirdPer90: 2.6,
      defensiveDuelsWonPer90: 1.4,
    },
    create: {
      slug: "demo-andreas-kostas",
      name: "Andreas Kostas",
      position: "Forward",
      age: 24,
      nationality: "Greece",
      number: 9,
      teamId: homeTeam.id,
      goals: 18,
      assists: 7,
      xg: 16.4,
      xag: 4.2,
      shotsPer90: 4.8,
      keyPassesPer90: 1.9,
      pressuresPer90: 12.3,
      progressivePassesPer90: 3.1,
      carriesIntoFinalThirdPer90: 2.6,
      defensiveDuelsWonPer90: 1.4,
    },
  });

  const p2 = await prisma.player.upsert({
    where: { slug: "demo-nikos-papadakis" },
    update: {
      name: "Nikos Papadakis",
      position: "Midfielder",
      teamId: homeTeam.id,
      number: 8,
      goals: 9,
      assists: 14,
      xg: 7.1,
      xag: 11.6,
      shotsPer90: 2.2,
      keyPassesPer90: 3.7,
      pressuresPer90: 16.8,
      progressivePassesPer90: 7.4,
      carriesIntoFinalThirdPer90: 4.1,
      defensiveDuelsWonPer90: 4.7,
    },
    create: {
      slug: "demo-nikos-papadakis",
      name: "Nikos Papadakis",
      position: "Midfielder",
      age: 27,
      nationality: "Greece",
      number: 8,
      teamId: homeTeam.id,
      goals: 9,
      assists: 14,
      xg: 7.1,
      xag: 11.6,
      shotsPer90: 2.2,
      keyPassesPer90: 3.7,
      pressuresPer90: 16.8,
      progressivePassesPer90: 7.4,
      carriesIntoFinalThirdPer90: 4.1,
      defensiveDuelsWonPer90: 4.7,
    },
  });

  const p3 = await prisma.player.upsert({
    where: { slug: "demo-giannis-markou" },
    update: {
      name: "Giannis Markou",
      position: "Forward",
      teamId: awayTeam.id,
      number: 10,
      goals: 12,
      assists: 6,
      xg: 10.8,
      xag: 5.1,
      shotsPer90: 3.9,
      keyPassesPer90: 1.6,
      pressuresPer90: 11.2,
      progressivePassesPer90: 2.4,
      carriesIntoFinalThirdPer90: 2.1,
      defensiveDuelsWonPer90: 1.2,
    },
    create: {
      slug: "demo-giannis-markou",
      name: "Giannis Markou",
      position: "Forward",
      age: 25,
      nationality: "Greece",
      number: 10,
      teamId: awayTeam.id,
      goals: 12,
      assists: 6,
      xg: 10.8,
      xag: 5.1,
      shotsPer90: 3.9,
      keyPassesPer90: 1.6,
      pressuresPer90: 11.2,
      progressivePassesPer90: 2.4,
      carriesIntoFinalThirdPer90: 2.1,
      defensiveDuelsWonPer90: 1.2,
    },
  });

  const p4 = await prisma.player.upsert({
    where: { slug: "demo-manos-vlachos" },
    update: {
      name: "Manos Vlachos",
      position: "Midfielder",
      teamId: awayTeam.id,
      number: 6,
      goals: 5,
      assists: 11,
      xg: 4.4,
      xag: 9.2,
      shotsPer90: 1.8,
      keyPassesPer90: 3.1,
      pressuresPer90: 15.4,
      progressivePassesPer90: 6.3,
      carriesIntoFinalThirdPer90: 3.5,
      defensiveDuelsWonPer90: 4.2,
    },
    create: {
      slug: "demo-manos-vlachos",
      name: "Manos Vlachos",
      position: "Midfielder",
      age: 28,
      nationality: "Greece",
      number: 6,
      teamId: awayTeam.id,
      goals: 5,
      assists: 11,
      xg: 4.4,
      xag: 9.2,
      shotsPer90: 1.8,
      keyPassesPer90: 3.1,
      pressuresPer90: 15.4,
      progressivePassesPer90: 6.3,
      carriesIntoFinalThirdPer90: 3.5,
      defensiveDuelsWonPer90: 4.2,
    },
  });

  const posPool = ["GK", "CB", "LB", "RB", "CM", "CM", "RW", "ST"];
  const squadHome = [];
  const squadAway = [];
  for (let i = 0; i < 4; i++) {
    const slug = `demo-squad-home-${i}`;
    squadHome.push(
      await prisma.player.upsert({
        where: { slug },
        update: {
          teamId: homeTeam.id,
          position: posPool[i],
          goals: 2 + i,
          assists: 1 + (i % 3),
          xg: 1.1 + i * 0.4,
          shotsPer90: 0.8 + i * 0.3,
          keyPassesPer90: 0.5 + i * 0.2,
          pressuresPer90: 8 + i * 2,
        },
        create: {
          slug,
          name: `Demo Home Squad ${i + 1}`,
          position: posPool[i],
          age: 22 + i,
          nationality: "Greece",
          number: 20 + i,
          teamId: homeTeam.id,
          goals: 2 + i,
          assists: 1 + (i % 3),
          xg: 1.1 + i * 0.4,
          xag: 0.6 + i * 0.15,
          shotsPer90: 0.8 + i * 0.3,
          keyPassesPer90: 0.5 + i * 0.2,
          pressuresPer90: 8 + i * 2,
          progressivePassesPer90: 1 + i * 0.4,
          carriesIntoFinalThirdPer90: 0.7 + i * 0.2,
          defensiveDuelsWonPer90: 2 + i * 0.3,
        },
      }),
    );
  }
  for (let i = 0; i < 4; i++) {
    const slug = `demo-squad-away-${i}`;
    squadAway.push(
      await prisma.player.upsert({
        where: { slug },
        update: {
          teamId: awayTeam.id,
          position: posPool[(i + 2) % posPool.length],
          goals: 1 + (i % 4),
          assists: 2 + (i % 2),
          xg: 0.9 + i * 0.35,
          shotsPer90: 0.9 + i * 0.25,
          keyPassesPer90: 0.7 + i * 0.15,
          pressuresPer90: 9 + i * 1.5,
        },
        create: {
          slug,
          name: `Demo Away Squad ${i + 1}`,
          position: posPool[(i + 2) % posPool.length],
          age: 23 + i,
          nationality: "Greece",
          number: 30 + i,
          teamId: awayTeam.id,
          goals: 1 + (i % 4),
          assists: 2 + (i % 2),
          xg: 0.9 + i * 0.35,
          xag: 1.1 + i * 0.2,
          shotsPer90: 0.9 + i * 0.25,
          keyPassesPer90: 0.7 + i * 0.15,
          pressuresPer90: 9 + i * 1.5,
          progressivePassesPer90: 1.2 + i * 0.35,
          carriesIntoFinalThirdPer90: 0.8 + i * 0.25,
          defensiveDuelsWonPer90: 2.2 + i * 0.4,
        },
      }),
    );
  }

  const homeRoster = [p1, p2, ...squadHome];
  const awayRoster = [p3, p4, ...squadAway];

  // Create or refresh one demo match
  let match = await prisma.match.findUnique({ where: { slug: matchSlug } });
  if (!match) {
    match = await prisma.match.create({
      data: {
        slug: matchSlug,
        competition: "Showcase Demo Match",
        venue: "Demo Arena",
        date: new Date(),
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        homeTeamName: homeTeam.name,
        awayTeamName: awayTeam.name,
      },
    });
  } else {
    await prisma.matchEvent.deleteMany({ where: { matchId: match.id } });
  }

  const events = [
    { type: "touch", team: "home", x: 41, y: 58, minute: 2, playerId: p2.id, metadata: { successful: true } },
    { type: "pass", team: "home", x: 44, y: 52, minute: 4, playerId: p2.id, metadata: { successful: true, toX: 63, toY: 40, toPlayerId: p1.id } },
    { type: "shot", team: "home", x: 80, y: 46, minute: 6, playerId: p1.id, xg: 0.22, metadata: { outcome: "saved" } },
    { type: "touch", team: "away", x: 39, y: 31, minute: 11, playerId: p4.id, metadata: { successful: true } },
    { type: "shot", team: "away", x: 74, y: 35, minute: 15, playerId: p3.id, xg: 0.18, metadata: { outcome: "off_target" } },
    { type: "pass", team: "home", x: 49, y: 49, minute: 19, playerId: p2.id, metadata: { successful: true, toX: 71, toY: 43, toPlayerId: p1.id } },
    { type: "shot", team: "home", x: 83, y: 42, minute: 21, playerId: p1.id, xg: 0.34, metadata: { outcome: "goal" } },
    { type: "touch", team: "home", x: 53, y: 47, minute: 28, playerId: p1.id, metadata: { successful: true } },
    { type: "pass", team: "away", x: 48, y: 42, minute: 32, playerId: p4.id, metadata: { successful: false, toX: 61, toY: 37, toPlayerId: p3.id } },
    { type: "shot", team: "away", x: 77, y: 40, minute: 37, playerId: p3.id, xg: 0.26, metadata: { outcome: "goal" } },
    { type: "touch", team: "home", x: 45, y: 56, minute: 50, playerId: p2.id, metadata: { successful: true } },
    { type: "pass", team: "home", x: 52, y: 50, minute: 54, playerId: p2.id, metadata: { successful: true, toX: 75, toY: 44, toPlayerId: p1.id } },
    { type: "shot", team: "home", x: 79, y: 44, minute: 55, playerId: p1.id, xg: 0.41, metadata: { outcome: "goal" } },
    { type: "pass", team: "home", x: 47, y: 54, minute: 62, playerId: p2.id, metadata: { successful: true, toX: 69, toY: 46, toPlayerId: p1.id } },
    { type: "shot", team: "home", x: 76, y: 47, minute: 63, playerId: p1.id, xg: 0.17, metadata: { outcome: "blocked" } },
    { type: "touch", team: "away", x: 52, y: 33, minute: 69, playerId: p4.id, metadata: { successful: true } },
    { type: "shot", team: "away", x: 70, y: 39, minute: 74, playerId: p3.id, xg: 0.11, metadata: { outcome: "saved" } },
    { type: "pass", team: "home", x: 46, y: 51, minute: 82, playerId: p2.id, metadata: { successful: true, toX: 72, toY: 45, toPlayerId: p1.id } },
    { type: "touch", team: "home", x: 58, y: 48, minute: 88, playerId: p1.id, metadata: { successful: true } },
  ];

  // Add dense vector data for showcase (pass/carry/dribble with endpoints)
  const denseEvents = [];
  for (let i = 0; i < 90; i++) {
    const minute = (i % 89) + 1;
    const isHome = i % 2 === 0;
    const team = isHome ? "home" : "away";
    const baseX = isHome ? 30 + (i % 40) : 25 + (i % 45);
    const baseY = isHome ? 35 + (i % 30) : 30 + (i % 35);
    const toX = Math.max(5, Math.min(95, baseX + (isHome ? 8 : -6) + ((i % 7) - 3)));
    const toY = Math.max(5, Math.min(95, baseY + ((i % 9) - 4)));

    denseEvents.push({
      type: "pass",
      team,
      x: baseX,
      y: baseY,
      minute,
      playerId: isHome ? homeRoster[i % homeRoster.length].id : awayRoster[i % awayRoster.length].id,
      metadata: {
        successful: i % 6 !== 0,
        toX,
        toY,
        endX: toX,
        endY: toY,
        progressive: i % 5 === 0 ? "progressive" : "normal",
      },
    });
  }

  for (let i = 0; i < 24; i++) {
    const isHome = i % 2 === 0;
    const team = isHome ? "home" : "away";
    const minute = 5 + i * 3;
    const x = isHome ? 35 + (i % 40) : 30 + (i % 35);
    const y = isHome ? 25 + (i % 45) : 30 + (i % 40);
    const toX = Math.max(5, Math.min(95, x + (isHome ? 6 : -5)));
    const toY = Math.max(5, Math.min(95, y + ((i % 5) - 2)));
    denseEvents.push({
      type: i % 2 === 0 ? "carry" : "dribble",
      team,
      x,
      y,
      minute,
      playerId: isHome ? homeRoster[(i + 1) % homeRoster.length].id : awayRoster[(i + 1) % awayRoster.length].id,
      metadata: {
        toX,
        toY,
        endX: toX,
        endY: toY,
      },
    });
  }

  for (let i = 0; i < 45; i++) {
    const isHome = i % 2 === 0;
    const team = isHome ? "home" : "away";
    const minute = 3 + (i % 87);
    const roster = isHome ? homeRoster : awayRoster;
    const player = roster[i % roster.length];
    denseEvents.push({
      type: i % 3 === 0 ? "tackle" : i % 3 === 1 ? "interception" : "foul",
      team,
      x: 25 + (i % 50),
      y: 20 + (i % 60),
      minute,
      playerId: player.id,
      metadata: { phase: "transition", fake: true },
    });
  }

  events.push(...denseEvents);

  await prisma.matchEvent.createMany({
    data: events.map((e) => ({
      matchId: match.id,
      type: e.type,
      team: e.team,
      x: e.x,
      y: e.y,
      minute: e.minute,
      playerId: e.playerId || null,
      xg: e.xg || 0,
      metadata: JSON.stringify(e.metadata || {}),
    })),
  });

  const homeShots = events.filter((e) => e.type === "shot" && e.team === "home").length;
  const awayShots = events.filter((e) => e.type === "shot" && e.team === "away").length;
  const homeXg = events.filter((e) => e.type === "shot" && e.team === "home").reduce((s, e) => s + (e.xg || 0), 0);
  const awayXg = events.filter((e) => e.type === "shot" && e.team === "away").reduce((s, e) => s + (e.xg || 0), 0);

  await prisma.match.update({
    where: { id: match.id },
    data: {
      competition: "Showcase Demo Match",
      venue: "Demo Arena",
      date: new Date(),
      scoreHome: 2,
      scoreAway: 1,
      shotsHome: homeShots,
      shotsAway: awayShots,
      xgHome: Number(homeXg.toFixed(2)),
      xgAway: Number(awayXg.toFixed(2)),
      possessionHome: 57,
      possessionAway: 43,
    },
  });

  console.log("✅ Demo showcase ready");
  console.log(`Match slug: ${matchSlug}`);
  console.log(`Open in app: /matches/${matchSlug}`);
  console.log(`Teams: Demo FC vs Showcase United`);
}

main()
  .catch((e) => {
    console.error("❌ Failed to create demo showcase:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

