import { ICON_GROUPS, iconSvg } from "./icons.js";

const bootstrap = JSON.parse(document.querySelector("#bootstrap").textContent);
const ui = bootstrap.admin;
const iconLabels = bootstrap.icons;
let config = structuredClone(bootstrap.config);
let saved = JSON.stringify(config);
let dirty = false;
const form = document.querySelector("[data-admin-form]");
const passwordPanel = document.querySelector("[data-password-panel]");
const saveButton = document.querySelector("[data-save]");
const toast = document.querySelector("[data-toast]");
const linksEditor = document.querySelector("[data-links-editor]");
const footerLinksEditor = document.querySelector("[data-footer-links-editor]");
const avatarFile = document.querySelector("[data-avatar-file]");
const avatarInput = form.elements.avatar;
const avatarPreview = document.querySelector("[data-avatar-preview]");
let uploadedAvatar = config.avatar.startsWith("data:") ? config.avatar : "";

renderLinks();
renderFooterLinks();
form.addEventListener("input", (event) => { if (!event.target.closest("[data-password-panel]")) markDirty(); });
form.addEventListener("change", (event) => { if (!event.target.closest("[data-password-panel]") && event.target !== avatarFile) markDirty(); });
saveButton.addEventListener("click", save);
document.querySelector("[data-avatar-upload]").addEventListener("click", () => avatarFile.click());
document.querySelector("[data-avatar-remove]").addEventListener("click", removeAvatar);
avatarFile.addEventListener("change", uploadAvatar);
avatarInput.addEventListener("input", () => { uploadedAvatar = ""; updateAvatarPreview(avatarInput.value.trim()); });
document.querySelector("[data-password-save]").addEventListener("click", changePassword);
document.querySelector("[data-add-link]").addEventListener("click", () => addLink());
document.querySelector("[data-add-contact]").addEventListener("click", () => addLink("contact"));
document.querySelector("[data-add-email]").addEventListener("click", () => addLink("email"));
document.querySelectorAll("[data-section-button]").forEach((button) => button.addEventListener("click", () => showSection(button.dataset.sectionButton)));
window.addEventListener("beforeunload", (event) => { if (dirty) event.preventDefault(); });

function showSection(name) {
  document.querySelectorAll("[data-section-button]").forEach((button) => button.classList.toggle("active", button.dataset.sectionButton === name));
  document.querySelectorAll("[data-section]").forEach((section) => section.classList.toggle("active", section.dataset.section === name));
  document.querySelector(`[data-section="${name}"] h2`)?.focus({ preventScroll: true });
}

function renderLinks() {
  linksEditor.replaceChildren();
  const ordered = [...config.links].sort((a, b) => a.order - b.order);
  for (const [title, websiteGroup] of [[ui.siteList, true], [ui.contactList, false]]) {
    const links = ordered.filter((link) => ["website", "link"].includes(link.type) === websiteGroup);
    const group = document.createElement("section");
    group.className = "link-editor-group";
    const heading = document.createElement("h3");
    heading.textContent = title;
    group.append(heading, ...links.map((link, index) => createLinkCard(link, links, index)));
    linksEditor.append(group);
  }
}

function renderFooterLinks() {
  footerLinksEditor.replaceChildren(createFooterLinkCard(config.settings.footerLinks[0]));
}

function createFooterLinkCard(link) {
  const article = document.createElement("article");
  article.className = "link-editor-card footer-link-card";
  article.dataset.footerLinkId = link.id;
  article.innerHTML = `<div class="link-fields"><label class="field"><span>${ui.displayName}</span><input data-footer-key="label" maxlength="40"></label><label class="field"><span>${ui.url}</span><input data-footer-key="url" type="url" maxlength="2048" placeholder="https://"></label></div>`;
  article.querySelectorAll("[data-footer-key]").forEach((input) => {
    input.autocomplete = "off";
    input.value = link[input.dataset.footerKey];
    input.addEventListener("input", () => { link[input.dataset.footerKey] = input.value; markDirty(); });
  });
  return article;
}

