import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api, tokenStore } from '../../shared/services/api';

export type Role = 'ADMIN'|'DOCTOR'|'NURSE'|'CASHIER';
export type SessionUser = { id:string; firstName:string; lastName:string; email:string; role:Role };
type AuthValue = { user:SessionUser|null; loading:boolean; login:(email:string,password:string)=>Promise<void>; logout:()=>void };
const AuthContext = createContext<AuthValue|null>(null);
export function AuthProvider({children}:PropsWithChildren) { const [user,setUser]=useState<SessionUser|null>(null); const [loading,setLoading]=useState(true); useEffect(()=>{ if(!tokenStore.get()){setLoading(false);return;} api.get('/auth/me').then(({data})=>setUser(data)).catch(()=>tokenStore.clear()).finally(()=>setLoading(false)); },[]); async function login(email:string,password:string){const {data}=await api.post('/auth/login',{email,password});tokenStore.set(data.accessToken);setUser(data.user);} function logout(){tokenStore.clear();setUser(null);} return <AuthContext.Provider value={{user,loading,login,logout}}>{children}</AuthContext.Provider>; }
export const useAuth=()=>{const value=useContext(AuthContext);if(!value)throw new Error('useAuth must be inside AuthProvider');return value;};
export function ProtectedRoute({children,roles}:{children:React.ReactNode;roles?:Role[]}){const {user,loading}=useAuth();const location=useLocation();if(loading)return <div className="grid min-h-screen place-items-center text-brand-700">Restoring secure session…</div>;if(!user)return <Navigate to="/login" replace state={{from:location}}/>;if(roles&&!roles.includes(user.role))return <Navigate to="/" replace/>;return children;}
