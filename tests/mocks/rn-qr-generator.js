// Mock for rn-qr-generator in development
// This prevents the "Could not find module RNQrGenerator" error

const RNQRGenerator = {
  detect: (options) => {
    console.log("📱 QR scanning not available in development mode");
    return Promise.reject({
      message: "QR scanning requires a native build. Use Expo Dev Client or production build."
    });
  },
};

export default RNQRGenerator;
