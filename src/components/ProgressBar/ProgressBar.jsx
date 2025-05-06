import React from 'react';
import './ProgressBar.css';

function ProgressBar({ currentStep, totalSteps }) {
  const progressPercentage = (currentStep / totalSteps) * 100;

  return (
    <div className="progress-bar-container">
      <div 
        className="progress-bar-fill" 
        style={{ width: `${progressPercentage}%` }}
      >
        {/* Opcional: Mostrar el porcentaje o el paso actual */}
        {/* <span className="progress-bar-text">{`${Math.round(progressPercentage)}%`}</span> */}
      </div>
    </div>
  );
}

export default ProgressBar;