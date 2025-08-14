
import randomColor from 'randomcolor';
export function addAlpha(color, opacity) {
  if (!color) return '';
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
export function randomCursorData(nickname) {
  return {
    color: randomColor({
      luminosity: 'dark',
      alpha: 1,
      format: 'hex',
    }),
    name: `${nickname}`,
  };
}