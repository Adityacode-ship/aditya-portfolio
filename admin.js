
const $ = id => document.getElementById(id);
const client = window.portfolioSupabase?.client;

const starterProjects = [
  {
    id: "ecommerce",
    title: "E-Commerce Analytics & Google Maps Lead Scraper",
    category: "Python",
    description: "A Streamlit application that cleans sales data, calculates revenue and order KPIs, visualizes trends, and scrapes Google Maps business listings.",
    technologies: ["Python", "Pandas", "Streamlit", "Plotly", "Selenium"],
    github_url: "https://github.com/Adityacode-ship/Ecommerce-Analytics-Solution-and-Data-Scraping",
    live_demo_url: "",
    image_path: "",
    published: true
  },
  {
    id: "currency",
    title: "Fake Currency Detection using CNN",
    category: "Machine Learning & Deep Learning",
    description: "A computer-vision project that classifies currency note images using a CNN model.",
    technologies: ["Python", "TensorFlow", "Keras", "CNN", "OpenCV", "Flask"],
    github_url: "https://github.com/Adityacode-ship/Fake-Currency-Detection-using-cnn",
    live_demo_url: "https://fake-currency-detection-using-cnn-4.onrender.com/",
    image_path: "",
    published: true
  }
];

let projects = [];
let session = null;
let selectedImagePath = "";

// ---------- Status messages ----------

function setStatus(message, error = false) {
  for (const id of ["admin-status", "status"]) {
    const element = $(id);
    if (element) {
      element.textContent = message;
      element.style.color = error ? "#ffb3bd" : "";
    }
  }
}

function setLoginStatus(message, error = false) {
  const element = $("login-status");
  if (!element) return;
  element.textContent = message;
  element.style.color = error ? "#ffb3bd" : "";
}

function setCertificateStatus(message, error = false) {
  const element = $("certificate-status");
  if (!element) return;
  element.textContent = message;
  element.style.color = error ? "#ffb3bd" : "";
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

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function showLogin() {
  $("login-view")?.classList.remove("hidden");
  $("dashboard-view")?.classList.add("hidden");
}

function showDashboard() {
  $("login-view")?.classList.add("hidden");
  $("dashboard-view")?.classList.remove("hidden");
  $("session-email").textContent = session?.user?.email || "";
}

// ---------- Authentication ----------

async function verifyAdmin() {
  const { data, error } = await client.rpc("is_admin");

  if (error) throw error;

  if (data !== true) {
    throw new Error(
      "This account is not authorized to manage the portfolio."
    );
  }
}

async function loadDashboard() {
  await verifyAdmin();
  showDashboard();

  try {
    await loadProjects();
    await loadCertificatesAdmin();
  } catch (error) {
    setStatus(`Could not load dashboard: ${error.message}`, true);
  }
}

async function start() {
  if (!window.portfolioSupabase?.configured || !client) {
    setLoginStatus(
      "Supabase is not configured. Check supabase-config.js.",
      true
    );
    const button = document.querySelector(
      '#login-form button[type="submit"]'
    );
    if (button) button.disabled = true;
    return;
  }

  try {
    const { data, error } = await client.auth.getSession();
    if (error) throw error;

    if (data.session) {
      session = data.session;
      await loadDashboard();
    } else {
      showLogin();
    }
  } catch (error) {
    showLogin();
    setLoginStatus(error.message, true);
  }

  // Avoid awaiting Supabase calls directly inside this callback.
  client.auth.onAuthStateChange((event, nextSession) => {
    session = nextSession;

    if (event === "SIGNED_OUT" || !nextSession) {
      showLogin();
      setLoginStatus("Please sign in to continue.");
      return;
    }

    if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
      setLoginStatus("Checking administrator access...");

      setTimeout(async () => {
        try {
          await loadDashboard();
          setLoginStatus("");
        } catch (error) {
          showLogin();
          setLoginStatus(error.message, true);
        }
      }, 0);
    }
  });
}

$("login-form")?.addEventListener("submit", async event => {
  event.preventDefault();

  if (!client) {
    setLoginStatus("Supabase is not configured.", true);
    return;
  }

  const button = document.querySelector(
    '#login-form button[type="submit"]'
  );

  if (button) button.disabled = true;
  setLoginStatus("Signing in...");

  try {
    const { error } = await client.auth.signInWithPassword({
      email: $("login-email").value.trim(),
      password: $("login-password").value
    });

    if (error) throw error;
  } catch (error) {
    setLoginStatus(`Sign-in failed: ${error.message}`, true);
  } finally {
    if (button) button.disabled = false;
  }
});

