import { useEffect, useRef } from "react";
import * as THREE from "three";
import { motion } from "../motion";

export default function Monolith({ opening, reduced, mobile, onReady }) {
  const host = useRef(null),
    state = useRef({ opening });
  state.current.opening = opening;
  useEffect(() => {
    const element = host.current;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: !mobile,
        powerPreference: "low-power",
      });
    } catch {
      onReady(false);
      return;
    }
    element.appendChild(renderer.domElement);
    renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.25 : 1.7));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.45;
    const scene = new THREE.Scene(),
      camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
    camera.position.set(4.3, 2.6, 8.7);
    camera.lookAt(0, 0, 0);
    scene.add(new THREE.AmbientLight(0xc0b9ad, 1.3));
    const key = new THREE.DirectionalLight(0xe8e2d9, 2.7);
    key.position.set(-3, 6, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, 2);
    rim.position.set(4, 1, -4);
    scene.add(rim);
    const lavaLight = new THREE.PointLight(0xff4500, 2, 7, 2);
    lavaLight.position.set(0, -0.7, 1);
    scene.add(lavaLight);
    const group = new THREE.Group();
    scene.add(group);
    const geometries = [],
      materials = [];
    const stone = new THREE.MeshStandardMaterial({
      color: 0x191918,
      roughness: 0.94,
      metalness: 0.16,
    });
    // Procedural stone grain keeps the hero texture-free and inexpensive to transfer.
    stone.onBeforeCompile = (shader) => {
      shader.vertexShader =
        "varying vec3 vStone;\n" +
        shader.vertexShader.replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nvStone = position;",
        );
      shader.fragmentShader =
        "varying vec3 vStone;\nfloat grain(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,35.719)))*43758.5453);}\n" +
        shader.fragmentShader.replace(
          "#include <color_fragment>",
          "#include <color_fragment>\nfloat n=grain(floor(vStone*190.));diffuseColor.rgb *= .6 + n*.65;",
        );
    };
    materials.push(stone);
    const lava = new THREE.MeshStandardMaterial({
      color: 0xff4b00,
      emissive: 0xff3600,
      emissiveIntensity: 4,
      roughness: 0.7,
      toneMapped: false,
    });
    materials.push(lava);
    const coreGeometry = new THREE.BoxGeometry(1.75, 3.96, 0.88);
    geometries.push(coreGeometry);
    const core = new THREE.Mesh(coreGeometry, lava);
    group.add(core);
    const pieces = [];
    // Shared jagged contours retain flat cuboidal faces while opening along actual gaps.
    const fracture = [
      -0.14, 0.06, -0.17, 0.12, 0.02, 0.2, -0.03, 0.13, -0.12, 0.05, -0.22,
      -0.04, 0.1,
    ];
    const seams = [
      [0, 0, 0, 0],
      [0, 0.07, -0.02, 0.03],
      [-0.02, 0.04, -0.06, 0.02],
      [0, 0, 0, 0],
    ];
    for (let row = 0; row < 3; row++) {
      const start = row * 4,
        bottom = -2 + (row * 4) / 3,
        top = bottom + 4 / 3;
      for (const side of [-1, 1]) {
        const points = [
          new THREE.Vector2(side * 0.9, bottom + seams[row][0] + 0.018),
          new THREE.Vector2(side * 0.6, bottom + seams[row][1] + 0.018),
          new THREE.Vector2(side * 0.3, bottom + seams[row][2] + 0.018),
        ];
        for (let k = 0; k <= 4; k++)
          points.push(
            new THREE.Vector2(
              fracture[start + k] + side * 0.04,
              bottom +
                k / 3 +
                (k === 0
                  ? seams[row][3] + 0.018
                  : k === 4
                    ? seams[row + 1][3] - 0.018
                    : 0),
            ),
          );
        points.push(
          new THREE.Vector2(side * 0.3, top + seams[row + 1][2] - 0.018),
          new THREE.Vector2(side * 0.6, top + seams[row + 1][1] - 0.018),
          new THREE.Vector2(side * 0.9, top + seams[row + 1][0] - 0.018),
        );
        const shape = new THREE.Shape(points);
        const geometry = new THREE.ExtrudeGeometry(shape, {
          depth: 0.9,
          bevelEnabled: true,
          bevelSegments: 1,
          steps: 1,
          bevelSize: 0.014,
          bevelThickness: 0.012,
        });
        geometry.translate(0, 0, -0.45);
        geometries.push(geometry);
        const mesh = new THREE.Mesh(geometry, stone);
        group.add(mesh);
        pieces.push({ mesh, side, row });
      }
    }
    const particleGeometry = new THREE.BufferGeometry(),
      positions = new Float32Array((mobile ? 24 : 70) * 3);
    for (let i = 0; i < positions.length; i += 3) {
      positions[i] = Math.sin(i * 12.7) * 2.6;
      positions[i + 1] = Math.cos(i * 8.1) * 3;
      positions[i + 2] = Math.sin(i * 5.9) * 1.8;
    }
    particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3),
    );
    geometries.push(particleGeometry);
    const particleMaterial = new THREE.PointsMaterial({
      color: 0xff8c32,
      size: 0.022,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });
    materials.push(particleMaterial);
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);
    let raf,
      previous = 0,
      elapsed = 0,
      openValue = 0,
      active = true,
      pointer = { x: 0, y: 0 },
      rotation = { x: 0, y: -0.1 };
    let renderedStatic = false;
    const resize = () => {
      const { width, height } = element.getBoundingClientRect();
      renderer.setSize(width, height);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
      renderedStatic = false;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    const intersection = new IntersectionObserver(([entry]) => {
      active = entry.isIntersecting;
    });
    intersection.observe(element);
    const move = (e) => {
      const r = element.getBoundingClientRect();
      pointer = {
        x: (e.clientX - r.left) / r.width - 0.5,
        y: (e.clientY - r.top) / r.height - 0.5,
      };
    };
    const leave = () => {
      pointer = { x: 0, y: 0 };
    };
    element.addEventListener("pointermove", move);
    element.addEventListener("pointerleave", leave);
    const frame = (time) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((time - previous) / 1000 || 0.016, 0.05);
      previous = time;
      if (!active || document.hidden || (reduced && renderedStatic)) return;
      elapsed += dt;
      const damping = 1 - Math.exp(-dt * motion.stoneFollow);
      rotation.x += ((reduced ? 0 : pointer.y * 0.12) - rotation.x) * damping;
      rotation.y +=
        ((reduced ? -0.1 : pointer.x * 0.3 - 0.1) - rotation.y) * damping;
      group.rotation.set(rotation.x, rotation.y, -0.035);
      group.position.y = reduced ? 0 : Math.sin(elapsed * 0.6) * 0.045;
      openValue +=
        ((state.current.opening ? 1 : 0) - openValue) *
        (1 - Math.exp(-dt * motion.stoneOpening));
      for (const p of pieces) {
        p.mesh.position.x = p.side * openValue * (1.2 + p.row * 0.2);
        p.mesh.position.y = openValue * (p.row - 1) * 0.7;
        p.mesh.rotation.y = p.side * openValue * 0.25;
      }
      core.scale.x = 1 - openValue * 0.95;
      lava.emissiveIntensity =
        3.1 + (reduced ? 0 : Math.sin(elapsed * 1.1) * 0.35) + openValue * 3;
      particles.rotation.y = reduced ? 0 : elapsed * 0.018;
      camera.position.z = 8.7 - openValue * 2;
      renderer.render(scene, camera);
      renderedStatic = true;
    };
    const lost = (e) => {
      e.preventDefault();
      onReady(false);
      element.style.opacity = "0";
    };
    renderer.domElement.addEventListener("webglcontextlost", lost);
    raf = requestAnimationFrame(frame);
    onReady(true);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      intersection.disconnect();
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerleave", leave);
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      renderer.dispose();
      renderer.domElement.remove();
      onReady(false);
    };
  }, [reduced, mobile, onReady]);
  return <div ref={host} className="monolith-canvas" />;
}
