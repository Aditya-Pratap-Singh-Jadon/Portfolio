import { useEffect, useRef } from "react";
import * as THREE from "three";
import "./Background3D.css";

export default function Background3D() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    camera.position.z = 5;

    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 1000;
    const posArray = new Float32Array(particlesCount * 3);

    for (let i = 0; i < particlesCount * 3; i++) {
      posArray[i] = (Math.random() - 0.5) * 15;
    }

    particlesGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(posArray, 3),
    );

    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.02,
      color: 0xd4af37,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });

    const particlesMesh = new THREE.Points(
      particlesGeometry,
      particlesMaterial,
    );
    scene.add(particlesMesh);

    const geometries = [
      new THREE.TorusGeometry(0.7, 0.2, 16, 100),
      new THREE.OctahedronGeometry(0.6),
      new THREE.IcosahedronGeometry(0.6),
    ];

    const material = new THREE.MeshBasicMaterial({
      color: 0x4a9eff,
      wireframe: true,
      transparent: true,
      opacity: 0.3,
    });

    const shapes = [];
    geometries.forEach((geometry, i) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.x = (i - 1) * 3;
      mesh.position.z = -2;
      shapes.push(mesh);
      scene.add(mesh);
    });

    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (event) => {
      mouseX = (event.clientX / window.innerWidth) * 2 - 1;
      mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    };
    document.addEventListener("mousemove", handleMouseMove);

    let animationId;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      particlesMesh.rotation.y += 0.001;
      particlesMesh.rotation.x += 0.0005;

      shapes.forEach((shape, i) => {
        shape.rotation.x += 0.003 + i * 0.001;
        shape.rotation.y += 0.005 + i * 0.001;
      });

      camera.position.x += (mouseX * 0.5 - camera.position.x) * 0.05;
      camera.position.y += (mouseY * 0.5 - camera.position.y) * 0.05;
      camera.lookAt(scene.position);

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("mousemove", handleMouseMove);
      particlesGeometry.dispose();
      particlesMaterial.dispose();
      geometries.forEach((g) => g.dispose());
      material.dispose();
      renderer.dispose();
    };
  }, []);

  return <canvas id="canvas3d" ref={canvasRef} className="canvas3d" />;
}
