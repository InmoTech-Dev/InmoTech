import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { User, Save, Loader, Mail, Phone, Camera, Shield, Bell, Globe } from 'lucide-react';
import { useAuth } from '../../../../shared/contexts/AuthContext';
import { useToast } from '../../../../shared/hooks/use-toast';
import PasswordConfirmationModal from '../../../../shared/components/dashboard/Header/PasswordConfirmationModal.jsx';
import { API_CONFIG } from '../../../../shared/services/api.config';
import { validateNombres, validateApellidos, validateTelefono } from '../../../../shared/utils/fieldValidations';

const ProfilePage = () => {
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();
  const [formData, setFormData] = useState({});
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [errors, setErrors] = useState({});
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const validators = useRef({
    nombre_completo: validateNombres,
    apellidos: validateApellidos,
    telefono: validateTelefono,
  });

  const mapUserData = useCallback((userData) => {
    const roleName = Array.isArray(userData.roles)
      ? userData.roles
          .map(rol => (typeof rol === 'object' ? rol.nombre_rol || rol.rol || rol.name : rol))
          .find(Boolean)
      : '';

    const nombreCompleto =
      userData.nombre_completo
      || userData.nombre
      || userData.fullName
      || [userData.primer_nombre, userData.segundo_nombre].filter(Boolean).join(' ')
      || userData.nombres
      || roleName
      || '';

    const apellidos =
      userData.apellido_completo
      || userData.apellidos
      || [userData.primer_apellido, userData.segundo_apellido].filter(Boolean).join(' ')
      || '';

    return {
      ...userData,
      nombre_completo: (nombreCompleto || '').trim(),
      apellidos: (apellidos || '').trim(),
      correo: userData.correo || userData.email || '',
      telefono: userData.telefono || '',
      tipo_documento: userData.tipo_documento || '',
      numero_documento: userData.numero_documento || '',
      foto_perfil_url: userData.foto_perfil_url || null,
      foto_public_id: userData.foto_public_id || null,
    };
  }, []);

  useEffect(() => {
    if (user) {
      const mappedData = mapUserData(user);
      setFormData(mappedData);
      setImagePreview(mappedData.foto_perfil_url);
      setProfileImageFile(null);
    }
  }, [user, mapUserData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (validators.current[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: validators.current[name](value),
      }));
    }
  };

  const uploadProfileImage = async (file) => {
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);

    const response = await fetch(`${API_CONFIG.BASE_URL}/files/upload`, {
      method: 'POST',
      body: formDataUpload,
      credentials: 'include'
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Error al subir la imagen');
    }

    return data.data;
  };

  const fileInputRef = useRef(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setProfileImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setProfileImageFile(null);
      setImagePreview(formData.foto_perfil_url);
    }
  };

  const validateProfileForm = () => {
    const newErrors = {
      nombre_completo: validators.current.nombre_completo(formData.nombre_completo || ""),
      apellidos: validators.current.apellidos(formData.apellidos || ""),
      telefono: validators.current.telefono(formData.telefono || ""),
    };

    setErrors(newErrors);
    return Object.values(newErrors).every((msg) => !msg);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateProfileForm()) {
      toast({
        title: "Por favor corrige los errores",
        variant: "destructive",
      });
      return;
    }
    setIsPasswordModalOpen(true);
  };

  const handleConfirmAndUpdate = async () => {
    try {
      setIsLoading(true);
      let uploadResult = null;

      if (profileImageFile) {
        setIsUploadingImage(true);
        uploadResult = await uploadProfileImage(profileImageFile);
        setIsUploadingImage(false);
      }

      const payload = {
        nombre_completo: (formData.nombre_completo || "").trim(),
        apellido_completo: (formData.apellidos || "").trim(),
        telefono: formData.telefono || "",
        foto_perfil_url: uploadResult?.url || formData.foto_perfil_url || null,
        foto_public_id: uploadResult?.public_id || formData.foto_public_id || null
      };

      const updatedUser = await updateProfile(payload);
      if (updatedUser) {
        const mappedData = mapUserData(updatedUser);
        setFormData(mappedData);
        setImagePreview(mappedData.foto_perfil_url);
        setProfileImageFile(null);
      }

      toast({
        title: "Perfil actualizado",
        description: "Tu informacion ha sido guardada exitosamente.",
        variant: "default",
      });

      setIsPasswordModalOpen(false);

    } catch (error) {
      console.error("Error al actualizar el perfil:", error);
      toast({
        title: "Error de actualizacion",
        description: error.message || "No se pudo actualizar tu perfil. Intentalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingImage(false);
      setIsPasswordModalOpen(false);
      setIsLoading(false);
    }
  };

  const fullName = [formData.nombre_completo, formData.apellidos].filter(Boolean).join(' ').trim();

  const shortName = (formData.nombre_completo || '').split(' ')[0] || '';

  const getUserRole = useCallback(() => {
    if (!user || !Array.isArray(user.roles)) return 'Usuario';
    const roleNames = user.roles
      .map(rol => (typeof rol === 'object' ? rol.nombre_rol || rol.rol || rol.name : rol))
      .filter(Boolean);
    if (roleNames.includes('Super Administrador')) return 'Super Administrador';
    if (roleNames.includes('Administrador')) return 'Administrador';
    return roleNames[0] || 'Usuario';
  }, [user]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Mi Perfil</h1>
          <p className="text-slate-600 mt-1">Administra tu información personal y preferencias</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSubmit}
          disabled={isLoading}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-medium transition-all duration-300 shadow-lg hover:shadow-xl"
        >
          {isLoading ? (
            <motion.div 
              animate={{ rotate: 360 }} 
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            >
              <Loader className="w-5 h-5" />
            </motion.div>
          ) : <Save className="w-5 h-5" />}
          {isLoading ? 'Guardando...' : 'Guardar Cambios'}
        </motion.button>
      </motion.div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid grid-cols-1 lg:grid-cols-4 gap-6"
      >
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            {/* Profile Photo */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Foto de perfil"
                    className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <img
                    src={`https://ui-avatars.com/api/?name=${(formData.nombre_completo || '').split(' ')[0]}+${(formData.apellidos || '').split(' ')[0] || ''}&background=0D8ABC&color=fff&size=128`}
                    alt="Foto de perfil"
                    className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                    referrerPolicy="no-referrer"
                  />
                )}
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => fileInputRef.current.click()}
                  className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full shadow-lg border-2 border-white"
                  aria-label="Cambiar foto de perfil"
                >
                  <Camera className="w-4 h-4" />
                </motion.button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold text-slate-800">
                  {fullName || shortName}
                </h3>
                <p className="text-sm text-slate-500">
                  {getUserRole()}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Miembro desde {new Date(user?.fecha_creacion).toLocaleDateString('es-ES')}
                </p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="mt-8 space-y-2">
              {[
                { id: 'personal', icon: User, label: 'Información Personal' },
                { id: 'security', icon: Shield, label: 'Seguridad' },
                { id: 'notifications', icon: Bell, label: 'Notificaciones' },
                { id: 'preferences', icon: Globe, label: 'Preferencias' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Tab Content */}
            {activeTab === 'personal' && (
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Información Personal</h3>
                  
                  {/* Document Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        Tipo de Documento
                      </label>
                      <input 
                        type="text" 
                        value={formData.tipo_documento || ''} 
                        readOnly 
                        className="w-full px-3 py-2 text-sm bg-slate-100 border border-slate-300 rounded-lg cursor-not-allowed text-slate-500" 
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        Número de Documento
                      </label>
                      <input 
                        type="text" 
                        value={formData.numero_documento || ''} 
                        readOnly 
                        className="w-full px-3 py-2 text-sm bg-slate-100 border border-slate-300 rounded-lg cursor-not-allowed text-slate-500" 
                      />
                    </div>
                  </div>

                  {/* Names */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                      <label htmlFor="nombre_completo" className="text-sm font-medium text-slate-700 mb-2 block">
                        Nombre Completo *
                      </label>
                      <input 
                        id="nombre_completo" 
                        name="nombre_completo" 
                        type="text" 
                        value={formData.nombre_completo || ''} 
                        onChange={handleInputChange} 
                        required 
                        className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${errors.nombre_completo ? 'border-red-500' : 'border-slate-300'}`} 
                      />
                      {errors.nombre_completo && (
                        <p className="text-red-500 text-xs mt-1">{errors.nombre_completo}</p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="apellidos" className="text-sm font-medium text-slate-700 mb-2 block">
                        Apellidos *
                      </label>
                      <input 
                        id="apellidos" 
                        name="apellidos" 
                        type="text" 
                        value={formData.apellidos || ''} 
                        onChange={handleInputChange} 
                        required 
                        className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${errors.apellidos ? 'border-red-500' : 'border-slate-300'}`} 
                      />
                      {errors.apellidos && (
                        <p className="text-red-500 text-xs mt-1">{errors.apellidos}</p>
                      )}
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="correo" className="text-sm font-medium text-slate-700 mb-2 block">
                        Correo Electrónico
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          id="correo" 
                          name="correo" 
                          type="email"
                          value={formData.correo || ''} 
                          readOnly
                          className="w-full pl-10 pr-3 py-2 text-sm bg-slate-100 border border-slate-300 rounded-lg cursor-not-allowed text-slate-500 transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="telefono" className="text-sm font-medium text-slate-700 mb-2 block">
                        Teléfono
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          id="telefono" 
                          name="telefono" 
                          type="tel" 
                          value={formData.telefono || ''} 
                          onChange={handleInputChange} 
                          required
                          className={`w-full pl-10 pr-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${errors.telefono ? 'border-red-500' : 'border-slate-300'}`} 
                        />
                      </div>
                      {errors.telefono && (
                        <p className="text-red-500 text-xs mt-1">{errors.telefono}</p>
                      )}
                    </div>
                  </div>
                </div>
              </form>
            )}

            {activeTab === 'security' && (
              <div className="p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Seguridad</h3>
                <div className="space-y-4">
                  <div className="p-4 border border-slate-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-slate-800">Cambiar Contraseña</h4>
                        <p className="text-sm text-slate-600 mt-1">Actualiza tu contraseña regularmente para mantener tu cuenta segura</p>
                      </div>
                      <button className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
                        Cambiar
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-4 border border-slate-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-slate-800">Autenticación de Dos Factores</h4>
                        <p className="text-sm text-slate-600 mt-1">Añade una capa extra de seguridad a tu cuenta</p>
                      </div>
                      <button className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
                        Activar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Notificaciones</h3>
                <div className="space-y-4">
                  {['Notificaciones por correo', 'Notificaciones de citas', 'Recordatorios', 'Promociones y ofertas'].map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                      <span className="text-sm font-medium text-slate-800">{item}</span>
                      <div className="relative inline-block w-12 h-6 rounded-full bg-slate-300">
                        <input type="checkbox" className="sr-only" defaultChecked={index === 0} />
                        <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'preferences' && (
              <div className="p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Preferencias</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Idioma</label>
                    <select className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      <option>Español</option>
                      <option>English</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Zona Horaria</label>
                    <select className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      <option>America/Bogota (GMT-5)</option>
                      <option>America/Mexico_City (GMT-6)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Password Confirmation Modal */}
      <PasswordConfirmationModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onConfirm={handleConfirmAndUpdate}
        isLoading={isLoading}
      />
    </div>
  );
};

export default ProfilePage;
