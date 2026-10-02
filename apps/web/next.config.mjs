/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @editor/shared é um pacote do monorepo (ESM); deixamos o Next transpilar.
  transpilePackages: ['@editor/shared'],
  eslint: {
    // o lint roda em CI separadamente; não bloqueia o build de produção
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
