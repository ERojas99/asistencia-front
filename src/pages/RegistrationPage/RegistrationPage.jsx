import React, { useState, useEffect } from 'react';
import RegistrationForm from '../../components/RegistrationForm/RegistrationForm';
import FaceRecognition from '../../components/FaceRecognition/FaceRecognition';
import ProgressBar from '../../components/ProgressBar/ProgressBar';
import FaceWarning from '../../pages/FaceWarning/FaceWarning';
import logo from '../../assets/logoANDICOM.png'; // Importar el logo
import './RegistrationPage.css';
// Eliminamos la importación de IDVerification
// import IDVerification from '../../components/IDVerification/IDVerification';

function RegistrationPage() {
  const [currentStep, setCurrentStep] = useState(1); // Nuevo estado para el paso actual
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    idNumber: '',  // Mantenemos el campo para cédula
    email: '',
    countryCode: '+57',
    phoneNumber: '',
    company: '',
    consent: false
  });
  
  const [faceData, setFaceData] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  // Eliminamos el estado para datos de ID
  // const [idData, setIdData] = useState(null);
  
  const [isFormValid, setIsFormValid] = useState(false);
  const [isFaceValid, setIsFaceValid] = useState(false);
  // Eliminamos el estado para validación de ID
  // const [isIdValid, setIsIdValid] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState({ success: null, message: '' });
  
  // Actualizamos el total de pasos a 3 (eliminamos el paso de verificación de ID)
  const totalSteps = 3;

  const handleFormChange = (newFormData, isValid) => {
    setFormData(newFormData);
    setIsFormValid(isValid);
  };
  
  const handleFaceCapture = (faceEmbeddings, isValid, imageData) => {
    setFaceData(faceEmbeddings);
    setIsFaceValid(isValid);
    if (imageData) { // Solo actualiza si hay una imagen nueva
      setCapturedImage(imageData);
    }
  };
  
  // Eliminamos la función para manejar la verificación de ID
  // const handleIdVerification = (idInfo, isValid) => {
  //   setIdData(idInfo);
  //   setIsIdValid(isValid);
  // };

  const nextStep = () => {
    if (currentStep === 1) {
      if (!isFormValid) {
        setSubmitResult({ success: false, message: 'Por favor complete todos los campos obligatorios del formulario.' });
        return;
      }
      if (!formData.consent) {
        setSubmitResult({ success: false, message: 'Debe aceptar el tratamiento de datos para continuar.' });
        return;
      }
    } else if (currentStep === 3 && !isFaceValid) {
        setSubmitResult({ success: false, message: 'Por favor complete la captura facial correctamente.' });
        return;
    }
    // Eliminamos la validación para el paso 4 (verificación de ID)
    
    setSubmitResult({ success: null, message: '' }); // Limpiar mensajes de error al avanzar
    setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
    setSubmitResult({ success: null, message: '' }); // Limpiar mensajes al retroceder
  };

  const [showThankYouPage, setShowThankYouPage] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(3);
  
  // Efecto para la redirección después de mostrar la página de agradecimiento
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
    
    // Actualizamos la validación para enviar sin verificación de ID
    if (isFormValid && isFaceValid && formData.consent) {
      setIsSubmitting(true);
      setSubmitResult({ success: null, message: '' });
      
      try {
        const dataToSend = {
          ...formData,
          faceData,
          faceImage: capturedImage,
          // Eliminamos idData del objeto a enviar
        };
        
        const response = await fetch('https://asistencia-back-evtb.onrender.com/api/visitors', {
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
          // Mostrar la página de agradecimiento en lugar de recargar
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
      let errorMessage = 'Por favor complete todos los pasos requeridos: ';
      if (!isFormValid || !formData.consent) errorMessage += 'Datos personales y consentimiento, ';
      if (!isFaceValid) errorMessage += 'Registro facial, ';
      // Eliminamos la validación de ID
      errorMessage = errorMessage.slice(0, -2) + '.'; // Remover la última coma y espacio
      
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
  
  // Si se debe mostrar la página de agradecimiento, renderizarla
  if (showThankYouPage) {
    return <ThankYouPage />;
  }
  
  return (
    <div className="registration-page">
      <div className="logo-container">
        <img src={logo} alt="Logo" className="header-logo" />
      </div>
      <h1>REGISTRO DE VISITANTES</h1>
      
      {/* Barra de Progreso */}
      <ProgressBar currentStep={currentStep} totalSteps={totalSteps} />

      {/* Indicador de Pasos (opcional, ya que la barra de progreso también informa) */}
      <div className="step-indicator">
        Paso {currentStep} de {totalSteps}
      </div>
      
      {submitResult.message && (
        <div className={`result-message ${submitResult.success === true ? 'success' : submitResult.success === false ? 'error' : ''}`}>
          {submitResult.message}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        {/* Renderizado condicional basado en el paso actual */}
        {currentStep === 1 && (
          <div className="step-container form-section">
            <h2>Paso 1: Datos Personales</h2>
            <RegistrationForm 
              formData={formData} 
              onChange={handleFormChange} 
            />
          </div>
        )}
        
        {currentStep === 2 && (
          <div className="step-container warning-section">
            <h2>Paso 2: Advertencias de Reconocimiento Facial</h2>
            <FaceWarning />
          </div>
        )}

        {currentStep === 3 && (
          <div className="step-container face-recognition-section">
            <h2>Paso 3: Reconocimiento Facial</h2>
            <FaceRecognition 
              onFaceCapture={handleFaceCapture}
              initialCapturedImage={capturedImage}
            />
          </div>
        )}

        {/* Eliminamos el paso 4 de verificación de ID */}

        {/* Botones de navegación y envío */}
        <div className="navigation-buttons">
          {currentStep > 1 && (
            <button type="button" onClick={prevStep} disabled={isSubmitting}>
              Anterior
            </button>
          )}
          
          {currentStep < 3 && (
            <button type="button" onClick={nextStep} disabled={isSubmitting}>
              Siguiente
            </button>
          )}
          
          {currentStep === 3 && (
            <button 
              type="submit" 
              disabled={!isFormValid || !isFaceValid || !formData.consent || isSubmitting}
            >
              {isSubmitting ? 'Enviando...' : 'Completar Registro'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default RegistrationPage;
