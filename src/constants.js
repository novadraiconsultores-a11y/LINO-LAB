export const CATEGORIAS = [
    "Playera",
    "Jersey",
    "Short",
    "Jeans / Pantalón",
    "Chamarra",
    "Sudadera / Hoodie",
    "Conjunto",
    "Gorra",
    "Tenis / Calzado",
    "Calcetas",
    "Accesorio",
    "Balón"
];

export const TALLAS = [
    "XXS", "XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "Unitalla"
];

export const CALIDADES = [
    "Original", "G5", "Top Quality", "1.1", "Nacional"
];

export const DEPORTES = [
    "Futbol",
    "Basketball",
    "Baseball",
    "Americano (NFL)",
    "Hockey",
    "Formula 1",
    "Boxeo / UFC",
    "Tennis",
    "Gym / Training",
    "Casual / Moda",
    "NA"
];

// Equipos base + lógica NA será manejada en el componente, pero necesitamos la lista.
export const EQUIPOS_POR_DEPORTE = {
    "Futbol": [
        "Real Madrid", "Barcelona", "Manchester City", "Liverpool", "PSG",
        "Bayern Munich", "Juventus", "Inter Miami", "America", "Chivas",
        "Cruz Azul", "Pumas", "Tigres", "Monterrey",
        "Seleccion Mexicana", "Seleccion Argentina", "Seleccion Brasil", "Seleccion Francia"
    ],
    "Basketball": [
        "Lakers", "Warriors", "Bulls", "Celtics", "Heat", "Nets", "Suns", "Bucks"
    ],
    "Baseball": [
        "Yankees", "Dodgers", "Red Sox", "Astros", "Cubs", "Giants"
    ],
    "Americano (NFL)": [
        "Chiefs", "Cowboys", "49ers", "Steelers", "Patriots", "Eagles", "Bills"
    ],
    "Hockey": [
        "Rangers", "Bruins", "Maple Leafs", "Canadiens", "Blackhawks"
    ],
    "Formula 1": [
        "Red Bull", "Mercedes", "Ferrari", "McLaren", "Aston Martin"
    ],
    "Boxeo / UFC": [
        "Canelo Team", "UFC Generic", "Mayweather Promotions", "Generic Box"
    ],
    "Tennis": [
        "Nike Court", "Adidas Tennis", "Lacoste", "Generic Tennis"
    ],
    "Gym / Training": [
        "Nike Pro", "Under Armour", "Gymshark", "Generic Gym"
    ],
    "Casual / Moda": [
        "Nike", "Adidas", "Puma", "Jordan", "Under Armour", "Zara", "H&M"
    ],
    "NA": [
        "NA"
    ]
};
