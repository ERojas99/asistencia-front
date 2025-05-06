import React, { useState } from 'react';
// import './IDVerification.css'; // Si necesitas estilos específicos

function IDVerification({ onVerify }) {
  // Lógica para cargar/capturar ID
  const [idFile, setIdFile] = useState(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setIdFile(file);
      // Aquí podrías añadir validación o procesamiento inicial
      // y llamar a onVerify con los datos y el estado de validez
      // onVerify({ fileName: file.name /* ...otros datos... */ }, true); 
      console.log("Archivo de ID seleccionado:", file.name);
       // Placeholder: Asumimos que es válido por ahora si se selecciona un archivo
       if (onVerify) {
         onVerify({ fileName: file.name }, true);
       }
    } else {
       if (onVerify) {
         onVerify(null, false);
       }
    }
  };

  return (
    <div className="id-verification">
      <h3>Cargar Documento de Identidad</h3>
      <input type="file" accept="image/*,.pdf" onChange={handleFileChange} />
      {idFile && <p>Archivo seleccionado: {idFile.name}</p>}
      {/* Aquí podrías añadir una vista previa o más controles */}
    </div>
  );
}

export default IDVerification;