function formatPhaseLabel(phase) {
  if (phase === 'ground-flight') return 'Ground / Flight';
  if (phase === 'ground') return 'Ground';
  if (phase === 'flight') return 'Flight';

  return phase || 'Ground';
}

function formatPhaseClass(phase) {
  if (phase === 'ground-flight') return 'ground-flight';
  if (phase === 'ground') return 'ground';
  if (phase === 'flight') return 'flight';

  return 'ground';
}

export function renderSidebar(areas, summaryByArea, activeAreaId, onSelectArea) {
  const nav = document.getElementById('sidebarNav');
  if (!nav) return;

  nav.innerHTML = areas.map(area => {
    const summary = summaryByArea[area.id] ?? { complete: false };
    const phase = area.phase || 'ground';

    return `
      <div class="nav-item ${activeAreaId === area.id ? 'active' : ''}" data-area-id="${area.id}">
        <span class="nav-roman">${area.roman ?? area.id}</span>
        <span class="nav-title">${area.title}</span>
        <span class="nav-phase ${formatPhaseClass(phase)}">${formatPhaseLabel(phase)}</span>
        <span class="nav-badge ${summary.complete ? 'area-complete' : ''}">
          <i class="fas fa-check-circle area-check"></i>
        </span>
      </div>
    `;
  }).join('');

  nav.querySelectorAll('[data-area-id]').forEach(item => {
    item.addEventListener('click', () => onSelectArea(item.dataset.areaId));
  });
}