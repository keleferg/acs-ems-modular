function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function gradeStatus(grade) {
  if (grade === "U") return "fail";
  if (grade === "S" || grade === "W") return "pass";
  return "incomplete";
}

function statusLabel(grade) {
  if (grade === "S") return "Satisfactory";
  if (grade === "U") return "Unsatisfactory";
  if (grade === "W") return "Waived";
  return "Incomplete";
}

function buildSections(tasks = []) {
  const sections = [];
  const map = new Map();

  for (const task of tasks) {
    const name = String(task.section_name || "PPC TASKS").trim() || "PPC TASKS";

    if (!map.has(name)) {
      const section = {
        id: `ppc-section-${sections.length + 1}`,
        roman: String(sections.length + 1),
        title: name,
        phase: "ground-flight",
        tasks: [],
      };

      map.set(name, section);
      sections.push(section);
    }

    map.get(name).tasks.push(task);
  }

  return sections;
}

export function getPpcSections(packet) {
  return buildSections(packet?.tasks || []);
}

export function summarizePpc(packet, grades = {}) {
  const tasks = packet?.tasks || [];

  let graded = 0;
  let satisfactory = 0;
  let unsatisfactory = 0;
  let waived = 0;

  const statuses = tasks.map((task) => {
    const grade = grades?.[task.id]?.grade_value || task.grade_value || "";

    if (grade) graded += 1;
    if (grade === "S") satisfactory += 1;
    if (grade === "U") unsatisfactory += 1;
    if (grade === "W") waived += 1;

    return {
      task,
      grade,
      status: gradeStatus(grade),
    };
  });

  const total = tasks.length;

  const overall =
    unsatisfactory > 0
      ? "UNSATISFACTORY"
      : graded === total && total > 0
        ? "SATISFACTORY"
        : "INCOMPLETE";

  return {
    statuses,
    total,
    graded,
    satisfactory,
    unsatisfactory,
    waived,
    overall,
    progressPct: total > 0 ? Math.round((graded / total) * 100) : 0,
  };
}

