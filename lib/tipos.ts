import type { Punto } from "@/lib/kpis";

export interface Analitica {
  usuarios: number;
  interacciones: number;
  cuarentena: number;
  sin_consentimiento: number;
  sentimiento_promedio: number | null;
  tasa_riesgo: number | null;
  por_canal: Punto[];
  por_tipo: Punto[];
  por_tema: Punto[];
  por_estatus: Punto[];
  por_rango_edad: Punto[];
  por_interes: Punto[];
  ciudades_con_consentimiento: Punto[];
}

export interface UsuarioVivo {
  id_usuario: string;
  alias: string;
  estatus: string;
  consentimiento_datos: string;
  rango_edad: string;
  interes_principal: string;
  ciudad: string | null;
}

export interface InteraccionViva {
  id_interaccion: string;
  id_usuario: string;
  timestamp: string | null;
  canal: string;
  tipo: string;
  tema: string;
  texto: string | null;
  sentimiento: number;
  ciudad: string | null;
}
