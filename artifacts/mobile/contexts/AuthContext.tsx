import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  setAuthTokenGetter,
  setBaseUrl,
  useGetMe,
  useLogin,
  useRegister,
} from "@workspace/api-client-react";
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
} from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React, { createContext, useContext, useEffect, useState } from "react";

const TOKEN_KEY = "homestay_token";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}`);
    setAuthTokenGetter(async () => {
      return await AsyncStorage.getItem(TOKEN_KEY);
    });

    const loadToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
        setToken(storedToken);
      } catch (e) {
        console.error("Failed to load token", e);
      } finally {
        setIsLoading(false);
      }
    };

    loadToken();
  }, []);

  const { data: user, isLoading: isLoadingMe, isError: isMeError } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
    } as any,
  });

  useEffect(() => {
    if (isMeError && token) {
      logout();
    }
  }, [isMeError, token]);

  const { mutateAsync: loginMutation } = useLogin();
  const { mutateAsync: registerMutation } = useRegister();

  const login = async (data: LoginRequest) => {
    const response = await loginMutation({ data });
    await handleAuthSuccess(response);
  };

  const register = async (data: RegisterRequest) => {
    const response = await registerMutation({ data });
    await handleAuthSuccess(response);
  };

  const handleAuthSuccess = async (response: AuthResponse) => {
    await AsyncStorage.setItem(TOKEN_KEY, response.token);
    setToken(response.token);
    router.replace("/(tabs)");
  };

  const logout = async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    setToken(null);
    router.replace("/(tabs)");
  };

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        token,
        isLoading: isLoading || (!!token && isLoadingMe),
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
