import { extension_settings, getContext } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";

const extensionName = "st-diary-manager"; // ต้องตรงกับชื่อโฟลเดอร์
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;
const defaultSettings = { entries: [] };

let ctx;
let currentEditId = null;

async function loadSettings() {
  extension_settings[extensionName] = extension_settings[extensionName] || {};
  if (!extension_settings[extensionName].entries) {
    Object.assign(extension_settings[extensionName], defaultSettings);
  }
  renderDiaryList();
}

function renderDiaryList() {
  const list = $("#diary_list");
  list.empty();
  const entries = extension_settings[extensionName].entries || [];
  if (entries.length === 0) {
    list.append('<p style="color:#888;font-style:italic;">No diary entries yet.</p>');
    return;
  }
  entries.forEach(entry => {
    const date = new Date(entry.date).toLocaleString();
    const $entry = $(`
      <div class="diary-entry">
        <div class="date">📅 ${date} — <strong>${escapeHtml(entry.charName)}</strong></div>
        <div class="content">${escapeHtml(entry.content).replace(/\n/g, '<br>')}</div>
        <div class="actions">
          <button class="edit-btn" data-id="${entry.id}">Edit</button>
          <button class="delete-btn" data-id="${entry.id}">Delete</button>
        </div>
      </div>
    `);
    list.append($entry);
  });
  $(".edit-btn").on("click", e => openEditModal($(e.target).data("id")));
  $(".delete-btn").on("click", e => {
    if (confirm("Delete?")) deleteEntry($(e.target).data("id"));
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function openAddModal() {
  currentEditId = null;
  $("#diary_text").val("");
  $("#delete_diary").hide();
  $("#diary_modal").show();
}

function openEditModal(id) {
  const entry = extension_settings[extensionName].entries.find(e => e.id === id);
  if (!entry) return;
  currentEditId = id;
  $("#diary_text").val(entry.content);
  $("#delete_diary").show();
  $("#diary_modal").show();
}

function saveEntry() {
  const content = $("#diary_text").val().trim();
  if (!content) return toastr.warning("Empty entry!");
  const char = ctx.characters[ctx.characterId];
  const charName = char?.name || "Unknown";

  if (currentEditId) {
    const entry = extension_settings[extensionName].entries.find(e => e.id === currentEditId);
    if (entry) {
      entry.content = content;
      entry.date = new Date().toISOString();
    }
  } else {
    extension_settings[extensionName].entries.push({
      id: Date.now().toString(),
      date: new Date().toISOString(),
      content: content,
      charName: charName
    });
  }
  saveSettingsDebounced();
  renderDiaryList();
  $("#diary_modal").hide();
  toastr.success("Saved!");
}

function deleteEntry(id) {
  extension_settings[extensionName].entries = extension_settings[extensionName].entries.filter(e => e.id !== id);
  saveSettingsDebounced();
  renderDiaryList();
}

jQuery(async () => {
  const settingsHtml = await $.get(`${extensionFolderPath}/diary.html`);
  $("#extensions_settings").append(settingsHtml);
  ctx = getContext();

  $("#open_diary_modal").on("click", () => { $("#diary_modal").toggle(); renderDiaryList(); });
  $("#add_diary_entry").on("click", openAddModal);
  $("#save_diary").on("click", saveEntry);
  $("#cancel_diary, .modal-close").on("click", () => $("#diary_modal").hide());
  $("#delete_diary").on("click", () => currentEditId && confirm("Delete?") && deleteEntry(currentEditId) && $("#diary_modal").hide());

  $(document).on("click", e => $(e.target).hasClass("modal") && $("#diary_modal").hide());

  loadSettings();

  // Add chat button
  if (!$("#diary_chat_button").length) {
    const button = $('<div id="diary_chat_button" class="fa-solid fa-book-open interact_btn" title="Diary"></div>');
    $("#extensionsMenu").append(button);
    button.on("click", () => $("#open_diary_modal").click());
  }
});
