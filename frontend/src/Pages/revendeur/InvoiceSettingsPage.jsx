import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import api from '../../api/axios';

export default function InvoiceSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    companyName: '',
    logoFile: null,
    signatureFile: null,
  });

  const [previews, setPreviews] = useState({
    logo: null,
    signature: null,
  });

  const [hasImages, setHasImages] = useState({
    logo: false,
    signature: false,
  });

  // Load current settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const response = await api.get('/invoices/invoice-settings');
        if (response.data?.data) {
          const { companyName, hasLogo, hasSignature } = response.data.data;
          setFormData(prev => ({
            ...prev,
            companyName: companyName || '',
          }));
          setHasImages({
            logo: hasLogo || false,
            signature: hasSignature || false,
          });
        }
      } catch (error) {
        console.error('Failed to load invoice settings:', error);
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleCompanyNameChange = (e) => {
    setFormData(prev => ({
      ...prev,
      companyName: e.target.value,
    }));
  };

  const handleFileChange = (e, fileType) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5_000_000) {
        toast.error('File is too large (max 5MB)');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviews(prev => ({
          ...prev,
          [fileType]: event.target.result,
        }));
      };
      reader.readAsDataURL(file);

      setFormData(prev => ({
        ...prev,
        [`${fileType}File`]: file,
      }));
    }
  };

  const clearFile = (fileType) => {
    setPreviews(prev => ({
      ...prev,
      [fileType]: null,
    }));
    setFormData(prev => ({
      ...prev,
      [`${fileType}File`]: null,
    }));

    const input = document.getElementById(`${fileType}-input`);
    if (input) input.value = '';
  };

  const handleSave = async () => {
    if (!formData.companyName.trim()) {
      toast.error('Company name is required');
      return;
    }

    try {
      setSaving(true);

      const data = new FormData();
      data.append('companyName', formData.companyName);

      if (formData.logoFile) {
        data.append('logoFile', formData.logoFile);
      }

      if (formData.signatureFile) {
        data.append('signatureFile', formData.signatureFile);
      }

      console.log('Sending form data:', {
        companyName: formData.companyName,
        hasLogo: !!formData.logoFile,
        hasSignature: !!formData.signatureFile,
      });

      const response = await api.put('/invoices/invoice-settings', data);

      console.log('Response:', response.data);

      if (response.data?.data) {
        setHasImages({
          logo: response.data.data.hasLogo || false,
          signature: response.data.data.hasSignature || false,
        });
        toast.success('Settings saved successfully');

        setPreviews({ logo: null, signature: null });
        setFormData(prev => ({
          ...prev,
          logoFile: null,
          signatureFile: null,
        }));
      }
    } catch (error) {
      console.error('Failed to save invoice settings:', error);
      const message = error.response?.data?.message || error.message || 'Failed to save settings';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-gray-600 font-medium">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Invoice Settings</h1>
          <p className="text-gray-600">Configure your professional invoice appearance</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden divide-y divide-gray-200">
          {/* Company Name Section */}
          <div className="p-8">
            <div className="max-w-2xl">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <div className="w-1 h-6 bg-blue-600 rounded mr-3"></div>
                Company Name
              </h2>
              <input
                type="text"
                value={formData.companyName}
                onChange={handleCompanyNameChange}
                placeholder="Enter your company name"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition duration-200"
              />
              <p className="mt-2 text-sm text-gray-500">
                This name will appear prominently on all your invoices
              </p>
            </div>
          </div>

          {/* Logo Section */}
          <div className="p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <div className="w-1 h-6 bg-blue-600 rounded mr-3"></div>
              Company Logo
            </h2>

            <div className="max-w-2xl">
              {previews.logo ? (
                <div className="bg-gray-50 rounded-lg p-6 border-2 border-gray-200">
                  <div className="mb-4">
                    <img
                      src={previews.logo}
                      alt="Logo preview"
                      className="max-h-32 mx-auto object-contain"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => clearFile('logo')}
                      className="flex-1 px-4 py-2 text-red-600 bg-red-50 border-2 border-red-200 rounded-lg hover:bg-red-100 transition font-medium"
                    >
                      Remove
                    </button>
                    <label className="flex-1 cursor-pointer">
                      <input
                        id="logo-input"
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, 'logo')}
                        className="hidden"
                      />
                      <span className="block px-4 py-2 text-blue-600 bg-blue-50 border-2 border-blue-200 rounded-lg hover:bg-blue-100 transition font-medium text-center">
                        Replace
                      </span>
                    </label>
                  </div>
                </div>
              ) : hasImages.logo ? (
                <div className="bg-gray-50 rounded-lg p-6 border-2 border-gray-200">
                  <p className="text-center text-gray-600 mb-4 font-medium">
                    ✓ Logo uploaded
                  </p>
                  <label className="cursor-pointer block">
                    <input
                      id="logo-input"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'logo')}
                      className="hidden"
                    />
                    <span className="block px-4 py-2 text-blue-600 bg-blue-50 border-2 border-blue-200 rounded-lg hover:bg-blue-100 transition font-medium text-center">
                      Change Logo
                    </span>
                  </label>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  <input
                    id="logo-input"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'logo')}
                    className="hidden"
                  />
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 hover:bg-blue-50 transition">
                    <div className="text-4xl mb-2">🖼️</div>
                    <p className="font-medium text-gray-700">Click to upload logo</p>
                    <p className="text-sm text-gray-500 mt-1">PNG, JPG or WEBP (Max 5MB)</p>
                  </div>
                </label>
              )}
            </div>
          </div>

          {/* Signature Section */}
          <div className="p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <div className="w-1 h-6 bg-blue-600 rounded mr-3"></div>
              Signature & Stamp
            </h2>

            <div className="max-w-2xl">
              {previews.signature ? (
                <div className="bg-gray-50 rounded-lg p-6 border-2 border-gray-200">
                  <div className="mb-4">
                    <img
                      src={previews.signature}
                      alt="Signature preview"
                      className="max-h-32 mx-auto object-contain"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => clearFile('signature')}
                      className="flex-1 px-4 py-2 text-red-600 bg-red-50 border-2 border-red-200 rounded-lg hover:bg-red-100 transition font-medium"
                    >
                      Remove
                    </button>
                    <label className="flex-1 cursor-pointer">
                      <input
                        id="signature-input"
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, 'signature')}
                        className="hidden"
                      />
                      <span className="block px-4 py-2 text-blue-600 bg-blue-50 border-2 border-blue-200 rounded-lg hover:bg-blue-100 transition font-medium text-center">
                        Replace
                      </span>
                    </label>
                  </div>
                </div>
              ) : hasImages.signature ? (
                <div className="bg-gray-50 rounded-lg p-6 border-2 border-gray-200">
                  <p className="text-center text-gray-600 mb-4 font-medium">
                    ✓ Signature uploaded
                  </p>
                  <label className="cursor-pointer block">
                    <input
                      id="signature-input"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'signature')}
                      className="hidden"
                    />
                    <span className="block px-4 py-2 text-blue-600 bg-blue-50 border-2 border-blue-200 rounded-lg hover:bg-blue-100 transition font-medium text-center">
                      Change Signature
                    </span>
                  </label>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  <input
                    id="signature-input"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'signature')}
                    className="hidden"
                  />
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 hover:bg-blue-50 transition">
                    <div className="text-4xl mb-2">✍️</div>
                    <p className="font-medium text-gray-700">Click to upload signature</p>
                    <p className="text-sm text-gray-500 mt-1">PNG, JPG or WEBP (Max 5MB)</p>
                  </div>
                </label>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="p-8 bg-gray-50">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full px-6 py-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition duration-200 shadow-lg hover:shadow-xl"
            >
              {saving ? (
                <span className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Saving...
                </span>
              ) : (
                '💾 Save Invoice Settings'
              )}
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border-l-4 border-blue-600 rounded-lg p-6">
          <h3 className="font-bold text-blue-900 mb-2">💡 Professional Invoice Template</h3>
          <p className="text-blue-800 text-sm">
            Your invoices will automatically use a beautiful, professional template with your company name, logo, and signature. No additional customization needed - it just looks perfect!
          </p>
        </div>
      </div>
    </div>
  );
}