export function renderPpcDetailed(container, section, store, handlers) {
  if (!container) return;

  if (!section) {
    container.innerHTML = `
      <div style="padding:22px;">
        Loading FAA Form 8410-1 tasks...
      </div>
    `;
    return;
  }

  const grades = store.ppcGrades || {};
  const expanded = store.ppcExpandedTasks || {};

  container.innerHTML = `
    <style>
      .ppc-grade-bar {
        display:flex;
        align-items:center;
        gap:14px;
        padding:10px 14px;
        border-top:1px solid rgba(0,0,0,.08);
        background:#f8fafc;
      }

      .ppc-grade-group {
        display:flex;
        align-items:center;
        gap:8px;
      }

      .ppc-grade-button {
        min-width:48px;
        padding:7px 12px;
        border:1px solid #c9d2dc;
        border-radius:7px;
        background:white;
        font-weight:800;
        cursor:pointer;
      }

      .ppc-grade-button.selected-s {
        background:#e8f7ed;
        border-color:#17813c;
        color:#12652e;
      }

      .ppc-grade-button.selected-u {
        background:#fff0f1;
        border-color:#c51f2d;
        color:#a51120;
      }

      .ppc-grade-button.selected-w {
        background:#eef3ff;
        border-color:#4666b0;
        color:#324c8c;
      }

      .ppc-grade-button:disabled {
        opacity:.28;
        cursor:not-allowed;
      }

      .ppc-waiver-note {
        margin-left:auto;
        font-size:.78rem;
        color:#64748b;
      }

      .ppc-task-number {
        display:inline-flex;
        align-items:center;
        justify-content:center;
        min-width:34px;
        height:26px;
        border-radius:6px;
        background:#edf2f7;
        font-weight:800;
      }

      .ppc-task-status.pass {
        color:#12652e;
      }

      .ppc-task-status.fail {
        color:#a51120;
      }

      .ppc-task-status.incomplete {
        color:#916700;
      }

      .ppc-task-description {
        padding:12px 14px;
        background:#fafcff;
        border-top:1px solid #e5e7eb;
      }

      .ppc-task-description strong {
        display:block;
        margin-bottom:5px;
      }
    </style>

    <div class="area-header">
      <h2>${escapeHtml(section.title)}</h2>

      <div class="area-meta">
        <span>FAA Form 8410-1</span>
        <span>${section.tasks.length} tasks shown</span>
      </div>
    </div>

    ${section.tasks
      .map((task) => {
        const current =
          grades?.[task.id]?.grade_value || task.grade_value || "";

        const note = grades?.[task.id]?.remarks ?? task.remarks ?? "";

        const isExpanded = expanded[task.id] === true;

        const status = gradeStatus(current);

        return `
          <div
            class="task-card"
            data-ppc-task-card="${escapeHtml(task.id)}"
          >
            <div
              class="task-header"
              data-ppc-toggle="${escapeHtml(task.id)}"
            >
              <span class="ppc-task-number">
                ${escapeHtml(task.task_number)}
              </span>

              <span class="task-title">
                ${escapeHtml(task.task_name)}
              </span>

              <span class="element-count">
                ${task.waiver_allowed ? "Waiver Authorized" : "Required Task"}
              </span>

              <span
                class="task-status-badge ${status} ppc-task-status"
              >
                ${statusLabel(current)}
              </span>

              <i
                class="fas fa-chevron-down chevron ${
                  isExpanded ? "expanded" : ""
                }"
              ></i>
            </div>

            <div class="ppc-grade-bar">
              <strong>Grade</strong>

              <div class="ppc-grade-group">
                <button
                  type="button"
                  class="ppc-grade-button ${
                    current === "S" ? "selected-s" : ""
                  }"
                  data-ppc-grade="S"
                  data-ppc-task="${escapeHtml(task.id)}"
                >
                  S
                </button>

                <button
                  type="button"
                  class="ppc-grade-button ${
                    current === "U" ? "selected-u" : ""
                  }"
                  data-ppc-grade="U"
                  data-ppc-task="${escapeHtml(task.id)}"
                >
                  U
                </button>

                <button
                  type="button"
                  class="ppc-grade-button ${
                    current === "W" ? "selected-w" : ""
                  }"
                  data-ppc-grade="W"
                  data-ppc-task="${escapeHtml(task.id)}"
                  ${task.waiver_allowed ? "" : "disabled"}
                  title="${
                    task.waiver_allowed
                      ? "Waiver permitted for this FAA 8410-1 task"
                      : "FAA 8410-1 does not authorize waiver of this task"
                  }"
                >
                  W
                </button>
              </div>

              <span class="ppc-waiver-note">
                ${task.waiver_allowed ? "W permitted" : ""}
              </span>
            </div>

            <div
              class="task-body ${isExpanded ? "expanded" : ""}"
            >
              <div class="ppc-task-description">
                <strong>
                  FAA 8410-1 Task
                  ${escapeHtml(task.task_number)}
                </strong>

                ${escapeHtml(task.task_name)}
              </div>

              <div class="notes-section">
                <label>Examiner Notes</label>

                <textarea
                  data-ppc-remarks="${escapeHtml(task.id)}"
                  placeholder="Enter examiner notes for this task..."
                >${escapeHtml(note)}</textarea>
              </div>
            </div>
          </div>
        `;
      })
      .join("")}
  `;

  container.querySelectorAll("[data-ppc-toggle]").forEach((element) => {
    element.addEventListener("click", (event) => {
      if (event.target.closest("button,input,textarea,select")) {
        return;
      }

      handlers.onToggleTask?.(element.dataset.ppcToggle);
    });
  });

  container.querySelectorAll("[data-ppc-grade]").forEach((button) => {
    button.addEventListener("click", () => {
      handlers.onGradeChange?.(button.dataset.ppcTask, button.dataset.ppcGrade);
    });
  });

  container.querySelectorAll("[data-ppc-remarks]").forEach((textarea) => {
    textarea.addEventListener("input", () => {
      handlers.onRemarksChange?.(textarea.dataset.ppcRemarks, textarea.value);
    });
  });
}

