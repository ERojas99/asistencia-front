import React, { useState, useEffect } from 'react';
import FaceRecognition from '../../components/FaceRecognition/FaceRecognition';
import FaceWarning from '../../pages/FaceWarning/FaceWarning';
import logo from '../../assets/logoANDICOM.png';
import './RegistrationPage.css';
import API_CONFIG from '../../config/apiConfig';
import * as faceapi from 'face-api.js';

function RegistrationPage() {
  // Definimos los pasos del formulario (uno por campo)
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    idType: '',  // Asegurarse de que comience vacío
    idNumber: '',
    email: '',
    countryCode: '+57',
    phoneNumber: '',
    company: '',
    consent: false
  });
  
  const [faceData, setFaceData] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isFormValid, setIsFormValid] = useState(false);
  const [isFaceValid, setIsFaceValid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState({ success: null, message: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  // Total de pasos: 6 campos + advertencia facial + reconocimiento facial
  const totalSteps = 8;
  
  // Validación de campos individuales
  const validateField = (name, value) => {
    let error = '';
    
    switch(name) {
      case 'firstName':
        if (!value.trim()) error = 'El nombre es obligatorio';
        break;
      case 'lastName':
        if (!value.trim()) error = 'El apellido es obligatorio';
        break;
      case 'idType':
        if (!value) error = 'Debe seleccionar un tipo de documento';
        break;
      case 'idNumber':
        if (!value.trim()) error = 'El número de documento es obligatorio';
        break;
      case 'email':
        if (!value.trim()) error = 'El correo electrónico es obligatorio';
        else if (!/\S+@\S+\.\S+/.test(value)) error = 'Ingrese un correo electrónico válido';
        break;
      case 'phoneNumber':
        if (!value.trim()) error = 'El número de teléfono es obligatorio';
        else if (!/^\d{7,10}$/.test(value)) error = 'Ingrese un número de teléfono válido';
        break;
      case 'company':
        if (!value.trim()) error = 'La empresa es obligatoria';
        break;
      default:
        break;
    }
    
    return error;
  };
  
  // Manejar cambio en los campos del formulario
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    let inputValue = type === 'checkbox' ? checked : value;
    
    // Filtrar caracteres no numéricos para el campo idNumber
    if (name === 'idNumber' && !/^\d*$/.test(value)) {
      return; // No actualizar el estado si contiene caracteres no numéricos
    }
    
    // Actualizar el valor del campo
    setFormData(prev => ({
      ...prev,
      [name]: inputValue
    }));
    
    // Validar el campo
    if (type !== 'checkbox') {
      const error = validateField(name, inputValue);
      setFieldErrors(prev => ({
        ...prev,
        [name]: error
      }));
    }
  };
  
  // Verificar si el campo actual es válido
  const isCurrentFieldValid = () => {
    // Validación específica para el paso 6 (empresa y consentimiento)
    if (currentStep === 6) {
      const companyValid = !validateField('company', formData.company);
      // Verificar que el checkbox de consentimiento esté marcado
      const consentValid = formData.consent === true;
      
      // Si el consentimiento no es válido, mostrar un error
      if (!consentValid) {
        setFieldErrors(prev => ({
          ...prev,
          consent: 'Debe aceptar los términos y condiciones para continuar'
        }));
      } else {
        // Limpiar el error si el consentimiento es válido
        setFieldErrors(prev => ({
          ...prev,
          consent: ''
        }));
      }
      
      return companyValid && consentValid;
    }
    
    // Validación específica para el paso 2 (tipo de documento)
    if (currentStep === 2) {
      const idTypeValid = !!formData.idType;
      
      if (!idTypeValid) {
        setFieldErrors(prev => ({
          ...prev,
          idType: 'Debe seleccionar un tipo de documento'
        }));
      } else {
        setFieldErrors(prev => ({
          ...prev,
          idType: ''
        }));
      }
      
      return idTypeValid;
    }
    
    // Para el primer paso, necesitamos validar tanto firstName como lastName
    if (currentStep === 1) {
      return !validateField('firstName', formData.firstName) && 
             !validateField('lastName', formData.lastName);
    }
    
    // Para los demás pasos, seguimos con la lógica original
    const fieldNames = ['firstName', 'lastName', 'idNumber', 'email', 'phoneNumber', 'company'];
    const currentField = fieldNames[currentStep - 1];
    
    if (!currentField) return true; // Para pasos que no son campos (advertencia, reconocimiento)
    
    const value = formData[currentField];
    return !validateField(currentField, value);
  };

  // Eliminar esta primera definición de nextStep
  // const nextStep = () => {
  //   // Validar el campo actual antes de avanzar
  //   if (!isCurrentFieldValid()) {
  //     return; // No avanzar si el campo no es válido
  //   }
  //   
  //   if (currentStep < totalSteps) {
  //     setCurrentStep(currentStep + 1);
  //   }
  // };
  
  // Manejador de eventos para la tecla Enter
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // Verificación específica para el paso 6 (empresa y consentimiento)
      if (currentStep === 6 && !formData.consent) {
        setFieldErrors(prev => ({
          ...prev,
          consent: 'Debe aceptar los términos y condiciones para continuar'
        }));
        
        setSubmitResult({ 
          success: false, 
          message: 'Debe aceptar los términos y condiciones para continuar' 
        });
        return;
      }
      
      // Solo avanzar si no estamos en el último paso
      if (currentStep < totalSteps) {
        nextStep();
      } else if (currentStep === totalSteps) {
        handleSubmit(new Event('submit'));
      }
    }
  };
  useEffect(() => {
    const loadFaceModels = async () => {
      if (!modelsLoaded && !isModelLoading) {
        setIsModelLoading(true);
        console.log('Precargando modelos de reconocimiento facial...');
        
        try {
          // Establecer la ruta a los modelos
          const MODEL_URL = '/models';
          
          // Cargar los modelos necesarios
          await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
            faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL)
          ]);
          
          setModelsLoaded(true);
          console.log('Modelos de reconocimiento facial cargados exitosamente');
        } catch (error) {
          console.error('Error al precargar modelos de reconocimiento facial:', error);
        } finally {
          setIsModelLoading(false);
        }
      }
    };
    
    loadFaceModels();
  }, [modelsLoaded, isModelLoading]);

  // Verificar si todos los campos son válidos
  useEffect(() => {
    const allFieldsValid = 
      !validateField('firstName', formData.firstName) &&
      !validateField('lastName', formData.lastName) &&
      !validateField('idNumber', formData.idNumber) &&
      !validateField('email', formData.email) &&
      !validateField('phoneNumber', formData.phoneNumber) &&
      !validateField('company', formData.company) &&
      formData.consent;
    
    setIsFormValid(allFieldsValid);
  }, [formData]);
  
  const handleFaceCapture = (faceEmbeddings, isValid, imageData) => {
    setFaceData(faceEmbeddings);
    setIsFaceValid(isValid);
    if (imageData) {
      setCapturedImage(imageData);
    }
  };

  const nextStep = () => {
    // Validar el campo actual antes de avanzar
    if (currentStep <= 6) {
      if (currentStep === 1) {
        // Validación especial para el primer paso (nombres y apellidos)
        const firstNameError = validateField('firstName', formData.firstName);
        const lastNameError = validateField('lastName', formData.lastName);
        
        if (firstNameError) {
          setSubmitResult({ 
            success: false, 
            message: firstNameError
          });
          return;
        }
        
        if (lastNameError) {
          setSubmitResult({ 
            success: false, 
            message: lastNameError
          });
          return;
        }
      } else if (currentStep === 2) {
        // Validación especial para el segundo paso (tipo de documento)
        if (!formData.idType) {
          setSubmitResult({ 
            success: false, 
            message: 'Debe seleccionar un tipo de documento'
          });
          return;
        }
      } else if (!isCurrentFieldValid()) {
        // Para los demás pasos, seguimos con la lógica original
        const fieldNames = ['firstName', 'lastName', 'idNumber', 'email', 'phoneNumber', 'company'];
        const currentField = fieldNames[currentStep - 1];
        const error = validateField(currentField, formData[currentField]);
        
        setSubmitResult({ 
          success: false, 
          message: error || 'Por favor complete este campo correctamente' 
        });
        return;
      }
    }
    
    // Si estamos en el paso de reconocimiento facial
    if (currentStep === 8 && !isFaceValid) {
      setSubmitResult({ 
        success: false, 
        message: 'Por favor complete la captura facial correctamente' 
      });
      return;
    }
    
    setSubmitResult({ success: null, message: '' });
    setCurrentStep(prev => prev + 1);
    
    // Si llegamos al último paso, enviar el formulario automáticamente
    if (currentStep === totalSteps) {
      handleSubmit(new Event('submit'));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
    setSubmitResult({ success: null, message: '' });
  };

  const [showThankYouPage, setShowThankYouPage] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(3);
  
  useEffect(() => {
    let timer;
    if (showThankYouPage && redirectCountdown > 0) {
      timer = setTimeout(() => {
        setRedirectCountdown(prev => prev - 1);
      }, 1000);
    } else if (showThankYouPage && redirectCountdown === 0) {
      window.location.href = 'https://andicom.co';
    }
    return () => clearTimeout(timer);
  }, [showThankYouPage, redirectCountdown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isFormValid && isFaceValid && formData.consent) {
      setIsSubmitting(true);
      setSubmitResult({ success: null, message: '' });
      
      try {
        const dataToSend = {
          ...formData,
          faceData,
          faceImage: capturedImage,
        };
        
        // Se están haciendo múltiples llamadas innecesarias a la API
        // Eliminar las llamadas duplicadas y mantener solo una
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.VISITORS.REGISTER}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(dataToSend),
        });
        
        const result = await response.json();
        
        if (response.ok) {
          setSubmitResult({ 
            success: true, 
            message: '¡Registro completado con éxito!' 
          });
          setShowThankYouPage(true);
        } else {
          setSubmitResult({ 
            success: false, 
            message: `Error: ${result.error || 'No se pudo completar el registro'}` 
          });
        }
      } catch (error) {
        console.error('Error al enviar datos:', error);
        setSubmitResult({ 
          success: false, 
          message: 'Error de conexión. Por favor, intente nuevamente.' 
        });
      } finally {
        setIsSubmitting(false);
      }
    } else {
      let errorMessage = 'Por favor complete todos los campos requeridos.';
      setSubmitResult({ 
        success: false, 
        message: errorMessage 
      });
    }
};
  
  // Componente de página de agradecimiento
  const ThankYouPage = () => (
    <div className="thank-you-page">
      <div className="thank-you-content">
        <img src={logo} alt="Logo ANDICOM" className="thank-you-logo" />
        <h1>¡Gracias por su registro!</h1>
        <p>Su información ha sido registrada correctamente.</p>
        <p>Será redirigido a la página de ANDICOM en <span className="countdown">{redirectCountdown}</span> segundos...</p>
        <button 
          onClick={() => window.location.href = 'https://andicom.co'} 
          className="redirect-button"
        >
          Ir a ANDICOM ahora
        </button>
      </div>
    </div>
  );
  
  if (showThankYouPage) {
    return <ThankYouPage />;
  }
  
  // Renderizar el campo actual según el paso
  const renderCurrentField = () => {
    switch(currentStep) {
      case 1:
        return (
          <div className="field-slide">
            <h2>Datos Personales</h2>
            <p className="field-description">Ingrese sus nombres y apellidos</p>
            <div className="form-field">
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                placeholder="Nombre(s)"
                autoFocus
                onKeyDown={handleKeyDown}
              />
              {fieldErrors.firstName && <p className="error-message">{fieldErrors.firstName}</p>}
            </div>
            
            <div className="form-field">
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                placeholder="Apellido(s)"
                onKeyDown={handleKeyDown}
              />
              {fieldErrors.lastName && <p className="error-message">{fieldErrors.lastName}</p>}
            </div>
          </div>
        );
      
      case 2:
        return (
          <div className="field-slide">
            <h2>Tipo de Documento</h2>
            <p className="field-description">Seleccione su tipo de documento de identidad</p>
            <div className="form-field">
              <select
                name="idType"
                value={formData.idType}
                onChange={handleInputChange}
                autoFocus
                onKeyDown={handleKeyDown}
              >
                <option value="">Seleccione tipo de documento</option>
                <option value="CC">Cédula de Ciudadanía</option>
                <option value="CE">Cédula de Extranjería</option>
                <option value="PA">Pasaporte</option>
              </select>
              {fieldErrors.idType && <p className="error-message">{fieldErrors.idType}</p>}
            </div>
          </div>
        );
      
      case 3:
        return (
          <div className="field-slide">
            <h2>Documento de Identidad</h2>
            <p className="field-description">Ingrese su número de cédula o documento</p>
            <div className="form-field">
              <input
                type="text"
                name="idNumber"
                value={formData.idNumber}
                onChange={handleInputChange}
                placeholder="Ingrese su número de documento"
                autoFocus
                onKeyDown={handleKeyDown}
                pattern="\d*"
                inputMode="numeric"
              />
              {fieldErrors.idNumber && <p className="error-message">{fieldErrors.idNumber}</p>}
            </div>
          </div>
        );
      
      case 4:
        return (
          <div className="field-slide">
            <h2>Correo Electrónico</h2>
            <p className="field-description">Ingrese su dirección de correo electrónico</p>
            <div className="form-field">
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="ejemplo@correo.com"
                autoFocus
                onKeyDown={handleKeyDown}
              />
              {fieldErrors.email && <p className="error-message">{fieldErrors.email}</p>}
            </div>
          </div>
        );
      
      case 5:
        return (
          <div className="field-slide">
            <h2>Número de Teléfono</h2>
            <p className="field-description">Ingrese su número de teléfono</p>
            <div className="form-field phone-field">
              <div className="phone-input-container">
                <select
                  name="countryCode"
                  value={formData.countryCode}
                  onChange={handleInputChange}
                  className="country-code-select"
                  onKeyDown={handleKeyDown}
                >
                  <option value="+57">+57 (Colombia)</option>
                  <option value="+1">+1 (USA/Canadá)</option>
                  <option value="+52">+52 (México)</option>
                  <option value="+34">+34 (España)</option>
                  <option value="+54">+54 (Argentina)</option>
                  <option value="+56">+56 (Chile)</option>
                  <option value="+51">+51 (Perú)</option>
                </select>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  placeholder="Número de teléfono"
                  autoFocus
                  className="phone-number-input"
                  onKeyDown={handleKeyDown}
                />
              </div>
              {fieldErrors.phoneNumber && <p className="error-message">{fieldErrors.phoneNumber}</p>}
            </div>
          </div>
        );
      
      case 6:
        return (
          <div className="field-slide">
            <h2>Empresa o Institución</h2>
            <p className="field-description">Ingrese el nombre de su empresa o institución</p>
            <div className="form-field">
              <input
                type="text"
                name="company"
                value={formData.company}
                onChange={handleInputChange}
                placeholder="Nombre de la empresa"
                autoFocus
                onKeyDown={handleKeyDown}
              />
              {fieldErrors.company && <p className="error-message">{fieldErrors.company}</p>}
            </div>
            
            <div className="consent-field">
              <label>
                <input
                  type="checkbox"
                  name="consent"
                  checked={formData.consent}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                />
                Acepto el tratamiento de mis datos personales según la política de privacidad
              </label>
              {fieldErrors.consent && <p className="error-message">{fieldErrors.consent}</p>}
            </div>
          </div>
        );
      case 7:
        return (
          <div className="field-slide">
            <FaceRecognition 
              onFaceCapture={handleFaceCapture}
              initialCapturedImage={capturedImage}
            />
            <div className="navigation-buttons">
              {currentStep > 1 && (
                <button 
                  type="button" 
                  onClick={prevStep} 
                  className="prev-button"
                  disabled={isSubmitting}
                >
                  Anterior
                </button>
              )}
              
              <button 
                type="button" 
                onClick={handleSubmit} 
                className="next-button"
                disabled={isSubmitting || !isFaceValid}
              >
                Completar Registro
              </button>
            </div>
          </div>
        );
        case 8: // Paso de reconocimiento facial
          return (
            <div className="face-recognition-section">
              <FaceRecognition 
                onFaceCapture={handleFaceCapture} 
                preloadedModels={modelsLoaded} 
              />
            </div>
          );
      default:
        return null;
    }
  };
  
  return (
    <div className="registration-page">
      <div className="logo-container">
        <img src={logo} alt="Logo ANDICOM" className="header-logo" />
      </div>
      
      {/* Indicadores de progreso */}
      <div className="progress-indicator">
        {Array.from({ length: totalSteps - 1 }, (_, i) => (
          <div 
            key={i} 
            className={`progress-dot ${i + 1 === currentStep ? 'active' : i + 1 < currentStep ? 'completed' : ''}`}
          />
        ))}
      </div>
      
      {submitResult.message && (
        <div className={`result-message ${submitResult.success === true ? 'success' : submitResult.success === false ? 'error' : ''}`}>
          {submitResult.message}
        </div>
      )}
      
      <form onSubmit={(e) => e.preventDefault()} className="wizard-form">
        <div className="wizard-container">
          {renderCurrentField()}
          
          {currentStep < 7 && (
            <div className="navigation-buttons">
              {currentStep > 1 && (
                <button 
                  type="button" 
                  onClick={prevStep} 
                  className="prev-button"
                  disabled={isSubmitting}
                >
                  Anterior
                </button>
              )}
              
              <button 
                type="button" 
                onClick={nextStep} 
                className="next-button"
                disabled={isSubmitting}
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};

export default RegistrationPage;
