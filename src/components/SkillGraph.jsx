import { useEffect, useRef } from "react";
import * as THREE from "three";
import { motion } from "../motion";

export default function SkillGraph({ skills, selected, onSelect, reduced }) {
  const host = useRef(null),
    labels = useRef([]),
    current = useRef(selected);
  current.current = selected;
  useEffect(() => {
    const element = host.current;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
    } catch {
      return;
    }
    element.prepend(renderer.domElement);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.4));
    renderer.setClearColor(0, 0);
    const scene = new THREE.Scene(),
      group = new THREE.Group(),
      camera = new THREE.PerspectiveCamera(43, 1, 0.1, 30);
    camera.position.set(0, 0.1, 6.7);
    scene.add(group);
    scene.add(new THREE.AmbientLight(0xd4c3ad, 2));
    const light = new THREE.PointLight(0xff8c32, 20, 12);
    light.position.set(1, 2, 3);
    scene.add(light);
    const geometry = new THREE.BoxGeometry(0.23, 0.34, 0.23),
      centerGeometry = new THREE.OctahedronGeometry(0.36);
    const coreMaterial = new THREE.MeshStandardMaterial({
      color: 0x30251c,
      emissive: 0x6b2207,
      roughness: 0.8,
      metalness: 0.3,
    });
    const core = new THREE.Mesh(centerGeometry, coreMaterial);
    group.add(core);
    const nodeMaterials = [],
      nodes = [],
      lines = [],
      lineGeometries = [],
      pulses = [];
    const positions = [
      [-1.6, 1.25, 0.4],
      [1.5, 1.2, -0.5],
      [1.7, -0.85, 0.7],
      [0, -1.55, -0.4],
      [-1.7, -0.75, 0.2],
    ];
    const pulseGeometry = new THREE.SphereGeometry(0.035, 6, 6),
      pulseMaterial = new THREE.MeshBasicMaterial({ color: 0xffae68 });
    skills.forEach((skill, index) => {
      const angle = (index / skills.length) * Math.PI * 2;
      const p =
        skills.length <= 5
          ? positions[index]
          : [
              Math.cos(angle) * 1.8,
              Math.sin(angle) * 1.6,
              Math.sin(angle * 2) * 0.5,
            ];
      const position = new THREE.Vector3(...p);
      const material = new THREE.MeshStandardMaterial({
        color: 0x2a2722,
        emissive: 0x000000,
        roughness: 0.9,
        metalness: 0.15,
      });
      nodeMaterials.push(material);
      const node = new THREE.Mesh(geometry, material);
      node.position.copy(position);
      node.rotation.set(0.15, 0.4, -0.12);
      nodes.push(node);
      group.add(node);
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(0, 0, 0),
        position
          .clone()
          .multiplyScalar(0.5)
          .add(new THREE.Vector3(0, 0.1, 0.5)),
        position,
      );
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(
        curve.getPoints(24),
      );
      lineGeometries.push(lineGeometry);
      const line = new THREE.Line(
        lineGeometry,
        new THREE.LineBasicMaterial({
          color: 0x713819,
          transparent: true,
          opacity: 0.65,
        }),
      );
      group.add(line);
      lines.push(line);
      const pulse = new THREE.Mesh(pulseGeometry, pulseMaterial);
      group.add(pulse);
      pulses.push({ mesh: pulse, curve });
    });
    let raf,
      active = false,
      width = 1,
      height = 1,
      previous = 0,
      time = 0,
      oldSelection,
      pulseTime = 0,
      needsRender = true;
    const pointer = { x: 0, y: 0 };
    const resize = () => {
      const r = element.getBoundingClientRect();
      width = r.width;
      height = r.height;
      renderer.setSize(width, height);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
      needsRender = true;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    const visible = new IntersectionObserver(([entry]) => {
      active = entry.isIntersecting;
      needsRender = true;
    });
    visible.observe(element);
    const move = (e) => {
      if (e.pointerType === "touch") return;
      const r = element.getBoundingClientRect();
      pointer.x = (e.clientX - r.left) / width - 0.5;
      pointer.y = (e.clientY - r.top) / height - 0.5;
    };
    const leave = () => {
      pointer.x = 0;
      pointer.y = 0;
    };
    element.addEventListener("pointermove", move);
    element.addEventListener("pointerleave", leave);
    const projection = new THREE.Vector3();
    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - previous) / 1000 || 0.016, 0.05);
      previous = now;
      if (!active || document.hidden) return;
      if (oldSelection !== current.current) {
        oldSelection = current.current;
        pulseTime = 0;
        needsRender = true;
      }
      if (reduced && !needsRender) return;
      time += dt;
      pulseTime += dt;
      group.rotation.y +=
        ((reduced ? 0 : pointer.x * 0.2) - group.rotation.y) *
        (1 - Math.exp(-dt * motion.stoneFollow));
      group.rotation.x +=
        ((reduced ? 0 : pointer.y * 0.15) - group.rotation.x) *
        (1 - Math.exp(-dt * motion.stoneFollow));
      nodes.forEach((node, i) => {
        const chosen = skills[i].id === current.current;
        node.material.emissive.setHex(chosen ? 0x9e3307 : 0x000000);
        lines[i].material.color.setHex(chosen ? 0xf16b28 : 0x713819);
        pulses[i].mesh.visible = chosen && !reduced && pulseTime < 1.2;
        pulses[i].mesh.position.copy(
          pulses[i].curve.getPoint(Math.min(pulseTime / 1.2, 1)),
        );
        node.rotation.y = reduced ? 0.4 : 0.4 + Math.sin(time * 0.45 + i) * 0.1;
      });
      renderer.render(scene, camera);
      nodes.forEach((node, i) => {
        node.getWorldPosition(projection);
        projection.project(camera);
        const label = labels.current[i];
        if (label) {
          label.style.left = (projection.x * 0.5 + 0.5) * width + "px";
          label.style.top = (-projection.y * 0.5 + 0.5) * height + 28 + "px";
        }
      });
      needsRender = false;
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      visible.disconnect();
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerleave", leave);
      geometry.dispose();
      centerGeometry.dispose();
      pulseGeometry.dispose();
      coreMaterial.dispose();
      pulseMaterial.dispose();
      nodeMaterials.forEach((m) => m.dispose());
      lines.forEach((l) => l.material.dispose());
      lineGeometries.forEach((g) => g.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [skills, reduced]);
  return (
    <div
      className="skill-graph-3d"
      ref={host}
      aria-label="Interactive skill graph"
    >
      {skills.map((skill, i) => (
        <button
          key={skill.id}
          ref={(node) => (labels.current[i] = node)}
          className={"graph-label " + (selected === skill.id ? "selected" : "")}
          aria-pressed={selected === skill.id}
          style={{
            left: [20, 80, 87, 50, 12][i % 5] + "%",
            top: [19, 19, 71, 89, 71][i % 5] + "%",
          }}
          onClick={() => onSelect(skill.id)}
        >
          {skill.name}
        </button>
      ))}
    </div>
  );
}
