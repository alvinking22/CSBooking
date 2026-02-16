import React, { createContext, useState, useContext, useEffect } from 'react';
import { configAPI } from '../services/api';

const ConfigContext = createContext(null);

export const ConfigProvider = ({ children }) => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchConfig = async () => {
    try {
      const res = await configAPI.getPublic();
      setConfig(res.data.data.config);
    } catch (err) {
      console.error('Could not load config');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchConfig(); }, []);

  const refreshConfig = () => fetchConfig();

  // Dynamic CSS variables based on config
  useEffect(() => {
    if (config?.primaryColor) {
      document.documentElement.style.setProperty('--color-primary', config.primaryColor);
    }
    if (config?.businessName) {
      document.title = config.businessName;
    }
  }, [config]);

  return (
    <ConfigContext.Provider value={{ config, loading, refreshConfig }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error('useConfig must be used within ConfigProvider');
  return ctx;
};

export default ConfigContext;
