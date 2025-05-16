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
  const [correctPose, setCorrectPose] = useState(false);
  
  // Estado para el modal de instrucciones - Inicializado como true para mostrar al cargar
  const [showInstructions, setShowInstructions] = useState(true);
  
  const [captureStep, setCaptureStep] = useState(0); // 0: no iniciado, 1: frontal, 2: derecha, 3: izquierda, 4: arriba, 5: abajo, 6: completado
  const [capturedImages, setCapturedImages] = useState({
    frontal: null,
    right: null,
    left: null,
    up: null,
    down: null
  });
  const [faceEmbeddingsMulti, setFaceEmbeddingsMulti] = useState({
    frontal: null,
    right: null,
    left: null,
    up: null,
    down: null
  });
  const [faceAngle, setFaceAngle] = useState({ horizontal: 0, vertical: 0 }); // Ángulos estimados de rotación del rostro
  const [livenessVerified, setLivenessVerified] = useState(false);
  
  // Estados para la captura automática
  const [correctPoseTime, setCorrectPoseTime] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureCountdown, setCaptureCountdown] = useState(0);
  
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
        setFeedback('Modelos cargados. Iniciando cámara automáticamente...');
        
        // Iniciar la cámara automáticamente después de cargar los modelos
        startCamera();
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
      // Verificar si navigator.mediaDevices está disponible
      if (!navigator.mediaDevices) {
        // Intentar usar el método antiguo como fallback
        if (navigator.getUserMedia || navigator.webkitGetUserMedia || 
            navigator.mozGetUserMedia || navigator.msGetUserMedia) {
          
          const getUserMedia = navigator.getUserMedia || 
                              navigator.webkitGetUserMedia || 
                              navigator.mozGetUserMedia || 
                              navigator.msGetUserMedia;
          
          getUserMedia(
            { video: { width: 640, height: 480 } },
            (stream) => {
              if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setIsCameraActive(true);
                setFeedback('Cámara activada. Posicione su rostro frente a la cámara.');
              }
            },
            (error) => {
              console.error('Error al acceder a la cámara (método antiguo):', error);
              setFeedback('No se pudo acceder a la cámara. Por favor, verifique los permisos o intente con otro navegador.');
            }
          );
          return;
        }
        
        throw new Error('navigator.mediaDevices no está disponible en este navegador');
      }
      
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
      setFeedback('Error al acceder a la cámara. Verifique los permisos o intente con otro navegador.');
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
    if (!landmarks) return { horizontal: 0, vertical: 0 };
    
    try {
      // Obtener puntos de referencia para calcular el ángulo horizontal
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
      const horizontalAngle = normalizedOffset * 45;
      
      // Calcular ángulo vertical
      // Obtener puntos de referencia para el ángulo vertical
      const chin = landmarks.getJawOutline()[8]; // Punto del mentón
      const foreheadPoint = landmarks.getJawOutline()[0]; // Punto superior de la mandíbula
      
      // Calcular la relación entre la posición vertical de la nariz y la distancia entre la frente y el mentón
      const faceHeight = chin.y - foreheadPoint.y;
      const noseVerticalPosition = noseTip.y - foreheadPoint.y;
      const normalizedVerticalPosition = (noseVerticalPosition / faceHeight) - 0.5; // Normalizar alrededor de 0
      
      // Convertir a ángulos (aproximadamente -30 a 30 grados)
      const verticalAngle = normalizedVerticalPosition * 60;
      
      return { horizontal: horizontalAngle, vertical: verticalAngle };
    } catch (error) {
      console.error('Error al calcular ángulo facial:', error);
      return { horizontal: 0, vertical: 0 };
    }
  };
  
  // Verificar si el ángulo cumple con los requisitos del paso actual
  const verifyAngleForStep = (angle, step) => {
    switch (step) {
      case 1: // Frontal
        return Math.abs(angle.horizontal) < 15 && Math.abs(angle.vertical) < 15; // Casi de frente
      case 2: // Derecha
        return angle.horizontal > 20 && Math.abs(angle.vertical) < 15; // Girado a la derecha
      case 3: // Izquierda
        return angle.horizontal < -20 && Math.abs(angle.vertical) < 15; // Girado a la izquierda
      case 4: // Arriba
        return Math.abs(angle.horizontal) < 15 && angle.vertical < -20; // Mirando hacia arriba
      case 5: // Abajo
        return Math.abs(angle.horizontal) < 15 && angle.vertical > 5; // Mirando hacia abajo
      default:
        return false;
    }
  };
  
  // Efecto para manejar la captura automática cuando se detecta la posición correcta
  useEffect(() => {
    if (captureStep > 0 && captureStep < 6 && isHuman && isAdult && faceEmbeddings && isCameraActive) {
      if (verifyAngleForStep(faceAngle, captureStep)) {
        // Si la posición es correcta, capturar inmediatamente
        console.log('Posición correcta detectada, capturando inmediatamente');
        handleCapture();
      }
    }
  }, [faceAngle, captureStep, isHuman, isAdult, faceEmbeddings, isCameraActive]);
  
  // Efecto para iniciar automáticamente el proceso de captura cuando se detecta un rostro adulto
  useEffect(() => {
    if (isHuman && isAdult && faceEmbeddings && isCameraActive && captureStep === 0) {
      console.log('Rostro adulto detectado, iniciando proceso de verificación automáticamente');
      setFeedback('Rostro detectado. Iniciando verificación automática...');
      // Iniciar el proceso de captura automáticamente
      startCapture();
    }
  }, [isHuman, isAdult, faceEmbeddings, isCameraActive, captureStep]);
  
  // Eliminar o simplificar el efecto de cuenta regresiva ya que no lo necesitamos
  useEffect(() => {
    let countdownTimer;
    
    if (isCapturing && captureCountdown > 0) {
      console.log(`Cuenta regresiva: ${captureCountdown}`);
      countdownTimer = setTimeout(() => {
        setCaptureCountdown(prev => prev - 1);
      }, 1000);
    } else if (isCapturing && captureCountdown === 0) {
      // Cuando la cuenta regresiva llega a 0, capturar automáticamente
      console.log('Ejecutando captura automática');
      handleCapture();
    }
    
    return () => {
      if (countdownTimer) clearTimeout(countdownTimer);
    };
  }, [isCapturing, captureCountdown]);
  
  // Función para iniciar el proceso de captura
  const startCapture = () => {
    if (captureStep === 0) {
      setCaptureStep(1);
      setFeedback('Mantenga su rostro mirando al frente');
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
    } else if (captureStep === 4) {
      setFeedback('Paso 4: Incline su rostro hacia arriba...');
    } else if (captureStep === 5) {
      setFeedback('Paso 5: Incline su rostro hacia abajo...');
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
            const angles = calculateFaceAngle(detection.landmarks);
            setFaceAngle(angles);
            
            setIsHuman(true);
            setIsAdult(age >= 18);
            setFaceEmbeddings(descriptor);
            
            // Dibujar información de edad y ángulo
            ctx.font = '16px Arial';
            ctx.fillStyle = age >= 18 ? 'green' : 'red';
            ctx.fillText(`Edad: ${age} años`, 10, 25);
            
            // Mostrar el ángulo de rotación
            ctx.fillStyle = 'blue';
            ctx.fillText(`Ángulo H: ${Math.round(angles.horizontal)}°`, 10, 50);
            ctx.fillText(`Ángulo V: ${Math.round(angles.vertical)}°`, 10, 75);
            
            // Mostrar instrucción según el paso actual
            if (captureStep > 0 && captureStep < 6) {
              const isCorrectAngle = verifyAngleForStep(angles, captureStep);
              ctx.fillStyle = isCorrectAngle ? 'green' : 'orange';
              let stepText = '';
              let angleText = '';
              
              if (captureStep === 1) {
                stepText = 'Mire al frente';
                angleText = Math.abs(angles.horizontal) < 15 && Math.abs(angles.vertical) < 15 ? '✓' : 'Alinee su rostro';
              } else if (captureStep === 2) {
                stepText = 'Gire a la derecha';
                angleText = angles.horizontal > 20 ? '✓' : 'Gire más';
              } else if (captureStep === 3) {
                stepText = 'Gire a la izquierda';
                angleText = angles.horizontal < -20 ? '✓' : 'Gire más';
              } else if (captureStep === 4) {
                stepText = 'Mire hacia arriba';
                angleText = angles.vertical < -15 ? '✓' : 'Incline más hacia arriba';
              } else if (captureStep === 5) {
                stepText = 'Mire hacia abajo';
                angleText = angles.vertical > 15 ? '✓' : 'Incline más hacia abajo';
              }
              
              ctx.fillText(stepText, 10, 100);
              ctx.fillText(angleText, 10, 125);
              
              // Mostrar barra de progreso para la captura automática
              if (isCorrectAngle) {
                const progressWidth = (correctPoseTime / 2000) * 100;
                ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
                ctx.fillRect(10, canvas.height - 30, progressWidth * (canvas.width - 20) / 100, 20);
                ctx.strokeStyle = 'green';
                ctx.strokeRect(10, canvas.height - 30, canvas.width - 20, 20);
                
                // Mostrar cuenta regresiva si está activa
                if (isCapturing && captureCountdown > 0) {
                  ctx.font = '24px Arial';
                  ctx.fillStyle = 'white';
                  ctx.textAlign = 'center';
                  ctx.fillText(`Capturando en ${captureCountdown}...`, canvas.width / 2, canvas.height - 40);
                }
              }
            }
            
            if (age < 18) {
              setFeedback(`Edad detectada: ${age} años. Se requiere ser mayor de 18 años.`);
              onFaceCapture(null, false);
            } else if (captureStep === 0) {
              setFeedback(`Rostro válido detectado. Edad: ${age} años.`);
            } else if (captureStep > 0 && captureStep < 6) {
              // Actualizar feedback con instrucciones para la captura automática
              const isCorrectAngle = verifyAngleForStep(angles, captureStep);
              if (isCorrectAngle) {
                if (isCapturing) {
                  setFeedback(`Mantenga la posición. Capturando en ${captureCountdown} segundos...`);
                } else {
                  setFeedback(`Posición correcta. Mantenga esta posición para capturar automáticamente...`);
                }
              } else {
                setFeedback(`Paso ${captureStep}: ${
                  captureStep === 1 ? 'Mire al frente' : 
                  captureStep === 2 ? 'Gire lentamente su rostro hacia la derecha' : 
                  captureStep === 3 ? 'Gire lentamente su rostro hacia la izquierda' :
                  captureStep === 4 ? 'Incline su rostro hacia arriba' :
                  'Incline su rostro hacia abajo'
                }`);
              }
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
    
    // Verificar que el video existe y tiene dimensiones válidas
    if (!video || !video.videoWidth || !video.videoHeight) {
      console.error('Error: El elemento de video no está disponible o no tiene dimensiones válidas');
      return null;
    }
    
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
      setFeedback('Paso 1: Mantenga su rostro mirando al frente para la captura automática');
      
      // Reiniciar los datos de captura
      setCapturedImages({
        frontal: null,
        right: null,
        left: null,
        up: null,
        down: null
      });
      
      setFaceEmbeddingsMulti({
        frontal: null,
        right: null,
        left: null,
        up: null,
        down: null
      });
      
      setLivenessVerified(false);
      setCorrectPoseTime(0);
      setIsCapturing(false);
      setCaptureCountdown(0);
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
      let mensaje = 'Posición incorrecta. Por favor, ';
      if (captureStep === 1) {
        mensaje += 'mire al frente';
      } else if (captureStep === 2) {
        mensaje += 'gire más a la derecha';
      } else if (captureStep === 3) {
        mensaje += 'gire más a la izquierda';
      } else if (captureStep === 4) {
        mensaje += 'incline más su rostro hacia arriba';
      } else if (captureStep === 5) {
        mensaje += 'incline más su rostro hacia abajo';
      }
      mensaje += ' antes de capturar.';
      setFeedback(mensaje);
      return;
    }
    
    const imageData = captureCurrentImage();
    
    // Verificar que se obtuvo una imagen válida
    if (!imageData) {
      setFeedback('Error al capturar la imagen. Por favor, inténtelo de nuevo.');
      return;
    }
    
    // Actualizar los datos según el paso actual
    if (captureStep === 1) {
      // Captura frontal
      setCapturedImages(prev => ({ ...prev, frontal: imageData }));
      setFaceEmbeddingsMulti(prev => ({ ...prev, frontal: faceEmbeddings }));
      setCaptureStep(2);
      setFeedback('Paso 2: Gire lentamente su rostro hacia la derecha para la captura automática');
      // Reiniciar los contadores para la siguiente captura
      setCorrectPoseTime(0);
      setIsCapturing(false);
      setCaptureCountdown(0);
    } else if (captureStep === 2) {
      // Captura derecha
      setCapturedImages(prev => ({ ...prev, right: imageData }));
      setFaceEmbeddingsMulti(prev => ({ ...prev, right: faceEmbeddings }));
      setCaptureStep(3);
      setFeedback('Paso 3: Gire lentamente su rostro hacia la izquierda para la captura automática');
      // Reiniciar los contadores para la siguiente captura
      setCorrectPoseTime(0);
      setIsCapturing(false);
      setCaptureCountdown(0);
    } else if (captureStep === 3) {
      // Captura izquierda
      setCapturedImages(prev => ({ ...prev, left: imageData }));
      setFaceEmbeddingsMulti(prev => ({ ...prev, left: faceEmbeddings }));
      setCaptureStep(4);
      setFeedback('Paso 4: Incline su rostro hacia arriba para la captura automática');
      // Reiniciar los contadores para la siguiente captura
      setCorrectPoseTime(0);
      setIsCapturing(false);
      setCaptureCountdown(0);
    } else if (captureStep === 4) {
      // Captura mirando hacia arriba
      setCapturedImages(prev => ({ ...prev, up: imageData }));
      setFaceEmbeddingsMulti(prev => ({ ...prev, up: faceEmbeddings }));
      setCaptureStep(5);
      setFeedback('Paso 5: Incline su rostro hacia abajo para la captura automática');
      // Reiniciar los contadores para la siguiente captura
      setCorrectPoseTime(0);
      setIsCapturing(false);
      setCaptureCountdown(0);
    } else if (captureStep === 5) {
      // Captura mirando hacia abajo
      setCapturedImages(prev => ({ ...prev, down: imageData }));
      setFaceEmbeddingsMulti(prev => ({ ...prev, down: faceEmbeddings }));
      setCaptureStep(6);
      
      // Verificar que se hayan completado todos los pasos
      setLivenessVerified(true);
      
      // Enviar los datos combinados
      const combinedData = {
        embeddings: {
          frontal: faceEmbeddingsMulti.frontal,
          right: faceEmbeddingsMulti.right,
          left: faceEmbeddingsMulti.left,
          up: faceEmbeddingsMulti.up,
          down: faceEmbeddings // El actual es el down
        },
        images: {
          frontal: capturedImages.frontal,
          right: capturedImages.right,
          left: capturedImages.left,
          up: capturedImages.up,
          down: imageData
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
      left: null,
      up: null,
      down: null
    });
    setFaceEmbeddingsMulti({
      frontal: null,
      right: null,
      left: null,
      up: null,
      down: null
    });
    setLivenessVerified(false);
    setCorrectPoseTime(0);
    setIsCapturing(false);
    setCaptureCountdown(0);
    setFeedback('Proceso de verificación reiniciado. Presione "Iniciar Verificación" para comenzar de nuevo.');
  };

  return (
    <div className="face-recognition">
      {captureStep > 0 && captureStep < 6 && (
        <div className="capture-steps">
          <div className="step-indicator active">
            {captureStep === 1 && (
              <div className="step-message">
                <div className="countdown">Preparando verificación...</div>
                <div>Ponga su rostro en posición Frontal</div>
              </div>
            )}
            {captureStep === 2 && "Gire su rostro a la Izquierda"}
            {captureStep === 3 && "Gire su rostro a la Derecha"}
            {captureStep === 4 && "Incline su rostro hacia Arriba"}
            {captureStep === 5 && "Incline su rostro hacia Abajo"}
          </div>
        </div>
      )}
      <div className="video-container">
        {captureStep === 6 ? (
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
            <div className="captured-image-container">
              <img src={capturedImages.up} alt="Rostro arriba" className="captured-image" />
              <span className="capture-label">Arriba</span>
            </div>
            <div className="captured-image-container">
              <img src={capturedImages.down} alt="Rostro abajo" className="captured-image" />
              <span className="capture-label">Abajo</span>
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
              className="mirror-mode"
            />
            <canvas ref={canvasRef} className="overlay-canvas" />
          </>
        )}
      </div>
      
      
      
      <div className="button-container">
        {!isCameraActive && (
          <button 
            className="camera-button"
            onClick={toggleCamera}
            disabled={!isModelLoaded}
          >
            Activar Cámara
          </button>
        )}
        
        
        {captureStep === 0 && (
          <button 
            className="capture-button" 
            onClick={startLivenessCheck}
            disabled={!isHuman || !isAdult || !faceEmbeddings || !isCameraActive}
          >
            Iniciando Verificación...
          </button>
        )}
        
        {/* No hay botón de captura manual - la captura es automática */}
      </div>
    </div>
  );
}

export default FaceRecognition;
