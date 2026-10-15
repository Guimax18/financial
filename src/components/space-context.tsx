'use client';
import { createContext, useContext } from 'react';
export const SpaceContext = createContext('');
export const useSpaceId = () => useContext(SpaceContext);
