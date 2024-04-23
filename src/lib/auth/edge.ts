export const getAuthJsCookieName = () => (process.env.NODE_ENV === 'production' ? '__Secure-authjs.session-token' : 'authjs.session-token')
