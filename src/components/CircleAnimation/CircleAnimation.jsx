import React from 'react';
import './CircleAnimation.css';

function CircleAnimation() {
  return (
    <div className="circle-animation-container">
      {/* Círculos del lado izquierdo */}
      <div className="circle-group left-circles">
        <div className="circle circle-1"></div>
        <div className="circle circle-2"></div>
        <div className="circle circle-3"></div>
      </div>
      
      {/* Círculos del lado derecho */}
      <div className="circle-group right-circles">
        <div className="circle circle-4"></div>
        <div className="circle circle-5"></div>
        <div className="circle circle-6"></div>
      </div>
    </div>
  );
}

export default CircleAnimation;