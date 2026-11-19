# El Balero Roguelike — Nerdearla México

Juego clásico del **balero tradicional mexicano** con físicas en tiempo real, trucos con multiplicadores y progresión **roguelike** por rondas, dificultades y gravedades cambiantes. Listo para desplegarse como sitio estático en **AWS Amplify** sin pasos de compilación.

## Cómo se juega

1. **Mueve el cursor o tu dedo** dentro del patio para controlar el **palito (mango)** del balero en tiempo real.
2. El **barril (cabeza)** cuelga de una cuerda con simulación física de péndulo, resorte y rotación.
3. Da un **jalón hacia arriba o en arco** para lanzar el barril al aire y **acerca la punta del palito al hoyito del barril** cuando esté alineado para ensartarlo.
4. Cuando el barril está ensartado, **haz clic / toca la pantalla** (o da un sacudón rápido) para soltarlo y encadenar otro truco.
5. Alcanza la **meta de puntos** antes de quedarte sin lanzamientos en la ronda. Al superar cada ronda, **elige 1 de 3 artesanías (reliquias)** y enfréntate a una nueva condición de gravedad.

## Trucos del Balero

| Truco | Cómo se logra | Puntos Base | Multiplicador |
|---|---|---|---|
| **Sencillo** | Ensartada clásica al caer | 100 pts | `x1` |
| **Capirucho** | Tirón veloz y ensartada rápida (< 0.85s en el aire) | 180 pts | `x2` |
| **Invertido (Al Vuelo)** | Ensartar mientras el barril aún sube o con encuentro ascendente | 240 pts | `x2.5` |
| **Vuelta al Mundo** | El barril da 1 giro completo (360°) en el aire antes de ensartar | 320 pts | `x3` |
| **Remolino Azteca** | 2 o más giros completos en el aire antes de ensartar | 450 pts | `x4+` |
| **Rebote / Malabar** | El barril bota en el palito en el aire antes de ensartarse | +120 pts | `+1x` |

## Gravedades y Escenarios

- **Patio de Coyoacán (`1.0g`)**: Gravedad terrestre clásica para calentar la muñeca.
- **Feria de San Marcos (`0.95g + Viento`)**: Ráfagas de viento lateral que empujan el barril.
- **Luna de Queso Oaxaca (`0.42g`)**: Baja gravedad, vuelos largos y giros lentos.
- **Planeta Caguama (`1.65g`)**: Gravedad pesada; requiere jalones firmes y reflejos rápidos.
- **Cuerda de Liga Loca (`0.85g + Resorte`)**: La cuerda estira y rebota como resorte de feria.
- **Vórtice de Quetzalcóatl (`Gravedad Oscilante`)**: La gravedad cambia de intensidad y dirección suavemente.

## Despliegue en AWS Amplify

1. Sube esta carpeta (`nerdearla-mx-balero`) a un repositorio en GitHub o conéctala en AWS Amplify Hosting.
2. En la consola de **AWS Amplify**, selecciona **Host your web app** → **GitHub** (o **Deploy without Git provider** subiendo el `.zip` de la carpeta).
3. Amplify detectará automáticamente los archivos estáticos (`index.html`, `styles.css`, `script.js`) y publicará tu juego en menos de un minuto.
