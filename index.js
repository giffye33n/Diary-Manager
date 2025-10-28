import { extension_settings, getContext, loadExtensionSettings } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";

const extensionName = "st-diary-manager";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;
const defaultSettings = {
  entries: [] // { id, date, content, charName }
};

let ctx;
let currentEditId = null;

// Load settings
async function loadSettings() {
  extension_settings[extensionName] = extension_settings[extensionName] || {};
  if (!extension_settings[extensionName].entries) {
    Object.assign(extension_settings[extensionName], defaultSettings);
  }
  renderDiaryList();
}

// Render diary list
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
          <button class="edit-btn" data-id="${entry.id}">✏️</button>
          <button class="delete-btn" data-id="${entry.id}">🗑️</button>
        </div>
      </div>
    `);
    list.append($entry);
  });

  // Bind edit/delete
  $(".edit-btn").on("click", function() {
    const id = $(this).data("id");
    openEditModal(id);
  });
  $(".delete-btn").on("click", function() {
    const id = $(this).data("id");
    if (confirm("Delete this diary entry?")) {
      deleteEntry(id);
    }
  });
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Open modal to add new
function openAddModal() {
  currentEditId = null;
  $("#diary_text").val("");
  $("#delete_diary").hide();
  $("#diary_modal").show();
}

// Open modal to edit
function openEditModal(id) {
  const entry = extension_settings[extensionName].entries.find(e => e.id === id);
  if (!entry) return;

  currentEditId = id;
  $("#diary_text").val(entry.content);
  $("#delete_diary").show();
  $("#diary_modal").show();
}

// Save entry
function saveEntry() {
  const content = $("#diary_text").val().trim();
  if (!content) {
    toastr.warning("Diary entry cannot be empty.");
    return;
  }

  const char = ctx.characters[ctx.characterId];
  const charName = char?.name || "Unknown";

  if (currentEditId) {
    // Edit existing
    const entry = extension_settings[extensionName].entries.find(e => e.id === currentEditId);
    if (entry) {
      entry.content = content;
      entry.date = new Date().toISOString();
    }
  } else {
    // Add new
    const newEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      content: content,
      charName: charName
    };
    extension_settings[extensionName].entries.push(newEntry);
  }

  saveSettingsDebounced();
  renderDiaryList();
  closeModal();
  toastr.success("Diary saved!");
}

// Delete entry
function deleteEntry(id) {
  extension_settings[extensionName].entries = extension_settings[extensionName].entries.filter(e => e.id !== id);
  saveSettingsDebounced();
  renderDiaryList();
  toastr.info("Diary entry deleted.");
}

// Close modal
function closeModal() {
  $("#diary_modal").hide();
  currentEditId = null;
}

// Add button to chat (optional)
function addChatButton() {
  if ($("#diary_chat_button").length) return;

  const button = $(`
    <div id="diary_chat_button" class="fa-solid fa-book-open interact_btn" title="Open Diary"></div>
  `);
  $("#extensionsMenu").append(button);

  button.on("click", () => {
    $("#open_diary_modal").click();
  });
}

// Main load
jQuery(async () => {
  const settingsHtml = await $.get(`${extensionFolderPath}/diary.html`);
  $("#extensions_settings").append(settingsHtml);

  ctx = getContext();

  // Events
  $("#open_diary_modal").on("click", () => {
    $("#diary_modal").toggle();
    renderDiaryList();
  });

  $("#add_diary_entry").on("click", openAddModal);
  $("#save_diary").on("click", saveEntry);
  $("#cancel_diary").on("click", closeModal);
  $("#delete_diary").on("click", () => {
    if (currentEditId && confirm("Delete this entry?")) {
      deleteEntry(currentEditId);
      closeModal();
    }
  });
  $(".modal-close").on("click", closeModal);

  // Close modal when clicking outside
  $(document).on("click", e => {
    if ($(e.target).hasClass("modal")) {
      closeModal();
    }
  });

  loadSettings();
  addChatButton();
});
