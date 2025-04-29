import React, { useState } from 'react';
import RegistrationForm from '../../components/RegistrationForm/RegistrationForm';
import FaceRecognition from '../../components/FaceRecognition/FaceRecognition';
import './RegistrationPage.css';

function RegistrationPage() {
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
  const [isFormValid, setIsFormValid] = useState(false);
  const [isFaceValid, setIsFaceValid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState({ success: false, message: '' });
  
  const handleFormChange = (newFormData, isValid) => {
    setFormData(newFormData);
    setIsFormValid(isValid);
  };
  
  const handleFaceCapture = (faceEmbeddings, isValid, imageData) => {
    setFaceData(faceEmbeddings);
    setIsFaceValid(isValid);
    setCapturedImage(imageData);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isFormValid && isFaceValid) {
      setIsSubmitting(true);
      setSubmitResult({ success: false, message: '' });
      
      try {
        // Preparar datos para enviar al backend
        const dataToSend = {
          ...formData,
          faceData,
          faceImage: capturedImage
        };
        
        // Enviar datos al backend
        const response = await fetch('http://localhost:5000/api/visitors', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(dataToSend),
        });
        
        const result = await response.json();
        
        if (response.ok) {
          // Registro exitoso
          setSubmitResult({ 
            success: true, 
            message: '¡Registro completado con éxito! La página se recargará en 3 segundos.' 
          });
          
          // Recargar la página después de 3 segundos
          setTimeout(() => {
            window.location.reload();
          }, 3000);
        } else {
          // Error en el registro
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
      setSubmitResult({ 
        success: false, 
        message: 'Por favor complete todos los campos requeridos y realice la validación facial.' 
      });
    }
  };
  
  return (
    <div className="registration-page">
      <h1>REGISRO DE VISITANTES</h1>
      
      {submitResult.message && (
        <div className={`result-message ${submitResult.success ? 'success' : 'error'}`}>
          {submitResult.message}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="registration-container">
          <div className="form-section">
            <RegistrationForm 
              formData={formData} 
              onChange={handleFormChange} 
            />
          </div>
          <div className="face-recognition-section">
            <FaceRecognition 
              onFaceCapture={handleFaceCapture} 
            />
          </div>
        </div>
        <div className="submit-section">
          <button 
            type="submit" 
            disabled={!isFormValid || !isFaceValid || isSubmitting}
          >
            {isSubmitting ? 'Enviando...' : 'Completar Registro'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default RegistrationPage;