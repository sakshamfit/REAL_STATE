import { Builder } from '../glb/lib/geo.mjs'
import { buildVehicle } from '../glb/lib/vehicle.mjs'
const b = new Builder()
buildVehicle(b, { kind: 'sedan', seed: 5, paint: 'paintA' })
let total = 0
const rows = []
for (const [mat, t] of b.targets) {
  let x0=Infinity,x1=-Infinity,y0=Infinity,y1=-Infinity,z0=Infinity,z1=-Infinity
  for (let i=0;i<t.positions.length;i+=3){
    const x=t.positions[i],y=t.positions[i+1],z=t.positions[i+2]
    x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);z0=Math.min(z0,z);z1=Math.max(z1,z)
  }
  total += t.positions.length/9
  rows.push(`${mat.padEnd(11)} x ${x0.toFixed(2).padStart(6)}..${x1.toFixed(2).padStart(5)}  y ${y0.toFixed(2).padStart(5)}..${y1.toFixed(2).padStart(5)}  z ${z0.toFixed(2).padStart(6)}..${z1.toFixed(2).padStart(5)}  ${(t.positions.length/9)} tris`)
}
rows.sort()
console.log(rows.join('\n'))
console.log('TOTAL', total, 'tris')
