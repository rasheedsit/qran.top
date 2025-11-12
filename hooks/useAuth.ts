import React, { useState, useEffect, useContext, createContext } from 'react';
import { auth, googleProvider } from '../firebase';

// Since we are not using npm, we declare the type for firebase.User globally.
declare const firebase: any;
type FirebaseUser = any; // A simple alias for firebase.User

interface AuthContextType {
    user: FirebaseUser | null;
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    signInWithGoogle: async () => {},
    signOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [loading, setLoading] = useState(true);

    const signInWithGoogle = async () => {
        try {
            await auth.signInWithPopup(googleProvider);
        } catch (error) {
            console.error("Error during sign in with Google", error);
        }
    };

    const signOut = async () => {
        try {
            await auth.signOut();
        } catch (error) {
            console.error("Error signing out", error);
        }
    };

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user: FirebaseUser) => {
            setUser(user);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const value = {
        user,
        loading,
        signInWithGoogle,
        signOut,
    };

    return React.createElement(AuthContext.Provider, { value }, children);
};

export const useAuth = () => {
    return useContext(AuthContext);
};