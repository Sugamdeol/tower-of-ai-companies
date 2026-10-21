/* Tower of AI-run Companies - application logic.
   No build step, no external dependencies. Everything runs in the browser. */
(function () {
  "use strict";

  const T = window.TOWER;
  const COMPANIES = window.COMPANIES;
  const K = window.STORAGE_KEYS;
  const store = window.towerStorage;

  // Tower geometry. CSS reads these from custom properties written below so
  // the stylesheet and the script can never disagree.
  const TOWER_FLOORS = 8;
  const FLOOR_W = 900;
  const FLOOR_H = 66;
  const FLOOR_GAP = 4;
  const BASE_H = 30;
  const STAGE_H = 620;
  // Each floor is narrower than the one below it, so the stack reads as a
  // tower in perspective without any 3D rotation (which would inflate the
  // slabs and overflow the stage).
  const FLOOR_TAPER_STEP = 0.032;
  const TOWER_SPIN = -14;

  let state = {
    view: "tower",
    spin: TOWER_SPIN,
    ride: 0,
    selectedFloor: 1,
    openCompanyId: null,
    token: sessionStorage.getItem(K.token) || null,
    user: null,
    balance: null,
    models: null,
    running: false,
    lastJobId: null
  };

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  };

  function companyById(id) {
    return COMPANIES.find((c) => c.id === id) || null;
  }
  function companyByFloor(floor) {
    return COMPANIES.find((c) => c.floor === floor) || null;
  }
  function isLeased(companyId) {
    const leases = store.read(K.leases, {}) || {};
    return Boolean(leases[companyId]);
  }
  function floorIsOpen(company) {
    return company.status === "open" && !isLeased(company.id);
  }

  /* --------------------------------------------------------------- toast */
  let toastTimer = null;
  function toast(message) {
    const node = $("#toast");
    if (!node) return;
    node.textContent = message;
    node.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove("show"), 4200);
  }

  /* -------------------------------------------------------------- PKCE */
  function b64url(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function randomString(length) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
    const out = new Array(length);
    const buf = new Uint8Array(length);
    crypto.getRandomValues(buf);
    for (let i = 0; i < length; i += 1) out[i] = alphabet[buf[i] % alphabet.length];
    return out.join("");
  }
  async function codeChallenge(verifier) {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
    return b64url(digest);
  }

  async function signIn() {
    try {
      const verifier = randomString(64);
      const stateParam = randomString(24);
      const challenge = await codeChallenge(verifier);
      sessionStorage.setItem("tower.pkce.verifier", verifier);
      sessionStorage.setItem("tower.oauth.state", stateParam);
      const params = new URLSearchParams({
        response_type: "code",
        client_id: T.clientId,
        redirect_uri: T.redirectUri,
        scope: "profile usage",
        state: stateParam,
        code_challenge: challenge,
        code_challenge_method: "S256"
      });
      window.location.assign(T.authEndpoint + "?" + params.toString());
    } catch (error) {
      toast("Could not start sign-in: " + error.message);
    }
  }

  async function completeOAuth(code, returnedState) {
    const expected = sessionStorage.getItem("tower.oauth.state");
    const verifier = sessionStorage.getItem("tower.pkce.verifier");
    if (expected && returnedState && expected !== returnedState) {
      throw new Error("OAuth state mismatch - sign-in was not completed. Please try again.");
    }
    if (!verifier) {
      throw new Error("No PKCE verifier in session storage - please start sign-in from the main page.");
    }
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code: code,
      client_id: T.clientId,
      redirect_uri: T.redirectUri,
      code_verifier: verifier
    });
    const response = await fetch(T.tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString()
    });
    const text = await response.text();
    let data = {};
    try {
      data = JSON.parse(text);
    } catch (error) {
      /* keep the raw text for the error message */
    }
    if (!response.ok) {
      const detail = data.error_description || data.error || text || ("HTTP " + response.status);
      throw new Error("Token exchange failed: " + detail);
    }
    if (!data.access_token) throw new Error("Token exchange returned no access_token.");
    state.token = data.access_token;
    sessionStorage.setItem(K.token, data.access_token);
    sessionStorage.removeItem("tower.pkce.verifier");
    sessionStorage.removeItem("tower.oauth.state");
    await loadUser();
    await refreshBalance();
  }

  async function loadUser() {
    try {
      const response = await fetch(T.userinfoEndpoint, {
        headers: { Authorization: "Bearer " + state.token }
      });
      if (!response.ok) return;
      const data = await response.json();
      state.user = {
        name: data.name || data.preferred_username || "Visitor",
        username: data.preferred_username || "",
        picture: data.picture || ""
      };
      sessionStorage.setItem(K.user, JSON.stringify(state.user));
    } catch (error) {
      /* user info is optional; the token still works */
    }
  }

  async function refreshBalance() {
    if (!state.token) return;
    try {
      const response = await fetch(T.balanceEndpoint, {
        headers: { Authorization: "Bearer " + state.token }
      });
      const text = await response.text();
      let data = {};
      try {
        data = JSON.parse(text);
      } catch (error) {
        /* ignore */
      }
      if (!response.ok) {
        state.balance = {
          error: describeApiError(data, text, "HTTP " + response.status)
        };
      } else {
        const total =
          (data.accountBalance && (data.accountBalance.total ?? data.accountBalance.balance)) ??
          data.total ??
          null;
        state.balance = { total: total };
      }
    } catch (error) {
      state.balance = { error: error.message };
    }
    renderAuth();
  }

  // Pollinations errors are sometimes objects; always show something readable.
  function describeApiError(data, rawText, fallback) {
    const candidate =
      (data && (data.error_description || data.error || data.message)) ||
      (data && data.detail && (data.detail.message || JSON.stringify(data.detail))) ||
      rawText;
    if (!candidate) return fallback;
    if (typeof candidate === "string") return candidate;
    if (candidate && typeof candidate === "object" && candidate.message) {
      return String(candidate.message);
    }
    try {
      return JSON.stringify(candidate);
    } catch (error) {
      return fallback;
    }
  }

  /* -------------------------------------------------------------- models */
  async function loadModels() {
    if (state.models) return state.models;
    try {
      const response = await fetch(T.modelsEndpoint);
      if (!response.ok) throw new Error("HTTP " + response.status);
      const list = await response.json();
      state.models = Array.isArray(list) ? list : [];
    } catch (error) {
      state.models = [];
    }
    return state.models;
  }

  const DEFAULT_MODEL = "openai/gpt-5.4-nano";
  const FALLBACK_PRICING = {
    promptTextTokens: 0.00000015,
    completionTextTokens: 0.0000009375,
    currency: "pollen"
  };

  function pricingFor(modelName) {
    const found = (state.models || []).find((m) => m.name === modelName);
    return (found && found.pricing) || FALLBACK_PRICING;
  }

  function estimateCost(prompt, maxTokens) {
    const pricing = pricingFor(DEFAULT_MODEL);
    const promptTokens = Math.ceil((prompt || "").length / 4) + 120;
    const completionTokens = maxTokens;
    const cost =
      promptTokens * Number(pricing.promptTextTokens || 0) +
      completionTokens * Number(pricing.completionTextTokens || 0);
    return { cost: cost, promptTokens: promptTokens, completionTokens: completionTokens, pricing: pricing };
  }

  function formatPollen(value) {
    if (value === null || value === undefined) return "-";
    const n = Number(value);
    if (!isFinite(n)) return String(value);
    if (n === 0) return "0";
    if (n < 0.001) return n.toExponential(3);
    return n.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
  }

  /* --------------------------------------------------------------- tower */
  function renderTower() {
    const tower = $("#tower");
    if (!tower) return;
    tower.innerHTML = "";

    const shaft = el("div", "tower-shaft");
    tower.appendChild(shaft);

    for (let floor = TOWER_FLOORS; floor >= 1; floor -= 1) {
      const company = companyByFloor(floor) || {
        id: "floor-" + floor,
        floor: floor,
        name: "Vacant Floor " + floor,
        tagline: "Available to rent",
        accent: "#8892a6",
        agentStatus: "vacant",
        status: "open"
      };
      const floorNode = el("div", "floor" + (company.status === "open" ? " is-vacant" : ""));
      floorNode.dataset.floor = String(floor);
      floorNode.dataset.companyId = company.id;
      // Slight per-floor horizontal offset so the stack reads as a building.
      floorNode.style.setProperty("--x", (floor % 2 === 0 ? 8 : -6) + "px");
      floorNode.style.setProperty(
        "--taper", String(1 - (floor - 1) * FLOOR_TAPER_STEP));
      floorNode.style.setProperty("--accent-company", company.accent || "#6ea8fe");

      const slab = el("div", "floor-slab");
      const plate = el("div", "floor-plate");
      const topline = el("div", "floor-topline");
      const left = el("div");
      left.appendChild(el("div", "floor-num", "Floor " + String(floor).padStart(2, "0")));
      left.appendChild(el("div", "floor-name", company.name));
      left.appendChild(el("div", "floor-tagline", company.tagline || ""));
      topline.appendChild(left);
      const status = el("div", "floor-status");
      status.appendChild(el("span", "dot " + (company.agentStatus || "idle")));
      status.appendChild(
        el("span", null, company.status === "open" ? "Available" : company.agent || "AI agent")
      );
      topline.appendChild(status);
      plate.appendChild(topline);

      const windows = el("div", "windows");
      const lit = floor % 3 === 0 ? 6 : 3;
      for (let i = 0; i < 10; i += 1) {
        const pane = el("i");
        if (i < lit) pane.className = "lit" + (floor % 2 === 0 ? " cool" : "");
        windows.appendChild(pane);
      }
      plate.appendChild(windows);
      if (company.status === "open") plate.appendChild(el("div", "floor-sign", "For rent"));
      slab.appendChild(plate);
      slab.setAttribute("role", "button");
      slab.setAttribute("tabindex", "0");
      slab.setAttribute("aria-label", "Open " + company.name + " on floor " + floor);
      slab.addEventListener("click", () => selectFloor(floor, true));
      slab.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectFloor(floor, true);
        }
      });
      floorNode.appendChild(slab);
      tower.appendChild(floorNode);
    }

    const base = el("div", "tower-base", "Lobby");
    tower.appendChild(base);
    applyTowerTransforms();
  }

  function applyTowerTransforms(animate) {
    const ride = $("#tower-ride");
    if (!ride) return;
    if (animate === false) ride.classList.add("no-anim");
    ride.style.setProperty("--ride", state.ride + "px");
    ride.style.setProperty("--spin", state.spin + "deg");
    if (animate === false) {
      void ride.offsetWidth;
      ride.classList.remove("no-anim");
    }
  }

  function selectFloor(floor, openOffice, instant) {
    state.selectedFloor = floor;
    if (instant) {
      // Opening view: show the whole tower, no camera move.
      state.ride = 0;
    } else {
      // "Ride" the elevator: translate the stack so the chosen floor lands in
      // the middle of the stage.
      const step = FLOOR_H + FLOOR_GAP;
      const stackHeight = TOWER_FLOORS * FLOOR_H + (TOWER_FLOORS - 1) * FLOOR_GAP + BASE_H;
      const stackTop = (STAGE_H - stackHeight) / 2;
      const floorCentreInStack = (TOWER_FLOORS - floor) * step + FLOOR_H / 2;
      state.ride = STAGE_H / 2 - stackTop - floorCentreInStack;
    }
    applyTowerTransforms(true);
    $$(".floor").forEach((node) => {
      const f = Number(node.dataset.floor);
      node.classList.toggle("is-selected", f === floor);
      // Only dim the neighbours while riding; the opening view shows the
      // whole tower lit.
      node.classList.toggle("is-dim", !instant && Math.abs(f - floor) > 1);
    });
    $$(".fbtn").forEach((node) => {
      node.classList.toggle("active", Number(node.dataset.floor) === floor);
    });
    const company = companyByFloor(floor);
    const tag = $("#floor-tag");
    if (tag && company) {
      tag.textContent = "Floor " + floor + " - " + company.name;
      // Move the caption into the selected floor's own card so it always sits
      // next to the floor it names, whichever floor that is.
      const selected = $('.floor[data-floor="' + floor + "'] .floor-plate");
      if (selected && tag.parentNode !== selected) selected.appendChild(tag);
    }
    if (openOffice && company) openOfficePanel(company.id);
  }

  function renderElevator() {
    const list = $("#floor-list");
    if (!list) return;
    list.innerHTML = "";
    for (let floor = TOWER_FLOORS; floor >= 1; floor -= 1) {
      const company = companyByFloor(floor);
      const button = el("button", "fbtn");
      button.dataset.floor = String(floor);
      button.appendChild(el("span", "num", String(floor).padStart(2, "0")));
      button.appendChild(el("span", "nm", company ? company.name : "Floor " + floor));
      if (company && company.status === "open" && !isLeased(company.id)) {
        button.appendChild(el("span", "vacant-label", "OPEN"));
      } else {
        button.appendChild(el("span", "st " + (company ? company.agentStatus : "vacant")));
      }
      button.addEventListener("click", () => selectFloor(floor, true));
      list.appendChild(button);
    }
  }

  /* --------------------------------------------------------------- office */
  function jobsFor(companyId) {
    const all = store.read(K.jobs, []) || [];
    return all.filter((job) => job.companyId === companyId);
  }

  function openOfficePanel(companyId) {
    const company = companyById(companyId);
    if (!company) return;
    state.openCompanyId = companyId;
    const panel = $("#office");
    if (!panel) return;
    panel.innerHTML = "";
    panel.classList.add("open");

    /* header */
    const head = el("div", "office-head");
    const logo = el("div", "office-logo", company.name.slice(0, 2).toUpperCase());
    logo.style.background = company.accent || "#6ea8fe";
    head.appendChild(logo);
    const title = el("div", "office-title");
    title.appendChild(el("h2", null, company.name));
    title.appendChild(el("div", "muted", "Floor " + company.floor + " - " + company.sector + " - " + company.tagline));
    head.appendChild(title);
    const statusPill = el("span", "pill");
    const statusDot = el("span", "dot");
    statusDot.style.background = company.status === "open" ? "#8892a6" : "#63d29a";
    statusPill.appendChild(statusDot);
    statusPill.appendChild(el("b", null, company.status === "open" ? "Office available" : "Tenant in residence"));
    head.appendChild(statusPill);
    const closeBtn = el("button", "btn ghost small", "Close");
    closeBtn.addEventListener("click", () => {
      panel.classList.remove("open");
      state.openCompanyId = null;
    });
    head.appendChild(closeBtn);
    panel.appendChild(head);

    if (company.status === "open" || (!company.owner && !isLeased(company.id))) {
      panel.appendChild(buildVacantBlock(company));
      panel.appendChild(buildApplyBlock(company));
      return;
    }

    /* facts grid */
    const grid = el("div", "office-grid");
    grid.appendChild(
      factCard("Owner", company.owner, company.ownerRole)
    );
    grid.appendChild(
      factCard(
        "AI agent",
        company.agent,
        company.agentRole + " - runs on Pollinations with the visitor's own Pollen"
      )
    );
    const statusCard = el("div", "card");
    statusCard.appendChild(el("div", "k", "Agent status"));
    const statusWrap = el("div", "agent-status " + company.agentStatus);
    const sdot = el("span", "dot");
    statusWrap.appendChild(sdot);
    statusWrap.appendChild(el("span", null, company.agentStatusLabel));
    statusCard.appendChild(statusWrap);
    grid.appendChild(statusCard);
    grid.appendChild(factCard("In residence since", company.since, company.headcount + " human" + (company.headcount === 1 ? "" : "s") + " + agent"));
    panel.appendChild(grid);

    /* work log */
    const logSection = el("div", "section");
    logSection.appendChild(el("h3", null, "Agent work log"));
    const log = el("div", "log");
    const entries = (company.work || []).slice();
    const pending = jobsFor(company.id).filter((job) => job.status === "needs-approval");
    const done = jobsFor(company.id).filter((job) => job.status === "approved");
    pending.forEach((job) => log.appendChild(buildPendingEntry(job)));
    done.forEach((job) => log.appendChild(buildDoneEntry(job)));
    entries.forEach((entry) => {
      const node = el("div", "log-entry");
      const meta = el("div", "meta");
      meta.appendChild(el("b", null, entry.who));
      meta.appendChild(document.createTextNode(" - " + entry.t));
      node.appendChild(meta);
      node.appendChild(document.createTextNode(entry.text));
      log.appendChild(node);
    });
    if (!log.childNodes.length) {
      log.appendChild(el("div", "empty", "No work logged yet. Send the agent a job below."));
    }
    logSection.appendChild(log);
    panel.appendChild(logSection);

    /* job runner */
    panel.appendChild(buildJobSection(company));
    renderAuth();
  }

  function factCard(key, value, sub) {
    const card = el("div", "card");
    card.appendChild(el("div", "k", key));
    const v = el("div", "v", value || "-");
    if (sub) v.appendChild(el("small", null, sub));
    card.appendChild(v);
    return card;
  }

  function buildPendingEntry(job) {
    const node = el("div", "log-entry pending");
    const meta = el("div", "meta");
    meta.appendChild(el("b", null, job.agent));
    meta.appendChild(document.createTextNode(" - " + job.label + " - finished, waiting for the owner"));
    node.appendChild(meta);
    node.appendChild(document.createTextNode(job.preview || job.prompt));
    const actions = el("div", "jobbar");
    const approve = el("button", "jobbtn", "Owner approves");
    approve.addEventListener("click", () => {
      approveJob(job.id, "approved");
    });
    const reject = el("button", "jobbtn", "Owner sends it back");
    reject.addEventListener("click", () => {
      approveJob(job.id, "sent-back");
    });
    actions.appendChild(approve);
    actions.appendChild(reject);
    node.appendChild(actions);
    return node;
  }

  function buildDoneEntry(job) {
    const node = el("div", "log-entry");
    const meta = el("div", "meta");
    meta.appendChild(el("b", null, job.agent));
    meta.appendChild(document.createTextNode(" - " + job.label + " - " + (job.decision === "approved" ? "approved by the owner" : "sent back for rework")));
    node.appendChild(meta);
    node.appendChild(document.createTextNode(job.preview || job.prompt));
    return node;
  }

  function approveJob(jobId, decision) {
    const all = store.read(K.jobs, []) || [];
    const job = all.find((j) => j.id === jobId);
    if (!job) return;
    job.status = decision;
    job.decision = decision;
    job.decidedAt = new Date().toISOString();
    store.write(K.jobs, all);
    if (state.openCompanyId) openOfficePanel(state.openCompanyId);
    toast(decision === "approved" ? "Owner approved the job - it is now part of the work log." : "Owner sent the job back for rework.");
  }

  function buildVacantBlock(company) {
    const wrap = el("div", "section");
    const note = el("div", "desk-note");
    const tag = el("div", "tag", "Office available");
    note.appendChild(tag);
    note.appendChild(
      el(
        "p",
        "muted",
        "Floor " + company.floor + " is empty and ready. Apply below with a short pitch - the landlord reviews every application and hands the keys to the best fit."
      )
    );
    wrap.appendChild(note);
    return wrap;
  }

  function buildApplyBlock(company) {
    const wrap = el("div", "section");
    wrap.appendChild(el("h3", null, "Apply to rent floor " + company.floor));
    const form = el("form", "panel");
    form.innerHTML =
      '<div class="two-col">' +
      '<label class="fld"><span>Your name</span><input type="text" name="name" required placeholder="Ada Okonkwo" /></label>' +
      '<label class="fld"><span>Company you want to run here</span><input type="text" name="company" required placeholder="Northwind Analytics" /></label>' +
      '<label class="fld" style="grid-column:1/-1"><span>What will your agent do on this floor?</span><input type="text" name="agentIdea" placeholder="Research agent for subscription analytics" /></label>' +
      '<label class="fld" style="grid-column:1/-1"><span>Your pitch (max 400 characters)</span><textarea name="pitch" rows="4" maxlength="400" required placeholder="One paragraph on what you do and why this floor fits."></textarea></label>' +
      '<label class="fld"><span>Email</span><input type="email" name="email" required placeholder="you@company.com" /></label>' +
      '<label class="fld"><span>Monthly Pollen budget for agent work</span><input type="text" name="budget" placeholder="e.g. 40 pollen / month" /></label>' +
      "</div>";
    const bar = el("div", "jobbar");
    const submit = el("button", "btn", "Submit application");
    submit.type = "submit";
    bar.appendChild(submit);
    const note = el("span", "faint", "Applications are stored in this browser and appear in the Landlord view.");
    bar.appendChild(note);
    form.appendChild(bar);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const applications = store.read(K.applications, []) || [];
      applications.push({
        id: "app-" + Date.now().toString(36),
        floor: company.floor,
        companyId: company.id,
        name: String(data.get("name") || "").trim(),
        company: String(data.get("company") || "").trim(),
        agentIdea: String(data.get("agentIdea") || "").trim(),
        pitch: String(data.get("pitch") || "").trim(),
        email: String(data.get("email") || "").trim(),
        budget: String(data.get("budget") || "").trim(),
        status: "pending",
        createdAt: new Date().toISOString()
      });
      store.write(K.applications, applications);
      form.reset();
      toast("Application submitted for floor " + company.floor + ". The landlord can see it in the Landlord view.");
      renderLandlord();
    });
    wrap.appendChild(form);
    return wrap;
  }

  /* ----------------------------------------------------------- job runner */
  function buildJobSection(company) {
    const section = el("div", "section");
    section.appendChild(el("h3", null, "Give the agent a job"));
    const intro = el("p", "muted");
    intro.textContent =
      "The agent runs on Pollinations and the request is billed to your own Pollen. The finished job lands on the owner's desk and waits for a human decision.";
    section.appendChild(intro);

    if (!state.token) {
      const gate = el("div", "gate");
      gate.appendChild(el("h3", null, "Sign in with your own Pollen to run a job"));
      gate.appendChild(
        el(
          "p",
          null,
          "This app never holds a shared API key. You sign in with Pollinations, we keep the access token in this browser tab only (sessionStorage), and every agent call is billed to your balance. Browsing the tower, the directory and applying to rent work without signing in."
        )
      );
      const bar = el("div", "jobbar");
      const button = el("button", "btn", "Sign in with your own Pollen");
      button.addEventListener("click", signIn);
      bar.appendChild(button);
      gate.appendChild(bar);
      section.appendChild(gate);
      return section;
    }

    const balanceLine = el("div", "pill");
    balanceLine.appendChild(el("span", null, "Your balance:"));
    balanceLine.appendChild(el("b", null, state.balance && state.balance.total !== null && state.balance.total !== undefined
      ? formatPollen(state.balance.total) + " pollen"
      : state.balance && state.balance.error
        ? "unavailable (" + state.balance.error + ")"
        : "loading..."));
    section.appendChild(balanceLine);

    const bar = el("div", "jobbar");
    (company.jobs || []).forEach((job) => {
      const estimate = estimateCost(job.prompt, 900);
      const button = el("button", "jobbtn");
      button.textContent = job.label + " - about " + formatPollen(estimate.cost) + " pollen";
      button.title = job.prompt;
      button.addEventListener("click", () => runJob(company, job));
      bar.appendChild(button);
    });
    if (!(company.jobs || []).length) {
      bar.appendChild(el("span", "faint", "This agent has no job templates yet."));
    }
    section.appendChild(bar);

    const output = el("div");
    output.id = "job-output";
    section.appendChild(output);
    return section;
  }

  async function runJob(company, job) {
    if (state.running) return;
    if (!state.token) {
      toast("Sign in with your own Pollen first - the agent runs on your balance.");
      return;
    }
    state.running = true;
    const output = $("#job-output");
    if (output) {
      output.className = "job-output pending";
      output.textContent = company.agent + " is working on: " + job.label + "... (paid for by your Pollen)";
    }
    const started = Date.now();
    const maxTokens = 900;
    try {
      const response = await fetch(T.chatEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + state.token
        },
        body: JSON.stringify({
          model: DEFAULT_MODEL,
          max_tokens: maxTokens,
          messages: [
            {
              role: "system",
              content:
                "You are " +
                company.agent +
                ", the AI agent working on floor " +
                company.floor +
                " of the Tower of AI-run Companies. You work for " +
                company.owner +
                ", the human owner of " +
                company.name +
                ". " +
                (company.agentRole || "You run the day-to-day work") +
                ". Deliver a finished, concrete work product. No preamble, no disclaimers, plain structured Markdown. Your work is read by a human owner who makes the final call, so surface the decisions that need them."
            },
            { role: "user", content: job.prompt }
          ]
        })
      });
      const text = await response.text();
      let data = {};
      try {
        data = JSON.parse(text);
      } catch (error) {
        /* non JSON error body */
      }
      if (!response.ok) {
        const detail = describeApiError(data, text, "");
        throw new Error(
          "Pollinations returned HTTP " +
            response.status +
            (detail ? ": " + detail : "")
        );
      }
      const content =
        (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "";
      const usage = data.usage || {};
      const pricing = pricingFor(DEFAULT_MODEL);
      const actualCost = usage.total_tokens
        ? (usage.prompt_tokens || 0) * Number(pricing.promptTextTokens || 0) +
          (usage.completion_tokens || 0) * Number(pricing.completionTextTokens || 0)
        : estimateCost(job.prompt, maxTokens).cost;

      const all = store.read(K.jobs, []) || [];
      const record = {
        id: "job-" + Date.now().toString(36),
        companyId: company.id,
        agent: company.agent,
        label: job.label,
        prompt: job.prompt,
        output: content,
        preview: content.slice(0, 220).replace(/\s+/g, " ") + (content.length > 220 ? "..." : ""),
        model: DEFAULT_MODEL,
        status: "needs-approval",
        cost: actualCost,
        tokens: usage.total_tokens || null,
        durationMs: Date.now() - started,
        createdAt: new Date().toISOString()
      };
      all.push(record);
      store.write(K.jobs, all);
      state.lastJobId = record.id;
      await refreshBalance();
      openOfficePanel(company.id);
      const out = $("#job-output");
      if (out) {
        out.className = "job-output";
        out.textContent = content || "(The model returned an empty response.)";
        const meta = el("div", "job-meta");
        meta.appendChild(el("span", null, "Model: " + record.model));
        meta.appendChild(el("span", null, "Cost: " + formatPollen(record.cost) + " pollen (your balance)"));
        meta.appendChild(el("span", null, "Tokens: " + (record.tokens || "n/a")));
        meta.appendChild(el("span", null, "Took: " + (record.durationMs / 1000).toFixed(1) + "s"));
        meta.appendChild(el("span", null, "Status: waiting for the owner to approve"));
        out.appendChild(meta);
      }
    } catch (error) {
      if (output) {
        output.className = "";
        output.innerHTML = "";
        const box = el("div", "error-box");
        box.appendChild(el("strong", null, "The agent job failed."));
        const code = el("code", null, error.message);
        box.appendChild(code);
        box.appendChild(
          el(
            "p",
            "faint",
            "Nothing was charged for a failed request. The message above is the real response from Pollinations."
          )
        );
        output.appendChild(box);
      }
    } finally {
      state.running = false;
    }
  }

  /* ----------------------------------------------------------- directory */
  function renderDirectory() {
    const grid = $("#directory-grid");
    if (!grid) return;
    grid.innerHTML = "";
    const leases = store.read(K.leases, {}) || {};
    COMPANIES.forEach((company) => {
      const card = el("div", "dcard");
      const top = el("div", "top");
      const chip = el("div", "chip", company.name.slice(0, 2).toUpperCase());
      chip.style.background = company.accent || "#6ea8fe";
      top.appendChild(chip);
      const nameWrap = el("div");
      nameWrap.appendChild(el("h3", null, company.name));
      nameWrap.appendChild(el("div", "faint", company.sector));
      top.appendChild(nameWrap);
      top.appendChild(el("div", "fl", "F" + company.floor));
      card.appendChild(top);
      card.appendChild(el("div", "tagline", company.tagline));
      const rows = el("div", "rows");
      const addRow = (k, v) => {
        const row = el("div");
        row.appendChild(el("span", null, k));
        row.appendChild(el("span", null, v));
        rows.appendChild(row);
      };
      addRow("Owner", company.owner || "-");
      addRow("Agent", company.agent || "-");
      addRow("Status", company.agentStatusLabel || "-");
      addRow("Since", company.since || "-");
      card.appendChild(rows);
      if (company.status === "open" && !leases[company.id]) {
        card.appendChild(el("div", "badge-open", "Office open - apply"));
      } else {
        card.appendChild(el("div", "badge-taken", "In residence"));
      }
      const button = el("button", "btn ghost small", company.status === "open" ? "View & apply" : "Enter office");
      button.addEventListener("click", () => {
        switchView("tower");
        selectFloor(company.floor, true);
        setTimeout(() => {
          const panel = $("#office");
          if (panel) panel.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 240);
      });
      card.appendChild(button);
      grid.appendChild(card);
    });
  }

  /* ----------------------------------------------------------- landlord */
  function renderLandlord() {
    const body = $("#applications-body");
    if (!body) return;
    const applications = store.read(K.applications, []) || [];
    const leases = store.read(K.leases, {}) || {};
    body.innerHTML = "";

    const openFloors = COMPANIES.filter((c) => c.status === "open" && !leases[c.id]);
    const queue = $("#open-queue");
    if (queue) {
      queue.innerHTML = "";
      openFloors.forEach((company) => {
        const row = el("tr");
        row.appendChild(el("td", null, "Floor " + company.floor));
        row.appendChild(el("td", null, company.name));
        row.appendChild(el("td", null, company.tagline));
        row.appendChild(el("td", null, "available"));
        queue.appendChild(row);
      });
      if (!openFloors.length) {
        const row = el("tr");
        const cell = el("td", "muted", "Every floor is taken. Add a company to the roster to open one.");
        cell.colSpan = 4;
        row.appendChild(cell);
        queue.appendChild(row);
      }
    }

    if (!applications.length) {
      body.appendChild(el("div", "empty", "No applications yet. Apply from an open office floor in the tower view."));
      return;
    }
    const table = el("table", "list");
    const head = el("thead");
    const hr = el("tr");
    ["Floor", "Applicant", "Company", "Agent plan", "Pitch", "Budget", "Status", ""].forEach((h) =>
      hr.appendChild(el("th", null, h))
    );
    head.appendChild(hr);
    table.appendChild(head);
    const tbody = el("tbody");
    applications.slice().reverse().forEach((app) => {
      const tr = el("tr");
      tr.appendChild(el("td", null, String(app.floor)));
      tr.appendChild(el("td", null, app.name));
      tr.appendChild(el("td", null, app.company));
      tr.appendChild(el("td", null, app.agentIdea || "-"));
      tr.appendChild(el("td", null, app.pitch));
      tr.appendChild(el("td", null, app.budget || "-"));
      const statusCell = el("td");
      statusCell.appendChild(el("span", "pill", app.status));
      tr.appendChild(statusCell);
      const actionCell = el("td");
      if (app.status === "pending") {
        const approve = el("button", "btn small", "Approve & hand over keys");
        approve.addEventListener("click", () => {
          const all = store.read(K.applications, []) || [];
          const target = all.find((a) => a.id === app.id);
          if (!target) return;
          target.status = "approved";
          store.write(K.applications, all);
          const currentLeases = store.read(K.leases, {}) || {};
          currentLeases[app.companyId] = {
            name: app.company,
            applicant: app.name,
            email: app.email,
            agentIdea: app.agentIdea,
            since: new Date().toISOString().slice(0, 10)
          };
          store.write(K.leases, currentLeases);
          toast("Approved. " + app.company + " now holds floor " + app.floor + ".");
          renderLandlord();
          renderElevator();
          renderDirectory();
        });
        actionCell.appendChild(approve);
        const reject = el("button", "btn ghost small", "Decline");
        reject.style.marginLeft = "6px";
        reject.addEventListener("click", () => {
          const all = store.read(K.applications, []) || [];
          const target = all.find((a) => a.id === app.id);
          if (!target) return;
          target.status = "declined";
          store.write(K.applications, all);
          renderLandlord();
        });
        actionCell.appendChild(reject);
      }
      tr.appendChild(actionCell);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    body.appendChild(table);
  }

  /* ----------------------------------------------------------------- auth */
  function renderAuth() {
    const box = $("#authbox");
    if (!box) return;
    box.innerHTML = "";
    if (state.token) {
      const pill = el("span", "pill");
      pill.appendChild(el("span", "dot"));
      pill.appendChild(el("b", null, state.user ? state.user.name : "Signed in"));
      if (state.user && state.user.username) pill.appendChild(el("span", null, "@" + state.user.username));
      box.appendChild(pill);
      if (state.balance && state.balance.total !== null && state.balance.total !== undefined) {
        const bal = el("span", "pill");
        bal.appendChild(el("span", null, "Balance:"));
        bal.appendChild(el("b", null, formatPollen(state.balance.total) + " pollen"));
        box.appendChild(bal);
      } else if (state.balance && state.balance.error) {
        const bal = el("span", "pill");
        bal.appendChild(el("span", null, "Balance unavailable: " + state.balance.error));
        box.appendChild(bal);
      }
      const out = el("button", "btn ghost small", "Sign out");
      out.addEventListener("click", () => {
        sessionStorage.removeItem(K.token);
        sessionStorage.removeItem(K.user);
        state.token = null;
        state.user = null;
        state.balance = null;
        renderAuth();
        if (state.openCompanyId) openOfficePanel(state.openCompanyId);
        toast("Signed out. The access token was removed from this tab.");
      });
      box.appendChild(out);
    } else {
      const button = el("button", "btn", "Sign in with your own Pollen");
      button.addEventListener("click", signIn);
      box.appendChild(button);
      const note = el("span", "faint", "BYOP - the agent runs on your balance");
      box.appendChild(note);
    }
  }

  /* ---------------------------------------------------------------- views */
  function switchView(view) {
    state.view = view;
    $$(".view").forEach((node) => node.classList.toggle("active", node.id === "view-" + view));
    $$("nav.views button").forEach((node) =>
      node.classList.toggle("active", node.dataset.view === view)
    );
    if (view === "directory") renderDirectory();
    if (view === "landlord") renderLandlord();
    if (window.location.hash !== "#" + view) {
      history.replaceState(null, "", "#" + view);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ----------------------------------------------------------------- init */
  function bindStage() {
    const stage = $("#stage");
    if (!stage) return;
    let dragging = false;
    let lastX = 0;
    let moved = 0;
    stage.addEventListener("pointerdown", (event) => {
      if (event.target.closest(".rot-ctrl")) return;
      dragging = true;
      moved = 0;
      lastX = event.clientX;
      stage.classList.add("dragging");
      stage.setPointerCapture(event.pointerId);
    });
    stage.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      const dx = event.clientX - lastX;
      lastX = event.clientX;
      moved += Math.abs(dx);
      state.spin += dx * 0.5;
      applyTowerTransforms(false);
    });
    const stop = (event) => {
      if (!dragging) return;
      dragging = false;
      stage.classList.remove("dragging");
      if (event && event.pointerId !== undefined && stage.hasPointerCapture && stage.hasPointerCapture(event.pointerId)) {
        stage.releasePointerCapture(event.pointerId);
      }
    };
    stage.addEventListener("pointerup", stop);
    stage.addEventListener("pointercancel", stop);
    stage.addEventListener("pointerleave", stop);
  }

  function bindRotateButtons() {
    const left = $("#rot-left");
    const right = $("#rot-right");
    const reset = $("#rot-reset");
    if (left) left.addEventListener("click", () => { state.spin -= 30; applyTowerTransforms(true); });
    if (right) right.addEventListener("click", () => { state.spin += 30; applyTowerTransforms(true); });
    if (reset) reset.addEventListener("click", () => { state.spin = -18; applyTowerTransforms(true); });
  }

  async function handleInlineCallback() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (!code) return false;
    const returnedState = params.get("state");
    window.history.replaceState(null, "", window.location.pathname + window.location.hash);
    try {
      await completeOAuth(code, returnedState);
      toast("Signed in as " + (state.user ? state.user.name : "you") + ". Your Pollen balance is loaded.");
      renderAuth();
      return true;
    } catch (error) {
      const box = $("#callback-status");
      if (box) {
        box.className = "error-box";
        box.textContent = "Sign-in failed: " + error.message;
      }
      toast("Sign-in failed: " + error.message);
      return false;
    }
  }

  async function init() {
    renderTower();
    renderElevator();
    renderAuth();
    renderDirectory();
    renderLandlord();
    bindStage();
    bindRotateButtons();
    selectFloor(1, false, true);

    $$("nav.views button").forEach((button) => {
      button.addEventListener("click", () => switchView(button.dataset.view));
    });

    const hash = (window.location.hash || "").replace("#", "");
    if (hash && ["tower", "directory", "apply", "landlord"].includes(hash)) {
      switchView(hash);
    }

    // Deep link: /?floor=3 opens that floor's office straight away.
    const wanted = Number(new URLSearchParams(window.location.search).get("floor"));
    if (wanted >= 1 && wanted <= TOWER_FLOORS) {
      switchView("tower");
      selectFloor(wanted, true);
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get("code")) {
      await handleInlineCallback();
    } else if (sessionStorage.getItem(K.token)) {
      state.token = sessionStorage.getItem(K.token);
      try {
        state.user = JSON.parse(sessionStorage.getItem(K.user) || "null");
      } catch (error) {
        state.user = null;
      }
      renderAuth();
      loadModels().then(() => {
        refreshBalance();
        if (state.openCompanyId) openOfficePanel(state.openCompanyId);
      });
    }

    loadModels().then(() => {
      if (state.openCompanyId) openOfficePanel(state.openCompanyId);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.towerApp = { state: state, signIn: signIn, selectFloor: selectFloor };
})();
