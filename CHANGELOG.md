# Changelog

All notable changes to the Providence Health Clinic Onboarding Form.

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
- Repeatable sections for satellite locations and ordering providers
- Content Security Policy and Subresource Integrity

### Security
- Disabled auto-resume on page load (user must click Resume button)
- Disabled automatic email-based draft detection
- Email verification required to access saved drafts
- SRI hashes for all CDN dependencies

### Form Sections
1. Program Selection
2. Clinic Information
3. Satellite Locations (repeatable)
4. Clinic Champion
5. Additional Contacts
6. Stakeholders
7. Program Customization
8. Lab Configuration
9. Ordering Providers (repeatable)
10. Review & Submit

---

*Designed and maintained by Glen Lewis*
