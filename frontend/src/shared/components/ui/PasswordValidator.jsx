import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

const PasswordValidator = ({ password }) => {
  const [passwordStrength, setPasswordStrength] = React.useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });

  React.useEffect(() => {
    if (password) {
      setPasswordStrength({
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[^A-Za-z0-9]/.test(password),
      });
    } else {
      setPasswordStrength({
        length: false,
        uppercase: false,
        lowercase: false,
        number: false,
        special: false,
      });
    }
  }, [password]);

  const getPasswordStrengthScore = () => {
    return Object.values(passwordStrength).filter(Boolean).length;
  };

  const getPasswordStrengthColor = () => {
    const score = getPasswordStrengthScore();
    if (score <= 2) return "bg-red-500";
    if (score <= 3) return "bg-yellow-500";
    if (score <= 4) return "bg-blue-500";
    return "bg-green-500";
  };

  const getPasswordStrengthText = () => {
    const score = getPasswordStrengthScore();
    if (score <= 2) return "Débil";
    if (score <= 3) return "Regular";
    if (score <= 4) return "Buena";
    return "Excelente";
  };

  if (!password) return null;

  return (
    <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-700">Fortaleza de contraseña:</span>
        <span
          className={`text-sm font-semibold ${
            getPasswordStrengthScore() <= 2
              ? "text-red-600"
              : getPasswordStrengthScore() <= 3
                ? "text-yellow-600"
                : getPasswordStrengthScore() <= 4
                  ? "text-blue-600"
                  : "text-green-600"
          }`}
        >
          {getPasswordStrengthText()}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor()}`}
          style={{ width: `${(getPasswordStrengthScore() / 5) * 100}%` }}
        ></div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center">
          {passwordStrength.length ? (
            <CheckCircle2 className="h-3 w-3 text-green-500 mr-1" />
          ) : (
            <XCircle className="h-3 w-3 text-red-500 mr-1" />
          )}
          <span className="text-gray-600">8+ caracteres</span>
        </div>
        <div className="flex items-center">
          {passwordStrength.uppercase ? (
            <CheckCircle2 className="h-3 w-3 text-green-500 mr-1" />
          ) : (
            <XCircle className="h-3 w-3 text-red-500 mr-1" />
          )}
          <span className="text-gray-600">Mayúscula</span>
        </div>
        <div className="flex items-center">
          {passwordStrength.number ? (
            <CheckCircle2 className="h-3 w-3 text-green-500 mr-1" />
          ) : (
            <XCircle className="h-3 w-3 text-red-500 mr-1" />
          )}
          <span className="text-gray-600">Número</span>
        </div>
        <div className="flex items-center">
          {passwordStrength.special ? (
            <CheckCircle2 className="h-3 w-3 text-green-500 mr-1" />
          ) : (
            <XCircle className="h-3 w-3 text-red-500 mr-1" />
          )}
          <span className="text-gray-600">Símbolo</span>
        </div>
      </div>
    </div>
  );
};

export default PasswordValidator;
