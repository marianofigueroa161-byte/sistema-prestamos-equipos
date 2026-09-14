const STORAGE_KEY = "prestamosEquiposTecnologicos";

let equipment = loadEquipment();

const form = document.querySelector("#equipmentForm");

const fields = {
  editingId: document.querySelector("#editingId"),
  code: document.querySelector("#code"),
  type: document.querySelector("#type"),
  model: document.querySelector("#model"),
  responsible: document.querySelector("#responsible"),
  area: document.querySelector("#area"),
  loanDate: document.querySelector("#loanDate"),
  returnDate: document.querySelector("#returnDate"),
  status: document.querySelector("#status"),
  notes: document.querySelector("#notes")
};

function loadEquipment() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (error) {
    return [];
  }
}

function saveEquipment() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(equipment));
}

function normalize(value) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function escapeHTML(value = "") {
  const element = document.createElement("div");
  element.textContent = value;
  return element.innerHTML;
}

function formatDate(value) {
  if (!value) {
    return "Sin fecha";
  }

  return new Date(`${value}T00:00:00`).toLocaleDateString("es-PE");
}

function isOverdue(item) {
  if (item.status !== "Prestado" || !item.returnDate) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const returnDate = new Date(`${item.returnDate}T00:00:00`);

  return returnDate < today;
}

function notify(message) {
  const notification = document.querySelector("#notification");

  notification.textContent = message;
  notification.classList.add("show");

  clearTimeout(notify.timer);

  notify.timer = setTimeout(() => {
    notification.classList.remove("show");
  }, 2400);
}

function updateStats() {
  document.querySelector("#totalCount").textContent =
    equipment.length;

  document.querySelector("#availableCount").textContent =
    equipment.filter(
      (item) => item.status === "Disponible"
    ).length;

  document.querySelector("#loanedCount").textContent =
    equipment.filter(
      (item) => item.status === "Prestado"
    ).length;

  document.querySelector("#maintenanceCount").textContent =
    equipment.filter(
      (item) => item.status === "Mantenimiento"
    ).length;
}

function render() {
  const searchValue =
    document.querySelector("#searchInput").value;

  const query = normalize(searchValue);

  const filter =
    document.querySelector("#statusFilter").value;

  const filteredEquipment = equipment.filter((item) => {
    const matchesSearch = [
      item.code,
      item.type,
      item.model,
      item.responsible,
      item.area
    ].some((value) =>
      normalize(value || "").includes(query)
    );

    const matchesStatus =
      filter === "Todos" ||
      item.status === filter ||
      (filter === "Vencido" && isOverdue(item));

    return matchesSearch && matchesStatus;
  });

  const list = document.querySelector("#equipmentList");
  const emptyState = document.querySelector("#emptyState");

  emptyState.classList.toggle(
    "hidden",
    filteredEquipment.length > 0
  );

  list.innerHTML = filteredEquipment
    .map((item) => {
      const overdueBadge = isOverdue(item)
        ? '<span class="badge mantenimiento">Vencido</span>'
        : "";

      const observations = item.notes
        ? `
          <p>
            <strong>Observaciones:</strong>
            ${escapeHTML(item.notes)}
          </p>
        `
        : "";

      return `
        <article class="equipment-card">
          <div>
            <div class="meta">
              <span class="badge type">
                ${escapeHTML(item.type)}
              </span>

              <span class="badge ${normalize(item.status)}">
                ${escapeHTML(item.status)}
              </span>

              ${overdueBadge}
            </div>

            <h3>
              ${escapeHTML(item.code)} ·
              ${escapeHTML(item.model)}
            </h3>

            <p>
              <strong>Responsable:</strong>
              ${escapeHTML(
                item.responsible || "Sin asignar"
              )}
            </p>

            <p>
              <strong>Área solicitante:</strong>
              ${escapeHTML(item.area || "Sin área")}
            </p>

            <p>
              <strong>Préstamo:</strong>
              ${formatDate(item.loanDate)}
              ·
              <strong>Devolución:</strong>
              ${formatDate(item.returnDate)}
            </p>

            ${observations}
          </div>

          <div class="card-actions">
            <button
              type="button"
              onclick="editEquipment('${item.id}')"
            >
              Editar
            </button>

            <button
              type="button"
              class="delete"
              onclick="deleteEquipment('${item.id}')"
            >
              Eliminar
            </button>
          </div>
        </article>
      `;
    })
    .join("");

  updateStats();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const data = Object.fromEntries(
    Object.entries(fields).map(([key, input]) => [
      key,
      input.value.trim()
    ])
  );

  if (
    data.status === "Prestado" &&
    !data.responsible
  ) {
    notify("Ingresa el responsable del préstamo");
    fields.responsible.focus();
    return;
  }

  if (
    data.loanDate &&
    data.returnDate &&
    data.returnDate < data.loanDate
  ) {
    notify(
      "La devolución no puede ser anterior al préstamo"
    );
    return;
  }

  const duplicatedCode = equipment.some(
    (item) =>
      normalize(item.code) === normalize(data.code) &&
      item.id !== data.editingId
  );

  if (duplicatedCode) {
    notify("El código del equipo ya existe");
    fields.code.focus();
    return;
  }

  if (data.editingId) {
    equipment = equipment.map((item) =>
      item.id === data.editingId
        ? {
            ...item,
            ...data,
            updatedAt: new Date().toISOString()
          }
        : item
    );

    notify("Equipo actualizado correctamente");
  } else {
    const id =
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : Date.now().toString();

    equipment.unshift({
      ...data,
      id,
      createdAt: new Date().toISOString()
    });

    notify("Equipo registrado correctamente");
  }

  saveEquipment();
  resetForm();
  render();
});

window.editEquipment = function (id) {
  const item = equipment.find(
    (record) => record.id === id
  );

  if (!item) {
    return;
  }

  Object.entries(fields).forEach(([key, input]) => {
    input.value = item[key] || "";
  });

  document.querySelector("#formTitle").textContent =
    "Editar equipo";

  document.querySelector("#saveButton").textContent =
    "Guardar cambios";

  document
    .querySelector("#cancelButton")
    .classList.remove("hidden");

  window.scrollTo({
    top: 130,
    behavior: "smooth"
  });
};

window.deleteEquipment = function (id) {
  const item = equipment.find(
    (record) => record.id === id
  );

  if (!item) {
    return;
  }

  const confirmed = confirm(
    `¿Eliminar el equipo ${item.code}?`
  );

  if (confirmed) {
    equipment = equipment.filter(
      (record) => record.id !== id
    );

    saveEquipment();
    render();
    notify("Equipo eliminado");
  }
};

function resetForm() {
  form.reset();

  fields.editingId.value = "";
  fields.status.value = "Disponible";

  document.querySelector("#formTitle").textContent =
    "Registrar equipo";

  document.querySelector("#saveButton").textContent =
    "Guardar equipo";

  document
    .querySelector("#cancelButton")
    .classList.add("hidden");
}

document
  .querySelector("#cancelButton")
  .addEventListener("click", resetForm);

document
  .querySelector("#searchInput")
  .addEventListener("input", render);

document
  .querySelector("#statusFilter")
  .addEventListener("change", render);

document
  .querySelector("#clearButton")
  .addEventListener("click", () => {
    if (equipment.length === 0) {
      notify("No existen registros para eliminar");
      return;
    }

    const confirmed = confirm(
      "¿Eliminar todos los registros?"
    );

    if (confirmed) {
      equipment = [];
      saveEquipment();
      resetForm();
      render();
      notify("Todos los registros fueron eliminados");
    }
  });

render();