import React, { useRef, useState } from "react";
import mixbox from "mixbox"; // 반드시 npm install mixbox

// #region Lab 변환 등 util 함수(동일)
// sRGB => Lab 위한 감마 보정
function gammaDecode(c) { c = c / 255; return c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92; }
// Lab => sRGB 감마 보정
function gammaEncode(c) { return c > 0.0031308 ? 1.055 * Math.pow(c, 1/2.4) - 0.055 : 12.92 * c; }
// xyz 색공간 변환
function f_xyz(t) { return t > 0.008856 ? Math.pow(t, 1/3) : 7.787 * t + 16/116; }
// xyz => Lab 변환
function f_inv_lab(t) { return t > 0.206893 ? Math.pow(t, 3) : (t - 16/116) / 7.787; }
// region RGB => Lab
function rgbToLab([R,G,B]) {
  const Rl=gammaDecode(R), Gl=gammaDecode(G), Bl=gammaDecode(B);
  let X=0.4124*Rl+0.3576*Gl+0.1805*Bl, Y=0.2126*Rl+0.7152*Gl+0.0722*Bl, Z=0.0193*Rl+0.1192*Gl+0.9505*Bl;
  const Xn=0.95047, Yn=1.0, Zn=1.08883; X/=Xn; Y/=Yn; Z/=Zn;
  const fx=f_xyz(X), fy=f_xyz(Y), fz=f_xyz(Z);
  return [116*fy-16, 500*(fx-fy), 200*(fy-fz)];
}
// region Lab => RGB
function labToRgb([L,a,b]) {
  const Xn=0.95047, Yn=1.0, Zn=1.08883;
  const fy=(L+16)/116, fx=fy+a/500, fz=fy-b/200;
  let X=Xn*f_inv_lab(fx), Y=Yn*f_inv_lab(fy), Z=Zn*f_inv_lab(fz);
  let Rl=3.2406*X-1.5372*Y-0.4986*Z, Gl=-0.9689*X+1.8758*Y+0.0415*Z, Bl=0.0557*X-0.2040*Y+1.0570*Z;
  let R=Math.round(Math.min(Math.max(gammaEncode(Rl),0),1)*255);
  let G=Math.round(Math.min(Math.max(gammaEncode(Gl),0),1)*255);
  let B=Math.round(Math.min(Math.max(gammaEncode(Bl),0),1)*255);
  return [R,G,B];
}
// region HEX => RGB 1:1 대응
function hexToRgb(hex) {
  hex = hex.replace(/^#/, "");
  if(hex.length!==6) return [0,0,0];
  return [
    parseInt(hex.substring(0,2), 16),
    parseInt(hex.substring(2,4), 16),
    parseInt(hex.substring(4,6), 16)
  ];
}
// Lab 평균
function averageRgbLab(rgbArray) {
  if(rgbArray.length===0) return [0,0,0];
  const labArray=rgbArray.map(rgbToLab);
  const n=labArray.length;
  let L=0,a=0,b=0;
  for(const lab of labArray){L+=lab[0];a+=lab[1];b+=lab[2];}
  return labToRgb([L/n,a/n,b/n]);
}
// rgb 평균
function averageRgb(rgbs) {
  if(rgbs.length===0) return [0,0,0];
  let R=0,G=0,B=0;
  for(const [r,g,b] of rgbs){R+=r;G+=g;B+=b;}
  return [Math.round(R/rgbs.length), Math.round(G/rgbs.length), Math.round(B/rgbs.length)];
}
// region RGB => HEX 1:1 대응됨
function rgbToHex([r,g,b]) {
  return (
    "#" +
    [r,g,b]
      .map((v)=>v.toString(16).padStart(2,"0"))
      .join("")
      .toUpperCase()
  );
}

function ColorMixDemo() {
  const [inputs, setInputs] = useState([
    [255, 255, 0], [0, 0, 255]
  ]);
  const [hexInputs, setHexInputs] = useState(inputs.map(rgbToHex));
  const colorInputsRef = useRef([]);

  // 상태 변경 함수는 기존과 동일
  const handleRgbChange = (idx, channel, value) => {
    const newInputs = inputs.map(arr => arr.slice());
    newInputs[idx][channel] = Math.max(0, Math.min(255, Number(value)));
    setInputs(newInputs);
    setHexInputs(newInputs.map(rgbToHex));
  };
  const handleHexChange = (idx, value) => {
    let hex = value.replace(/[^0-9A-Fa-f]/g,"").toUpperCase();
    if(hex.length>6) hex = hex.slice(0,6);
    hex = "#" + hex;
    const nextHex = hexInputs.slice();
    nextHex[idx] = hex;
    setHexInputs(nextHex);
    if(hex.length===7) {
      const rgb = hexToRgb(hex);
      const newInputs = inputs.map(arr=>arr.slice());
      newInputs[idx] = rgb;
      setInputs(newInputs);
    }
  };
  const addColor = () => {
    setInputs([...inputs, [0,0,0]]);
    setHexInputs([...hexInputs, "#000000"]);
  };
  const removeColor = idx => {
    setInputs(inputs.filter((_,i)=>i!==idx));
    setHexInputs(hexInputs.filter((_,i)=>i!==idx));
  };
  const handleChipClick = idx => {
    if(colorInputsRef.current[idx]) {
      colorInputsRef.current[idx].click();
    }
  };
  const handleColorPicker = (idx, e) => {
    const hex = e.target.value.toUpperCase();
    handleHexChange(idx, hex);
  };

  const rgbMean = averageRgb(inputs);
  const labMean = averageRgbLab(inputs);
  // region Mixbox 감산혼합 결과 (여러 색 가중치 동등)
  const mixboxMean = (() => {
    if (inputs.length === 0) return [0,0,0];
    // 각 입력색을 latent 벡터로 변환
    const latents = inputs.map(rgb => mixbox.rgbToLatent(rgb));
    let zMix = new Array(mixbox.LATENT_SIZE).fill(0);
    for (let i = 0; i < zMix.length; i++) {
      for (let j = 0; j < latents.length; j++) {
        zMix[i] += latents[j][i] / latents.length;
      }
    }
    return mixbox.latentToRgb(zMix);
  })();
  const rgbToCss = ([r,g,b]) => `rgb(${r},${g},${b})`;

  return (
    <div>
      <h3>색 혼합 방식 비교 (컬러피커 + Mixbox 감산혼합)</h3>
      <div>
        {inputs.map((rgb, idx) => (
          <div key={idx} style={{margin:'5px 0',display:'flex',alignItems:'center',gap:6}}>
            <span
              style={{
                display:'inline-block',
                width:40,
                height:24,
                background:rgbToCss(rgb),
                marginRight:10,
                cursor:'pointer',
                border:'1px solid #ccc'
              }}
              onClick={()=>handleChipClick(idx)}
              title="클릭해서 색상 선택"
            ></span>
            <input
              type="color"
              style={{display:"none"}}
              ref={el => colorInputsRef.current[idx]=el}
              value={rgbToHex(rgb)}
              onChange={e => handleColorPicker(idx, e)}
            />
            R:<input type="number" value={rgb[0]} min="0" max="255" onChange={e=>handleRgbChange(idx,0,e.target.value)} style={{width:40}} />
            G:<input type="number" value={rgb[1]} min="0" max="255" onChange={e=>handleRgbChange(idx,1,e.target.value)} style={{width:40}} />
            B:<input type="number" value={rgb[2]} min="0" max="255" onChange={e=>handleRgbChange(idx,2,e.target.value)} style={{width:40}} />
            HEX:
            <input
              type="text"
              value={hexInputs[idx]}
              onChange={e=>handleHexChange(idx, e.target.value)}
              style={{width:70, textTransform:'uppercase'}}
              maxLength={7}
            />
            <button onClick={()=>removeColor(idx)} disabled={inputs.length<=1}>삭제</button>
          </div>
        ))}
        <button onClick={addColor}>+ 색 추가</button>
      </div>
      <hr />
      <div style={{display: 'flex', gap: 32}}>
        <div>
          <strong>RGB 평균</strong>
          <div style={{width:80,height:40,background:rgbToCss(rgbMean),margin:"8px 0"}}></div>
          <div>
            <span>{JSON.stringify(rgbMean)} </span>
            <span style={{marginLeft:8}}> {rgbToHex(rgbMean)} </span>
          </div>
        </div>
        <div>
          <strong>Lab 평균</strong>
          <div style={{width:80,height:40,background:rgbToCss(labMean),margin:"8px 0"}}></div>
          <div>
            <span>{JSON.stringify(labMean)} </span>
            <span style={{marginLeft:8}}> {rgbToHex(labMean)} </span>
          </div>
        </div>
        <div>
          <strong>Mixbox 혼합(감산혼합)</strong>
          <div style={{width:80,height:40,background:rgbToCss(mixboxMean),margin:"8px 0"}}></div>
          <div>
            <span>{JSON.stringify(mixboxMean)} </span>
            <span style={{marginLeft:8}}> {rgbToHex(mixboxMean)} </span>
          </div>
        </div>
      </div>
      <small style={{color:"#555"}}>
        컬러칩을 눌러 <b>컬러 피커</b>로 직접 색을 골라보세요!<br />
        RGB/HEX 입력도 양방향 동기화됩니다.<br />
        <b>Mixbox</b> 결과는 실제 물감 느낌과 가장 유사한 감산혼합 결과입니다.<br/>
        Kubelka-Munk theory?
      </small>
    </div>
  );
}

export default ColorMixDemo;
