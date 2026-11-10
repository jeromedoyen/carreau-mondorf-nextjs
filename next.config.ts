import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Import d'une liste par photo ou PDF : le fichier voyage dans le corps d'une
   * action serveur, plafonnée à 1 Mo par défaut — une photo de téléphone la
   * dépasse trois fois. 4 Mo, parce que Vercel coupe de toute façon à 4,5 Mo. */
  experimental: { serverActions: { bodySizeLimit: "4mb" } },

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
