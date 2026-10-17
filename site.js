const grid = document.getElementById("project-grid");
const filters = document.getElementById("filters");
const empty = document.getElementById("empty");
const yearElement = document.getElementById("year");
if (yearElement) yearElement.textContent = new Date().getFullYear();


function renderPortfolio(projects) {
  let active = "All";
  filters.innerHTML = ["All", ...CATEGORIES].map(category =>
    `<button class="filter-btn ${category === "All" ? "active" : ""}" data-cat="${escapeHtml(category)}">${escapeHtml(category)}</button>`
  ).join("");

  function draw() {
    const shown = projects.filter(project => active === "All" || project.category === active);
    grid.innerHTML = shown.map(project => {
      const imageUrl = project.image_path
        ? window.portfolioSupabase.client.storage.from("project-images").getPublicUrl(project.image_path).data.publicUrl
        : "";
      const githubUrl = safeExternalUrl(project.github_url);
      const demoUrl = safeExternalUrl(project.live_demo_url);
      return `<article class="project-card">${imageUrl ? `<img class="project-image" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(project.title)} preview">` : `<div class="project-image placeholder">PROJECT PREVIEW</div>`}<div class="project-content"><div class="project-meta"><span>${escapeHtml(project.category)}</span><span>PROJECT</span></div><h3>${escapeHtml(project.title)}</h3><p>${escapeHtml(project.description)}</p><div class="tags">${(project.technologies || []).map(tool => `<span class="tag">${escapeHtml(tool)}</span>`).join("")}</div><div class="project-links">${githubUrl ? `<a href="${escapeHtml(githubUrl)}" target="_blank" rel="noopener noreferrer">View source ↗</a>` : ""}${demoUrl ? `<a href="${escapeHtml(demoUrl)}" target="_blank" rel="noopener noreferrer">Live demo ↗</a>` : ""}</div></div></article>`;
    }).join("");
    empty.classList.toggle("hidden", shown.length > 0);
    filters.querySelectorAll("button").forEach(button => button.classList.toggle("active", button.dataset.cat === active));
  }

  filters.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (button) { active = button.dataset.cat; draw(); }
  });
  draw();
}

async function loadPortfolio() {
  if (!window.portfolioSupabase.configured) {
    empty.textContent = "Supabase is not configured yet. Copy supabase-config.example.js to supabase-config.js and add your project values.";
    empty.classList.remove("hidden");
    return;
  }
  const { data, error } = await window.portfolioSupabase.client
    .from("projects")
    .select("id,title,category,description,technologies,github_url,live_demo_url,image_path")
    .eq("published", true)
    .order("created_at", { ascending: false });
  if (error) {
    empty.textContent = "Projects could not be loaded right now. Please try again later.";
    empty.classList.remove("hidden");
    console.error("Could not load published projects.", error);
    return;
  }
  renderPortfolio(data || []);
}

loadPortfolio();

async function loadCertificates() {
  const grid = document.getElementById("certificate-grid");
  const emptyState = document.getElementById("certificates-empty");
  if (!grid || !emptyState || !window.portfolioSupabase.configured) return;
  const client = window.portfolioSupabase.client;
  const { data, error } = await client.from("certificates")
    .select("id,title,issuer,issued_on,description,file_path,file_type")
    .eq("published", true).order("created_at", { ascending: false });
  if (error) {
    emptyState.textContent = "Certificates could not be loaded right now.";
    emptyState.classList.remove("hidden");
    console.error("Could not load certificates.", error);
    return;
  }
  const certificates = data || [];
  grid.innerHTML = certificates.map(item => {
    const url = client.storage.from("certificates").getPublicUrl(item.file_path).data.publicUrl;
    const isPdf = item.file_type === "application/pdf" || String(item.file_path).toLowerCase().endsWith(".pdf");
    const preview = isPdf
      ? `<div class="certificate-pdf-preview"><span class="pdf-mark">PDF</span><span>Certificate document</span></div>`
      : `<img class="certificate-image" src="${escapeHtml(url)}" alt="${escapeHtml(item.title)} certificate" loading="lazy">`;
    return `<article class="certificate-card">${preview}<div class="certificate-content"><div class="certificate-meta">${escapeHtml(item.issuer || "Certificate")}${item.issued_on ? ` · ${escapeHtml(item.issued_on)}` : ""}</div><h3>${escapeHtml(item.title)}</h3>${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}<a class="button small" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${isPdf ? "View PDF ↗" : "View certificate ↗"}</a></div></article>`;
  }).join("");
  emptyState.classList.toggle("hidden", certificates.length > 0);
}

loadCertificates();

