import React, { useRef, useEffect, useState } from 'react';
import * as faceapi from 'face-api.js';
import './FaceRecognition.css';

function FaceRecognition({ onFaceCapture }) {
  // Referencias y estados básicos
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [feedback, setFeedback] = useState('Esperando carga de modelos...');
  const [isHuman, setIsHuman] = useState(false);
  const [isAdult, setIsAdult] = useState(false);
  const [faceEmbeddings, setFaceEmbeddings] = useState(null);
  
  // Estados para la detección de vida
  const [captureStep, setCaptureStep] = useState(0); // 0: no iniciado, 1: frontal, 2: derecha, 3: izquierda, 4: completado
  const [capturedImages, setCapturedImages] = useState({
    frontal: null,
    right: null,
    left: null
  });
  const [faceEmbeddingsMulti, setFaceEmbeddingsMulti] = useState({
    frontal: null,
    right: null,
    left: null
  });
  const [faceAngle, setFaceAngle] = useState(0); // Ángulo estimado de rotación del rostro
  const [livenessVerified, setLivenessVerified] = useState(false);
  
  // Cargar modelos de face-api.js
  useEffect(() => {
    const loadModels = async () => {
      setFeedback('Cargando modelos de reconocimiento facial...');
      
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
        
        setIsModelLoaded(true);
        setFeedback('Modelos cargados. Active la cámara para comenzar.');
      } catch (error) {
        console.error('Error al cargar modelos:', error);
        setFeedback('Error al cargar modelos. Intente recargar la página.');
      }
    };
    
    loadModels();
  }, []);
  
  // Iniciar la cámara
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
        setFeedback('Cámara activada. Posicione su rostro frente a la cámara.');
      }
    } catch (error) {
      console.error('Error al acceder a la cámara:', error);
      setFeedback('Error al acceder a la cámara. Verifique los permisos.');
    }
  };
  
  // Detener la cámara
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCameraActive(false);
      setFeedback('Cámara desactivada.');
    }
  };
  
  // Alternar cámara
  const toggleCamera = () => {
    if (isCameraActive) {
      stopCamera();
      // Reiniciar el proceso de captura si está en curso
      if (captureStep > 0 && captureStep < 4) {
        resetCapture();
      }
    } else {
      startCamera();
    }
  };
  
  // Calcular el ángulo de rotación del rostro basado en landmarks
  const calculateFaceAngle = (landmarks) => {
    if (!landmarks) return 0;
    
    try {
      // Obtener puntos de referencia para calcular el ángulo
      const leftEye = landmarks.getLeftEye();
      const rightEye = landmarks.getRightEye();
      
      // Calcular los centros de los ojos
      const leftEyeCenter = {
        x: leftEye.reduce((sum, point) => sum + point.x, 0) / leftEye.length,
        y: leftEye.reduce((sum, point) => sum + point.y, 0) / leftEye.length
      };
      
      const rightEyeCenter = {
        x: rightEye.reduce((sum, point) => sum + point.x, 0) / rightEye.length,
        y: rightEye.reduce((sum, point) => sum + point.y, 0) / rightEye.length
      };
      
      // Calcular la diferencia en el eje X entre los ojos
      const eyeDistanceX = rightEyeCenter.x - leftEyeCenter.x;
      
      // Calcular el ángulo basado en la proporción de la distancia entre los ojos
      // Cuando el rostro está de frente, la distancia es máxima
      // Cuando gira, la distancia se reduce
      
      // Obtener la nariz para referencia adicional
      const nose = landmarks.getNose();
      const noseTip = nose[3]; // Punta de la nariz
      
      // Calcular el punto medio entre los ojos
      const midPoint = {
        x: (leftEyeCenter.x + rightEyeCenter.x) / 2,
        y: (leftEyeCenter.y + rightEyeCenter.y) / 2
      };
      
      // Calcular el desplazamiento horizontal de la nariz respecto al punto medio
      const noseOffset = noseTip.x - midPoint.x;
      
      // Normalizar el offset y convertirlo a un ángulo estimado
      // Valores negativos indican giro a la izquierda, positivos a la derecha
      const maxOffset = eyeDistanceX / 2; // Offset máximo estimado
      const normalizedOffset = noseOffset / maxOffset;
      
      // Convertir a ángulos (aproximadamente -45 a 45 grados)
      const angle = normalizedOffset * 45;
      
      return angle;
    } catch (error) {
      console.error('Error al calcular ángulo facial:', error);
      return 0;
    }
  };
  
  // Verificar si el ángulo cumple con los requisitos del paso actual
  const verifyAngleForStep = (angle, step) => {
    switch (step) {
      case 1: // Frontal
        return Math.abs(angle) < 15; // Casi de frente
      case 2: // Derecha
        return angle > 20; // Girado a la derecha
      case 3: // Izquierda
        return angle < -20; // Girado a la izquierda
      default:
        return false;
    }
  };
  
  // Procesar el video para detección facial
  const handleVideoPlay = () => {
    if (!isModelLoaded || isDetecting || !isCameraActive) return;
    
    setIsDetecting(true);
    
    // Actualizar el mensaje según el paso de captura
    if (captureStep === 1) {
      setFeedback('Paso 1: Mantenga su rostro mirando al frente...');
    } else if (captureStep === 2) {
      setFeedback('Paso 2: Gire lentamente su rostro hacia la derecha...');
    } else if (captureStep === 3) {
      setFeedback('Paso 3: Gire lentamente su rostro hacia la izquierda...');
    } else {
      setFeedback('Analizando rostro...');
    }
    
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
            
            // Calcular el ángulo de rotación del rostro
            const angle = calculateFaceAngle(detection.landmarks);
            setFaceAngle(angle);
            
            setIsHuman(true);
            setIsAdult(age >= 18);
            setFaceEmbeddings(descriptor);
            
            // Dibujar información de edad y ángulo
            ctx.font = '16px Arial';
            ctx.fillStyle = age >= 18 ? 'green' : 'red';
            ctx.fillText(`Edad: ${age} años`, 10, 25);
            
            // Mostrar el ángulo de rotación
            ctx.fillStyle = 'blue';
            ctx.fillText(`Ángulo: ${Math.round(angle)}°`, 10, 50);
            
            // Mostrar instrucción según el paso actual
            if (captureStep > 0 && captureStep < 4) {
              ctx.fillStyle = verifyAngleForStep(angle, captureStep) ? 'green' : 'orange';
              let stepText = '';
              let angleText = '';
              
              if (captureStep === 1) {
                stepText = 'Mire al frente';
                angleText = Math.abs(angle) < 15 ? '✓' : 'Alinee su rostro';
              } else if (captureStep === 2) {
                stepText = 'Gire a la derecha';
                angleText = angle > 20 ? '✓' : 'Gire más';
              } else if (captureStep === 3) {
                stepText = 'Gire a la izquierda';
                angleText = angle < -20 ? '✓' : 'Gire más';
              }
              
              ctx.fillText(stepText, 10, 75);
              ctx.fillText(angleText, 10, 100);
            }
            
            if (age < 18) {
              setFeedback(`Edad detectada: ${age} años. Se requiere ser mayor de 18 años.`);
              onFaceCapture(null, false);
            } else if (captureStep === 0) {
              setFeedback(`Rostro válido detectado. Edad: ${age} años. Presione "Iniciar Verificación" para comenzar el proceso.`);
            }
          } else {
            setIsHuman(false);
            setIsAdult(false);
            setFaceEmbeddings(null);
            setFaceAngle(0);
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

  // Función para capturar la imagen actual
  const captureCurrentImage = () => {
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convertir a base64 para almacenar/mostrar
    return canvas.toDataURL('image/jpeg');
  };

  // Iniciar el proceso de verificación de vida
  const startLivenessCheck = () => {
    if (isHuman && isAdult && faceEmbeddings && isCameraActive) {
      setCaptureStep(1);
      setFeedback('Paso 1: Mantenga su rostro mirando al frente y presione "Capturar" cuando esté listo');
      
      // Reiniciar los datos de captura
      setCapturedImages({
        frontal: null,
        right: null,
        left: null
      });
      
      setFaceEmbeddingsMulti({
        frontal: null,
        right: null,
        left: null
      });
      
      setLivenessVerified(false);
    } else {
      setFeedback('No se puede iniciar la verificación. Asegúrese de que su rostro sea visible y sea mayor de 18 años.');
    }
  };

  // Capturar el rostro en el paso actual
  const handleCapture = () => {
    if (!isHuman || !isAdult || !faceEmbeddings || !isCameraActive) {
      setFeedback('No se puede capturar. Asegúrese de que su rostro sea visible y sea mayor de 18 años.');
      return;
    }
    
    // Verificar si el ángulo es correcto para el paso actual
    if (!verifyAngleForStep(faceAngle, captureStep)) {
      setFeedback(`Posición incorrecta. Por favor, ${
        captureStep === 1 ? 'mire al frente' : 
        captureStep === 2 ? 'gire más a la derecha' : 
        'gire más a la izquierda'
      } antes de capturar.`);
      return;
    }
    
    const imageData = captureCurrentImage();
    
    // Actualizar los datos según el paso actual
    if (captureStep === 1) {
      // Captura frontal
      setCapturedImages(prev => ({ ...prev, frontal: imageData }));
      setFaceEmbeddingsMulti(prev => ({ ...prev, frontal: faceEmbeddings }));
      setCaptureStep(2);
      setFeedback('Paso 2: Gire lentamente su rostro hacia la derecha y presione "Capturar"');
    } else if (captureStep === 2) {
      // Captura derecha
      setCapturedImages(prev => ({ ...prev, right: imageData }));
      setFaceEmbeddingsMulti(prev => ({ ...prev, right: faceEmbeddings }));
      setCaptureStep(3);
      setFeedback('Paso 3: Gire lentamente su rostro hacia la izquierda y presione "Capturar"');
    } else if (captureStep === 3) {
      // Captura izquierda
      setCapturedImages(prev => ({ ...prev, left: imageData }));
      setFaceEmbeddingsMulti(prev => ({ ...prev, left: faceEmbeddings }));
      setCaptureStep(4);
      
      // Verificar que se hayan completado todos los pasos
      setLivenessVerified(true);
      
      // Enviar los datos combinados
      const combinedData = {
        embeddings: {
          frontal: faceEmbeddingsMulti.frontal,
          right: faceEmbeddingsMulti.right,
          left: faceEmbeddings // El actual es el izquierdo
        },
        images: {
          frontal: capturedImages.frontal,
          right: capturedImages.right,
          left: imageData
        },
        livenessVerified: true
      };
      
      // Enviar los datos al componente padre
      onFaceCapture(combinedData, true, capturedImages.frontal); // Usar la imagen frontal como principal
      setFeedback('¡Verificación de vida completada con éxito! Se han guardado los datos faciales desde múltiples ángulos.');
    }
  };

  // Reiniciar el proceso de captura
  const resetCapture = () => {
    setCaptureStep(0);
    setCapturedImages({
      frontal: null,
      right: null,
      left: null
    });
    setFaceEmbeddingsMulti({
      frontal: null,
      right: null,
      left: null
    });
    setLivenessVerified(false);
    setFeedback('Proceso de verificación reiniciado. Presione "Iniciar Verificación" para comenzar de nuevo.');
  };

  return (
    <div className="face-recognition">
      <h2>RECONOCIMIENTO FACIAL CON VERIFICACIÓN DE VIDA</h2>
      
      <div className="video-container">
        {captureStep === 4 ? (
          <div className="captured-images-grid">
            <div className="captured-image-container">
              <img src={capturedImages.frontal} alt="Rostro frontal" className="captured-image" />
              <span className="capture-label">Frontal</span>
            </div>
            <div className="captured-image-container">
              <img src={capturedImages.right} alt="Rostro derecha" className="captured-image" />
              <span className="capture-label">Derecha</span>
            </div>
            <div className="captured-image-container">
              <img src={capturedImages.left} alt="Rostro izquierda" className="captured-image" />
              <span className="capture-label">Izquierda</span>
            </div>
          </div>
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
          
          {livenessVerified && (
            <span className="status-indicator success">Verificación de vida ✓</span>
          )}
          
          {captureStep > 0 && captureStep < 4 && (
            <span className="status-indicator info">
              Paso {captureStep} de 3
            </span>
          )}
        </div>
        
        {captureStep > 0 && (
          <div className="capture-steps">
            <div className={`step-indicator ${captureStep >= 1 ? 'active' : ''} ${captureStep > 1 ? 'completed' : ''}`}>
              Frontal
            </div>
            <div className={`step-indicator ${captureStep >= 2 ? 'active' : ''} ${captureStep > 2 ? 'completed' : ''}`}>
              Derecha
            </div>
            <div className={`step-indicator ${captureStep >= 3 ? 'active' : ''} ${captureStep > 3 ? 'completed' : ''}`}>
              Izquierda
            </div>
          </div>
        )}
      </div>
      
      <div className="button-container">
        <button 
          className={`camera-button ${isCameraActive ? 'active' : ''}`} 
          onClick={toggleCamera}
          disabled={!isModelLoaded}
        >
          {isCameraActive ? 'Desactivar Cámara' : 'Activar Cámara'}
        </button>
        
        {captureStep === 0 && (
          <button 
            className="capture-button" 
            onClick={startLivenessCheck}
            disabled={!isHuman || !isAdult || !faceEmbeddings || !isCameraActive}
          >
            Iniciar Verificación
          </button>
        )}
        
        {captureStep > 0 && captureStep < 4 && (
          <button 
            className="capture-button" 
            onClick={handleCapture}
            disabled={!isHuman || !isAdult || !faceEmbeddings || !isCameraActive || !verifyAngleForStep(faceAngle, captureStep)}
          >
            Capturar {captureStep === 1 ? 'Frontal' : captureStep === 2 ? 'Derecha' : 'Izquierda'}
          </button>
        )}
        
        {captureStep > 0 && (
          <button 
            className="reset-button" 
            onClick={resetCapture}
          >
            Reiniciar
          </button>
        )}
      </div>
    </div>
  );
}

export default FaceRecognition;