export function renderPpcSummary(container, packet, grades) {
  if (!container) return;

  const sections = getPpcSections(packet);

  const summary = summarizePpc(packet, grades);

  container.innerHTML = `
    <div class="summary-grid">
      ${sections
        .map((section) => {
          const sectionRows = section.tasks.map((task) => {
            const grade =
              grades?.[task.id]?.grade_value || task.grade_value || "";

            return {
              task,
              grade,
              status: gradeStatus(grade),
            };
          });

          const complete = sectionRows.filter((row) => row.grade).length;

          const pct = sectionRows.length
            ? Math.round((complete / sectionRows.length) * 100)
            : 0;

          return `
            <div class="summary-area-card">
              <h4>
                ${escapeHtml(section.title)}
              </h4>

              <div class="summary-progress">
                <div
                  class="summary-progress-fill"
                  style="width:${pct}%"
                ></div>
              </div>

              <div class="summary-dots">
                ${sectionRows
                  .map(
                    ({ task, grade, status }) => `
                      <span
                        class="summary-dot ${
                          status === "pass"
                            ? "dot-pass"
                            : status === "fail"
                              ? "dot-fail"
                              : "dot-incomplete"
                        }"
                        title="Task ${escapeHtml(
                          task.task_number,
                        )}: ${escapeHtml(task.task_name)} — ${escapeHtml(
                          statusLabel(grade),
                        )}"
                      ></span>
                    `,
                  )
                  .join("")}
              </div>
            </div>
          `;
        })
        .join("")}
    </div>

    <div
      style="
        margin-top:18px;
        padding:14px;
        border:1px solid #d0d7de;
        border-radius:10px;
        background:#f8fafc;
      "
    >
      <strong>FAA 8410-1 PPC Summary</strong>

      <div style="margin-top:8px;">
        ${summary.graded} of
        ${summary.total} applicable tasks graded
      </div>

      <div>
        Satisfactory:
        ${summary.satisfactory}
        &nbsp; · &nbsp;
        Unsatisfactory:
        ${summary.unsatisfactory}
        &nbsp; · &nbsp;
        Waived:
        ${summary.waived}
      </div>
    </div>
  `;
}

export function renderPpcSidebar(
  sections,
  summary,
  activeSectionId,
  onSelect,
  grades,
) {
  const nav = document.getElementById("sidebarNav");

  if (!nav) return;

  nav.innerHTML = sections
    .map((section, index) => {
      const complete = section.tasks.every((task) => {
        return Boolean(grades?.[task.id]?.grade_value || task.grade_value);
      });

      return `
        <div
          class="nav-item ${activeSectionId === section.id ? "active" : ""}"
          data-ppc-section="${escapeHtml(section.id)}"
        >
          <span class="nav-roman">
            ${index + 1}
          </span>

          <span class="nav-title">
            ${escapeHtml(section.title)}
          </span>

          <span class="nav-phase ground-flight">
            PPC
          </span>

          <span
            class="nav-badge ${complete ? "area-complete" : ""}"
          >
            <i
              class="fas fa-check-circle area-check"
            ></i>
          </span>
        </div>
      `;
    })
    .join("");

  nav.querySelectorAll("[data-ppc-section]").forEach((item) => {
    item.addEventListener("click", () => {
      onSelect?.(item.dataset.ppcSection);
    });
  });
}

export function renderPpcStats(summary) {
  const setText = (id, value) => {
    const el = document.getElementById(id);

    if (el) {
      el.textContent = value;
    }
  };

  const statTotal = document.getElementById("statTotal");

  const statEvaluated = document.getElementById("statEvaluated");

  const statPassed = document.getElementById("statPassed");

  const statOverall = document.getElementById("statOverall");

  if (statTotal) {
    statTotal.textContent = String(summary.total);
  }

  if (statEvaluated) {
    statEvaluated.textContent = String(summary.graded);
  }

  if (statPassed) {
    statPassed.textContent = `${summary.satisfactory + summary.waived}/${summary.total}`;
  }

  if (statOverall) {
    const cls =
      summary.overall === "SATISFACTORY"
        ? "badge-pass"
        : summary.overall === "UNSATISFACTORY"
          ? "badge-fail"
          : "badge-incomplete";

    statOverall.innerHTML = `
      <span class="summary-badge ${cls}">
        ${summary.overall}
      </span>
    `;
  }

  setText("progressPct", `${summary.progressPct}%`);

  const progressFill = document.getElementById("progressFill");

  if (progressFill) {
    progressFill.style.width = `${summary.progressPct}%`;
  }

  const summaryBar = document.getElementById("gradeSummaryBar");

  if (summaryBar) {
    const cls =
      summary.overall === "SATISFACTORY"
        ? "badge-pass"
        : summary.overall === "UNSATISFACTORY"
          ? "badge-fail"
          : "badge-incomplete";

    summaryBar.innerHTML = `
      <div class="summary-item">
        <span>Overall:</span>
        <span
          class="summary-badge ${cls}"
          id="summOverall"
        >
          ${summary.overall}
        </span>
      </div>

      <div class="summary-item">
        <span>Graded:</span>
        <span>${summary.graded}</span>
      </div>

      <div class="summary-item">
        <span>S:</span>
        <span>${summary.satisfactory}</span>
      </div>

      <div class="summary-item">
        <span>U:</span>
        <span>${summary.unsatisfactory}</span>
      </div>

      <div class="summary-item">
        <span>W:</span>
        <span>${summary.waived}</span>
      </div>

      <div class="summary-item">
        <span>Total:</span>
        <span>${summary.total}</span>
      </div>
    `;
  }
}
