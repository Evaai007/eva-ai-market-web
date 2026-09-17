/* EVA AI MARKET — Interactive 3D WebGL Hero Visual (Desktop Only) */
(function () {
  'use strict';

  function isMobileEnv() {
    var ua = navigator.userAgent || '';
    var ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var android = /android/i.test(ua);
    var touch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    var mobileLite = document.documentElement.classList.contains('eva-mobile-lite');
    var narrow = window.innerWidth <= 768;
    return ios || android || mobileLite || (touch && narrow);
  }

  if (isMobileEnv()) {
    // Mobile devices use lightweight crash-free CSS 3D visuals
    return;
  }

  function hasWebGL() {
    try {
      var canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
      return false;
    }
  }

  if (!hasWebGL()) return;

  function loadThreeJS(cb) {
    if (window.THREE) {
      cb();
      return;
    }
    var script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    script.async = true;
    script.onload = cb;
    script.onerror = function () {
      console.warn('Three.js CDN unavailable, using CSS fallback');
    };
    document.head.appendChild(script);
  }

  function init3DHero() {
    var visualContainer = document.querySelector('.ref-hero .ref-visual');
    if (!visualContainer) return;

    // Check container size
    var rect = visualContainer.getBoundingClientRect();
    if (rect.width < 200 || rect.height < 200) return;

    // Canvas wrapper
    var wrap = document.createElement('div');
    wrap.className = 'eva-3d-canvas-wrap';
    wrap.style.cssText = 'position:absolute;inset:-20px;z-index:2;pointer-events:none;overflow:visible;';
    visualContainer.appendChild(wrap);

    var width = visualContainer.clientWidth || 400;
    var height = visualContainer.clientHeight || 400;

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 8.5;

    var renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    wrap.appendChild(renderer.domElement);

    // Lights
    var ambientLight = new THREE.AmbientLight(0x0c1838, 2.5);
    scene.add(ambientLight);

    var pointLight1 = new THREE.PointLight(0x32e7ff, 4.5, 20);
    pointLight1.position.set(4, 4, 5);
    scene.add(pointLight1);

    var pointLight2 = new THREE.PointLight(0xef63ef, 4.5, 20);
    pointLight2.position.set(-4, -4, 4);
    scene.add(pointLight2);

    var pointLight3 = new THREE.PointLight(0x8b62ff, 3, 15);
    pointLight3.position.set(0, 5, -2);
    scene.add(pointLight3);

    // Core Group
    var coreGroup = new THREE.Group();
    scene.add(coreGroup);

    // Central Sphere (Glossy EVA AI Core)
    var sphereGeo = new THREE.IcosahedronGeometry(1.6, 6);
    var sphereMat = new THREE.MeshPhysicalMaterial({
      color: 0x0c1e4a,
      emissive: 0x1a4599,
      emissiveIntensity: 0.6,
      roughness: 0.15,
      metalness: 0.85,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      wireframe: false
    });
    var coreSphere = new THREE.Mesh(sphereGeo, sphereMat);
    coreGroup.add(coreSphere);

    // Outer Wireframe Crystal Overlay
    var outerGeo = new THREE.IcosahedronGeometry(1.85, 2);
    var outerMat = new THREE.MeshBasicMaterial({
      color: 0x32e7ff,
      wireframe: true,
      transparent: true,
      opacity: 0.28
    });
    var outerWire = new THREE.Mesh(outerGeo, outerMat);
    coreGroup.add(outerWire);

    // Torus Rings
    var ring1Geo = new THREE.TorusGeometry(2.3, 0.035, 16, 100);
    var ring1Mat = new THREE.MeshStandardMaterial({
      color: 0x32e7ff,
      emissive: 0x20c5ff,
      emissiveIntensity: 1.2,
      roughness: 0.2,
      metalness: 0.9
    });
    var ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    ring1.rotation.x = Math.PI / 3;
    coreGroup.add(ring1);

    var ring2Geo = new THREE.TorusGeometry(2.6, 0.025, 16, 100);
    var ring2Mat = new THREE.MeshStandardMaterial({
      color: 0xef63ef,
      emissive: 0xd942d9,
      emissiveIntensity: 1.2,
      roughness: 0.2,
      metalness: 0.9
    });
    var ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.y = Math.PI / 4;
    ring2.rotation.x = -Math.PI / 6;
    coreGroup.add(ring2);

    // Particle Cloud / Nebula
    var particleCount = 450;
    var particlesGeo = new THREE.BufferGeometry();
    var positions = new Float32Array(particleCount * 3);
    var colors = new Float32Array(particleCount * 3);

    var colorOptions = [
      new THREE.Color(0x32e7ff),
      new THREE.Color(0xef63ef),
      new THREE.Color(0x8b62ff),
      new THREE.Color(0x38e6bf)
    ];

    for (var i = 0; i < particleCount; i++) {
      var r = 2.8 + Math.random() * 3.5;
      var theta = Math.random() * Math.PI * 2;
      var phi = Math.acos((Math.random() * 2) - 1);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      var c = colorOptions[Math.floor(Math.random() * colorOptions.length)];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particlesGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    var particleMat = new THREE.PointsMaterial({
      size: 0.065,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });

    var particleSystem = new THREE.Points(particlesGeo, particleMat);
    scene.add(particleSystem);

    // Mouse Interaction
    var mouseX = 0, mouseY = 0;
    var targetX = 0, targetY = 0;

    window.addEventListener('mousemove', function (e) {
      var windowHalfX = window.innerWidth / 2;
      var windowHalfY = window.innerHeight / 2;
      mouseX = (e.clientX - windowHalfX) / windowHalfX;
      mouseY = (e.clientY - windowHalfY) / windowHalfY;
    }, { passive: true });

    // Render loop with Visibility Optimization
    var isVisible = true;
    var observer = new IntersectionObserver(function (entries) {
      isVisible = entries[0].isIntersecting;
    }, { threshold: 0.1 });
    observer.observe(visualContainer);

    var clock = new THREE.Clock();

    function animate() {
      requestAnimationFrame(animate);
      if (!isVisible) return;

      var delta = clock.getDelta();
      var time = clock.getElapsedTime();

      // Mouse Smooth Interpolation
      targetX += (mouseX - targetX) * 0.05;
      targetY += (mouseY - targetY) * 0.05;

      // Rotations
      coreGroup.rotation.y = time * 0.25 + targetX * 0.8;
      coreGroup.rotation.x = Math.sin(time * 0.2) * 0.15 + targetY * 0.5;

      outerWire.rotation.y = -time * 0.35;
      ring1.rotation.z = time * 0.4;
      ring2.rotation.z = -time * 0.3;

      particleSystem.rotation.y = time * 0.08;

      // Pulse lighting
      pointLight1.intensity = 4.0 + Math.sin(time * 2) * 1.0;
      pointLight2.intensity = 4.0 + Math.cos(time * 2.5) * 1.0;

      renderer.render(scene, camera);
    }

    animate();

    // Resize handling
    window.addEventListener('resize', function () {
      if (isMobileEnv()) return;
      var w = visualContainer.clientWidth || 400;
      var h = visualContainer.clientHeight || 400;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      loadThreeJS(init3DHero);
    });
  } else {
    loadThreeJS(init3DHero);
  }
})();
