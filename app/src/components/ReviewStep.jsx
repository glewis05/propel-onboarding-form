import { useState, useContext } from 'react';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';

/**
 * ExpandableGeneList - Shows genes with expand/collapse toggle
 */
function ExpandableGeneList({ genes }) {
    const [expanded, setExpanded] = useState(false);
    const maxDisplay = 10;

    if (genes.length <= maxDisplay) {
        return (
            <span>
                <span className="font-medium">{genes.length} genes:</span>{' '}
                {genes.join(', ')}
            </span>
        );
    }

    return (
        <div>
            <span className="font-medium">{genes.length} genes:</span>{' '}
            {expanded ? (
                <span className="block mt-1 p-2 bg-gray-50 rounded text-xs leading-relaxed max-h-32 overflow-y-auto">
                    {genes.join(', ')}
                </span>
            ) : (
                <span>{genes.slice(0, maxDisplay).join(', ')}</span>
            )}
            <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="ml-2 text-propel-teal hover:underline text-xs"
            >
                {expanded ? 'Show less' : `...and ${genes.length - maxDisplay} more`}
            </button>
        </div>
    );
}
import FormContext from '../context/FormContext';
import { STORAGE_KEY, FORMSPREE_ENDPOINT } from '../constants';
import { generateOutputJson } from '../utils/output-formatter';
import { evaluateCondition } from '../utils/validation';
import { saveOnboardingSubmission } from '../services/supabase';
import { useAuth } from './auth/AuthProvider';
import { debugLog } from '../utils/debug';

/**
 * ReviewStep - Displays a summary of all entered data, submits to Supabase,
 * and allows JSON/Word download
 */
