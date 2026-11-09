export interface ConsejoPiel {
  slug: string;
  titulo: string;
  resumen: string;
  icono: string;
  tono: string;
  pasos: string[];
  ingredientes: string[];
  evitar: string;
}

export const CONSEJOS_PIEL: ConsejoPiel[] = [
  {
    slug: "acne",
    titulo: "Acné e imperfecciones",
    resumen: "Una rutina suave y constante suele ser más útil que sumar muchos activos a la vez.",
    icono: "01",
    tono: "bg-[#dfeadf]",
    pasos: ["Limpiador suave mañana y noche", "Tratamiento con BHA o niacinamida en días alternos", "Hidratante no comedogénica", "Protector solar cada mañana"],
    ingredientes: ["Ácido salicílico", "Niacinamida", "Centella asiática", "Ceramidas"],
    evitar: "Exfoliar a diario, manipular lesiones o combinar varios ácidos sin adaptación.",
  },
  {
    slug: "manchas",
    titulo: "Manchas y tono desigual",
    resumen: "La protección solar constante es la base; los activos despigmentantes funcionan con paciencia.",
    icono: "02",
    tono: "bg-[#e8f0e8]",
    pasos: ["Antioxidante por la mañana", "Hidratación ligera", "Protector solar de amplio espectro", "Activo antimanchas por la noche"],
    ingredientes: ["Vitamina C", "Ácido tranexámico", "Arbutina", "Niacinamida"],
    evitar: "Esperar cambios inmediatos o usar exfoliantes fuertes sin protector solar.",
  },
  {
    slug: "deshidratacion",
    titulo: "Deshidratación",
    resumen: "Aportá agua y sellala con lípidos; incluso una piel grasa puede estar deshidratada.",
    icono: "03",
    tono: "bg-[#e7f0eb]",
    pasos: ["Limpieza de baja espuma", "Tónico o esencia humectante", "Sérum sobre la piel ligeramente húmeda", "Crema con ceramidas"],
    ingredientes: ["Ácido hialurónico", "Glicerina", "Beta-glucano", "Ceramidas"],
    evitar: "Agua muy caliente, limpiadores agresivos y exfoliación excesiva.",
  },
  {
    slug: "arrugas",
    titulo: "Líneas y firmeza",
    resumen: "Protección solar, retinoides progresivos e hidratación forman el núcleo de una rutina antiedad.",
    icono: "04",
    tono: "bg-[#eee7d8]",
    pasos: ["Antioxidante durante el día", "Protector solar diario", "Retinoide gradual por la noche", "Crema reparadora"],
    ingredientes: ["Retinal o retinol", "Péptidos", "Vitamina C", "Adenosina"],
    evitar: "Iniciar retinoides todas las noches o mezclarlos de entrada con exfoliantes fuertes.",
  },
  {
    slug: "poros",
    titulo: "Poros y textura",
    resumen: "No se pueden borrar los poros, pero sí mantenerlos limpios y mejorar visualmente la textura.",
    icono: "05",
    tono: "bg-[#f2e4ba]",
    pasos: ["Doble limpieza solo cuando sea necesaria", "BHA dos o tres veces por semana", "Niacinamida", "Hidratante ligera"],
    ingredientes: ["BHA", "Niacinamida", "Retinoides", "Arcilla"],
    evitar: "Tiras abrasivas, cepillos agresivos o productos que prometen cerrar poros.",
  },
  {
    slug: "rojez",
    titulo: "Sensibilidad y rojez",
    resumen: "Simplificá la rutina y priorizá reparar la barrera antes de incorporar activos intensos.",
    icono: "06",
    tono: "bg-[#eee2d6]",
    pasos: ["Limpiador sin perfume", "Sérum calmante", "Crema reparadora", "Protector solar apto para piel sensible"],
    ingredientes: ["Centella asiática", "Pantenol", "Ceramidas", "Avena"],
    evitar: "Fragancias intensas, exfoliación frecuente y sumar varios productos nuevos juntos.",
  },
];
