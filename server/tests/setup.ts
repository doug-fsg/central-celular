import dotenv from 'dotenv'

dotenv.config()

process.env.JWT_SECRET ??= 'test-jwt-secret-for-vitest-only'
process.env.NODE_ENV ??= 'test'
