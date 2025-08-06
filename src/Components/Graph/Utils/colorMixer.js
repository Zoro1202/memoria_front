/**
 * 색을 섞을 때, 좀 현실같이 섞고 싶음.
 * 1. HEX color 로 보통 표현되기 때문에 그걸 R, G, B로 나눈다
 * 2. 각 값을 평균을 낸다.
 * 3. 적용시킨다
 * 
 * 문제: RGB는 가산 혼합이기에 현실과는 이질감이 있음. 물론 섞이긴 한다만, 좀 더 현실같이 섞고 싶다.
 * 
 * 그래서 CMYK나 Lab 으로 변경해서 혼합한다음 다시 RGB로 불러올것이다.
 * 
 * Lab? : 
 * Lab 색상 모델(또는 CIELab 색상 공간)은 인간의 시각적 인식을 기반으로 만들어진 색상 모델로, 색을 세 가지 요소로 표현합니다:
 * 
 * L (Lightness, 밝기): 색의 밝기 정도를 0(검정)부터 100(흰색)까지 나타냅니다.
 * 
 * a (빨강-초록 축): 양수는 빨강에 가까운 색, 음수는 녹색에 가까운 색을 나타냅니다.
 * 
 * b (노랑-파랑 축): 양수는 노랑, 음수는 파랑에 가까운 색을 나타냅니다.
 * 
 * Lab는 RGB나 CMYK와 다르게 장치(디스플레이, 프린터 등)에 독립적이며, 인간 눈의 색 인지에 더 가깝도록 설계되어 있습니다. 즉, 사람이 실제로 느끼는 색상의 차이와 Lab 색 공간상에서의 거리가 더 비례하도록 만들어졌습니다.
 * 
 * 그렇다고 한다.
 * 
 * 1. RBG -> Lab 변환
 * 2. L, a, b 각 평균 구함
 * 3. 평균 L, a, b -> RGB로 변환
 * 
 * 근데 RGB를 Lab으로 변환하는게 좀 어려움.
 * -> AI가 해줌
*/

// RGB를 0~1로 정규화
function gammaDecode(c) {
  c = c / 255;
  return c > 0.04045
    ? Math.pow((c + 0.055) / 1.055, 2.4)
    : c / 12.92;
}

function gammaEncode(c) {
  return c > 0.0031308
    ? 1.055 * Math.pow(c, 1 / 2.4) - 0.055
    : 12.92 * c;
}

function f_xyz(t) {
  return t > 0.008856
    ? Math.pow(t, 1 / 3)
    : 7.787 * t + 16 / 116;
}
function f_inv_lab(t) {
  return t > 0.206893
    ? Math.pow(t, 3)
    : (t - 16 / 116) / 7.787;
}

function rgbToLab([R, G, B]) {
  // 1. sRGB to linear RGB
  const Rl = gammaDecode(R);
  const Gl = gammaDecode(G);
  const Bl = gammaDecode(B);
  // 2. Linear RGB to XYZ (D65)
  let X = 0.4124 * Rl + 0.3576 * Gl + 0.1805 * Bl;
  let Y = 0.2126 * Rl + 0.7152 * Gl + 0.0722 * Bl;
  let Z = 0.0193 * Rl + 0.1192 * Gl + 0.9505 * Bl;
  // 3. Normalize for D65 reference white
  const Xn = 0.95047, Yn = 1.0, Zn = 1.08883;
  X /= Xn;
  Y /= Yn;
  Z /= Zn;
  // 4. XYZ to Lab
  const fx = f_xyz(X);
  const fy = f_xyz(Y);
  const fz = f_xyz(Z);
  const L = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const b = 200 * (fy - fz);
  return [L, a, b];
}

function labToRgb([L, a, b]) {
  // 1. Lab to XYZ
  const Xn = 0.95047, Yn = 1.0, Zn = 1.08883;
  const fy = (L + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;
  let X = Xn * f_inv_lab(fx);
  let Y = Yn * f_inv_lab(fy);
  let Z = Zn * f_inv_lab(fz);
  // 2. XYZ to linear RGB
  let Rl = 3.2406 * X - 1.5372 * Y - 0.4986 * Z;
  let Gl = -0.9689 * X + 1.8758 * Y + 0.0415 * Z;
  let Bl = 0.0557 * X - 0.2040 * Y + 1.0570 * Z;
  // 3. Linear RGB to sRGB
  let R = Math.round(Math.min(Math.max(gammaEncode(Rl), 0), 1) * 255);
  let G = Math.round(Math.min(Math.max(gammaEncode(Gl), 0), 1) * 255);
  let B = Math.round(Math.min(Math.max(gammaEncode(Bl), 0), 1) * 255);
  return [R, G, B];
}

export function averageRgbLab(rgbArray) {
  if (rgbArray.length === 0) return [0, 0, 0];
  // Lab로 변환해서 각 성분 평균
  const labArray = rgbArray.map(rgbToLab);
  const n = labArray.length;
  let L = 0, a = 0, b = 0;
  for (const lab of labArray) {
    L += lab[0];
    a += lab[1];
    b += lab[2];
  }
  const avgLab = [L / n, a / n, b / n];
  return labToRgb(avgLab);
}
