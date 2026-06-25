import { z } from 'zod'

export const RegisterCheckValid = z.object({
    name: z.string(),
    email: z.string().email(),
    password: z.string().min(3).max(20)


})

export const LoginValidationSchema = z.object({
    email: z.string().email(),
    password: z.string()
})