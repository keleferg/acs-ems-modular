const SHAREPOINT_STATS_ENDPOINT = 'PASTE_YOUR_POWER_AUTOMATE_HTTP_URL_HERE';

async function fetchStatisticsData() {
  const response = await fetch(SHAREPOINT_STATS_ENDPOINT, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`SharePoint data request failed: ${response.status}`);
  }

  return await response.json();
}

function buildPieChart(canvasId, labels, values) {
  const ctx = document.getElementById(canvasId);

  return new Chart(ctx, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data: values
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

function countBy(items, key) {
  return items.reduce((acc, item) => {
    const value = item[key] || 'Unknown';
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function renderChartFromCounts(canvasId, counts) {
  buildPieChart(
    canvasId,
    Object.keys(counts),
    Object.values(counts)
  );
}

async function initStatisticsPage() {
  try {
    const data = await fetchStatisticsData();

    renderChartFromCounts(
      'outcomeChart',
      countBy(data.evaluations, 'outcome')
    );

    renderChartFromCounts(
      'certificateChart',
      countBy(data.evaluations, 'certificate')
    );

    renderChartFromCounts(
      'krsChart',
      data.krsGradeCounts
    );

    renderChartFromCounts(
      'unsatChart',
      data.unsatisfactoryAreaCounts
    );

  } catch (error) {
    console.error(error);
    alert('Unable to load statistics from SharePoint.');
  }
}

initStatisticsPage();