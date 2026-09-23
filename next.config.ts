import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* La route du championnat national s'appelait `/national-d2`. Depuis la
   * saison 2027 le club joue en National D1 : la page vit désormais sous
   * `/national`, et les anciens liens — partagés à l'extérieur du club,
   * cf. AppChrome.tsx — continuent d'arriver au bon endroit. */
  async redirects() {
    return [
      { source: "/national-d2", destination: "/national", permanent: true },
      { source: "/national-d2/:chemin*", destination: "/national/:chemin*", permanent: true },
    ];
  },
};

export default nextConfig;
