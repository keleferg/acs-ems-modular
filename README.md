# ACS-EMS-Modular

Modular refactor of the ACS Evaluation Management System.

## Run locally

Open the folder in VS Code and launch `index.html` with the Live Server extension. Because this app uses ES modules, do not open `index.html` directly from Finder using a `file://` URL.

## Structure

```text
ACS-EMS-Modular
├── index.html
├── css
│   └── styles.css
└── js
    ├── main.js
    ├── state
    │   └── store.js
    ├── config
    │   └── config.js
    ├── data
    │   ├── index.js
    │   ├── private.js
    │   ├── commercial.js
    │   ├── atp.js
    │   ├── cfi.js
    │   └── checklists.js
    ├── logic
    │   ├── filtering.js
    │   ├── grading.js
    │   └── outcome.js
    ├── services
    │   └── exportService.js
    └── views
        ├── headerView.js
        ├── sidebarView.js
        ├── detailedView.js
        ├── summaryView.js
        ├── outcomeView.js
        └── checklistView.js
```

## Additional-rating logic

Additional-rating filtering is implemented in `js/logic/filtering.js` and uses `ADDITIONAL_MAPS` in `js/config/config.js`.

Rules implemented:

1. Initial practical tests require all visible rating-applicable tasks.
2. Additional practical tests require only tasks listed in the selected additional-rating map.
3. Non-required tasks remain visible, are marked as `Not Performed`, and do not make an area incomplete if left as `NP`.
4. If a non-required task is graded with a failing grade (`1`), the whole outcome becomes unsatisfactory.
5. Required tasks remain incomplete until K, R, and S are all graded numerically.

## SharePoint

The SharePoint button is intentionally isolated as a stub in `main.js`. Connect it to a future `services/sharePointService.js` module using your Power Automate HTTP endpoint.
