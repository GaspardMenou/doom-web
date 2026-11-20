import {DataTexture, NearestFilter, RepeatWrapping, SRGBColorSpace} from 'three';

export function createTexture(surface) {
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const grain = (x * 17 + y * 31 + x * y % 23) % 15 - 7;
      let color;
      if (surface === 'floor') {
        const plate = (x + y) % 16 < 2 || (x - y + 64) % 16 < 2;
        const tone = 48 + grain + (plate ? 12 : 0);
        color = x < 3 || y < 3 ? [18, 20, 16] : [tone, tone + 2, tone - 7];
      } else if (surface === 'ceiling') {
        color = x < 4 || y < 4 ? [12, 14, 11] : [29 + grain, 32 + grain, 24 + grain];
        if (y > 28 && y < 35) color = [58, 61, 44];
        if (x > 17 && x < 47 && y > 30 && y < 34) color = [151, 153, 104];
      } else if (surface === 'enemy') {
        color = [155 + grain, 145 + grain, 127 + grain];
        if (x < 7 || x > 56 || y < 7 || y > 56) color = [63, 53, 44];
        if (y > 35 && y < 44 && (x > 11 && x < 26 || x > 38 && x < 53)) color = [255, 239, 191];
        if (x > 17 && x < 47 && y > 13 && y < 27) color = [23, 19, 16];
        if (x > 20 && x < 44 && x % 8 < 4 && y > 18 && y < 25) color = [219, 211, 182];
      } else if (surface === 'exit') {
        color = [22 + grain, 105 + grain, 31 + grain];
        if (x < 5 || x > 58 || y < 5 || y > 58) color = [129, 219, 49];
        if (Math.abs(x - 32) < 4 && y > 13 && y < 43 || y > 35 && y < 51 && Math.abs(x - 32) < 51 - y) color = [193, 245, 101];
      } else {
        color = [94 + grain, 92 + grain, 70 + grain];
        if (x < 4 || x > 59 || y < 3 || y > 60 || y > 43 && y < 47) color = [29, 33, 24];
        if (x > 14 && x < 50 && y > 25 && y < 41 && y % 5 < 2) color = [28, 31, 24];
        if (y > 8 && y < 16) color = (x + y) % 16 < 8 ? [152, 119, 39] : [39, 35, 22];
        if ((x * 7 + y * 11) % 97 < 7 && y > 46) color = [104, 61, 31];
        if ((x > 5 && x < 9 || x > 54 && x < 58) && (y > 5 && y < 9 || y > 54 && y < 58)) color = [163, 160, 126];
      }
      data.set([...color, 255], (y * size + x) * 4);
    }
  }
  const texture = new DataTexture(data, size, size);
  texture.colorSpace = SRGBColorSpace;
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}