function createLinkCard(link, groupLinks, index) {
    const article = document.createElement("article");
    article.className = "link-editor-card";
    article.dataset.linkId = link.id;
    const iconField = `<fieldset class="icon-field"><legend>${ui.icon}</legend><div class="icon-picker" data-icon-picker></div></fieldset>`;
    const fields = link.type === "email"
      ? `<div class="link-primary-fields"><label class="field"><span>${ui.displayName}</span><input data-key="label" maxlength="80"></label><label class="field"><span>${ui.emailAddress}</span><input data-key="value" type="email" maxlength="200" placeholder="name@example.com"></label></div>${iconField}`
      : `<div class="link-primary-fields"><label class="field"><span>${ui.displayName}</span><input data-key="label" maxlength="80"></label><label class="field"><span>${ui.accountText}</span><input data-key="value" maxlength="200"></label></div>${iconField}<label class="field wide"><span>${ui.url}</span><input data-key="url" type="url" maxlength="2048" placeholder="https://"></label>`;
    const remove = `<button type="button" class="remove-link" data-remove aria-label="${ui.deleteItem}">${ui.delete}</button>`;
    article.innerHTML = `<div class="link-editor-head"><div><strong></strong><small></small></div><label class="switch"><input type="checkbox"><span aria-hidden="true"></span><b>${ui.show}</b></label></div><div class="link-fields">${fields}</div><div class="order-actions"><span>${ui.order} ${index + 1}</span><div>${remove}<button type="button" data-move="up" aria-label="${ui.moveUp}">↑</button><button type="button" data-move="down" aria-label="${ui.moveDown}">↓</button></div></div>`;
    article.querySelector("strong").textContent = link.label;
    article.querySelector("small").textContent = typeName(link.type);
    article.querySelector('input[type="checkbox"]').checked = link.enabled;
    article.querySelector('input[type="checkbox"]').addEventListener("change", (event) => { link.enabled = event.currentTarget.checked; markDirty(); });
    article.querySelectorAll("[data-key]").forEach((input) => { input.autocomplete = "off"; input.value = link[input.dataset.key]; input.addEventListener("input", () => { link[input.dataset.key] = input.value; if (link.type === "email" && input.dataset.key === "value") link.url = input.value ? `mailto:${input.value}` : ""; article.querySelector("strong").textContent = link.label || ui.unnamed; }); });
    const picker = article.querySelector("[data-icon-picker]");
    const labelInput = article.querySelector('[data-key="label"]');
    const currentIconLabel = iconLabels[link.icon] || Object.values(ICON_GROUPS).flat().find(([value]) => value === link.icon)?.[1];
    let autoLabel = !link.label.trim() || link.label === ui.newLink || link.label === currentIconLabel;
    labelInput.addEventListener("input", () => { autoLabel = !labelInput.value.trim(); });
    if (picker) {
      for (const [title, choices] of [[ui.genericIcons, ICON_GROUPS.generic], [ui.brandIcons, ICON_GROUPS.brands]]) {
        const group = document.createElement("div");
        group.className = "icon-picker-group";
        const heading = document.createElement("strong");
        heading.textContent = title;
        const grid = document.createElement("div");
        grid.className = "icon-picker-grid";
        group.append(heading, grid);
        picker.append(group);
        for (const [value, label] of choices) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "icon-choice";
          button.title = iconLabels[value] || label;
          button.setAttribute("aria-label", button.title);
          button.setAttribute("aria-pressed", String(link.icon === value));
          button.innerHTML = iconSvg(value);
          button.addEventListener("click", () => {
            if (autoLabel) {
              link.label = button.title;
              labelInput.value = link.label;
              article.querySelector("strong").textContent = link.label;
            }
            link.icon = value;
            picker.querySelectorAll(".icon-choice").forEach((choice) => choice.setAttribute("aria-pressed", String(choice === button)));
            markDirty();
          });
          grid.append(button);
        }
      }
    }
    article.querySelector('[data-move="up"]').disabled = index === 0;
    article.querySelector('[data-move="down"]').disabled = index === groupLinks.length - 1;
    article.querySelectorAll("[data-move]").forEach((button) => button.addEventListener("click", () => moveLink(link.id, groupLinks, button.dataset.move === "up" ? -1 : 1)));
    article.querySelector("[data-remove]")?.addEventListener("click", () => removeLink(link.id));
    return article;
}

function typeName(type) {
  return ({ website: ui.siteList, email: ui.emailAddress, github: "GitHub", telegram: "Telegram", line: "LINE", x: "X", link: ui.customUrl })[type] || ui.contactList;
}

