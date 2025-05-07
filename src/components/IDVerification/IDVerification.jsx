import React, { useState, useRef, useEffect } from 'react';
import './IDVerification.css';

function IDVerification({ onVerify, formIdNumber }) {
  const [capturedImage, setCapturedImage] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  // Función para iniciar la cámara
  const startCamera = async () => {
    try {
      const constraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment' // Usar cámara trasera por defecto
        }
      };
      
      console.log('Solicitando acceso a la cámara...');
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Acceso a la cámara concedido');
      
      // Guardar el stream en el estado para poder acceder a él más tarde
      setCameraStream(stream);
      setIsCameraActive(true);
      
    } catch (error) {
      console.error('Error al acceder a la cámara:', error);
      alert('No se pudo acceder a la cámara. Por favor, verifica los permisos.');
    }
  };
  
  // Efecto para asignar el stream al video cuando ambos estén disponibles
  useEffect(() => {
    if (isCameraActive && cameraStream && videoRef.current) {
      console.log('Asignando stream al video');
      videoRef.current.srcObject = cameraStream;
      videoRef.current.onloadedmetadata = () => {
        console.log('Video metadata cargada');
        videoRef.current.play().catch(error => {
          console.error('Error al reproducir el video:', error);
        });
      };
    }
  }, [isCameraActive, cameraStream, videoRef]);
  
  // Función para detener la cámara
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
      setIsCameraActive(false);
    }
  };
  
  // Limpiar al desmontar el componente
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);
  
  // Función para capturar la foto
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      console.error('Referencias no disponibles para capturar foto');
      return;
    }
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    // Establecer dimensiones del canvas según el video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Dibujar el frame actual del video en el canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convertir a base64
    const imageDataUrl = canvas.toDataURL('image/jpeg');
    setCapturedImage(imageDataUrl);
    
    // Detener la cámara después de capturar
    stopCamera();
    
    // Notificar al componente padre
    if (onVerify) {
      onVerify({
        imageData: imageDataUrl,
        verified: true // Siempre consideramos verificado ya que no hay OCR
      }, true);
    }
  };
  
  // Función para reiniciar el proceso
  const resetVerification = () => {
    setCapturedImage(null);
    
    if (onVerify) {
      onVerify(null, false);
    }
  };
  
  return (
    <div className="id-verification">
      <h3>Verificación de Documento de Identidad</h3>
      
      <div className="verification-instructions">
        <p>Por favor, tome una foto clara de la parte frontal de su cédula de ciudadanía colombiana.</p>
      </div>
      
      <div className="id-capture-container">
        {!isCameraActive && !capturedImage && (
          <button 
            type="button" 
            onClick={startCamera} 
            className="camera-button"
          >
            Activar Cámara
          </button>
        )}
        
        {isCameraActive && !capturedImage && (
          <div className="camera-container">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted
              className="camera-preview"
            />
            <div className="camera-overlay">
              <div className="id-frame"></div>
            </div>
            <div className="capture-button-container">
              <button 
                type="button" 
                onClick={capturePhoto} 
                className="capture-button"
              >
                Capturar Foto
              </button>
            </div>
          </div>
        )}
        
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        
        {capturedImage && (
          <div className="preview-container">
            <img src={capturedImage} alt="Foto de cédula" className="id-preview" />
            <div className="verification-success">
              <p>✅ Imagen de cédula capturada correctamente.</p>
            </div>
          </div>
        )}
        
        <div className="verification-actions">
          {capturedImage && (
            <button 
              type="button" 
              onClick={resetVerification} 
              className="reset-button"
            >
              Volver a Capturar CC
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default IDVerification;