/**
 * AddressGroup - Composite address fields
 * Renders street, city, state, zip as a group
 */
function AddressGroup({ question, value, onChange, errors, referenceData }) {
    const addressValue = value || {};

    const handleFieldChange = (fieldId, fieldValue) => {
        onChange({
            ...addressValue,
            [fieldId]: fieldValue
        });
    };

    const stateOptions = referenceData.us_states || [];

    // Check for errors using the correct key pattern: question_id_field_id
    const getFieldError = (fieldId) => errors?.[`${question.question_id}_${fieldId}`];
    const hasAnyError = ['street', 'city', 'state', 'zip'].some(f => getFieldError(f));

    return (
        <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
                {question.label}
                {question.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className={`space-y-3 p-3 sm:p-4 bg-gray-50 rounded-lg border ${hasAnyError ? 'border-red-500' : 'border-gray-200'}`}>
                {/* Street - always full width */}
                <div>
                    <input
                        type="text"
                        value={addressValue.street || ''}
                        onChange={(e) => handleFieldChange('street', e.target.value)}
                        placeholder="Street Address"
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-propel-teal focus:border-propel-teal ${
                            getFieldError('street') ? 'border-red-500 bg-red-50' : 'border-gray-300'
                        }`}
                    />
                </div>
                {/* City/State/ZIP - stack on mobile, row on desktop */}
                <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                    <div className="sm:col-span-3">
                        <input
                            type="text"
                            value={addressValue.city || ''}
                            onChange={(e) => handleFieldChange('city', e.target.value)}
                            placeholder="City"
                            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-propel-teal focus:border-propel-teal ${
                                getFieldError('city') ? 'border-red-500 bg-red-50' : 'border-gray-300'
                            }`}
                        />
                    </div>
                    <div className="sm:col-span-1">
                        <select
                            value={addressValue.state || ''}
                            onChange={(e) => handleFieldChange('state', e.target.value)}
                            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-propel-teal focus:border-propel-teal ${
                                getFieldError('state') ? 'border-red-500 bg-red-50' : 'border-gray-300'
                            }`}
                        >
                            <option value="">State</option>
                            {stateOptions.map(s => (
                                <option key={s.value} value={s.value}>{s.value}</option>
                            ))}
                        </select>
                    </div>
                    <div className="sm:col-span-2">
                        <input
                            type="text"
                            value={addressValue.zip || ''}
                            onChange={(e) => handleFieldChange('zip', e.target.value)}
                            placeholder="ZIP Code"
                            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-propel-teal focus:border-propel-teal ${
                                getFieldError('zip') ? 'border-red-500 bg-red-50' : 'border-gray-300'
                            }`}
                        />
                    </div>
                </div>
            </div>
            {hasAnyError && (
                <p className="mt-1 text-sm text-red-600">Please complete all required address fields</p>
            )}
        </div>
    );
}

export default AddressGroup;
