import React, { useEffect } from 'react';
import { useAuth } from './AuthContext';
import { Colors, Spacing, FontSizes, BorderRadius } from '@cantina-pos/shared';

interface LoginPageProps {
  onAuthenticated?: () => void;
}

export function LoginPage({ onAuthenticated }: LoginPageProps) {
  const { isAuthenticated, isLoading, error, login, clearError } = useAuth();

  useEffect(() => {
    if (isAuthenticated && onAuthenticated) {
      onAuthenticated();
    }
  }, [isAuthenticated, onAuthenticated]);

  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <p style={styles.loadingText}>A verificar sessão...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Logo */}
        <img 
          src="/logo.jpg" 
          alt="ADVM Logo" 
          style={styles.logo}
        />
        
        <h1 style={styles.title}>Cantina POS</h1>
        <p style={styles.subtitle}>Sistema de Ponto de Venda</p>

        {error && (
          <div style={styles.error}>
            {error}
            <button onClick={clearError} style={styles.errorClose}>×</button>
          </div>
        )}

        <button onClick={login} style={styles.loginButton}>
          Entrar com Zoho
        </button>

        <p style={styles.hint}>
          Use sua conta @advm.lu para acessar
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundSecondary,
    padding: Spacing.md,
  },
  card: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    textAlign: 'center',
    maxWidth: 400,
    width: '100%',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: '50%',
    marginBottom: Spacing.md,
  },
  title: {
    margin: 0,
    fontSize: FontSizes.xl,
    fontWeight: 700,
    color: Colors.text,
  },
  subtitle: {
    margin: `${Spacing.xs}px 0 ${Spacing.lg}px`,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  error: {
    backgroundColor: '#fef2f2',
    color: Colors.danger,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    fontSize: FontSizes.sm,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorClose: {
    background: 'none',
    border: 'none',
    color: Colors.danger,
    fontSize: FontSizes.lg,
    cursor: 'pointer',
    padding: 0,
    marginLeft: Spacing.sm,
  },
  loginButton: {
    width: '100%',
    padding: Spacing.md,
    backgroundColor: Colors.primary,
    color: Colors.textLight,
    border: 'none',
    borderRadius: BorderRadius.md,
    fontSize: FontSizes.md,
    fontWeight: 600,
    cursor: 'pointer',
  },
  hint: {
    marginTop: Spacing.md,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
  },
};
