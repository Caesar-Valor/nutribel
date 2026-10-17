// Laboratorio: tarjeta de plato al estilo de los componentes de 21st.dev
// (React + Tailwind + shadcn/ui + motion/react). NO se usa en la web real.
// Ojo: este archivo NO salió del MCP Magic de 21st.dev (no estaba conectado);
// está escrito a mano imitando su formato para poder comparar. Ver README.md.
"use client";

import * as React from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Plus, Check, Flame, Leaf } from "lucide-react";
import { cn } from "@/lib/utils";

type Size = { tamano: string; precio: number | null };

export interface DishCardProps {
  nombre: string;
  descripcion: string;
  imagen?: string;
  etiquetas?: { id: string; label: string }[];
  precios: Size[];
  agotado?: boolean;
  onAdd?: (item: { nombre: string; tamano: string; precio: number | null }) => void;
  className?: string;
}

const money = (n: number | null) =>
  typeof n === "number" ? `RD$${n.toLocaleString("es-DO")}` : "Precio por confirmar";

export function DishCard({
  nombre, descripcion, imagen, etiquetas = [], precios, agotado, onAdd, className,
}: DishCardProps) {
  const [size, setSize] = React.useState(0);
  const [added, setAdded] = React.useState(false);
  const reduce = useReducedMotion();

  const add = () => {
    onAdd?.({ nombre, tamano: precios[size].tamano, precio: precios[size].precio });
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  };

  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 22, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.25 }}
      whileHover={reduce || agotado ? undefined : { y: -4 }}
      transition={{ type: "spring", visualDuration: 0.45, bounce: 0.25 }}
      className={cn(
        "group relative flex flex-col gap-3 overflow-hidden rounded-[22px] border-[1.5px] border-t-[6px]",
        "border-[#E4DFD2] border-t-[#3F4D2B] bg-white p-[18px] shadow-sm transition-shadow hover:shadow-xl",
        "dark:border-[#353d2b] dark:border-t-[#B3CB7A] dark:bg-[#1f2419]",
        agotado && "opacity-55",
        className,
      )}
    >
      {imagen && (
        <div className="-mx-[18px] -mt-[18px] mb-1 aspect-[16/10] overflow-hidden rounded-t-[14px] bg-[#E8EDDD]">
          <img src={imagen} alt={nombre} loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
        </div>
      )}

      <h3 className="font-['Fraunces'] text-[25px] font-semibold leading-[1.05] text-[#3F4D2B] dark:text-[#B3CB7A]">
        {nombre}
      </h3>
      <p className="text-[15.5px] leading-[1.45] text-[#5E6452] dark:text-[#b4b9a3]">{descripcion}</p>

      {etiquetas.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {etiquetas.map((t) => (
            <span key={t.id}
              className="inline-flex items-center gap-1 rounded-md bg-[#E8EDDD] px-2 py-0.5 text-[12.5px] font-semibold text-[#1F2617] dark:bg-[#1c2216] dark:text-[#eef0e2]">
              {t.id === "proteina" ? <Flame className="size-3" aria-hidden /> : <Leaf className="size-3" aria-hidden />}
              {t.label}
            </span>
          ))}
        </div>
      )}

      <div role="radiogroup" aria-label={`Tamaño de ${nombre}`} className="relative flex flex-wrap gap-2">
        {precios.map((p, i) => (
          <button key={p.tamano} role="radio" aria-checked={i === size} onClick={() => setSize(i)}
            className={cn(
              "relative z-0 flex min-h-9 items-center gap-2 rounded-[10px] px-3 text-sm font-semibold",
              "text-[#3F4D2B] outline-offset-2 focus-visible:outline-[3px] focus-visible:outline-[#56643C] dark:text-[#B3CB7A]",
            )}>
            {i === size && (
              <motion.span layoutId={`size-${nombre}`} transition={{ type: "spring", visualDuration: 0.3, bounce: 0.2 }}
                className="absolute inset-0 -z-10 rounded-[10px] bg-[#A6C24F]/35 ring-2 ring-[#3F4D2B] dark:ring-[#B3CB7A]" />
            )}
            <span>{p.tamano}</span>
            <span className="font-medium opacity-80">{money(p.precio)}</span>
          </button>
        ))}
      </div>

      <motion.button type="button" disabled={agotado} onClick={add}
        whileTap={reduce ? undefined : { scale: 0.96 }}
        className={cn(
          "mt-auto flex min-h-11 items-center justify-center gap-2 overflow-hidden rounded-xl bg-[#3F4D2B] px-3 font-semibold text-white",
          "outline-offset-2 focus-visible:outline-[3px] focus-visible:outline-[#56643C] disabled:cursor-not-allowed disabled:bg-[#E4DFD2] disabled:text-[#5E6452]",
          "dark:bg-[#B3CB7A] dark:text-[#161a11]",
        )}>
        <AnimatePresence mode="wait" initial={false}>
          {added ? (
            <motion.span key="ok" className="flex items-center gap-2"
              initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -14, opacity: 0 }}>
              <Check className="size-4" aria-hidden /> Agregado
            </motion.span>
          ) : (
            <motion.span key="add" className="flex items-center gap-2"
              initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -14, opacity: 0 }}>
              <Plus className="size-4" aria-hidden /> {agotado ? "Agotado hoy" : "Agregar al pedido"}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </motion.article>
  );
}

// Ejemplo de uso
export default function Demo() {
  return (
    <div className="grid max-w-[360px] p-6">
      <DishCard
        nombre="Fritaca / Omelette"
        descripcion="Empanadilla de huevo con verduras, jamón y queso. Con pan multigrano, casabe, tarta de arroz o puré de víveres blancos."
        imagen="/assets/img/platos/fritaca-omelette-800.webp"
        etiquetas={[{ id: "proteina", label: "Alto en proteína" }]}
        precios={[{ tamano: "S", precio: 375 }, { tamano: "M", precio: 425 }, { tamano: "L", precio: 550 }]}
        onAdd={(item) => console.log("agregar", item)}
      />
    </div>
  );
}
