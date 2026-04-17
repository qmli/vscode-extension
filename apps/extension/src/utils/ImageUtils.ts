import fs from 'fs';

// SVG 数字圆形图标生成
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function generateAdvancedSVGCircle(config: {
  number: any;
  fontSize?: number | undefined;
  size?: number | undefined;
  bgColor?: string | undefined;
  textColor?: string | undefined;
  fontFamily?: string | undefined;
  strokeColor?: string | undefined;
  strokeWidth?: 0 | undefined;
}) {
  let {
    number,
    fontSize,
    size = 20,
    bgColor = '#0e639c',
    textColor = '#ffffff',
    fontFamily = 'Arial',
    strokeColor = '',
    strokeWidth = 0
  } = config;

  fontSize = fontSize === undefined ? Math.floor(size * 0.4) : fontSize;
  let strokeAttr = '';

  if (strokeColor && strokeWidth > 0) {
    strokeAttr = `stroke="${strokeColor}" stroke-width="${strokeWidth}"`;
  }

  const svgContent = `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - strokeWidth / 2}" 
        fill="${bgColor}" ${strokeAttr}/>
  <text x="${size / 2}" y="${size / 2}" 
        fill="${textColor}" 
        font-family="${fontFamily}" 
        font-size="${fontSize}" 
        font-weight="bold"
        text-anchor="middle"
        dominant-baseline="middle">
    ${number}
  </text>
</svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`;
}

/**
 * 图片转base64
 * @returns {string} - base64
 */
export function image2Base64(filePath: string): string {
  const data = fs.readFileSync(filePath);
  return data.toString('base64');
}
