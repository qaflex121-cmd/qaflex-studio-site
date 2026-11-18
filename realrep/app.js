(function () {
  "use strict";
  const cfg = window.REALREP_CONFIG || {};
  const configured = Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey);
  const $ = (id) => document.getElementById(id);
  const escapeHtml = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  let client = null, currentUser = null, currentProfile = null, busy = false;
  const say = (message) => {
    const toast = $("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.style.display = "block";
    clearTimeout(window.realrepToastTimer);
    window.realrepToastTimer = setTimeout(() => toast.style.display = "none", 3200);
  };
  function setupPanel() {
    const note = document.querySelector(".demo-note");
    if (note) note.innerHTML = "<b>RealRep:</b> account services connect when the public Supabase configuration is set. Until then, demo activity stays in this browser.";
    const composer = document.querySelector(".composer");
    if (!composer) return;
    const panel = document.createElement("section");
    panel.id = "accountPanel";
    panel.className = "sidecard";
    panel.style.marginBottom = "14px";
    panel.innerHTML = '<h3>RealRep account</h3><p id="accountStatus" class="principle">Live account services are not configured yet. The prototype remains available in this browser.</p><div id="authFields" style="display:grid;gap:9px;margin-top:12px"><input id="authName" maxlength="60" placeholder="Display name" autocomplete="name" style="padding:10px;border:1px solid #e1e8e3;border-radius:9px"><input id="authUsername" maxlength="24" placeholder="Username (3–24 letters, numbers, underscores)" autocomplete="username" style="padding:10px;border:1px solid #e1e8e3;border-radius:9px"><input id="authEmail" type="email" placeholder="Email address" autocomplete="email" style="padding:10px;border:1px solid #e1e8e3;border-radius:9px"><input id="authPassword" type="password" minlength="8" placeholder="Password (at least 8 characters)" autocomplete="current-password" style="padding:10px;border:1px solid #e1e8e3;border-radius:9px"><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="signUpBtn">Create account</button><button class="btn light" id="signInBtn">Sign in</button><button class="btn light" id="signOutBtn" hidden>Sign out</button></div></div>';
    composer.parentNode.insertBefore(panel, composer);
  }
  setupPanel();
  if (!configured || !window.supabase || !window.supabase.createClient) {
    const status = $("accountStatus");
    if (status) status.textContent = "Waiting for backend setup. Add your Supabase Project URL and public anon/publishable key to realrep/config.js. Never use a service-role key in the browser.";
    ["signUpBtn","signInBtn"].forEach(id => { const b = $(id); if (b) b.addEventListener("click", () => say("Supabase is not configured yet. The site owner must complete the setup checklist.")); });
    const authFields = $("authFields");
    if (authFields) authFields.querySelectorAll("input").forEach(i => i.disabled = true);
    return;
  }
  client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  const note = document.querySelector(".demo-note");
  if (note) note.innerHTML = "<b>Shared backend configured:</b> posts and reactions are stored in the connected RealRep database. Community approval is a signal, not proof of misconduct.";
  const status = $("accountStatus");
  if (status) status.textContent = "Connecting securely to RealRep…";
  const authError = (error) => {
    console.error("RealRep auth:", error);
    say(error && error.message ? error.message : "Request failed. Please try again.");
  };
  async function refreshUser() {
    const { data, error } = await client.auth.getUser();
    if (error && error.name !== "AuthSessionMissingError") console.warn(error.message);
    currentUser = data && data.user ? data.user : null;
    currentProfile = null;
    if (currentUser) {
      const res = await client.from("profiles").select("id,username,display_name").eq("id", currentUser.id).maybeSingle();
      if (!res.error) currentProfile = res.data;
    }
    updateAuthUi();
  }
  function updateAuthUi() {
    if (!status) return;
    if (currentUser) {
      status.textContent = "Signed in as " + (currentProfile ? currentProfile.display_name : currentUser.email) + ". Posts and reactions are shared with other users.";
      $("authName").hidden = true; $("authUsername").hidden = true;
      $("authEmail").hidden = true; $("authPassword").hidden = true;
      $("signUpBtn").hidden = true; $("signInBtn").hidden = true; $("signOutBtn").hidden = false;
      const label = document.querySelector('.composer label');
      if (label) label.textContent = "Share something worth standing behind";
      const publish = $("publish");
      if (publish) publish.textContent = "Publish post ↗";
    } else {
      status.textContent = "Sign in to publish, react and report. Public posts are visible to everyone.";
      $("authName").hidden = false; $("authUsername").hidden = false;
      $("authEmail").hidden = false; $("authPassword").hidden = false;
      $("signUpBtn").hidden = false; $("signInBtn").hidden = false; $("signOutBtn").hidden = true;
    }
  }
  $("signUpBtn").addEventListener("click", async () => {
    const display_name = $("authName").value.trim();
    const username = $("authUsername").value.trim();
    const email = $("authEmail").value.trim();
    const password = $("authPassword").value;
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) return say("Username must be 3–24 letters, numbers or underscores.");
    if (!display_name || display_name.length > 60) return say("Enter a display name (maximum 60 characters).");
    if (!email || password.length < 8) return say("Enter a valid email and a password of at least 8 characters.");
    const { data, error } = await client.auth.signUp({ email, password, options: { data: { username, display_name } } });
    if (error) return authError(error);
    if (data.session) { await refreshUser(); await loadFeed(); say("Account created. Welcome to RealRep."); }
    else say("Account request received. Check your email to confirm registration, then sign in.");
  });
  $("signInBtn").addEventListener("click", async () => {
    const { data, error } = await client.auth.signInWithPassword({ email: $("authEmail").value.trim(), password: $("authPassword").value });
    if (error) return authError(error);
    currentUser = data.user;
    await refreshUser(); await loadFeed(); say("Signed in.");
  });
  $("signOutBtn").addEventListener("click", async () => {
    const { error } = await client.auth.signOut();
    if (error) return authError(error);
    currentUser = null; currentProfile = null; updateAuthUi(); await loadFeed(); say("Signed out.");
  });
  function reputation(likes, dislikes) {
    return Math.round(100 * (Number(likes) + 2) / (Number(likes) + Number(dislikes) + 4));
  }
  async function loadFeed() {
    const feed = $("feed");
    if (!feed) return;
    const { data, error } = await client.from("feed_posts").select("*").order("created_at", { ascending: false }).limit(100);
    if (error) {
      console.error(error);
      feed.innerHTML = '<div class="empty">The shared feed could not load. Confirm that the database migration has been applied.</div>';
      return;
    }
    let myReactions = {};
    if (currentUser) {
      const ids = (data || []).map(p => p.id);
      if (ids.length) {
        const res = await client.from("reactions").select("post_id,reaction").eq("user_id", currentUser.id).in("post_id", ids);
        if (!res.error) (res.data || []).forEach(r => myReactions[r.post_id] = r.reaction);
      }
    }
    const posts = data || [];
    if (!posts.length) {
      feed.innerHTML = '<div class="empty">No community posts yet. Be the first to share an idea.</div>';
    } else {
      feed.innerHTML = posts.map(p => {
        const score = reputation(p.like_count, p.dislike_count);
        const initial = (p.display_name || p.username || "R").trim().charAt(0).toUpperCase();
        const mine = myReactions[p.id];
        const date = new Date(p.created_at).toLocaleString();
        return '<article class="post"><div class="posthead"><div class="avatar">'+escapeHtml(initial)+'</div><div class="who"><b>'+escapeHtml(p.display_name || p.username)+'</b><div class="handle">@'+escapeHtml(p.username)+' · '+escapeHtml(date)+'</div></div><span class="reputation">Creator rep '+Number(p.creator_reputation_score ?? score)+'/100</span></div><div class="postbody">'+escapeHtml(p.body)+'</div><div class="postfoot"><button class="react '+(mine==="like"?"onlike":"")+'" data-live-vote="like" data-id="'+p.id+'">♥ Like <b>'+Number(p.like_count)+'</b></button><button class="react '+(mine==="dislike"?"ondislike":"")+'" data-live-vote="dislike" data-id="'+p.id+'">▾ Dislike <b>'+Number(p.dislike_count)+'</b></button><button class="report" data-live-report="'+p.id+'">Report</button></div></article>';
      }).join("");
    }
    let totalLikes = 0, totalDislikes = 0, score = 50;
    if (currentUser) {
      const ownSummary = await client.from("creator_reputation").select("like_count,dislike_count,reputation_score").eq("author_id", currentUser.id).maybeSingle();
      if (!ownSummary.error && ownSummary.data) {
        totalLikes = Number(ownSummary.data.like_count || 0);
        totalDislikes = Number(ownSummary.data.dislike_count || 0);
        score = Number(ownSummary.data.reputation_score ?? 50);
      }
    }
    if ($("myScore")) $("myScore").innerHTML = score + '<span style="font-size:16px;color:#b8d4c8"> / 100</span>';
    if ($("scoreBar")) $("scoreBar").style.width = score + "%";
    if ($("myLikes")) $("myLikes").textContent = totalLikes;
    if ($("myDislikes")) $("myDislikes").textContent = totalDislikes;
    if ($("scoreLabel")) $("scoreLabel").textContent = currentUser ? "Approval estimate for your posts" : "Sign in to see your own post metrics";
  }
  document.addEventListener("click", async (event) => {
    const vote = event.target.closest("[data-live-vote]");
    if (vote) {
      event.preventDefault(); event.stopImmediatePropagation();
      if (!currentUser) return say("Sign in before reacting to a post.");
      if (busy) return;
      busy = true;
      const postId = vote.dataset.id, reaction = vote.dataset.liveVote;
      const existing = await client.from("reactions").select("reaction").eq("post_id", postId).eq("user_id", currentUser.id).maybeSingle();
      if (existing.error) { busy = false; return authError(existing.error); }
      let result;
      if (existing.data && existing.data.reaction === reaction) {
        result = await client.from("reactions").delete().eq("post_id", postId).eq("user_id", currentUser.id);
      } else {
        result = await client.from("reactions").upsert({ post_id: postId, user_id: currentUser.id, reaction }, { onConflict: "post_id,user_id" });
      }
      busy = false;
      if (result.error) return authError(result.error);
      await loadFeed(); say("Reaction updated.");
      return;
    }
    const report = event.target.closest("[data-live-report]");
    if (report) {
      event.preventDefault(); event.stopImmediatePropagation();
      if (!currentUser) return say("Sign in before reporting content.");
      const reason = prompt("Why are you reporting this post? (3–500 characters)");
      if (reason === null) return;
      if (reason.trim().length < 3 || reason.trim().length > 500) return say("Please enter a reason between 3 and 500 characters.");
      const { error } = await client.from("reports").insert({ reporter_id: currentUser.id, post_id: report.dataset.liveReport, reason: reason.trim() });
      if (error) return authError(error);
      say("Report submitted for moderator review.");
    }
  }, true);
  document.addEventListener("click", async (event) => {
    const button = event.target.closest("#publish");
    if (!button) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (!client) return;
    if (!currentUser) return say("Sign in before publishing.");
    const body = $("newPost").value.trim();
    if (!body) return say("Write something before publishing.");
    if (body.length > 500) return say("Posts are limited to 500 characters.");
    if (busy) return;
    busy = true; button.disabled = true;
    const { error } = await client.from("posts").insert({ author_id: currentUser.id, body });
    busy = false; button.disabled = false;
    if (error) return authError(error);
    $("newPost").value = ""; $("count").textContent = "0";
    await loadFeed(); say("Your post is now shared with the RealRep community.");
  }, true);
  async function boot() {
    await refreshUser();
    await loadFeed();
    client.auth.onAuthStateChange((_event, session) => {
      currentUser = session && session.user ? session.user : null;
      // Defer follow-up API calls so they run outside the auth callback's internal lock.
      setTimeout(async () => {
        currentProfile = null;
        if (currentUser) {
          const res = await client.from("profiles").select("id,username,display_name").eq("id", currentUser.id).maybeSingle();
          if (!res.error) currentProfile = res.data;
        }
        updateAuthUi();
        await loadFeed();
      }, 0);
    });
  }
  boot().catch(authError);
})();