$("logout")?.addEventListener("click", async () => {
  if (!client) return;

  try {
    const { error } = await client.auth.signOut();
    if (error) throw error;
    showLogin();
    setLoginStatus("You have signed out.");
  } catch (error) {
    setStatus(`Could not log out: ${error.message}`, true);
  }
});

// ---------- Projects ----------

async function loadProjects() {
  const { data, error } = await client
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  projects = data || [];
  renderList();
}

function renderList() {
  $("count").textContent = `(${projects.length})`;

  $("project-list").innerHTML = projects.length
    ? projects.map(project => {
        const imageUrl = project.image_path
          ? client.storage.from("project-images")
              .getPublicUrl(project.image_path).data.publicUrl
          : "";

        return `
          <div class="project-row">
            <img src="${escapeHtml(imageUrl)}" alt=""
              onerror="this.style.visibility='hidden'">
            <div class="row-main">
              <strong>${escapeHtml(project.title)}</strong>
              <small>
                ${escapeHtml(project.category)} ·
                ${(project.technologies || []).map(escapeHtml).join(", ")}
                ${project.published ? "" : " · Unpublished"}
              </small>
            </div>
            <div class="row-actions">
              <button class="mini-btn"
                data-edit="${escapeHtml(project.id)}">Edit</button>
              <button class="mini-btn danger"
                data-delete="${escapeHtml(project.id)}">Delete</button>
            </div>
          </div>`;
      }).join("")
    : `<p class="muted">No projects yet. Add your first project.</p>`;
}

function clearForm() {
  $("project-form").reset();
  $("project-id").value = "";
  $("image-file").value = "";
  $("image-preview").src = "";
  $("image-preview").classList.add("hidden");
  selectedImagePath = "";
  $("form-title").textContent = "Add a project";
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

  const url = selectedImagePath
    ? client.storage.from("project-images")
        .getPublicUrl(selectedImagePath).data.publicUrl
    : "";

  $("image-preview").src = url;
  $("image-preview").classList.toggle("hidden", !url);
  $("form-title").textContent = "Edit project";

  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function uploadImage(file, projectId) {
  if (!file) return selectedImagePath;

  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    throw new Error("Choose a PNG, JPG, or WebP image.");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Project images must be smaller than 5 MB.");
  }

  const extension = file.type.split("/")[1].replace("jpeg", "jpg");
  const path = `${session.user.id}/${projectId}-${crypto.randomUUID()}.${extension}`;

  const { error } = await client.storage
    .from("project-images")
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) throw error;
  return path;
}

async function removeImage(path) {
  if (!path) return;

  const { error } = await client.storage
    .from("project-images")
    .remove([path]);

  if (error) throw error;
}

async function saveProject(event) {
  event.preventDefault();

  const id = $("project-id").value || `project-${crypto.randomUUID()}`;
  const old = projects.find(project => project.id === id);
  const githubUrl = safeUrl($("github").value.trim());
  const demoUrl = safeUrl($("demo").value.trim());

  if (
    ($("github").value.trim() && !githubUrl) ||
    ($("demo").value.trim() && !demoUrl)
  ) {
    setStatus("GitHub and demo URLs must use http:// or https://.", true);
    return;
  }

  setStatus("Saving project...");

  try {
    const file = $("image-file").files[0];
    const imagePath = await uploadImage(file, id);

    const record = {
      id,
      title: $("title").value.trim(),
      category: $("category").value,
      description: $("description").value.trim(),
      technologies: $("tools").value.split(",")
        .map(value => value.trim()).filter(Boolean),
      github_url: githubUrl,
      live_demo_url: demoUrl,
      image_path: imagePath,
      published: true,
      updated_at: new Date().toISOString()
    };

    const { error } = await client.from("projects").upsert(record);
    if (error) throw error;

    if (old?.image_path && old.image_path !== imagePath) {
      await removeImage(old.image_path);
    }

    await loadProjects();
    clearForm();
    setStatus("Project saved successfully.");
  } catch (error) {
    setStatus(`Could not save project: ${error.message}`, true);
  }
}

