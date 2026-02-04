/**
 * ContactGroup - Composite contact fields
 * Renders name, title, email, phone, preferred_channel, preferred_time
 */
function ContactGroup({ question, value, onChange, errors, referenceData }) {
    const contactValue = value || {};

    const handleFieldChange = (fieldId, fieldValue) => {
        onChange({
            ...contactValue,
            [fieldId]: fieldValue
        });
    };

    const channelOptions = referenceData.communication_channels || [];
    const timeOptions = referenceData.preferred_times || [];

    // Check for errors using the correct key pattern: question_id_field_id
    const getFieldError = (fieldId) => errors?.[`${question.question_id}_${fieldId}`];
    const hasAnyError = ['name', 'email'].some(f => getFieldError(f));

    return (
        <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
                {question.label}
                {question.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {question.help_text && (
                <p className="text-sm text-gray-500 mb-2">{question.help_text}</p>
            )}
            <div className={`space-y-3 p-4 bg-gray-50 rounded-lg border ${hasAnyError ? 'border-red-500' : 'border-gray-200'}`}>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Name {question.required && <span className="text-red-500">*</span>}</label>
                        <input
                            type="text"
                            value={contactValue.name || ''}
                            onChange={(e) => handleFieldChange('name', e.target.value)}
                            placeholder="Jane Smith"
                            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-propel-teal focus:border-propel-teal ${
                                getFieldError('name') ? 'border-red-500 bg-red-50' : 'border-gray-300'
                            }`}
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Title</label>
                        <input
                            type="text"
                            value={contactValue.title || ''}
                            onChange={(e) => handleFieldChange('title', e.target.value)}
                            placeholder="Clinical Director"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-propel-teal focus:border-propel-teal"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Email {question.required && <span className="text-red-500">*</span>}</label>
                        <input
                            type="email"
                            value={contactValue.email || ''}
                            onChange={(e) => handleFieldChange('email', e.target.value)}
                            placeholder="jane.smith@clinic.org"
                            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-propel-teal focus:border-propel-teal ${
                                getFieldError('email') ? 'border-red-500 bg-red-50' : 'border-gray-300'
                            }`}
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Phone</label>
                        <input
                            type="tel"
                            value={contactValue.phone || ''}
                            onChange={(e) => handleFieldChange('phone', e.target.value)}
                            placeholder="406-555-1234"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-propel-teal focus:border-propel-teal"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Preferred Contact Method</label>
                        <select
                            value={contactValue.preferred_channel || ''}
                            onChange={(e) => handleFieldChange('preferred_channel', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-propel-teal focus:border-propel-teal"
                        >
                            <option value="">Select...</option>
                            {channelOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.display_name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Best Time to Reach</label>
                        <select
                            value={contactValue.preferred_time || ''}
                            onChange={(e) => handleFieldChange('preferred_time', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-propel-teal focus:border-propel-teal"
                        >
                            <option value="">Select...</option>
                            {timeOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.display_name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
            {hasAnyError && (
                <p className="mt-1 text-sm text-red-600">Please complete all required contact fields</p>
            )}
        </div>
    );
}

export default ContactGroup;
