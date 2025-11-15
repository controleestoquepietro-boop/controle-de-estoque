import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  nome: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, senha: string) => Promise<boolean>;
  register: (nome: string, email: string, senha: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USERS_KEY = 'controle-alimentos-users';
const CURRENT_USER_KEY = 'controle-alimentos-current-user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Carregar sessão salva
    const savedUser = localStorage.getItem(CURRENT_USER_KEY);
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Erro ao carregar sessão:', error);
        localStorage.removeItem(CURRENT_USER_KEY);
      }
    }
  }, []);

  const register = async (nome: string, email: string, senha: string): Promise<boolean> => {
    try {
      const usersData = localStorage.getItem(USERS_KEY);
      const users = usersData ? JSON.parse(usersData) : [];

      // Verificar se o email já está cadastrado
      if (users.find((u: any) => u.email === email)) {
        return false;
      }

      // Adicionar novo usuário
      users.push({ nome, email, senha });
      localStorage.setItem(USERS_KEY, JSON.stringify(users));

      // Fazer login automático
      const newUser = { nome, email };
      setUser(newUser);
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser));

      return true;
    } catch (error) {
      console.error('Erro ao registrar:', error);
      return false;
    }
  };

  const login = async (email: string, senha: string): Promise<boolean> => {
    try {
      const usersData = localStorage.getItem(USERS_KEY);
      const users = usersData ? JSON.parse(usersData) : [];

      const foundUser = users.find((u: any) => u.email === email && u.senha === senha);

      if (foundUser) {
        const loggedUser = { nome: foundUser.nome, email: foundUser.email };
        setUser(loggedUser);
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(loggedUser));
        return true;
      }

      return false;
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(CURRENT_USER_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
