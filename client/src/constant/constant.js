let prod = false
const HOST = prod ? import.meta.env.VITE_PRODUCTION_HOST : import.meta.env.VITE_SERVER_HOST 
const DOMAIN = prod ? import.meta.env.VITE_PRODUCTION_DOMAIN : import.meta.env.VITE_SERVER_DOMAIN

export {HOST,DOMAIN}