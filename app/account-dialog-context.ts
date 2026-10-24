'use client';
import {createContext,useContext} from 'react';
export const AccountDialogContext=createContext<(()=>void)|null>(null);
export function useAccountDialog(){return useContext(AccountDialogContext)}
