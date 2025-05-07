import React from 'react';
import './FaceWarning.css';

function FaceWarning() {
  return (
    <div className="face-warning-container">
      <div className="warning-header">
        <h2>ADVERTENCIAS IMPORTANTES</h2>
        <p className="subtitle">Por favor, lea atentamente antes de continuar</p>
      </div>

      <div className="warning-content">
        <div className="warning-section">
          <h3>Requisitos para el Reconocimiento Facial</h3>
          <ul>
            <li>Asegúrese de estar en un lugar bien iluminado</li>
            <li>Retire cualquier accesorio que cubra su rostro (gafas de sol, gorras, etc.)</li>
            <li>Mantenga su rostro centrado y mirando directamente a la cámara</li>
            <li>Evite movimientos bruscos durante la captura</li>
          </ul>
        </div>

        <div className="warning-section">
          <h3>Consideraciones Técnicas</h3>
          <ul>
            <li>Permita el acceso a la cámara cuando el navegador lo solicite</li>
            <li>Utilice un dispositivo con cámara frontal de buena calidad</li>
            <li>Asegúrese de tener una conexión estable a internet</li>
            <li>Se recomienda usar navegadores actualizados (Chrome, Firefox, Edge)</li>
          </ul>
        </div>

        <div className="warning-section">
          <h3>Protección de Datos</h3>
          <ul>
            <li>Sus datos biométricos serán tratados con estricta confidencialidad</li>
            <li>La información recopilada será utilizada únicamente para fines de identificación</li>
            <li>Puede solicitar la eliminación de sus datos en cualquier momento</li>
          </ul>
        </div>
      </div>

      <div className="warning-footer">
        <p className="note">Nota: El proceso de reconocimiento facial es seguro y rápido. Si experimenta algún problema, por favor contacte al personal de soporte.</p>
      </div>
    </div>
  );
}

export default FaceWarning;