async function deleteProject(project) {
  if (!confirm(`Delete "${project.title}"?`)) return;

  setStatus("Deleting project...");

  try {
    const { error } = await client
      .from("projects").delete().eq("id", project.id);

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
  const backup = projects.map(project => ({
    ...project,
    image: project.image_path
      ? client.storage.from("project-images")
          .getPublicUrl(project.image_path).data.publicUrl
      : ""
  }));

  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json"
  });

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

    if (!Array.isArray(data)) {
      throw new Error("The JSON file must contain a list of projects.");
    }

    if (!confirm("Import these projects into your portfolio?")) return;

    const records = data.map(project => {
      const githubValue = project.github_url || project.github || "";
      const demoValue = project.live_demo_url || project.demo || "";

      if (
        (githubValue && !safeUrl(githubValue)) ||
        (demoValue && !safeUrl(demoValue))
      ) {
        throw new Error("Imported URLs must use http:// or https://.");
      }

      return {
        id: String(project.id || `project-${crypto.randomUUID()}`),
        title: String(project.title || "").trim(),
        category: project.category,
        description: String(project.description || "").trim(),
        technologies: project.technologies || project.tools || [],
        github_url: safeUrl(githubValue),
        live_demo_url: safeUrl(demoValue),
        image_path: project.image_path || "",
        published: project.published !== false
      };
    });

    const { error } = await client.from("projects").upsert(records);
    if (error) throw error;

    await loadProjects();
    setStatus("Projects imported successfully.");
  } catch (error) {
    setStatus(`Could not import JSON: ${error.message}`, true);
  }
}

async function restoreDefaults() {
  if (!confirm(
    "Replace your current project list with the two starter projects?"
  )) return;

  setStatus("Restoring starter projects...");

  try {
    const { error: deleteError } = await client
      .from("projects").delete().neq("id", "");

    if (deleteError) throw deleteError;

    const { error } = await client.from("projects").insert(starterProjects);
    if (error) throw error;

    await loadProjects();
    clearForm();
    setStatus("Starter projects restored.");
  } catch (error) {
    setStatus(`Could not restore projects: ${error.message}`, true);
  }
}

// ---------- Certificates ----------

const CERTIFICATE_BUCKET = "certificates";
const CERTIFICATE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf"
];
const MAX_CERTIFICATE_SIZE = 10 * 1024 * 1024;

function certificatePublicUrl(path) {
  return client.storage
    .from(CERTIFICATE_BUCKET)
    .getPublicUrl(path).data.publicUrl;
}

async function loadCertificatesAdmin() {
  const list = $("certificate-admin-list");
  if (!list) return;

  list.innerHTML = `<p class="muted">Loading certificates...</p>`;

  const { data, error } = await client
    .from("certificates")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  if (!data?.length) {
    list.innerHTML = `<p class="muted">No certificates uploaded yet.</p>`;
    return;
  }

  list.innerHTML = data.map(certificate => {
    const url = certificatePublicUrl(certificate.file_path);
    const isPdf = certificate.file_type === "application/pdf";

    return `
      <div class="project-row certificate-row">
        <div class="row-main">
          <strong>${escapeHtml(certificate.title)}</strong>
          <small>
            ${escapeHtml(certificate.issuer || "Certificate")}
            ${certificate.issued_on
              ? " · " + escapeHtml(certificate.issued_on)
              : ""}
            · ${isPdf ? "PDF" : "Image"}
          </small>
          ${certificate.description
            ? `<small>${escapeHtml(certificate.description)}</small>`
            : ""}
          <a href="${escapeHtml(url)}" target="_blank"
             rel="noopener noreferrer">View certificate ↗</a>
        </div>
        <div class="row-actions">
          <button type="button" class="mini-btn danger"
            data-certificate-delete="${escapeHtml(certificate.id)}">
            Delete
          </button>
        </div>
      </div>`;
  }).join("");
}

