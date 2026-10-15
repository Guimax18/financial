import { z } from 'zod';

export const signupSchema = z.object({
  fullName: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Insira um e-mail válido'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
});

export const loginSchema = z.object({
  email: z.string().email('Insira um e-mail válido'),
  password: z.string().min(1, 'A senha é obrigatória'),
});

export const resetPasswordSchema = z.object({
  email: z.string().email('Insira um e-mail válido'),
});

export const updatePasswordSchema = z.object({
  password: z.string().min(6, 'A nova senha deve ter no mínimo 6 caracteres'),
});

export const createSpaceSchema = z.object({
  name: z.string().min(2, 'O nome do espaço deve ter no mínimo 2 caracteres').max(50, 'Máximo 50 caracteres'),
  type: z.enum(['personal', 'family']),
});

export const inviteMemberSchema = z.object({
  email: z.string().email('Insira um e-mail válido do convidado'),
});
