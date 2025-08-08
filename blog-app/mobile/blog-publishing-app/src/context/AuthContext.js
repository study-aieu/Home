import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../services/api';
import { authStorage } from '../services/storage';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is authenticated on app start
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      const { token, userData } = await authStorage.getAuthData();
      
      if (token && userData) {
        // Verify token is still valid by fetching user profile
        try {
          const response = await authAPI.getProfile();
          if (response.success) {
            setUser(response.data.user);
            setIsAuthenticated(true);
          } else {
            // Token is invalid, clear auth data
            await authStorage.clearAuthData();
          }
        } catch (error) {
          console.error('Token validation failed:', error);
          await authStorage.clearAuthData();
        }
      }
    } catch (error) {
      console.error('Failed to check auth status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setIsLoading(true);
      const response = await authAPI.login({ email, password });
      
      if (response.success) {
        const { user: userData, token } = response.data;
        
        // Save auth data to secure storage
        await authStorage.saveAuthData(token, userData);
        
        setUser(userData);
        setIsAuthenticated(true);
        
        return { success: true, user: userData };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      console.error('Login error:', error);
      const message = error.response?.data?.message || 'Login failed. Please try again.';
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setIsLoading(true);
      const response = await authAPI.register(userData);
      
      if (response.success) {
        const { user: newUser, token } = response.data;
        
        // Save auth data to secure storage
        await authStorage.saveAuthData(token, newUser);
        
        setUser(newUser);
        setIsAuthenticated(true);
        
        return { success: true, user: newUser };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      console.error('Registration error:', error);
      const message = error.response?.data?.message || 'Registration failed. Please try again.';
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      
      // Clear auth data from storage
      await authStorage.clearAuthData();
      
      // Clear state
      setUser(null);
      setIsAuthenticated(false);
      
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, message: 'Failed to logout' };
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = async () => {
    try {
      const response = await authAPI.getProfile();
      if (response.success) {
        setUser(response.data.user);
        await authStorage.saveAuthData(
          await authStorage.getAuthData().then(data => data.token),
          response.data.user
        );
      }
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  const value = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    updateUser,
    checkAuthStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};