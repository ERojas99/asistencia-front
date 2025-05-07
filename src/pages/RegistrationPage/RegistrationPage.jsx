import React, { useState } from 'react';
import RegistrationForm from '../../components/RegistrationForm/RegistrationForm';
import FaceRecognition from '../../components/FaceRecognition/FaceRecognition';
import ProgressBar from '../../components/ProgressBar/ProgressBar';
import FaceWarning from '../../pages/FaceWarning/FaceWarning';
import logo from '../../assets/logoANDICOM.png'; // Importar el logo
import './RegistrationPage.css';
import IDVerification from '../../components/IDVerification/IDVerification';

function RegistrationPage() {
  const [currentStep, setCurrentStep] = useState(1); // Nuevo estado para el paso actual
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    idNumber: '',  // Nuevo campo para cédula
    email: '',
    countryCode: '+57',
    phoneNumber: '',
    company: '',
    consent: false
  });
  
  const [faceData, setFaceData] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [idData, setIdData] = useState(null); // Estado para datos de ID
  
  const [isFormValid, setIsFormValid] = useState(false);
  const [isFaceValid, setIsFaceValid] = useState(false);
  const [isIdValid, setIsIdValid] = useState(false); // Estado para validación de ID
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState({ success: null, message: '' }); // Cambiado success a null inicialmente
  
  const totalSteps = 4; // Actualizado para incluir el paso de advertencias

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
  
  // Función para manejar la verificación de ID
  const handleIdVerification = (idInfo, isValid) => {
    setIdData(idInfo);
    setIsIdValid(isValid);
  };

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
    } else if (currentStep === 4 && !isIdValid) {
        setSubmitResult({ success: false, message: 'Por favor complete la verificación de identidad correctamente.' });
        return;
    }
    
    setSubmitResult({ success: null, message: '' }); // Limpiar mensajes de error al avanzar
    setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
    setSubmitResult({ success: null, message: '' }); // Limpiar mensajes al retroceder
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Asegurarse de que todos los pasos requeridos son válidos antes de enviar
    if (isFormValid && isFaceValid && isIdValid && formData.consent) {
      setIsSubmitting(true);
      setSubmitResult({ success: null, message: '' });
      
      try {
        const dataToSend = {
          ...formData,
          faceData,
          faceImage: capturedImage,
          idData, // Incluir datos de ID
        };
        
        const response = await fetch('http://localhost:5000/api/visitors', {
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
          setTimeout(() => {
            window.location.reload();
          }, 1000); // Aumentado a 3 segundos
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
      if (!isIdValid) errorMessage += 'Verificación de identidad, ';
      errorMessage = errorMessage.slice(0, -2) + '.'; // Remover la última coma y espacio
      
      setSubmitResult({ 
        success: false, 
        message: errorMessage 
      });
    }
  };
  
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

        {currentStep === 4 && (
           <div className="step-container id-verification-section">
            <h2>Paso 4: Verificación de Identidad</h2> {/* Corregido el número del paso */}
            <IDVerification 
              onVerify={handleIdVerification}
              formIdNumber={formData.idNumber}
            />
          </div>
        )}

        {/* Botones de navegación y envío */}
        <div className="navigation-buttons">
          {currentStep > 1 && (
            <button type="button" onClick={prevStep} disabled={isSubmitting}>
              Anterior
            </button>
          )}
          
          {currentStep < 4 && (
            <button type="button" onClick={nextStep} disabled={isSubmitting}>
              Siguiente
            </button>
          )}
          
          {currentStep === 4 && (
            <button 
              type="submit" 
              disabled={!isFormValid || !isFaceValid || !isIdValid || !formData.consent || isSubmitting}
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
