import React, { useRef, useEffect, useState } from 'react';
import * as faceapi from 'face-api.js';
import './FaceRecognition.css';

function FaceRecognition({ onFaceCapture }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [feedback, setFeedback] = useState('Esperando carga de modelos...');
  const [isHuman, setIsHuman] = useState(false);
  const [isAdult, setIsAdult] = useState(false);
  const [faceEmbeddings, setFaceEmbeddings] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);

  // Cargar modelos de face-api.js
  useEffect(() => {
    const loadModels = async () => {
      try {
        // Cambiar esta línea
        const MODEL_URL = '/models';
        
        setFeedback('Cargando modelos de reconocimiento facial...');
        
        // Cargar todos los modelos necesarios
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL)
        ]);
        
        setIsModelLoaded(true);
        setFeedback('Modelos cargados. Haga clic en "Activar Cámara" para comenzar.');
      } catch (error) {
        console.error('Error al cargar los modelos:', error);
        setFeedback('Error al cargar los modelos de reconocimiento facial.');
      }
    };
    
    loadModels();
    
    // Limpiar al desmontar
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = () => {
    if (isCameraActive) return;
    
    navigator.mediaDevices.getUserMedia({ video: {} })
      .then(stream => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsCameraActive(true);
          setFeedback('Cámara activada. Posicione su rostro frente a la cámara.');
        }
      })
      .catch(err => {
        console.error('Error al acceder a la cámara:', err);
        setFeedback('Error al acceder a la cámara. Verifique los permisos del navegador.');
      });
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCameraActive(false);
      setIsDetecting(false);
      
      // Limpiar el canvas
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      
      setFeedback('Cámara desactivada. Haga clic en "Activar Cámara" para comenzar.');
    }
  };

  const toggleCamera = () => {
    if (isCameraActive) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  const handleVideoPlay = () => {
    if (!isModelLoaded || isDetecting || !isCameraActive) return;
    
    setIsDetecting(true);
    setFeedback('Analizando rostro...');
    
    const detectFace = async () => {
      if (videoRef.current && canvasRef.current && !videoRef.current.paused && !videoRef.current.ended) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        // Configurar dimensiones del canvas para que coincida con el video
        const displaySize = { width: video.videoWidth, height: video.videoHeight };
        faceapi.matchDimensions(canvas, displaySize);
        
        try {
          // Detectar rostro con landmarks, descriptores, edad y género
          const detections = await faceapi.detectAllFaces(
            video, 
            new faceapi.TinyFaceDetectorOptions()
          )
          .withFaceLandmarks()
          .withFaceDescriptors()
          .withAgeAndGender();
          
          // Redimensionar resultados al tamaño del canvas
          const resizedDetections = faceapi.resizeResults(detections, displaySize);
          
          // Limpiar canvas y dibujar detecciones
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          // Dibujar cuadro de detección y landmarks
          faceapi.draw.drawDetections(canvas, resizedDetections);
          faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
          
          if (resizedDetections.length > 0) {
            const detection = resizedDetections[0]; // Tomar la primera cara detectada
            const age = Math.round(detection.age);
            const descriptor = Array.from(detection.descriptor); // Convertir a array normal (128 valores)
            
            setIsHuman(true);
            setIsAdult(age >= 18);
            setFaceEmbeddings(descriptor);
            
            // Dibujar información de edad
            ctx.font = '16px Arial';
            ctx.fillStyle = age >= 18 ? 'green' : 'red';
            ctx.fillText(`Edad: ${age} años`, 10, 25);
            
            if (age < 18) {
              setFeedback(`Edad detectada: ${age} años. Se requiere ser mayor de 18 años.`);
              onFaceCapture(null, false);
            } else {
              setFeedback(`Rostro válido detectado. Edad: ${age} años.`);
              onFaceCapture(descriptor, true);
            }
          } else {
            setIsHuman(false);
            setIsAdult(false);
            setFaceEmbeddings(null);
            setFeedback('No se detecta rostro humano. Por favor, posiciónese frente a la cámara.');
            onFaceCapture(null, false);
          }
        } catch (error) {
          console.error('Error en la detección facial:', error);
          setFeedback('Error en el procesamiento facial. Intente nuevamente.');
        }
        
        // Continuar detección si la cámara sigue activa
        if (isCameraActive) {
          requestAnimationFrame(detectFace);
        }
      }
    };
    
    detectFace();
  };

  const handleCapture = () => {
    if (isHuman && isAdult && faceEmbeddings) {
      // Capturar la imagen actual del video
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convertir a base64 para almacenar/mostrar
      const imageData = canvas.toDataURL('image/jpeg');
      setCapturedImage(imageData);
      
      // Enviar los datos faciales y la imagen
      onFaceCapture(faceEmbeddings, true, imageData);
      setFeedback('¡Rostro capturado con éxito! Ahora puede completar el registro.');
    } else {
      setFeedback('No se puede capturar. Asegúrese de que su rostro sea visible y sea mayor de 18 años.');
    }
  };

  return (
    <div className="face-recognition">
      <h2>RECONOCIMIENTO FACIAL</h2>
      
      <div className="video-container">
        {capturedImage ? (
          <img src={capturedImage} alt="Rostro capturado" className="captured-image" />
        ) : (
          <>
            <video 
              ref={videoRef} 
              onPlay={handleVideoPlay} 
              autoPlay 
              muted 
              playsInline
            />
            <canvas ref={canvasRef} className="overlay-canvas" />
          </>
        )}
      </div>
      
      <div className="feedback-container">
        <p className="feedback-message">{feedback}</p>
        
        <div className="status-indicators">
          {isModelLoaded ? (
            <span className="status-indicator success">Modelos cargados ✓</span>
          ) : (
            <span className="status-indicator loading">Cargando modelos...</span>
          )}
          
          {isCameraActive && (
            <span className="status-indicator success">Cámara activa ✓</span>
          )}
          
          {isHuman && (
            <span className="status-indicator success">Rostro humano ✓</span>
          )}
          
          {isAdult && (
            <span className="status-indicator success">Mayor de edad ✓</span>
          )}
          
          {capturedImage && (
            <span className="status-indicator success">Imagen guardada ✓</span>
          )}
        </div>
      </div>
      
      <div className="button-container">
        {!capturedImage ? (
          <>
            <button 
              className={`camera-button ${isCameraActive ? 'active' : ''}`} 
              onClick={toggleCamera}
              disabled={!isModelLoaded}
            >
              {isCameraActive ? 'Desactivar Cámara' : 'Activar Cámara'}
            </button>
            
            <button 
              className="capture-button" 
              onClick={handleCapture}
              disabled={!isHuman || !isAdult || !faceEmbeddings || !isCameraActive}
            >
              Capturar Rostro
            </button>
          </>
        ) : (
          <button 
            className="camera-button" 
            onClick={() => {
              setCapturedImage(null);
              startCamera();
            }}
          >
            Volver a Capturar
          </button>
        )}
      </div>
    </div>
  );
}

export default FaceRecognition;