async function uploadCertificate(event) {
  event.preventDefault();

  const file = $("certificate-file")?.files?.[0];

  if (!file) {
    setCertificateStatus("Please select a certificate file.", true);
    return;
  }

  if (!CERTIFICATE_TYPES.includes(file.type)) {
    setCertificateStatus("Choose a PNG, JPG, WebP, or PDF file.", true);
    return;
  }

  if (file.size > MAX_CERTIFICATE_SIZE) {
    setCertificateStatus("The certificate file must be 10 MB or smaller.", true);
    return;
  }

  const button = $("certificate-form").querySelector(
    'button[type="submit"]'
  );

  if (button) button.disabled = true;
  setCertificateStatus("Uploading certificate...");

  let uploadedPath = "";

  try {
    const extensionMap = {
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/webp": "webp",
      "application/pdf": "pdf"
    };

    const safeName = file.name
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .slice(0, 60) || "certificate";

    uploadedPath =
      `${session.user.id}/${crypto.randomUUID()}-${safeName}.${extensionMap[file.type]}`;

    const { error: uploadError } = await client.storage
      .from(CERTIFICATE_BUCKET)
      .upload(uploadedPath, file, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) throw uploadError;

    const record = {
      title: $("certificate-title").value.trim(),
      issuer: $("certificate-issuer").value.trim(),
      issued_on: $("certificate-date").value.trim(),
      description: $("certificate-description").value.trim(),
      file_path: uploadedPath,
      file_type: file.type,
      published: true
    };

    const { error: insertError } = await client
      .from("certificates")
      .insert(record);

    if (insertError) throw insertError;

    $("certificate-form").reset();
    await loadCertificatesAdmin();
    setCertificateStatus("Certificate uploaded successfully.");
  } catch (error) {
    // If the database insert fails after storage upload, remove the orphan file.
    if (uploadedPath) {
      await client.storage.from(CERTIFICATE_BUCKET)
        .remove([uploadedPath]).catch(() => {});
    }

    setCertificateStatus(
      `Could not upload certificate: ${error.message}`,
      true
    );
  } finally {
    if (button) button.disabled = false;
  }
}

async function deleteCertificate(certificateId) {
  if (!confirm("Delete this certificate?")) return;

  setCertificateStatus("Deleting certificate...");

  try {
    const { data: certificate, error: findError } = await client
      .from("certificates")
      .select("id, title, file_path")
      .eq("id", certificateId)
      .single();

    if (findError) throw findError;

    const { error: deleteError } = await client
      .from("certificates")
      .delete()
      .eq("id", certificateId);

    if (deleteError) throw deleteError;

    const { error: storageError } = await client.storage
      .from(CERTIFICATE_BUCKET)
      .remove([certificate.file_path]);

    if (storageError) {
      setCertificateStatus(
        "Certificate record deleted, but its stored file could not be removed: " +
        storageError.message,
        true
      );
      await loadCertificatesAdmin();
      return;
    }

    await loadCertificatesAdmin();
    setCertificateStatus("Certificate deleted.");
  } catch (error) {
    setCertificateStatus(
      `Could not delete certificate: ${error.message}`,
      true
    );
  }
}

// ---------- Event listeners ----------

$("project-form")?.addEventListener("submit", saveProject);
$("reset-form")?.addEventListener("click", clearForm);

$("remove-image")?.addEventListener("click", () => {
  selectedImagePath = "";
  $("image-file").value = "";
  $("image-preview").src = "";
  $("image-preview").classList.add("hidden");
});

$("image-file")?.addEventListener("change", event => {
  const file = event.target.files[0];
  if (!file) return;

  if (
    !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
    file.size > 5 * 1024 * 1024
  ) {
    setStatus("Choose a PNG, JPG, or WebP image up to 5 MB.", true);
    event.target.value = "";
    return;
  }

  $("image-preview").src = URL.createObjectURL(file);
  $("image-preview").classList.remove("hidden");
});

$("project-list")?.addEventListener("click", event => {
  const edit = event.target.closest("[data-edit]");
  const deleted = event.target.closest("[data-delete]");

  if (edit) {
    const project = projects.find(item => item.id === edit.dataset.edit);
    if (project) fillForm(project);
  }

  if (deleted) {
    const project = projects.find(item => item.id === deleted.dataset.delete);
    if (project) deleteProject(project);
  }
});

$("export-json")?.addEventListener("click", exportJson);
$("import-json")?.addEventListener("change", importJson);
$("reset-defaults")?.addEventListener("click", restoreDefaults);

$("certificate-form")?.addEventListener("submit", uploadCertificate);

$("certificate-admin-list")?.addEventListener("click", event => {
  const button = event.target.closest("[data-certificate-delete]");
  if (button) deleteCertificate(button.dataset.certificateDelete);
});

// Start the admin application.
start();
