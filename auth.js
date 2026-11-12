(() => {
  const $ = (id) => document.getElementById(id);
  const form = $("authForm"), message = $("message"), submit = $("submitBtn");
  const loginTab = $("loginTab"), signupTab = $("signupTab");
  let mode = "login", client = null;
  const cfg = window.NILORA_CONFIG || {};
  function notify(text, type = "info") { message.textContent = text; message.className = "message show " + type; }
  function setMode(next) {
    mode = next;
    const signingUp = mode === "signup";
    loginTab.classList.toggle("active", !signingUp); signupTab.classList.toggle("active", signingUp);
    $("heading").textContent = signingUp ? "Create your account" : "Welcome back";
    $("subheading").textContent = signingUp ? "Set up your NILORA account to get started." : "Sign in to continue to your NILORA account.";
    $("nameField").classList.toggle("hidden", !signingUp);
    $("roleField").classList.toggle("hidden", !signingUp);
    $("fullName").required = signingUp;
    $("password").autocomplete = signingUp ? "new-password" : "current-password";
    $("submitBtn").textContent = signingUp ? "Create account" : "Sign in";
    $("forgotBtn").classList.toggle("hidden", signingUp);
    message.className = "message";
  }
  function getClient() {
    if (client) return client;
    if (!window.supabase || !cfg.supabaseUrl || !cfg.supabaseAnonKey) return null;
    client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
    return client;
  }
  loginTab.addEventListener("click", () => setMode("login"));
  signupTab.addEventListener("click", () => setMode("signup"));
  $("togglePassword").addEventListener("click", () => {
    const input = $("password"), show = input.type === "password";
    input.type = show ? "text" : "password"; $("togglePassword").textContent = show ? "Hide" : "Show";
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const sb = getClient();
    if (!sb) { notify("Account authentication is not configured yet. Add the Supabase publishable/anon key in config.js, then try again.", "error"); return; }
    submit.disabled = true; submit.textContent = mode === "signup" ? "Creating account…" : "Signing in…";
    try {
      const email = $("email").value.trim(), password = $("password").value;
      if (mode === "signup") {
        const { data, error } = await sb.auth.signUp({
          email, password,
          options: { data: { full_name: $("fullName").value.trim(), requested_role: $("role").value } }
        });
        if (error) throw error;
        notify(data.session ? "Your account has been created. You can now sign in." : "Account created. Check your email for the confirmation link before signing in.", "success");
        setMode("login");
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        notify("You are signed in. The NILORA workspace is still being connected; your account session is active.", "success");
      }
    } catch (error) { notify(error.message || "Authentication failed. Please try again.", "error"); }
    finally { submit.disabled = false; submit.textContent = mode === "signup" ? "Create account" : "Sign in"; }
  });
  $("forgotBtn").addEventListener("click", async () => {
    const sb = getClient();
    if (!sb) { notify("Add the Supabase publishable/anon key in config.js before using password recovery.", "error"); return; }
    const email = $("email").value.trim();
    if (!email) { notify("Enter your email address first.", "info"); $("email").focus(); return; }
    try {
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/signup.html" });
      if (error) throw error;
      notify("If an account exists for this email, a password reset link has been sent.", "success");
    } catch (error) { notify(error.message || "Could not send the reset email.", "error"); }
  });
  $("googleBtn").addEventListener("click", async () => {
    const sb = getClient();
    if (!sb) { notify("Add the Supabase publishable/anon key in config.js before using Google sign-in.", "error"); return; }
    try {
      const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin + "/signup.html" } });
      if (error) throw error;
    } catch (error) { notify(error.message || "Google sign-in could not start.", "error"); }
  });
  setMode("login");
  if (!cfg.supabaseAnonKey) notify("One setup step remains: add your Supabase publishable/anon key in config.js. The form will then connect to real authentication.", "info");
})();