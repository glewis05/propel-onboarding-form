import { useContext } from 'react';
import FormContext from '../context/FormContext';
import { evaluateCondition, filterConditionalOptions } from '../utils/validation';
import { debugLog } from '../utils/debug';
import {
    TextField,
    TextArea,
    SelectField,
    RadioGroup,
    CheckboxField,
    SelectWithAlternates,
    GeneSelector,
    TestPanelSelector,
    AddressGroup,
    ContactGroup,
    StakeholderGroup,
    ProviderFilterList,
    NCCNRuleSearch,
    RuleModificationEditor
} from './question-types';

/**
 * QuestionRenderer - The heart of the form-driven architecture.
 * It receives a question definition and renders the appropriate component.
 */
function QuestionRenderer({ question, value, onChange, errors, formData }) {
    const { referenceData, testCatalog } = useContext(FormContext);

    // Check show_when condition - don't render if condition not met
    if (question.show_when && !evaluateCondition(question.show_when, formData)) {
        debugLog(`[QuestionRenderer] Hiding ${question.question_id} due to show_when condition`);
        return null;
    }

    // Get options for select/radio questions
    let options = [];
    if (question.options_ref) {
        // Special case for test_catalog - build options from test catalog
        if (question.options_ref === 'test_catalog') {
            const labPartner = formData.lab_partner;
            if (labPartner && testCatalog[labPartner]) {
                options = testCatalog[labPartner].tests.map(test => ({
                    value: test.test_code,
                    display_name: `${test.test_name} (${test.test_code})`
                }));
            }
        } else {
            options = referenceData[question.options_ref] || [];
        }

        // Apply conditional options filtering
        if (question.conditional_options) {
            options = filterConditionalOptions(options, question.conditional_options, formData);
        }

        // Filter test panels by selected lab partner
        if ((question.question_id === 'test_panel' || question.question_id === 'test_code') && formData.lab_partner) {
            const beforeCount = options.length;
            options = options.filter(opt => !opt.lab || opt.lab === formData.lab_partner);
            debugLog(`[QuestionRenderer] Filtering tests by lab ${formData.lab_partner}: ${beforeCount} → ${options.length}`);
        }

        // For additional test panels (test_code), exclude the default panel already selected
        if (question.question_id === 'test_code' && formData.test_panel) {
            options = options.filter(opt => opt.value !== formData.test_panel);
            debugLog(`[QuestionRenderer] Filtering out default panel: ${formData.test_panel}`);
        }
    }

    // Render based on question type
    switch (question.type) {
        case 'text':
            return (
                <TextField
                    question={question}
                    value={value}
                    onChange={onChange}
                    error={errors[question.question_id]}
                />
            );

        case 'textarea':
            return (
                <TextArea
                    question={question}
                    value={value}
                    onChange={onChange}
                    error={errors[question.question_id]}
                />
            );

        case 'select':
            // Use specialized TestPanelSelector for test panel questions
            // This shows gene info buttons with popup gene lists
            if (question.question_id === 'test_panel' || question.question_id === 'test_code') {
                return (
                    <TestPanelSelector
                        question={question}
                        value={value}
                        onChange={onChange}
                        options={options}
                        error={errors[question.question_id]}
                    />
                );
            }
            return (
                <SelectField
                    question={question}
                    value={value}
                    onChange={onChange}
                    options={options}
                    error={errors[question.question_id]}
                />
            );

        case 'select_with_alternates':
            return (
                <SelectWithAlternates
                    question={question}
                    value={value}
                    onChange={onChange}
                    options={options}
                    error={errors[question.question_id]}
                />
            );

        case 'radio':
            return (
                <RadioGroup
                    question={question}
                    value={value}
                    onChange={onChange}
                    options={options}
                    error={errors[question.question_id]}
                />
            );

        case 'checkbox':
            return (
                <CheckboxField
                    question={question}
                    value={value}
                    onChange={onChange}
                    error={errors[question.question_id]}
                />
            );

        case 'address':
            return (
                <AddressGroup
                    question={question}
                    value={value}
                    onChange={onChange}
                    errors={errors}
                    referenceData={referenceData}
                />
            );

        case 'contact_group':
            return (
                <ContactGroup
                    question={question}
                    value={value}
                    onChange={onChange}
                    errors={errors}
                    referenceData={referenceData}
                />
            );

        case 'stakeholder_group':
            return (
                <StakeholderGroup
                    question={question}
                    value={value}
                    onChange={onChange}
                    errors={errors}
                    referenceData={referenceData}
                />
            );

        case 'provider_filter_list':
            return (
                <ProviderFilterList
                    question={question}
                    value={value}
                    onChange={onChange}
                    errors={errors}
                />
            );

        case 'gene_selector':
            return (
                <GeneSelector
                    question={question}
                    value={value}
                    onChange={onChange}
                    options={options}
                    error={errors[question.question_id]}
                />
            );

        case 'nccn_rule_search':
            return (
                <NCCNRuleSearch
                    question={question}
                    value={value}
                    onChange={onChange}
                    error={errors[question.question_id]}
                />
            );

        case 'rule_modification_editor':
            return (
                <RuleModificationEditor
                    question={question}
                    value={value}
                    onChange={onChange}
                    error={errors[question.question_id]}
                    formData={formData}
                />
            );

        default:
            console.warn(`[QuestionRenderer] Unknown question type: ${question.type}`);
            return (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded mb-4">
                    <p className="text-yellow-700">Unknown question type: {question.type}</p>
                </div>
            );
    }
}

export default QuestionRenderer;
