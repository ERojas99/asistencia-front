// Configuración de las rutas de la API
const API_CONFIG = {
    // URL base de la API
      BASE_URL: import.meta.env.VITE_API_BASE_URL,
    
    // Rutas específicas
    ENDPOINTS: {
        // Visitantes
        VISITORS: {
            CHECK_EMAIL: (email) => `/api/visitors/check-email/${email}`,
            REGISTER: '/api/visitors/visitors',
            VALIDATE_FACE: '/api/visitors/validate-face',
        },
        
        // Reconocimiento facial
        FACE: {
            VERIFY: '/api/face/verify',
            VALIDATE: '/api/face/validate',
        }
    }
};

export default API_CONFIG;
