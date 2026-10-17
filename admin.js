const $ = id => document.getElementById(id);
const client = window.portfolioSupabase.client;
const starterProjects = [
  { id: "ecommerce", title: "E-Commerce Analytics & Google Maps Lead Scraper", category: "Python", description: "A Streamlit application that cleans uploaded sales data, calculates revenue and order KPIs, visualizes trends, and scrapes business listings from Google Maps.", technologies: ["Python", "Pandas", "Streamlit", "Plotly", "Selenium"], github_url: "https://github.com/Adityacode-ship/Ecommerce-Analytics-Solution-and-Data-Scraping", live_demo_url: "", image_path: "", published: true },
  { id: "currency", title: "Fake Currency Detection using CNN", category: "Machine Learning & Deep Learning", description: "A computer-vision project that classifies currency note images using a CNN model, with image preprocessing and a web interface for predictions.", technologies: ["Python", "TensorFlow", "Keras", "CNN", "OpenCV", "Flask"], github_url: "https://github.com/Adityacode-ship/Fake-Currency-Detection-using-cnn", live_demo_url: "https://fake-currency-detection-using-cnn-4.onrender.com/", image_path: "", published: true }
];
let projects = [];
let session = null;
let selectedImagePath = "";
let selectedImageUrl = "";

function setStatus(message, error = false) {
  $("admin-status").textContent = message;
  $("status").textContent = message;
  $("admin-status").style.color = error ? "#ffb3bd" : "";
  $("status").style.color = error ? "#ffb3bd" : "";
}

function setLoginStatus(message, error = false) {
  $("login-status").textContent = message;
  $("login-status").style.color = error ? "#ffb3bd" : "";
}

function safeUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function showLogin() {
  $("login-view").classList.remove("hidden");
  $("dashboard-view").classList.add("hidden");
}

function showDashboard() {
  $("login-view").classList.add("hidden");
  $("dashboard-view").classList.remove("hidden");
  $("session-email").textContent = session.user.email;
}

async function verifyAdmin() {
  const { data, error } = await client.rpc("is_admin");
  if (error) throw error;
  if (data !== true) {
    await client.auth.signOut();
    throw new Error("This account is authenticated but is not authorized to manage projects.");
  }
}

async function loadProjects() {
  const { data, error } = await client.from("projects").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  projects = data || [];
  renderList();
}

function renderList() {
  $("count").textContent = `(${projects.length})`;
  $("project-list").innerHTML = projects.length ? projects.map(project => {
    const imageUrl = project.image_path ? client.storage.from("project-images").getPublicUrl(project.image_path).data.publicUrl : "";
    return `<div class="project-row"><img src="${escapeHtml(imageUrl)}" alt="" onerror="this.style.visibility='hidden'"><div class="row-main"><strong>${escapeHtml(project.title)}</strong><small>${escapeHtml(project.category)} · ${(project.technologies || []).map(escapeHtml).join(", ")}${project.published ? "" : " · Unpublished"}</small></div><div class="row-actions"><button class="mini-btn" data-edit="${escapeHtml(project.id)}">Edit</button><button class="mini-btn danger" data-delete="${escapeHtml(project.id)}">Delete</button></div></div>`;
  }).join("") : `<p class="muted">No projects yet. Add your first project using the form.</p>`;
}

function clearForm() {
  $("project-form").reset();
  $("project-id").value = "";
  selectedImagePath = "";
  selectedImageUrl = "";
  $("image-preview").src = "";
  $("image-preview").classList.add("hidden");
  $("form-title").textContent = "Add a project";
  $("remove-image").textContent = "Remove image";
}

function fillForm(project) {
  $("project-id").value = project.id;
  $("title").value = project.title;
  $("category").value = project.category;
  $("description").value = project.description;
  $("tools").value = (project.technologies || []).join(", ");
  $("github").value = project.github_url || "";
  $("demo").value = project.live_demo_url || "";
  selectedImagePath = project.image_path || "";
  selectedImageUrl = selectedImagePath ? client.storage.from("project-images").getPublicUrl(selectedImagePath).data.publicUrl : "";
  setPreview(selectedImageUrl);
  $("form-title").textContent = "Edit project";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setPreview(source) {
  $("image-preview").src = source || "";
  $("image-preview").classList.toggle("hidden", !source);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
}

async function uploadImage(file, projectId) {
  if (!file) return selectedImagePath;
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) throw new Error("Please choose a PNG, JPG, or WebP image.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Please choose an image smaller than 5 MB.");
  const extension = file.type.split("/")[1].replace("jpeg", "jpg");
  const path = `${session.user.id}/${projectId}-${crypto.randomUUID()}.${extension}`;
  const { error } = await client.storage.from("project-images").upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}

async function removeImage(path) {
  if (path) {
    const { error } = await client.storage.from("project-images").remove([path]);
    if (error) throw error;
  }
}

async function saveProject(event) {
  event.preventDefault();
  const id = $("project-id").value || `project-${crypto.randomUUID()}`;
  const old = projects.find(project => project.id === id);
  const githubUrl = safeUrl($("github").value.trim());
  const demoUrl = safeUrl($("demo").value.trim());
  if ($("github").value.trim() && !githubUrl || $("demo").value.trim() && !demoUrl) {
    setStatus("GitHub and demo URLs must use http:// or https://.", true);
    return;
  }
  setStatus("Saving project...");
  try {
    const file = $("image-file").files[0];
    const imagePath = await uploadImage(file, id);
    const record = {
      id, title: $("title").value.trim(), category: $("category").value,
      description: $("description").value.trim(),
      technologies: $("tools").value.split(",").map(value => value.trim()).filter(Boolean),
      github_url: githubUrl, live_demo_url: demoUrl, image_path: imagePath,
      published: true, updated_at: new Date().toISOString()
    };
    const { error } = await client.from("projects").upsert(record);
    if (error) throw error;
    if (old && old.image_path && old.image_path !== imagePath) await removeImage(old.image_path);
    setStatus("Project saved.");
    await loadProjects();
    clearForm();
  } catch (error) {
    setStatus(`Could not save project: ${error.message}`, true);
  }
}

