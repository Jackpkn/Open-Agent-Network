'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Cpu, Activity, Zap, Shield, Sparkles, Box } from 'lucide-react';
import { motion } from 'framer-motion';

interface AgentNodeData {
  name: string;
  role: string;
  color: string;
  url: string;
  volume: string;
  position: THREE.Vector3;
}

export function ThreeAgentGlobe() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentNodeData | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    // 1. Scene, Camera, Renderer Setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x121212, 0.08);

    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 18);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 2. Central Protocol Core Sphere
    const coreGeometry = new THREE.IcosahedronGeometry(2.5, 2);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0x3b82f6,
      wireframe: true,
      transparent: true,
      opacity: 0.6,
    });
    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    scene.add(coreMesh);

    // Inner Glowing Core
    const innerCoreGeo = new THREE.SphereGeometry(1.5, 32, 32);
    const innerCoreMat = new THREE.MeshBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.8,
    });
    const innerCore = new THREE.Mesh(innerCoreGeo, innerCoreMat);
    scene.add(innerCore);

    // Orbit Ring
    const ringGeo = new THREE.RingGeometry(6, 6.08, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.3,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 3;
    scene.add(ringMesh);

    // 3. Orbiting Agent Nodes
    const agentNodesData: AgentNodeData[] = [
      {
        name: 'Claude & Gemini Code Auditor',
        role: 'Primary Security Auditor',
        color: '#3B82F6',
        url: 'http://localhost:8001',
        volume: '$425 USDC',
        position: new THREE.Vector3(-6, 3, 2),
      },
      {
        name: 'SecurityScanner Agent',
        role: 'AST Vulnerability Sub-worker',
        color: '#10B981',
        url: 'http://localhost:8003',
        volume: '$190 USDC',
        position: new THREE.Vector3(6, 2, -2),
      },
      {
        name: 'Polyglot Technical Translator',
        role: 'A2A Polyglot Agent',
        color: '#A855F7',
        url: 'http://localhost:8002',
        volume: '$72 USDC',
        position: new THREE.Vector3(-4, -4, 3),
      },
      {
        name: 'DocWriter Agent',
        role: 'OpenAPI Doc Sub-worker',
        color: '#F59E0B',
        url: 'http://localhost:8004',
        volume: '$10 USDC',
        position: new THREE.Vector3(5, -3, -1),
      },
    ];

    const agentMeshes: THREE.Mesh[] = [];

    agentNodesData.forEach((node) => {
      const geo = new THREE.SphereGeometry(0.8, 32, 32);
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(node.color),
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(node.position);
      mesh.userData = node;
      scene.add(mesh);
      agentMeshes.push(mesh);

      // Outer Halo Wireframe
      const haloGeo = new THREE.SphereGeometry(1.1, 16, 16);
      const haloMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(node.color),
        wireframe: true,
        transparent: true,
        opacity: 0.3,
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.position.copy(node.position);
      scene.add(halo);

      // Connecting Curved Line to Core
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(node.position.x * 0.5, node.position.y * 0.5 + 2, node.position.z * 0.5),
        node.position
      );
      const points = curve.getPoints(50);
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(node.color),
        transparent: true,
        opacity: 0.4,
      });
      const line = new THREE.Line(lineGeo, lineMat);
      scene.add(line);
    });

    // 4. Background Starfield Particles
    const particleCount = 200;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 40;
      particlePositions[i + 1] = (Math.random() - 0.5) * 40;
      particlePositions[i + 2] = (Math.random() - 0.5) * 40;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.1,
      transparent: true,
      opacity: 0.5,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // 5. Mouse Raycasting for Interactive Selection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(agentMeshes);

      if (intersects.length > 0) {
        const data = intersects[0].object.userData as AgentNodeData;
        setSelectedAgent(data);
        container.style.cursor = 'pointer';
      } else {
        container.style.cursor = 'default';
      }
    };

    container.addEventListener('mousemove', onPointerMove);

    // 6. Animation Loop
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Rotate core & rings
      coreMesh.rotation.y += 0.005;
      coreMesh.rotation.x += 0.002;
      innerCore.rotation.y -= 0.008;
      ringMesh.rotation.z += 0.003;
      particles.rotation.y += 0.0005;

      // Orbit agent nodes slowly
      const time = Date.now() * 0.0005;
      agentMeshes.forEach((mesh, index) => {
        const offset = index * (Math.PI / 2);
        const radius = 6.5;
        mesh.position.x = Math.cos(time + offset) * radius;
        mesh.position.z = Math.sin(time + offset) * radius;
      });

      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      container.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('resize', handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="p-6 rounded-2xl bg-[#1C1C1E] border border-[#2C2C2E] space-y-4 relative overflow-hidden">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-blue-400 animate-pulse" />
            <h2 className="text-xl font-bold text-white">Three.js 3D Cybernetic Agent Network</h2>
          </div>
          <p className="text-xs text-[#98989E] mt-1">
            Real-time WebGL 3D mesh rendering active agent nodes, orbit rings, and A2A subcontracting beams.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs font-mono px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
            <span>Three.js WebGL Active</span>
          </span>
        </div>
      </div>

      {/* 3D WebGL Canvas Container */}
      <div className="h-[480px] w-full rounded-2xl bg-[#121214] overflow-hidden relative border border-[#2C2C2E]">
        <div ref={containerRef} className="w-full h-full" />

        {/* Selected 3D Node Floating Badge */}
        {selectedAgent && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-6 left-6 p-4 rounded-xl bg-[#1C1C1E]/90 border border-blue-500/40 backdrop-blur-md space-y-1 shadow-2xl max-w-xs"
          >
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedAgent.color }} />
              <h4 className="text-xs font-bold text-white">{selectedAgent.name}</h4>
            </div>
            <p className="text-[11px] text-[#98989E]">{selectedAgent.role}</p>
            <div className="flex items-center justify-between text-[11px] font-mono pt-1 text-emerald-400">
              <span>{selectedAgent.url}</span>
              <span className="font-bold">{selectedAgent.volume}</span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
