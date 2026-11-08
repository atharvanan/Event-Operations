'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';
import i18n from '../lib/i18n';
import { IUserProfile, IOrganization, IEvent, SupportedLanguage } from '@shared/types';

interface AuthContextType {
  user: IUserProfile | null;
  token: string | null;
  organization: IOrganization | null;
  setOrganization: (org: IOrganization | null) => void;
  currentEvent: IEvent | null;
  currentRole: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (data: any) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  setCurrentEvent: (event: IEvent | null, role?: string | null) => void;
  changeLanguage: (lang: SupportedLanguage) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IUserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [organization, setOrganizationState] = useState<IOrganization | null>(null);
  const [currentEvent, setCurrentEventState] = useState<IEvent | null>(null);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const setOrganization = (org: IOrganization | null) => {
    setOrganizationState(org);
    if (org) {
      localStorage.setItem('eventops_org', JSON.stringify(org));
    } else {
      localStorage.removeItem('eventops_org');
    }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem('eventops_token');
    const savedUser = localStorage.getItem('eventops_user');
    const savedOrg = localStorage.getItem('eventops_org');
    const savedEvent = localStorage.getItem('eventops_event');
    const savedRole = localStorage.getItem('eventops_role');
    const savedLang = localStorage.getItem('eventops_lang') as SupportedLanguage;

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        if (savedOrg) {
          setOrganizationState(JSON.parse(savedOrg));
        } else {
          // Fetch /auth/me to automatically retrieve or provision the user's organization
          api.get('/auth/me').then((res) => {
            const org = res.data?.data?.memberships?.[0]?.orgId;
            if (org) {
              setOrganization(org);
            }
          }).catch(() => {});
        }
        if (savedEvent) setCurrentEventState(JSON.parse(savedEvent));
        if (savedRole) setCurrentRole(savedRole);
      } catch (e) {
        console.error('Error parsing stored auth data', e);
      }
    }

    if (savedLang) {
      i18n.changeLanguage(savedLang);
    }

    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token: receivedToken, user: receivedUser, organization: receivedOrg } = response.data.data;

      setToken(receivedToken);
      setUser(receivedUser);
      setOrganization(receivedOrg);

      localStorage.setItem('eventops_token', receivedToken);
      localStorage.setItem('eventops_user', JSON.stringify(receivedUser));
      if (receivedOrg) {
        localStorage.setItem('eventops_org', JSON.stringify(receivedOrg));
      }

      if (receivedUser.preferredLanguage) {
        i18n.changeLanguage(receivedUser.preferredLanguage);
        localStorage.setItem('eventops_lang', receivedUser.preferredLanguage);
      }

      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        message: err.response?.data?.message || 'Login failed. Please check your credentials.',
      };
    }
  };

  const register = async (data: any) => {
    try {
      const response = await api.post('/auth/register', data);
      const { token: receivedToken, user: receivedUser, organization: receivedOrg } = response.data.data;

      setToken(receivedToken);
      setUser(receivedUser);
      setOrganization(receivedOrg);

      localStorage.setItem('eventops_token', receivedToken);
      localStorage.setItem('eventops_user', JSON.stringify(receivedUser));
      if (receivedOrg) {
        localStorage.setItem('eventops_org', JSON.stringify(receivedOrg));
      }

      if (data.preferredLanguage) {
        i18n.changeLanguage(data.preferredLanguage);
        localStorage.setItem('eventops_lang', data.preferredLanguage);
      }

      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        message: err.response?.data?.message || 'Registration failed.',
      };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setOrganization(null);
    setCurrentEventState(null);
    setCurrentRole(null);
    localStorage.removeItem('eventops_token');
    localStorage.removeItem('eventops_user');
    localStorage.removeItem('eventops_org');
    localStorage.removeItem('eventops_event');
    localStorage.removeItem('eventops_role');
  };

  const setCurrentEvent = (event: IEvent | null, role?: string | null) => {
    setCurrentEventState(event);
    if (role !== undefined) setCurrentRole(role);
    if (event) {
      localStorage.setItem('eventops_event', JSON.stringify(event));
      if (role) localStorage.setItem('eventops_role', role);
    } else {
      localStorage.removeItem('eventops_event');
      localStorage.removeItem('eventops_role');
    }
  };

  const changeLanguage = async (lang: SupportedLanguage) => {
    await i18n.changeLanguage(lang);
    localStorage.setItem('eventops_lang', lang);
    if (user) {
      setUser({ ...user, preferredLanguage: lang });
      localStorage.setItem('eventops_user', JSON.stringify({ ...user, preferredLanguage: lang }));
      try {
        await api.patch('/auth/language', { preferredLanguage: lang });
      } catch (e) {
        // Silently preserve client selection if network is unavailable
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        organization,
        setOrganization,
        currentEvent,
        currentRole,
        isLoading,
        login,
        register,
        logout,
        setCurrentEvent,
        changeLanguage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