function addLink(type = "link") {
  if (config.links.length >= 20) { showToast(ui.maximumLinks, true); return; }
  const id = `custom-${crypto.randomUUID().slice(0, 20)}`;
  config.links.push({ id, type, icon: type === "email" ? "email" : "link", label: type === "email" ? "Email" : ui.newLink, value: "", url: "", enabled: false, order: Math.max(0, ...config.links.map((link) => link.order)) + 1 });
  renderLinks();
  markDirty();
  linksEditor.querySelector(`[data-link-id="${id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function removeLink(id) {
  config.links = config.links.filter((link) => link.id !== id);
  renderLinks();
  markDirty();
}

function moveLink(id, groupLinks, offset) {
  const index = groupLinks.findIndex((link) => link.id === id);
  const next = index + offset;
  if (next < 0 || next >= groupLinks.length) return;
  [groupLinks[index].order, groupLinks[next].order] = [groupLinks[next].order, groupLinks[index].order];
  renderLinks();
  markDirty();
}

function collect() {
  const data = new FormData(form);
  config.name = String(data.get("name") || "").trim();
  config.avatar = String(data.get("avatar") || "").trim() || uploadedAvatar;
  config.settings.siteTitle = String(data.get("siteTitle") || "").trim();
  config.settings.canonicalUrl = String(data.get("canonicalUrl") || "").trim();
  config.settings.footerLinks.forEach((link) => { link.label = link.label.trim(); link.url = link.url.trim(); });
  for (const lang of ["zh-TW", "en", "ja"]) {
    config.status[lang] = String(data.get(`status.${lang}`) || "").trim();
    config.bio[lang] = String(data.get(`bio.${lang}`) || "").trim();
  }
  config.links.forEach((link) => { link.label = link.label.trim(); link.value = link.value.trim(); link.url = link.type === "email" && link.value ? `mailto:${link.value}` : link.url.trim(); });
  return config;
}

async function uploadAvatar() {
  const file = avatarFile.files?.[0];
  if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { showToast(ui.imageType, true); return; }
  try {
    uploadedAvatar = await resizeImage(file);
    avatarInput.value = "";
    updateAvatarPreview(uploadedAvatar);
    markDirty();
  } catch (error) { showToast(error.message || ui.imageFailed, true); }
  finally { avatarFile.value = ""; }
}

function removeAvatar() {
  uploadedAvatar = "";
  avatarInput.value = "";
  updateAvatarPreview("");
  markDirty();
}

function updateAvatarPreview(source) {
  avatarPreview.replaceChildren();
  if (source) {
    const image = document.createElement("img");
    image.src = source;
    image.alt = ui.currentAvatar;
    image.addEventListener("error", () => updateAvatarPreview(""), { once: true });
    avatarPreview.append(image);
  } else {
    const initials = [...(config.name.trim() || "?")].slice(0, 2).join("").toUpperCase();
    const span = document.createElement("span");
    span.textContent = initials;
    avatarPreview.append(span);
  }
}

async function resizeImage(file) {
  const image = new Image();
  const source = await blobToDataUrl(file);
  await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error(ui.imageUnreadable)); image.src = source; });
  for (const [size, quality] of [[512, .84], [384, .76]]) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const context = canvas.getContext("2d");
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    context.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 0, 0, size, size);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    if (blob && blob.size <= 256 * 1024) return await blobToDataUrl(blob);
  }
  throw new Error(ui.imageTooLarge);
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error(ui.imageConvertFailed)); reader.readAsDataURL(blob); });
}

async function changePassword() {
  const current = passwordPanel.querySelector('[name="currentPassword"]');
  const next = passwordPanel.querySelector('[name="newPassword"]');
  const confirm = passwordPanel.querySelector('[name="confirmPassword"]');
  if (next.value !== confirm.value) { showToast(ui.passwordMismatch, true); return; }
  const button = document.querySelector("[data-password-save]");
  button.disabled = true;
  button.textContent = ui.updating;
  try {
    const response = await fetch("/api/admin/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword: current.value, newPassword: next.value }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || ui.passwordUpdateFailed);
    current.value = next.value = confirm.value = "";
    showToast(ui.passwordUpdated);
    setTimeout(() => { location.href = "/admin/login"; }, 900);
  } catch (error) { showToast(error.message, true); button.disabled = false; button.textContent = ui.updatePassword; }
}

function markDirty() {
  collect();
  dirty = JSON.stringify(config) !== saved;
}

async function save() {
  collect();
  saveButton.disabled = true;
  try {
    const response = await fetch("/api/admin/config", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(config) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.details?.join("; ") || result.error || ui.saveFailed);
    config = result;
    saved = JSON.stringify(result);
    // Event handlers in the editors close over their link objects. The API
    // response replaces config, so rebuild both editors to bind subsequent
    // edits to the newly saved objects.
    renderLinks();
    renderFooterLinks();
    document.title = `${ui.title} — ${result.settings.siteTitle || result.name}`;
    markDirty();
    showToast(ui.saved);
  } catch (error) {
    showToast(error.message, true);
  } finally {
    saveButton.disabled = false;
  }
}

function showToast(message, isError = false) {
  toast.textContent = message;
  toast.classList.toggle("error", isError);
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 3200);
}
