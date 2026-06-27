import { createContext, useContext, useState, useEffect } from 'react';
import api from '../Services/api';
import { connectSocket, disconnectSocket, joinWorkspace } from '../Services/socket';

const AuthContext = createContext();

const normalizeUserRole = (role) => {
    if (role === 'workspace_owner') return 'owner';
    return role;
};

const normalizeUser = (user) => {
    if (!user) return user;
    return { ...user, role: normalizeUserRole(user.role) };
};

export const AuthProvider = ({ children }) => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Check if user is already logged in when app loads (via httpOnly cookie)
    useEffect(() => {
        let mounted = true;
        api.get('/users/me')
            .then((res) => {
                if (!mounted) return;
                const userData = res?.data?.user;
                if (userData) {
                    setUser(normalizeUser(userData));
                    setIsLoggedIn(true);
                } else {
                    setUser(null);
                    setIsLoggedIn(false);
                }
            })
            .catch(() => {
                if (!mounted) return;
                setUser(null);
                setIsLoggedIn(false);
            })
            .finally(() => {
                if (!mounted) return;
                setLoading(false);
            });

        return () => { mounted = false; };
    }, []);

    const login = (userData) => {
        setUser(normalizeUser(userData));
        setIsLoggedIn(true);
    };

    const logout = () => {
        setUser(null);
        setIsLoggedIn(false);
    };

    // Listen for session expiry fired by the axios interceptor
    useEffect(() => {
        const handleExpiry = () => {
            setUser(null);
            setIsLoggedIn(false);
            disconnectSocket();
            // Redirect to login without full reload
            window.location.href = '/login';
        };
        window.addEventListener('auth:expired', handleExpiry);
        return () => window.removeEventListener('auth:expired', handleExpiry);
    }, []);

    // Synchronize global socket connection with auth state
    useEffect(() => {
        if (isLoggedIn && user?.id) {
            connectSocket(user.id);
            // Join workspace room so owner receives real-time join-request alerts etc.
            if (user.activeWorkspaceId) {
                joinWorkspace(user.activeWorkspaceId);
            }
        } else {
            disconnectSocket();
        }
    }, [isLoggedIn, user?.id, user?.activeWorkspaceId]);

    const value = {
        isLoggedIn,
        user,
        loading,
        login,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};


// USE THIS HOOK IN ANY COMPONENT
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};