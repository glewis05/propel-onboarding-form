# Changelog

All notable changes to the Providence Health Clinic Onboarding Form.

## [1.0.2] - 2025-01-22

### Removed
- Satellite Locations step - Providence doesn't use the satellite clinic construct; all locations are clinics
- Removed satellite_locations from JSON schema and output
- Updated form from 10 steps to 9 steps

### Changed
- Renumbered all form steps (Contacts is now step 3, etc.)
- Updated sample JSON files to remove satellite location references

---

## [1.0.1] - 2025-01-21

### Added
- Gene list info buttons (?) for CancerNext-Expanded test panels
- GeneListPopup component showing gene lists in non-modal floating panel
- TestPanelSelector component with card-style radio buttons
- Gene data: Base panel (77 genes) and Limited Evidence Add-on (8 genes)

### Changed
- Test panel selector now uses card layout instead of dropdown
- Updated gene counts in reference data (85 total for LEG panels)

### UI/UX
- Popup positions to right on desktop, bottom sheet on mobile
- Multi-column gene grid for readability
- Click outside or Escape key to close popup
- Form selections remain visible while viewing gene list

---

## [1.0.0] - 2025-01-21

### Added
- Multi-step form wizard with 10 sections
- React 18 UI with Tailwind CSS styling
- Supabase integration for draft auto-save
- Resume functionality with email verification
- Word document export on submission
- Providence Health branding
- Mobile-responsive design
- Progress indicator with step navigation
- Form-driven architecture (JSON-defined questions)
- Conditional field visibility based on program selection
- Composite field types (address, contact_group, stakeholder_group)
- Repeatable sections for ordering providers
- Content Security Policy and Subresource Integrity

### Security
- Disabled auto-resume on page load (user must click Resume button)
- Disabled automatic email-based draft detection
- Email verification required to access saved drafts
- SRI hashes for all CDN dependencies

### Form Sections
1. Program Selection
2. Clinic Information
3. Contacts
4. Key Stakeholders
5. Lab Configuration
6. Additional Test Panels (repeatable)
7. Ordering Providers (repeatable)
8. Extract Filtering
9. Review & Download

---

*Designed and maintained by Glen Lewis*