function ReviewStep({ formData, formDefinition, onEdit }) {
    const { referenceData } = useContext(FormContext);
    const { user } = useAuth();

    // Submission state
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [submitError, setSubmitError] = useState(null);

    // Honeypot spam protection
    const [honeypot, setHoneypot] = useState('');

    // Generate output data
    const getOutputData = () => {
        const output = generateOutputJson(formData, formDefinition, referenceData);
        return {
            submitted_at: new Date().toISOString(),
            clinic_name: formData.clinic_name || 'Unknown',
            clinic_epic_id: formData.clinic_epic_id || '',
            program: formData.program || '',
            ...output
        };
    };

    // Supabase submission handler
    const handleSubmit = async () => {
        setSubmitting(true);
        setSubmitError(null);

        const outputData = getOutputData();
        debugLog('[ReviewStep] Submitting to Supabase:', outputData.clinic_name);

        // Get submitter info - prioritize logged-in user's email for draft association
        const submitterEmail = user?.email
            || formData.submitter_email
            || formData.clinic_champion?.email
            || formData.contact_primary?.email
            || formData.genetic_counselor?.email
            || 'onboarding@propelhealth.com';
        const submitterName = formData.submitter_name
            || formData.clinic_champion?.name
            || formData.contact_primary?.name
            || outputData.clinic_name
            || 'Unknown Clinic';

        try {
            // Save to Supabase
            await saveOnboardingSubmission({
                submitter_email: submitterEmail,
                submitter_name: submitterName,
                program_id: formData.program || '',
                form_data: outputData,
                status: 'submitted',
                user_id: user?.id
            });

            setSubmitted(true);
            // Clear saved draft from localStorage after successful submit
            localStorage.removeItem(STORAGE_KEY);
            debugLog('[ReviewStep] Submission successful to Supabase');

            // Also send to Formspree as backup notification (non-blocking)
            fetch(FORMSPREE_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({
                    _subject: `New Onboarding Submission: ${outputData.clinic_name}`,
                    _gotcha: honeypot,
                    clinic_name: outputData.clinic_name,
                    program: outputData.program,
                    submitted_at: outputData.submitted_at,
                    note: 'Data saved to Supabase. This is a backup notification.'
                })
            }).catch(e => debugLog('[ReviewStep] Formspree backup notification failed (non-critical):', e));

        } catch (error) {
            console.error('[ReviewStep] Submit error:', error);
            setSubmitError('Failed to submit to database. Please try downloading the JSON and emailing it manually.');
        } finally {
            setSubmitting(false);
        }
    };

    // JSON download handler
    const handleDownload = () => {
        const output = getOutputData();
        const json = JSON.stringify(output, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
        const filename = `onboarding-${formData.program || 'unknown'}-${timestamp}.json`;

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        debugLog('[ReviewStep] Downloaded:', filename);
    };

    // Word document download handler
    const handleWordDownload = async () => {
        const output = getOutputData();

        // Helper to format a value for display
        const formatValue = (val) => {
            if (val === null || val === undefined || val === '') return 'Not provided';
            if (typeof val === 'boolean') return val ? 'Yes' : 'No';
            if (Array.isArray(val)) {
                if (val.length === 0) return 'None';
                if (typeof val[0] === 'object') {
                    return val.map((item, i) => {
                        // Provider filter list format
                        if (item.first_name && item.last_name) {
                            return `${i + 1}. ${item.first_name} ${item.last_name}`;
                        }
                        // Contact/stakeholder in array
                        if (item.name) {
                            const parts = [item.name];
                            if (item.title) parts[0] = `${item.name}, ${item.title}`;
                            if (item.email) parts.push(item.email);
                            if (item.is_ordering_provider) parts.push('(Ordering Provider)');
                            return `${i + 1}. ${parts.join(' | ')}`;
                        }
                        return `${i + 1}. ${JSON.stringify(item)}`;
                    }).join('\n');
                }
                return val.join(', ');
            }
            if (typeof val === 'object') {
                // Address type
                if (val.street) {
                    return `${val.street}, ${val.city}, ${val.state} ${val.zip}`;
                }
                // Contact/Stakeholder types - handle with or without email
                if (val.name) {
                    const parts = [val.name];
                    if (val.title) parts[0] = `${val.name}, ${val.title}`;
                    if (val.email) parts.push(val.email);
                    if (val.phone) parts.push(val.phone);
                    if (val.is_ordering_provider) parts.push('(Ordering Provider)');
                    return parts.join(' | ');
                }
                // Select with alternates
                if ('default' in val) {
                    let result = val.default || 'Not selected';
                    if (val.alternates && val.alternates.length > 0) {
                        result += ` (Also: ${val.alternates.join(', ')})`;
                    }
                    return result;
                }
                return JSON.stringify(val, null, 2);
            }
            return String(val);
        };

        // Create document sections
        const docChildren = [];

        // Title
        docChildren.push(
            new Paragraph({
                text: 'Propel Clinic Onboarding Questionnaire',
                heading: HeadingLevel.TITLE,
                spacing: { after: 200 }
            })
        );

        // Horizontal line after title
        docChildren.push(
            new Paragraph({
                border: {
                    bottom: { style: BorderStyle.SINGLE, size: 6, color: '003366' }
                },
                spacing: { after: 300 }
            })
        );

        // Summary info box
        docChildren.push(
            new Table({
                rows: [
                    new TableRow({
                        children: [
                            new TableCell({
                                children: [
                                    new Paragraph({
                                        children: [
                                            new TextRun({ text: 'Clinic: ', bold: true }),
                                            new TextRun(output.clinic_name || 'Unknown')
                                        ]
                                    })
                                ],
                                shading: { fill: 'F5F5F5' },
                                margins: { top: 100, bottom: 100, left: 150, right: 150 }
                            }),
                            new TableCell({
                                children: [
                                    new Paragraph({
                                        children: [
                                            new TextRun({ text: 'Program: ', bold: true }),
                                            new TextRun(output.program || 'Unknown')
                                        ]
                                    })
                                ],
                                shading: { fill: 'F5F5F5' },
                                margins: { top: 100, bottom: 100, left: 150, right: 150 }
                            }),
                            new TableCell({
                                children: [
                                    new Paragraph({
                                        children: [
                                            new TextRun({ text: 'Submitted: ', bold: true }),
                                            new TextRun(new Date(output.submitted_at).toLocaleString())
                                        ]
                                    })
                                ],
                                shading: { fill: 'F5F5F5' },
                                margins: { top: 100, bottom: 100, left: 150, right: 150 }
                            })
                        ]
                    })
                ],
                width: { size: 100, type: WidthType.PERCENTAGE }
            })
        );

        // Space after summary
        docChildren.push(new Paragraph({ spacing: { after: 300 } }));

        // Process each step from form definition
        formDefinition.steps.forEach(step => {
            if (step.is_review_step) return;

            // Section heading
            docChildren.push(
                new Paragraph({
                    text: step.title,
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 400, after: 200 }
                })
            );

            if (step.repeatable) {
                const items = formData[step.step_id] || [];
                if (items.length === 0) {
                    docChildren.push(
                        new Paragraph({
                            text: 'None added',
                            spacing: { after: 200 }
                        })
                    );
                } else {
                    items.forEach((item, idx) => {
                        const itemTitle = step.repeatable_config.item_title_template
                            .replace('{{index}}', idx + 1);
                        docChildren.push(
                            new Paragraph({
                                text: itemTitle,
                                heading: HeadingLevel.HEADING_2,
                                spacing: { before: 200, after: 100 }
                            })
                        );

                        const rows = step.questions.map(q => {
                            return new TableRow({
                                children: [
                                    new TableCell({
                                        children: [new Paragraph({ children: [new TextRun({ text: q.label, bold: true, size: 20 })] })],
                                        width: { size: 35, type: WidthType.PERCENTAGE },
                                        shading: { fill: 'F9F9F9' },
                                        margins: { top: 50, bottom: 50, left: 100, right: 100 }
                                    }),
                                    new TableCell({
                                        children: [new Paragraph({ children: [new TextRun({ text: formatValue(item[q.question_id]), size: 20 })] })],
                                        width: { size: 65, type: WidthType.PERCENTAGE },
                                        margins: { top: 50, bottom: 50, left: 100, right: 100 }
                                    })
                                ]
                            });
                        });

                        docChildren.push(
                            new Table({
                                rows: rows,
                                width: { size: 100, type: WidthType.PERCENTAGE },
                                borders: {
                                    top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
                                    bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
                                    left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
                                    right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
                                    insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
                                    insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' }
                                }
                            })
                        );
                    });
                }
            } else {
                const rows = [];
                step.questions.forEach(q => {
                    if (q.show_when && !evaluateCondition(q.show_when, formData)) {
                        return;
                    }

                    rows.push(new TableRow({
                        children: [
                            new TableCell({
                                children: [new Paragraph({ children: [new TextRun({ text: q.label, bold: true, size: 20 })] })],
                                width: { size: 35, type: WidthType.PERCENTAGE },
                                shading: { fill: 'F9F9F9' },
                                margins: { top: 50, bottom: 50, left: 100, right: 100 }
                            }),
                            new TableCell({
                                children: [new Paragraph({ children: [new TextRun({ text: formatValue(formData[q.question_id]), size: 20 })] })],
                                width: { size: 65, type: WidthType.PERCENTAGE },
                                margins: { top: 50, bottom: 50, left: 100, right: 100 }
                            })
                        ]
                    }));
                });

                if (rows.length > 0) {
                    docChildren.push(
                        new Table({
                            rows: rows,
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            borders: {
                                top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
                                bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
                                left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
                                right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
                                insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
                                insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' }
                            }
                        })
                    );
                }
            }
        });

        // Create document
        const doc = new Document({
            sections: [{
                children: docChildren
            }]
        });

        // Generate and download
        const blob = await Packer.toBlob(doc);
        const url = URL.createObjectURL(blob);

        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
        const filename = `onboarding-${formData.program || 'unknown'}-${timestamp}.docx`;

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        debugLog('[ReviewStep] Downloaded Word doc:', filename);
    };

    const getDisplayValue = (value, optionsRef, questionType) => {
        // Handle null/undefined but NOT false (booleans)
        if (value === null || value === undefined || value === '') {
            return <span className="text-gray-400">Not provided</span>;
        }

        // Boolean values (checkboxes)
        if (typeof value === 'boolean') {
            return value ? 'Yes' : 'No';
        }

        // Provider filter list (array of {first_name, last_name})
        if (questionType === 'provider_filter_list' && Array.isArray(value)) {
            if (value.length === 0) {
                return <span className="text-gray-400">None added</span>;
            }
            return value.map((p, i) => (
                <span key={i}>
                    {i > 0 && ', '}
                    {p.first_name} {p.last_name}
                </span>
            ));
        }

        // Gene selector type - use expandable component
        if (questionType === 'gene_selector' && Array.isArray(value)) {
            if (value.length === 0) {
                return <span className="text-gray-400">No genes selected</span>;
            }
            return <ExpandableGeneList genes={value} />;
        }

        // Select with alternates type
        if (questionType === 'select_with_alternates' && typeof value === 'object' && 'default' in value) {
            const options = optionsRef && referenceData[optionsRef] ? referenceData[optionsRef] : [];
            const getOptionName = (val) => {
                const opt = options.find(o => o.value === val);
                return opt ? opt.display_name : val;
            };

            const defaultName = getOptionName(value.default);
            if (!value.offer_alternates || !value.alternates || value.alternates.length === 0) {
                return defaultName || <span className="text-gray-400">Not selected</span>;
            }

            const alternateNames = value.alternates.map(getOptionName).join(', ');
            return (
                <span>
                    <span className="font-medium">Default:</span> {defaultName}
                    <br />
                    <span className="font-medium">Additional:</span> {alternateNames}
                </span>
            );
        }

        // Standard select/radio with options_ref
        if (optionsRef && referenceData[optionsRef]) {
            const option = referenceData[optionsRef].find(o => o.value === value);
            return option ? option.display_name : value;
        }

        // Composite object types
        if (typeof value === 'object' && !Array.isArray(value)) {
            // Address type
            if (value.street) {
                return `${value.street}, ${value.city}, ${value.state} ${value.zip}`;
            }
            // Contact/Stakeholder types - handle with or without email
            if (value.name) {
                const parts = [value.name];
                if (value.title) parts[0] = `${value.name}, ${value.title}`;
                if (value.email) parts.push(value.email);
                if (value.phone) parts.push(value.phone);
                if (value.is_ordering_provider) parts.push('(Ordering Provider)');
                return parts.join(' | ');
            }
            // Fallback for unknown object types
            return JSON.stringify(value);
        }

        return value;
    };

    const renderSection = (step, index) => {
        if (step.is_review_step) return null;

        return (
            <div key={step.step_id} className="mb-4 sm:mb-6 pb-4 sm:pb-6 border-b border-gray-200 last:border-0">
                <div className="flex justify-between items-center mb-2 sm:mb-3">
                    <h3 className="text-base sm:text-lg font-semibold text-propel-navy">{step.title}</h3>
                    <button
                        type="button"
                        onClick={() => onEdit(index)}
                        className="px-2 sm:px-3 py-1 text-xs sm:text-sm text-propel-teal hover:text-propel-navy font-medium border border-propel-teal rounded hover:bg-propel-light transition-colors"
                    >
                        Edit
                    </button>
                </div>

                {step.repeatable ? (
                    <div className="space-y-2 sm:space-y-3">
                        {(formData[step.step_id] || []).map((item, itemIndex) => (
                            <div key={itemIndex} className="p-2 sm:p-3 bg-gray-50 rounded">
                                <p className="font-medium text-gray-700 mb-2 text-sm sm:text-base">
                                    {step.repeatable_config.item_title_template.replace('{{index}}', itemIndex + 1)}
                                </p>
                                {step.questions.map(q => (
                                    <div key={q.question_id} className="flex flex-col sm:flex-row sm:gap-x-6 py-1">
                                        <span className="sm:w-1/3 sm:flex-shrink-0 text-xs sm:text-sm text-gray-500">{q.label}:</span>
                                        <span className="sm:w-2/3 text-xs sm:text-sm text-gray-900 mt-0.5 sm:mt-0">
                                            {getDisplayValue(item[q.question_id], q.options_ref, q.type)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ))}
                        {(formData[step.step_id] || []).length === 0 && (
                            <p className="text-gray-400 text-xs sm:text-sm">None added</p>
                        )}
                    </div>
                ) : (
                    <div>
                        {step.questions.map(q => {
                            if (q.show_when && !evaluateCondition(q.show_when, formData)) {
                                return null;
                            }
                            return (
                                <div key={q.question_id} className="flex flex-col sm:flex-row sm:gap-x-6 py-1">
                                    <span className="sm:w-1/3 sm:flex-shrink-0 text-xs sm:text-sm text-gray-500">{q.label}:</span>
                                    <span className="sm:w-2/3 text-xs sm:text-sm text-gray-900 mt-0.5 sm:mt-0">
                                        {getDisplayValue(formData[q.question_id], q.options_ref, q.type)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="step-content">
            {/* Header message */}
            {!submitted && (
                <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-700 font-medium text-sm sm:text-base">
                        Ready to submit! Review your responses below, then submit to Propel Health.
                    </p>
                </div>
            )}

            {/* Form data review sections */}
            {formDefinition.steps.map((step, index) => renderSection(step, index))}

            {/* Submission UI */}
            {!submitted ? (
                <div className="mt-6 sm:mt-8 space-y-4">
                    {/* Honeypot spam protection */}
                    <input
                        type="text"
                        name="_gotcha"
                        style={{ display: 'none' }}
                        tabIndex="-1"
                        autoComplete="off"
                        value={honeypot}
                        onChange={(e) => setHoneypot(e.target.value)}
                    />

                    {/* Primary action: Submit */}
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="w-full py-3 px-4 bg-propel-teal text-white rounded-lg font-medium
                                   hover:bg-opacity-90 disabled:bg-gray-400 disabled:cursor-not-allowed
                                   transition-colors"
                    >
                        {submitting ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10"
                                            stroke="currentColor" strokeWidth="4" fill="none"/>
                                    <path className="opacity-75" fill="currentColor"
                                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                                </svg>
                                Submitting...
                            </span>
                        ) : (
                            'Submit to Propel Health'
                        )}
                    </button>

                    {/* Secondary actions: Download options */}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={handleWordDownload}
                            className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg
                                       hover:bg-gray-50 transition-colors"
                        >
                            <span className="flex items-center justify-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Download Word
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={handleDownload}
                            className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg
                                       hover:bg-gray-50 transition-colors"
                        >
                            <span className="flex items-center justify-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Download JSON
                            </span>
                        </button>
                    </div>

                    {/* Error message */}
                    {submitError && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            {submitError}
                        </div>
                    )}
                </div>
            ) : (
                /* Success state */
                <div className="mt-6 sm:mt-8 p-6 bg-green-50 border border-green-200 rounded-lg text-center">
                    <div className="text-green-600 text-4xl mb-3">✓</div>
                    <h3 className="text-xl font-semibold text-green-800 mb-2">
                        Submission Received!
                    </h3>
                    <p className="text-green-700">
                        Thank you! The Propel Health team will review your information
                        and contact you within 2 business days.
                    </p>
                    <p className="text-sm text-green-600 mt-4">
                        A copy of your submission has been sent to our team.
                    </p>

                    <div className="mt-4 flex justify-center gap-4">
                        <button
                            type="button"
                            onClick={handleWordDownload}
                            className="text-sm text-propel-teal hover:underline"
                        >
                            Download Word
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                            type="button"
                            onClick={handleDownload}
                            className="text-sm text-propel-teal hover:underline"
                        >
                            Download JSON
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ReviewStep;
