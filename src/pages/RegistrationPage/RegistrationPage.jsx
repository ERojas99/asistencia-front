import React, { useState } from 'react';
import RegistrationForm from '../../components/RegistrationForm/RegistrationForm';
import FaceRecognition from '../../components/FaceRecognition/FaceRecognition';
// Importa un nuevo componente para la verificación de ID (a crear)
// import IDVerification from '../../components/IDVerification/IDVerification'; 
import './RegistrationPage.css';

function RegistrationPage() {
  const [currentStep, setCurrentStep] = useState(1); // Nuevo estado para el paso actual
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    countryCode: '+57',
    phoneNumber: '',
    company: '',
    consent: false
  });
  
  const [faceData, setFaceData] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  // const [idData, setIdData] = useState(null); // Estado para datos de ID (si es necesario)
  
  const [isFormValid, setIsFormValid] = useState(false);
  const [isFaceValid, setIsFaceValid] = useState(false);
  // const [isIdValid, setIsIdValid] = useState(false); // Estado para validación de ID
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState({ success: null, message: '' }); // Cambiado success a null inicialmente
  
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
  
  // Placeholder para la función de manejo de verificación de ID
  // const handleIdVerification = (idInfo, isValid) => {
  //   setIdData(idInfo);
  //   setIsIdValid(isValid);
  // };

  const nextStep = () => {
    if (currentStep === 1 && !isFormValid) {
        setSubmitResult({ success: false, message: 'Por favor complete todos los campos obligatorios del formulario.' });
        return;
    }
     if (currentStep === 1 && !formData.consent) {
        setSubmitResult({ success: false, message: 'Debe aceptar el tratamiento de datos para continuar.' });
        return;
    }
    if (currentStep === 2 && !isFaceValid) {
        setSubmitResult({ success: false, message: 'Por favor complete la captura facial correctamente.' });
        return;
    }
    // Añadir validación para el paso 3 si es necesario
    // if (currentStep === 3 && !isIdValid) {
    //     setSubmitResult({ success: false, message: 'Por favor complete la verificación de identidad.' });
    //     return;
    // }
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
    if (isFormValid && isFaceValid /* && isIdValid */ && formData.consent) {
      setIsSubmitting(true);
      setSubmitResult({ success: null, message: '' });
      
      try {
        const dataToSend = {
          ...formData,
          faceData,
          faceImage: capturedImage,
          // idData, // Incluir datos de ID si existen
        };
        
        const response = await fetch('http://localhost:5000/api/visitors', {

        // Enviar datos al backend
        //const response = await fetch('https://2364-45-171-182-198.ngrok-free.app/api/visitors', {

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
            message: '¡Registro completado con éxito! La página se recargará en 3 segundos.' 
          });
          setTimeout(() => {
            window.location.reload();
          }, 3000); // Aumentado a 3 segundos
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
      // if (!isIdValid) errorMessage += 'Verificación de identidad, ';
      errorMessage = errorMessage.slice(0, -2) + '.'; // Remover la última coma y espacio
      
      setSubmitResult({ 
        success: false, 
        message: errorMessage 
      });
    }
  };
  
  return (
    <div className="registration-page">
      <h1>REGISRO DE VISITANTES - Paso {currentStep} de 3</h1> {/* Actualizado para mostrar el paso */}
      
      {submitResult.message && (
        <div className={`result-message ${submitResult.success === true ? 'success' : submitResult.success === false ? 'error' : ''}`}>
          {submitResult.message}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        {/* Renderizado condicional basado en el paso actual */}
        {currentStep === 1 && (
          <div className="step-container form-section">
            <RegistrationForm 
              formData={formData} 
              onChange={handleFormChange} 
            />
          </div>
        )}
        
        {currentStep === 2 && (
          <div className="step-container face-recognition-section">
             {/* Asegúrate de pasar la imagen capturada si quieres mostrarla */}
            <FaceRecognition 
              onFaceCapture={handleFaceCapture}
              initialCapturedImage={capturedImage} // Pasa la imagen si ya fue capturada
            />
          </div>
        )}

        {currentStep === 3 && (
           <div className="step-container id-verification-section">
            <h2>Paso 3: Verificación de Identidad</h2>
            <p>Aquí iría el componente para cargar o capturar el documento de identidad.</p>
            {/* <IDVerification onVerify={handleIdVerification} /> */}
            {/* Placeholder hasta crear el componente */}
            <p style={{padding: "20px", border: "1px dashed #ccc", textAlign: "center"}}>
              (Componente de Verificación de ID pendiente)
            </p>
          </div>
        )}

        {/* Botones de navegación y envío */}
        <div className="navigation-buttons">
          {currentStep > 1 && (
            <button type="button" onClick={prevStep} disabled={isSubmitting}>
              Anterior
            </button>
          )}
          
          {currentStep < 3 && ( // Cambiado de 3 a 2 si IDVerification no está listo
            <button type="button" onClick={nextStep} disabled={isSubmitting}>
              Siguiente
            </button>
          )}
          
          {currentStep === 3 && ( // Mostrar botón de envío en el último paso
            <button 
              type="submit" 
              disabled={!isFormValid || !isFaceValid || !formData.consent /* || !isIdValid */ || isSubmitting}
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
