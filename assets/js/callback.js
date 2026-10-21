/* OAuth callback handler for the BYOP (Bring Your Own Pollen) sign-in flow.
   Exchanges the authorization code for an access token, keeps the token in
   sessionStorage (never localStorage, never in a URL) and returns to the tower. */
(function () {
  "use strict";

  const T = window.TOWER;
  const K = window.STORAGE_KEYS;

  function b64url(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function setStatus(node, kind, message) {
    if (!node) return;
    node.className = kind === "error" ? "error-box" : kind === "ok" ? "ok-box" : "muted";
    node.textContent = message;
  }

  // Works whether the callback is served from /callback.html or /callback/index.html.
  function siteRoot() {
    var path = window.location.pathname;
    var marker = "/tower-of-ai-companies/";
    var index = path.indexOf(marker);
    if (index !== -1) return path.slice(0, index + marker.length);
    var parent = path.replace(/[^/]*$/, "");
    return parent;
  }

  async function run() {
    const status = document.getElementById("callback-status");
    const params = new URLSearchParams(window.location.search);

    // Remove the code from the address bar as early as possible.
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, "", window.location.pathname);
    }

    const error = params.get("error");
    if (error) {
      setStatus(
        status,
        "error",
        "Pollinations returned an error: " + error + (params.get("error_description") ? " - " + params.get("error_description") : "")
      );
      return;
    }

    const code = params.get("code");
    if (!code) {
      setStatus(status, "muted", "No authorization code in this URL. Start the sign-in from the tower page.");
      return;
    }

    const verifier = sessionStorage.getItem("tower.pkce.verifier");
    const expectedState = sessionStorage.getItem("tower.oauth.state");
    const returnedState = params.get("state");

    if (!verifier) {
      setStatus(status, "error", "The PKCE verifier is missing from this tab's session storage. Please start the sign-in again from the tower page.");
      return;
    }
    if (expectedState && returnedState && expectedState !== returnedState) {
      setStatus(status, "error", "OAuth state mismatch - the sign-in was not completed. Please try again.");
      return;
    }

    setStatus(status, "muted", "Exchanging the authorization code for an access token...");

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code: code,
      client_id: T.clientId,
      redirect_uri: T.redirectUri,
      code_verifier: verifier
    });

    try {
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
        /* keep raw text */
      }
      if (!response.ok) {
        const detail = data.error_description || data.error || text || "HTTP " + response.status;
        setStatus(status, "error", "Token exchange failed: " + detail);
        return;
      }
      if (!data.access_token) {
        setStatus(status, "error", "Token exchange returned no access_token.");
        return;
      }

      // The token lives in sessionStorage only: it dies with this tab.
      sessionStorage.setItem(K.token, data.access_token);
      sessionStorage.removeItem("tower.pkce.verifier");
      sessionStorage.removeItem("tower.oauth.state");
      sessionStorage.setItem("tower.callback.done", "1");

      let label = "your account";
      try {
        const info = await fetch(T.userinfoEndpoint, {
          headers: { Authorization: "Bearer " + data.access_token }
        });
        if (info.ok) {
          const profile = await info.json();
          label = profile.name || profile.preferred_username || label;
          sessionStorage.setItem(
            K.user,
            JSON.stringify({
              name: profile.name || profile.preferred_username || "Visitor",
              username: profile.preferred_username || "",
              picture: profile.picture || ""
            })
          );
        }
      } catch (error) {
        /* user info is optional */
      }

      setStatus(status, "ok", "Signed in as " + label + ". Taking you back to the tower...");
      setTimeout(function () {
        window.location.replace(siteRoot() + "index.html");
      }, 900);
    } catch (error) {
      setStatus(status, "error", "Sign-in failed: " + error.message);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
