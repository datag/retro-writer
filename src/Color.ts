
export default class Color {
    /** Convert RGB to HSL */
    static rgbToHsl(r: number, g: number, b: number): Array<number> {
        r /= 255;
        g /= 255;
        b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0; // achromatic
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return [h * 360, s * 100, l * 100];
    };

    /** Convert HSL back to RGB */
    static hslToRgb(h: number, s: number, l: number): Array<number> {
        h /= 360;
        s /= 100;
        l /= 100;

        let r, g, b;

        if (s === 0) {
            r = g = b = l; // achromatic
        } else {
            const hueToRgb = (p: number, q: number, t: number): number => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            };

            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hueToRgb(p, q, h + 1 / 3);
            g = hueToRgb(p, q, h);
            b = hueToRgb(p, q, h - 1 / 3);
        }

        return [
            Math.round(r * 255),
            Math.round(g * 255),
            Math.round(b * 255),
        ];
    };

    /** Convert RGB back to hex */
    static rgbToHex(r: number, g: number, b: number): string {

        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }

    /**
     * Adjust a color (hex format) in lightness
     *
     * @param hexColor Color in hex format #rrggbb.
     * @param lightnessPercent Lightness in percent
     * @param maxOriginal Whether to limit lightness to original color lightness
     */
    static adjustLightness(hexColor: string, lightnessPercent: number, maxOriginal: boolean = false): string {
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);

        const hsl = Color.rgbToHsl(r, g, b);

        // Adjust lightness
        if (maxOriginal) {
            // Limit to original color
            hsl[2] = Math.min(lightnessPercent, hsl[2]);
        } else {
            hsl[2] = lightnessPercent;
        }

        const [newR, newG, newB] = Color.hslToRgb(hsl[0], hsl[1], hsl[2]);

        return Color.rgbToHex(newR, newG, newB);
    }
}
