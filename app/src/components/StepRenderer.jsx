import QuestionRenderer from './QuestionRenderer';
import RepeatableSection from './RepeatableSection';
import { debugLog } from '../utils/debug';

/**
 * StepRenderer - Renders all questions for a single step
 */
function StepRenderer({ step, formData, onChange, errors }) {
    // If this is the review step, we don't render it here
    // (ReviewStep is handled separately in FormWizard)
    if (step.is_review_step) {
        return null;
    }

    const handleQuestionChange = (questionId, value) => {
        debugLog(`[StepRenderer] Question ${questionId} changed:`, value);
        onChange({
            ...formData,
            [questionId]: value
        });
    };

    const handleRepeatableChange = (items) => {
        debugLog(`[StepRenderer] Repeatable section ${step.step_id} changed:`, items);
        onChange({
            ...formData,
            [step.step_id]: items
        });
    };

    return (
        <div className="step-content">
            {step.repeatable ? (
                <RepeatableSection
                    step={step}
                    items={formData[step.step_id] || []}
                    onChange={handleRepeatableChange}
                    errors={errors}
                    formData={formData}
                />
            ) : (
                step.questions.map(question => (
                    <QuestionRenderer
                        key={question.question_id}
                        question={question}
                        value={formData[question.question_id]}
                        onChange={(value) => handleQuestionChange(question.question_id, value)}
                        errors={errors}
                        formData={formData}
                    />
                ))
            )}
        </div>
    );
}

export default StepRenderer;
