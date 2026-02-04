/**
 * StakeholderGroup - Composite stakeholder fields
 * Renders name, title, email, phone, and "is_ordering_provider" checkbox
 * When is_ordering_provider is checked, this stakeholder's info will be used to
 * auto-populate the first ordering provider on Page 8.
 */
function StakeholderGroup({ question, value, onChange, errors, referenceData }) {
    const stakeholderValue = value || {};

    const handleFieldChange = (fieldId, fieldValue) => {
        onChange({
            ...stakeholderValue,
            [fieldId]: fieldValue
        });
    };

    return (
        <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
                {question.label}
                {question.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {question.help_text && (
                <p className="text-sm text-gray-500 mb-2">{question.help_text}</p>
            )}
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                {/* Row 1: Name and Title */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Name {question.required && <span className="text-red-500">*</span>}</label>
                        <input
                            type="text"
                            value={stakeholderValue.name || ''}
                            onChange={(e) => handleFieldChange('name', e.target.value)}
                            placeholder="Dr. Robert Brown"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-propel-teal focus:border-propel-teal"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Title</label>
                        <input
                            type="text"
                            value={stakeholderValue.title || ''}
                            onChange={(e) => handleFieldChange('title', e.target.value)}
                            placeholder="Chief Medical Officer"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-propel-teal focus:border-propel-teal"
                        />
                    </div>
                </div>
                {/* Row 2: Email and Phone */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Email {question.required && <span className="text-red-500">*</span>}</label>
                        <input
                            type="email"
                            value={stakeholderValue.email || ''}
                            onChange={(e) => handleFieldChange('email', e.target.value)}
                            placeholder="robert.brown@clinic.org"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-propel-teal focus:border-propel-teal"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Phone</label>
                        <input
                            type="tel"
                            value={stakeholderValue.phone || ''}
                            onChange={(e) => handleFieldChange('phone', e.target.value)}
                            placeholder="406-555-1234"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-propel-teal focus:border-propel-teal"
                        />
                    </div>
                </div>
                {/* "Is Ordering Provider" checkbox - hidden for IT Director */}
                {question.question_id !== 'stakeholder_it_director' && (
                    <div className="pt-2 border-t border-gray-200">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={stakeholderValue.is_ordering_provider || false}
                                onChange={(e) => handleFieldChange('is_ordering_provider', e.target.checked)}
                                className="w-4 h-4 text-propel-teal border-gray-300 rounded focus:ring-propel-teal"
                            />
                            <span className="text-sm text-gray-700">
                                This stakeholder is also an ordering provider
                            </span>
                        </label>
                        <p className="text-xs text-gray-500 mt-1 ml-6">
                            If checked, this person will be added as Ordering Provider #1 on Page 8
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default StakeholderGroup;
