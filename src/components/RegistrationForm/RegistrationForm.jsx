import React, { useState, useEffect, useCallback } from 'react';
import './RegistrationForm.css';
import API_CONFIG from '../../config/apiConfig';

function RegistrationForm({ formData, onChange }) {
  // Inicializar con un objeto vacío por defecto para evitar undefined
  const initialFormData = {
    firstName: formData?.firstName || '',
    lastName: formData?.lastName || '',
    idNumber: formData?.idNumber || '',  // Nuevo campo para cédula
    email: formData?.email || '',
    countryCode: formData?.countryCode || '+57',
    phoneNumber: formData?.phoneNumber || '',
    company: formData?.company || '',
    consent: formData?.consent || false
  };
  
  const [localFormData, setLocalFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  
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

  const checkEmailExists = async (email) => {
    if (!email || !validateEmail(email)) return;
    
    setIsCheckingEmail(true);
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.VISITORS.CHECK_EMAIL(email.toLowerCase())}`);
      const result = await response.json();
      setEmailExists(result.exists);
      
      if (result.exists) {
        setErrors(prev => ({
          ...prev,
          email: 'Este correo ya está registrado.'
        }));
      }
    } catch (error) {
      console.error('Error al verificar el correo:', error);
    } finally {
      setIsCheckingEmail(false);
    }
  };

  // Debounce para no hacer demasiadas peticiones mientras el usuario escribe
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localFormData.email && validateEmail(localFormData.email)) {
        checkEmailExists(localFormData.email);
      }
    }, 500); // Esperar 500ms después de que el usuario deje de escribir
    
    return () => clearTimeout(timer);
  }, [localFormData.email]);

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
    
    if (!data.idNumber.trim()) {
      newErrors.idNumber = 'El número de cédula es obligatorio';
      isValid = false;
    } else if (!/^\d+$/.test(data.idNumber)) {
      newErrors.idNumber = 'La cédula debe contener solo números';
      isValid = false;
    } else if (data.idNumber.length < 6 || data.idNumber.length > 10) {
      newErrors.idNumber = 'La cédula debe tener entre 6 y 10 dígitos';
      isValid = false;
    }
    
    if (!data.email.trim()) {
      newErrors.email = 'El correo electrónico es obligatorio';
      isValid = false;
    } else if (!validateEmail(data.email)) {
      newErrors.email = 'FORMATO DE CORREO ELECTRÓNICO INVÁLIDO';
      isValid = false;
    } else if (emailExists) {
      newErrors.email = 'Este correo ya está registrado.';
      isValid = false;
    }
    
    setErrors(newErrors);
    return isValid;
  }, [emailExists]);  // Importante: emailExists está en las dependencias

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let newValue;
    
    if (type === 'checkbox') {
      newValue = checked;
    } else if (name === 'phoneNumber' || name === 'idNumber') {
      // Eliminar todos los caracteres que no sean números para teléfono y cédula
      newValue = value.replace(/\D/g, '')
    } else {
      // Convertir a mayúsculas solo si es un campo de texto, NO email
      newValue = type === 'text' ? value.toUpperCase() : value;
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
  
  // Actualizar el onChange para que valide inmediatamente cuando cambia emailExists
  useEffect(() => {
    if (onChange) {
      onChange(localFormData, validateForm(localFormData));
    }
  }, [emailExists, localFormData, onChange, validateForm]);

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
        <label htmlFor="idNumber">NÚMERO DE CÉDULA *</label>
        <input
          type="text"
          id="idNumber"
          name="idNumber"
          value={localFormData.idNumber}
          onChange={handleChange}
          required
          placeholder="Ej: 1002537927"
          inputMode="numeric" 
          pattern="[0-9]*"
        />
        {errors.idNumber && <span className="error-message">{errors.idNumber}</span>}
      </div>
      
      <div className="form-group">
        <label htmlFor="email">CORREO ELECTRÓNICO *</label>
        <div className="email-input-container">
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className={emailExists ? 'input-error' : ''}
            disabled={isCheckingEmail}
          />
          {isCheckingEmail && (
            <div className="spinner-container">
              <div className="spinner"></div>
            </div>
          )}
        </div>
        {isCheckingEmail && <span className="checking-message">Verificando correo...</span>}
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
            pattern="[0-9]*"
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