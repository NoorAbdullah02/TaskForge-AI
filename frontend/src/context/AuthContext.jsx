import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Check if user is already logged in when app loads
    useEffect(() => {
        // Try to fetch current user using httpOnly cookie (backend must set cookie and expose /me)
        let mounted = true;
        import('../Services/api').then(({ default: api }) => {
            api.get('/users/me')
                .then((res) => {
                    if (!mounted) return;
                    if (res?.data?.user) {
                        setUser(res.data.user);
                        setIsLoggedIn(true);
                    } else {
                        setIsLoggedIn(false);
                    }
                })
                .catch(() => {
                    if (!mounted) return;
                    setIsLoggedIn(false);
                })
                .finally(() => {
                    if (!mounted) return;
                    setLoading(false);
                });
        });

        return () => { mounted = false };
    }, []);

    const login = (userData) => {
        setUser(userData);
        setIsLoggedIn(true);
    };

    const logout = () => {
        setUser(null);
        setIsLoggedIn(false);
    };

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