async function deleteProject(project) {
  if (!confirm(`Delete "${project.title}"?`)) return;
  setStatus("Deleting project...");
  try {
    const { error } = await client.from("projects").delete().eq("id", project.id);
    if (error) throw error;
    await removeImage(project.image_path);
    if ($("project-id").value === project.id) clearForm();
    await loadProjects();
    setStatus("Project deleted.");
  } catch (error) {
    setStatus(`Could not delete project: ${error.message}`, true);
  }
}

function exportJson() {
  const backup = projects.map(project => ({ ...project, image: project.image_path ? client.storage.from("project-images").getPublicUrl(project.image_path).data.publicUrl : "" }));
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "aditya-portfolio-projects.json";
  link.click();
  URL.revokeObjectURL(link.href);
}

async function importJson(event) {
  const file = event.target.files[0];
  event.target.value = "";
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data) || data.some(project => project.image && project.image.startsWith("data:"))) throw new Error("Legacy Base64 images are not accepted. Upload screenshots through the form.");
    if (!confirm("Replace your current projects with this JSON list?")) return;
    const records = data.map(project => {
      const githubValue = project.github_url || project.github || "";
      const demoValue = project.live_demo_url || project.demo || "";
      if ((githubValue && !safeUrl(githubValue)) || (demoValue && !safeUrl(demoValue))) throw new Error("Imported GitHub and demo URLs must use http:// or https://.");
      return {
      id: String(project.id || `project-${crypto.randomUUID()}`),
      title: String(project.title || "").trim(), category: project.category,
      description: String(project.description || "").trim(),
      technologies: project.technologies || project.tools || [],
      github_url: safeUrl(githubValue),
      live_demo_url: safeUrl(demoValue),
      image_path: project.image_path || "", published: project.published !== false
      };
    });
    const { error } = await client.from("projects").upsert(records);
    if (error) throw error;
    await loadProjects();
    setStatus("Projects imported. Upload any missing images through the edit form.");
  } catch (error) {
    setStatus(`Could not import JSON: ${error.message}`, true);
  }
}

async function restoreDefaults() {
  if (!confirm("Replace your current list with the two starter projects? This will remove your custom projects.")) return;
  setStatus("Restoring starter projects...");
  try {
    const { error: deleteError } = await client.from("projects").delete().neq("id", "");
    if (deleteError) throw deleteError;
    const { error } = await client.from("projects").insert(starterProjects);
    if (error) throw error;
    await loadProjects();
    clearForm();
    setStatus("Starter projects restored.");
  } catch (error) {
    setStatus(`Could not restore starter projects: ${error.message}`, true);
  }
}

async function start() {
  if (!window.portfolioSupabase.configured || !client) {
    setLoginStatus("Supabase is not configured. Add your project URL and publishable key in supabase-config.js, then reload this page.", true);
    const submit = document.querySelector('#login-form button[type="submit"]');
    if (submit) submit.disabled = true;
    return;
  }
  const { data } = await client.auth.getSession();
  if (data.session) {
    session = data.session;
    try { await verifyAdmin(); showDashboard(); await loadProjects(); } catch (error) { showLogin(); setLoginStatus(error.message, true); }
  } else showLogin();
  client.auth.onAuthStateChange(async (_event, nextSession) => {
    session = nextSession;
    if (!nextSession) { showLogin(); setLoginStatus("Your session has ended. Please sign in again."); return; }
    try { await verifyAdmin(); showDashboard(); await loadProjects(); } catch (error) { showLogin(); setLoginStatus(error.message, true); }
  });
}

$("login-form").addEventListener("submit", async event => {
  event.preventDefault();
  if (!client) { setLoginStatus("Supabase is not configured. Update supabase-config.js first.", true); return; }
  setLoginStatus("Signing in...");
  const { error } = await client.auth.signInWithPassword({ email: $("login-email").value.trim(), password: $("login-password").value });
  if (error) setLoginStatus(`Sign-in failed: ${error.message}`, true);
});
$("logout").addEventListener("click", async () => {
  if (!client) return;
  const { error } = await client.auth.signOut();
  if (error) setStatus(`Could not log out: ${error.message}`, true);
});
$("project-form").addEventListener("submit", saveProject);
$("reset-form").addEventListener("click", clearForm);
$("remove-image").addEventListener("click", () => { selectedImagePath = ""; selectedImageUrl = ""; $("image-file").value = ""; setPreview(""); });
$("image-file").addEventListener("change", event => {
  const file = event.target.files[0];
  if (file) { if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) { setStatus("Choose a PNG, JPG, or WebP image up to 5 MB.", true); event.target.value = ""; return; } setPreview(URL.createObjectURL(file)); }
});
$("project-list").addEventListener("click", event => {
  const edit = event.target.closest("[data-edit]");
  const deleted = event.target.closest("[data-delete]");
  if (edit) { const project = projects.find(item => item.id === edit.dataset.edit); if (project) fillForm(project); }
  if (deleted) { const project = projects.find(item => item.id === deleted.dataset.delete); if (project) deleteProject(project); }
});
$("export-json").addEventListener("click", exportJson);
$("import-json").addEventListener("change", importJson);
$("reset-defaults").addEventListener("click", restoreDefaults);
start();
