# Architecture Documentation

## EMR Adapter Modularity

### Requirement
To facilitate independent development and maintenance of support for different Electronic Medical Record (EMR) systems, each EMR adapter MUST be implemented in its own separate file.

### Structure
All EMR adapters are located in `utils/adapters/`.

- **Base Class**: `utils/adapters/base.js` - Defines the `EmrAdapter` interface.
- **Manager**: `utils/adapters/manager.js` - Handles detection and loading of the correct adapter.
- **Specific Adapters**:
  - `utils/adapters/m3_digikar.js`
  - `utils/adapters/clinics.js`
  - `utils/adapters/mobacal.js`
  - `utils/adapters/generic.js` (Fallback)

### Development Guidelines
1. **Isolation**: When modifying logic for a specific EMR (e.g., m3 Digikar), ONLY edit the corresponding file (e.g., `m3_digikar.js`). Do not modify other adapters or the base class unless absolutely necessary for global changes.
2. **Adding New Support**: To support a new EMR:
   - Create a new file in `utils/adapters/` (e.g., `new_emr.js`).
   - Extend `EmrAdapter`.
   - Implement `matches(url)`, `pasteText(text)`, and `pasteImage(imageData)`.
   - Add the script tag to `sidepanel/sidepanel.html`.
   - Register the new adapter in `utils/adapters/manager.js`.
