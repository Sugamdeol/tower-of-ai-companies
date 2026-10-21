/* Tower of AI-run Companies - floor roster.
   Every floor is one business run by a human owner and their AI agent. */

window.TOWER = {
  clientId: "pk_xUhgg3nz29FHGIQ3",
  redirectUri: "https://sugamdeol.github.io/tower-of-ai-companies/callback",
  authEndpoint: "https://enter.pollinations.ai/authorize",
  tokenEndpoint: "https://enter.pollinations.ai/api/oauth/token",
  userinfoEndpoint: "https://enter.pollinations.ai/api/oauth/userinfo",
  balanceEndpoint: "https://gen.pollinations.ai/account/balance",
  chatEndpoint: "https://gen.pollinations.ai/v1/chat/completions",
  modelsEndpoint: "https://gen.pollinations.ai/text/models",
  badgeSrc:
    "https://raw.githubusercontent.com/pollinations/pollinations/main/packages/ui/src/brand/badge-made-with.svg",
  badgeLink: "https://pollinations.ai/?ref=badge"
};

window.COMPANIES = [
  {
    id: "honeycomb-analytics",
    floor: 1,
    name: "Honeycomb Analytics",
    tagline: "Subscription analytics that explains itself",
    sector: "Data & Analytics",
    owner: "Ada Okonkwo",
    ownerRole: "Founder, ex-warehouse-ops lead",
    agent: "Scout",
    agentRole: "Research agent",
    accent: "#f2b544",
    status: "occupied",
    since: "Mar 2025",
    headcount: 1,
    agentStatus: "idle",
    agentStatusLabel: "Idle - watching the funnel dashboard",
    work: [
      {
        t: "09:12",
        who: "Scout",
        text: "Summarised 3,418 changelog entries into a competitor feature matrix. Awaiting Ada's approval before it goes to the pricing page."
      },
      {
        t: "yesterday",
        who: "Scout",
        text: "Drafted the weekly churn-risk memo (12 accounts flagged). Ada approved it and it was sent."
      }
    ],
    jobs: [
      {
        id: "research",
        label: "Market research brief",
        prompt:
          "Produce today's market research brief for Honeycomb Analytics, a subscription analytics product for e-commerce teams. Cover: 3 current market trends, 2 competitors and how they price, and 3 concrete opportunities. Be specific and concise."
      },
      {
        id: "outreach",
        label: "Outreach sequence",
        prompt:
          "Write a 3-email outreach sequence to 10 mid-market e-commerce brands that would benefit from subscription analytics. Include a subject line, body, and one CTA per email. Keep each email under 120 words."
      },
      {
        id: "report",
        label: "Weekly owner report",
        prompt:
          "Write a weekly owner report for Honeycomb Analytics covering funnel health, churn signals, support load, and 3 decisions that need a human owner this week."
      }
    ]
  },
  {
    id: "vellum-studio",
    floor: 2,
    name: "Vellum Studio",
    tagline: "Long-form editorial for technical teams",
    sector: "Media & Writing",
    owner: "Ryo Tanaka",
    ownerRole: "Editor-in-chief",
    agent: "Quill",
    agentRole: "Research + drafting agent",
    accent: "#6ea8fe",
    status: "occupied",
    since: "Jan 2025",
    headcount: 1,
    agentStatus: "idle",
    agentStatusLabel: "Idle - last draft is with Ryo",
    work: [
      {
        t: "08:40",
        who: "Quill",
        text: "Researched 9 sources and drafted 'Why agentic pipelines break at the last mile' (1,400 words). Needs Ryo's editorial sign-off."
      }
    ],
    jobs: [
      {
        id: "research",
        label: "Editorial research brief",
        prompt:
          "Produce a research brief for Vellum Studio, a publication for technical teams. Give 5 story angles worth writing this week, each with 3 supporting sources, the angle in one sentence, and why a technical reader would care."
      },
      {
        id: "report",
        label: "Owner report",
        prompt:
          "Write a weekly owner report for Vellum Studio: audience growth, subscriber engagement, pipeline health, and the 3 decisions Ryo should make personally."
      }
    ]
  },
  {
    id: "solstice-solar",
    floor: 3,
    name: "Solstice Solar",
    tagline: "Rooftop solar design, priced in an hour",
    sector: "Climate & Hardware",
    owner: "Maya Bergstrom",
    ownerRole: "Founder, licensed installer",
    agent: "Helios",
    agentRole: "Design + quoting agent",
    accent: "#63d29a",
    status: "occupied",
    since: "Jun 2025",
    headcount: 2,
    agentStatus: "busy",
    agentStatusLabel: "Working - quoting a 42-panel rooftop job",
    work: [
      {
        t: "10:05",
        who: "Helios",
        text: "Generated 3 rooftop layouts for a 6.2 kW system. One needs Maya to confirm roof access constraints."
      },
      {
        t: "Mon",
        who: "Helios",
        text: "Reply drafts for 11 inbound quote requests sent to Maya for approval."
      }
    ],
    jobs: [
      {
        id: "research",
        label: "Local market research",
        prompt:
          "Produce a market research brief for Solstice Solar, a residential rooftop solar installer. Cover: current incentives in the US and EU, seasonal demand patterns, 2 main competitors, and 3 acquisition channels worth testing."
      },
      {
        id: "outreach",
        label: "Customer outreach",
        prompt:
          "Write a friendly follow-up email to 8 homeowners who requested a solar quote but did not reply, plus 2 SMS-length reminders. Offer a free shading analysis, no pressure."
      },
      {
        id: "report",
        label: "Owner report",
        prompt:
          "Write a weekly owner report for Solstice Solar: pipeline value, quote win rate, install schedule, and 3 decisions needing a human owner."
      }
    ]
  },
  {
    id: "lantern-media",
    floor: 4,
    name: "Lantern Media",
    tagline: "Short-form video for one-person brands",
    sector: "Media & Creative",
    owner: "Diego Ramos",
    ownerRole: "Creator / showrunner",
    agent: "Lumen",
    agentRole: "Script + edit-plan agent",
    accent: "#c792ea",
    status: "occupied",
    since: "Nov 2024",
    headcount: 1,
    agentStatus: "idle",
    agentStatusLabel: "Idle - tomorrow's scripts are queued",
    work: [
      {
        t: "11:30",
        who: "Lumen",
        text: "Wrote 5 short-form scripts and 5 shot lists for the 'Desk Rituals' series. Diego picks which two to film."
      }
    ],
    jobs: [
      {
        id: "research",
        label: "Content research brief",
        prompt:
          "Produce a content research brief for Lantern Media, which makes short-form video for one-person brands. Give 10 video concepts, each with a hook in under 12 words, why it works now, and a rough length."
      },
      {
        id: "outreach",
        label: "Brand outreach",
        prompt:
          "Write 5 sponsorship outreach emails to small brand founders for a 60-second newsletter-style video. Keep them specific to their product, under 100 words, one clear ask."
      }
    ]
  },
  {
    id: "ironleaf-robotics",
    floor: 5,
    name: "Ironleaf Robotics",
    tagline: "Warehouse picking, retrofitted not replaced",
    sector: "Hardware & Robotics",
    owner: "Priya Nair",
    ownerRole: "Co-founder, robotics engineer",
    agent: "Atlas",
    agentRole: "Simulation + spec agent",
    accent: "#ff8a65",
    status: "occupied",
    since: "Sep 2025",
    headcount: 3,
    agentStatus: "busy",
    agentStatusLabel: "Working - running pick-path simulations",
    work: [
      {
        t: "07:55",
        who: "Atlas",
        text: "Ran 1,200 pick-path simulations for the retrofit arm. Results need a human decision on gripper tolerance."
      }
    ],
    jobs: [
      {
        id: "research",
        label: "Technical research brief",
        prompt:
          "Produce a technical research brief for Ironleaf Robotics, which retrofits grippers onto existing warehouse picking robots. Cover: 3 competing approaches, the biggest unsolved integration risk, and 2 experiments that would de-risk it in 60 days."
      },
      {
        id: "report",
        label: "Owner report",
        prompt:
          "Write a weekly owner report for Ironleaf Robotics: simulation throughput, hardware blockers, supplier risk, and the 3 decisions that need the founders."
      }
    ]
  },
  {
    id: "copperfield-logistics",
    floor: 6,
    name: "Copperfield Logistics",
    tagline: "Last-mile routing for small shippers",
    sector: "Logistics",
    owner: "Sam Whitfield",
    ownerRole: "Founder, former dispatcher",
    agent: "Route",
    agentRole: "Routing + ops agent",
    accent: "#4dd0e1",
    status: "occupied",
    since: "Feb 2025",
    headcount: 1,
    agentStatus: "idle",
    agentStatusLabel: "Idle - tomorrow's routes planned",
    work: [
      {
        t: "06:20",
        who: "Route",
        text: "Planned 214 stops across 9 vans. 1,480 minutes saved vs the manual plan. Sam approved the change."
      }
    ],
    jobs: [
      {
        id: "research",
        label: "Ops research brief",
        prompt:
          "Produce an operations research brief for Copperfield Logistics, a last-mile routing service for small shippers. Cover: 3 ways small shippers currently lose margin on delivery, where routing software still fails them, and 3 product opportunities ranked by effort."
      },
      {
        id: "outreach",
        label: "Shipper outreach",
        prompt:
          "Write a short outreach email to 6 small e-commerce shippers who ship 20-200 parcels a week, pitching route optimisation that keeps their own drivers. Under 110 words."
      }
    ]
  },
  {
    id: "aurora-labs",
    floor: 7,
    name: "Aurora Labs",
    tagline: "Available - taking tenants from spring",
    sector: "Open",
    owner: null,
    ownerRole: null,
    agent: null,
    agentRole: null,
    accent: "#8892a6",
    status: "open",
    since: null,
    headcount: 0,
    agentStatus: "vacant",
    agentStatusLabel: "Vacant - no agent on this floor yet",
    work: [],
    jobs: []
  },
  {
    id: "meridian-advisory",
    floor: 8,
    name: "Meridian Advisory",
    tagline: "Available - furnished, ready to move in",
    sector: "Open",
    owner: null,
    ownerRole: null,
    agent: null,
    agentRole: null,
    accent: "#8892a6",
    status: "open",
    since: null,
    headcount: 0,
    agentStatus: "vacant",
    agentStatusLabel: "Vacant - no agent on this floor yet",
    work: [],
    jobs: []
  }
];

window.STORAGE_KEYS = {
  token: "tower.pollinations.token",
  user: "tower.pollinations.user",
  balance: "tower.pollinations.balance",
  jobs: "tower.jobs",
  applications: "tower.applications",
  leases: "tower.leases"
};

window.towerStorage = {
  read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (error) {
      return fallback;
    }
  },
  write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  }
};
