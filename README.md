# Los Güeros Admin (CRM)

## Arrancar el proyecto

Desde la carpeta **losgueros-admin**:

```bash
cd losgueros-admin
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). Si sale "port in use" o "Unable to acquire lock", cierra cualquier otra terminal donde esté corriendo `npm run dev` o borra el lock:

```bash
rm -f .next/dev/lock
```

Luego vuelve a ejecutar `npm run dev`.

## Primer usuario

1. En Firebase Console → Authentication → Sign-in method, activa **Email/Password**.
2. En la pestaña **Users**, crea un usuario (email y contraseña).
3. En la app entra en `/login` e inicia sesión con ese usuario.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
