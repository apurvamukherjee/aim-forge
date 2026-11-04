import * as THREE from 'three';
import { canvasTex, radialSprite, rand } from './util.js';

const holeTex = canvasTex(64, 64, (x, w) => {
  const g = x.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  g.addColorStop(0, 'rgba(0,0,0,0.95)');
  g.addColorStop(0.35, 'rgba(10,10,10,0.8)');
  g.addColorStop(0.55, 'rgba(40,40,40,0.35)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, w, w);
});
const sparkTex = radialSprite('rgba(255,230,170,1)', 'rgba(255,140,40,0)', 64);
const puffTex = radialSprite('rgba(180,180,180,0.5)', 'rgba(120,120,120,0)', 64);

export class Effects {
  constructor(scene) {
    this.scene = scene;
    // bullet holes
    this.holes = [];
    this.holeIdx = 0;
    const hm = new THREE.MeshBasicMaterial({ map: holeTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
    const hg = new THREE.PlaneGeometry(0.09, 0.09);
    for (let i = 0; i < 120; i++) {
      const m = new THREE.Mesh(hg, hm); m.visible = false; scene.add(m); this.holes.push(m);
    }
    // sparks / puffs
    this.parts = [];
    for (let i = 0; i < 160; i++) {
      const isPuff = i % 4 === 0;
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: isPuff ? puffTex : sparkTex, blending: isPuff ? THREE.NormalBlending : THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      s.visible = false; s.userData = { v: new THREE.Vector3(), life: 0, max: 1, puff: isPuff };
      scene.add(s); this.parts.push(s);
    }
    this.partIdx = 0;
    // tracers
    this.tracers = [];
    const tm = () => new THREE.LineBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false });
    for (let i = 0; i < 24; i++) {
      const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
      const l = new THREE.Line(g, tm()); l.frustumCulled = false; l.visible = false;
      l.userData.life = 0; scene.add(l); this.tracers.push(l);
    }
    this.trIdx = 0;
    // world muzzle light
    this.flash = new THREE.PointLight(0xffb060, 0, 9, 2);
    scene.add(this.flash);
    this.flashT = 0;
  }

  hole(point, normal) {
    const m = this.holes[this.holeIdx++ % this.holes.length];
    m.position.copy(point).addScaledVector(normal, 0.004);
    m.lookAt(point.clone().add(normal));
    m.rotation.z = Math.random() * 6.28;
    m.scale.setScalar(rand(0.7, 1.2));
    m.visible = true;
  }

  sparks(point, normal, n = 6, color = null) {
    for (let i = 0; i < n; i++) {
      const s = this.parts[this.partIdx++ % this.parts.length];
      const u = s.userData;
      s.position.copy(point).addScaledVector(normal, 0.02);
      u.v.copy(normal).multiplyScalar(u.puff ? 0.6 : rand(2, 5)).add(new THREE.Vector3(rand(-1, 1), rand(-0.5, 1.5), rand(-1, 1)).multiplyScalar(u.puff ? 0.3 : 2));
      u.life = u.max = u.puff ? rand(0.4, 0.7) : rand(0.12, 0.3);
      s.scale.setScalar(u.puff ? 0.25 : 0.05);
      s.material.color.set(color && !u.puff ? color : 0xffffff);
      s.visible = true;
    }
  }

  tracer(from, to) {
    const l = this.tracers[this.trIdx++ % this.tracers.length];
    const p = l.geometry.attributes.position;
    // start a little way down the barrel path so it doesn't fill the screen
    const start = from.clone().lerp(to, 0.04);
    p.setXYZ(0, start.x, start.y, start.z);
    p.setXYZ(1, to.x, to.y, to.z);
    p.needsUpdate = true;
    l.geometry.computeBoundingSphere();
    l.userData.life = 0.06;
    l.material.opacity = 0.9;
    l.visible = true;
  }

  muzzle(pos) {
    this.flash.position.copy(pos);
    this.flashT = 0.05;
  }

  update(dt) {
    for (const s of this.parts) {
      if (!s.visible) continue;
      const u = s.userData;
      u.life -= dt;
      if (u.life <= 0) { s.visible = false; continue; }
      if (!u.puff) u.v.y -= 9.8 * dt;
      s.position.addScaledVector(u.v, dt);
      const k = u.life / u.max;
      s.material.opacity = k;
      if (u.puff) s.scale.setScalar(0.25 + (1 - k) * 0.4);
    }
    for (const l of this.tracers) {
      if (!l.visible) continue;
      l.userData.life -= dt;
      l.material.opacity = Math.max(0, l.userData.life / 0.06) * 0.9;
      if (l.userData.life <= 0) l.visible = false;
    }
    this.flashT -= dt;
    this.flash.intensity = this.flashT > 0 ? 25 : 0;
  }

  clear() {
    for (const h of this.holes) h.visible = false;
    for (const s of this.parts) s.visible = false;
    for (const l of this.tracers) l.visible = false;
  }
}
