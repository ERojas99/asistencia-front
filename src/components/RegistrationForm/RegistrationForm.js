import React, { useState, useEffect, useCallback } from 'react';
import './RegistrationForm.css';

function RegistrationForm({ formData, onChange }) {
  // Inicializar con un objeto vacío por defecto para evitar undefined
  const initialFormData = {
    firstName: formData?.firstName || '',
    lastName: formData?.lastName || '',
    email: formData?.email || '',
    countryCode: formData?.countryCode || '+57',
    phoneNumber: formData?.phoneNumber || '',
    company: formData?.company || '',
    consent: formData?.consent || false
  };
  
  const [localFormData, setLocalFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  
  const countryCodes = [
    { code: '+57', name: 'COL' },
    { code: '+51', name: 'PER' },
    { code: '+52', name: 'MEX' },
    { code: '+54', name: 'ARG' },
    { code: '+56', name: 'CHL' },
    { code: '+1', name: 'USA' },
    { code: '+34', name: 'ESP' },
    { code: '+49', name: 'ALE' },
    { code: '+33', name: 'FRA' },
    { code: '+44', name: 'UK' },
  ];

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  };

  const validateForm = useCallback((data) => {
    const newErrors = {};
    let isValid = true;
    
    if (!data.firstName.trim()) {
      newErrors.firstName = 'El nombre es obligatorio';
      isValid = false;
    }
    
    if (!data.lastName.trim()) {
      newErrors.lastName = 'Los apellidos son obligatorios';
      isValid = false;
    }
    
    if (!data.email.trim()) {
      newErrors.email = 'El correo electrónico es obligatorio';
      isValid = false;
    } else if (!validateEmail(data.email)) {
      newErrors.email = 'FORMATO DE CORREO ELECTRÓNICO INVÁLIDO';
      isValid = false;
    }
    
    setErrors(newErrors);
    return isValid;
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let newValue;
    
    if (type === 'checkbox') {
      newValue = checked;
    } else {
      // Convertir a mayúsculas si es un campo de texto o email
      newValue = type === 'text' || type === 'email' ? value.toUpperCase() : value;
    }
    
    const newFormData = { ...localFormData, [name]: newValue };
    setLocalFormData(newFormData);
    
    if (onChange) {
      onChange(newFormData, validateForm(newFormData));
    }
  };
  
  // Validar el formulario cuando se monta el componente
  useEffect(() => {
    validateForm(localFormData);
  }, [localFormData, validateForm]);

  return (
    <div className="registration-form">
      <h2>DATOS DEL VISITANTE</h2>
      
      <div className="form-group">
        <label htmlFor="firstName">NOMBRES *</label>
        <input
          type="text"
          id="firstName"
          name="firstName"
          value={formData.firstName}
          onChange={handleChange}
          required
        />
        {errors.firstName && <span className="error-message">{errors.firstName}</span>}
      </div>
      
      <div className="form-group">
        <label htmlFor="lastName">APELLIDOS *</label>
        <input
          type="text"
          id="lastName"
          name="lastName"
          value={formData.lastName}
          onChange={handleChange}
          required
        />
        {errors.lastName && <span className="error-message">{errors.lastName}</span>}
      </div>
      
      <div className="form-group">
        <label htmlFor="email">CORREO ELECTRÓNICO *</label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
        />
        {errors.email && <span className="error-message">{errors.email}</span>}
      </div>
      
      <div className="form-group phone-group">
        <label htmlFor="phoneNumber">NÚMERO DE CELULAR</label>
        <div className="phone-input-container">
          <select
            name="countryCode"
            value={formData.countryCode}
            onChange={handleChange}
            className="country-code-select"
          >
            {countryCodes.map(country => (
              <option key={country.code} value={country.code}>
                {country.name} ({country.code})
              </option>
            ))}
          </select>
          <input
            type="tel"
            id="phoneNumber"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleChange}
            placeholder="Ej: 3123456789"
            className="phone-number-input"
          />
        </div>
      </div>
      
      <div className="form-group">
        <label htmlFor="company">EMPRESA/ORGANIZACIÓN</label>
        <input
          type="text"
          id="company"
          name="company"
          value={formData.company}
          onChange={handleChange}
        />
      </div>
      <div className="form-group consent-group">
        <label>
          <input
            type="checkbox"
            name="consent"
            checked={localFormData.consent}
            onChange={handleChange}
            required
          />
          Acepto el tratamiento de mis datos personales y faciales según la política de privacidad.
        </label>
        {errors.consent && <span className="error-message">{errors.consent}</span>}
      </div>
    </div>
  );
}

export default RegistrationForm;