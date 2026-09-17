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
    if (window.__eva3dHeroCleanup) {
      try { window.__eva3dHeroCleanup(); } catch (e) {}
    }

    var visualContainer = document.querySelector('.ref-hero .ref-visual');
    if (!visualContainer) return;

    var rect = visualContainer.getBoundingClientRect();
    if (rect.width < 200 || rect.height < 200) return;

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

    var canvasEl = renderer.domElement;

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

    // State Variables
    var animFrameId = null;
    var isIntersecting = true;
    var isTabVisible = !document.hidden;
    var isContextLost = false;

    // Motion preference
    var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    var prefersReducedMotion = motionQuery.matches;

    var mouseX = 0, mouseY = 0;
    var targetX = 0, targetY = 0;

    function onMouseMove(e) {
      if (prefersReducedMotion) return;
      var windowHalfX = window.innerWidth / 2;
      var windowHalfY = window.innerHeight / 2;
      mouseX = (e.clientX - windowHalfX) / windowHalfX;
      mouseY = (e.clientY - windowHalfY) / windowHalfY;
    }

    function onWindowResize() {
      if (isMobileEnv()) return;
      var w = visualContainer.clientWidth || 400;
      var h = visualContainer.clientHeight || 400;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderFrame(0);
    }

    function onVisibilityChange() {
      isTabVisible = !document.hidden;
      updateLoopState();
    }

    function onMotionQueryChange(e) {
      prefersReducedMotion = e.matches;
      renderFrame(clock.getElapsedTime());
      updateLoopState();
    }

    function onContextLost(e) {
      e.preventDefault();
      isContextLost = true;
      updateLoopState();
    }

    function onContextRestored() {
      isContextLost = false;
      updateLoopState();
    }

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('resize', onWindowResize, { passive: true });
    document.addEventListener('visibilitychange', onVisibilityChange);
    if (motionQuery.addEventListener) {
      motionQuery.addEventListener('change', onMotionQueryChange);
    } else if (motionQuery.addListener) {
      motionQuery.addListener(onMotionQueryChange);
    }

    if (canvasEl) {
      canvasEl.addEventListener('webglcontextlost', onContextLost, false);
      canvasEl.addEventListener('webglcontextrestored', onContextRestored, false);
    }

    // Intersection Observer
    var observer = new IntersectionObserver(function (entries) {
      isIntersecting = entries[0].isIntersecting;
      updateLoopState();
    }, { threshold: 0.1 });
    observer.observe(visualContainer);

    var clock = new THREE.Clock();

    function renderFrame(time) {
      if (prefersReducedMotion) {
        coreGroup.rotation.y = 0.5;
        coreGroup.rotation.x = 0.1;
        outerWire.rotation.y = 0;
        ring1.rotation.z = 0;
        ring2.rotation.z = 0;
        particleSystem.rotation.y = 0;
        pointLight1.intensity = 4.5;
        pointLight2.intensity = 4.5;
      } else {
        targetX += (mouseX - targetX) * 0.05;
        targetY += (mouseY - targetY) * 0.05;

        coreGroup.rotation.y = time * 0.25 + targetX * 0.8;
        coreGroup.rotation.x = Math.sin(time * 0.2) * 0.15 + targetY * 0.5;

        outerWire.rotation.y = -time * 0.35;
        ring1.rotation.z = time * 0.4;
        ring2.rotation.z = -time * 0.3;

        particleSystem.rotation.y = time * 0.08;

        pointLight1.intensity = 4.0 + Math.sin(time * 2) * 1.0;
        pointLight2.intensity = 4.0 + Math.cos(time * 2.5) * 1.0;
      }

      renderer.render(scene, camera);
    }

    function animate() {
      if (!shouldRun()) {
        animFrameId = null;
        return;
      }

      var time = clock.getElapsedTime();
      renderFrame(time);

      if (prefersReducedMotion) {
        animFrameId = null;
        return;
      }

      animFrameId = requestAnimationFrame(animate);
    }

    function shouldRun() {
      return isIntersecting && isTabVisible && !isContextLost;
    }

    function updateLoopState() {
      if (shouldRun()) {
        if (!animFrameId) {
          clock.start();
          if (prefersReducedMotion) {
            renderFrame(0);
          } else {
            animFrameId = requestAnimationFrame(animate);
          }
        }
      } else {
        if (animFrameId) {
          cancelAnimationFrame(animFrameId);
          animFrameId = null;
        }
      }
    }

    // Full Cleanup Function
    function cleanup() {
      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }

      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onWindowResize);
      document.removeEventListener('visibilitychange', onVisibilityChange);

      if (motionQuery.removeEventListener) {
        motionQuery.removeEventListener('change', onMotionQueryChange);
      } else if (motionQuery.removeListener) {
        motionQuery.removeListener(onMotionQueryChange);
      }

      if (canvasEl) {
        canvasEl.removeEventListener('webglcontextlost', onContextLost);
        canvasEl.removeEventListener('webglcontextrestored', onContextRestored);
      }

      if (observer) {
        observer.disconnect();
      }

      // Dispose Scene Objects
      scene.traverse(function (obj) {
        if (obj.geometry) {
          obj.geometry.dispose();
        }
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(function (m) { m.dispose(); });
          } else {
            obj.material.dispose();
          }
        }
      });

      if (renderer) {
        renderer.dispose();
        if (renderer.domElement && renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      }

      if (wrap && wrap.parentNode) {
        wrap.parentNode.removeChild(wrap);
      }

      delete window.__eva3dHeroCleanup;
    }

    window.__eva3dHeroCleanup = cleanup;

    // Start initial state
    updateLoopState();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      loadThreeJS(init3DHero);
    });
  } else {
    loadThreeJS(init3DHero);
  }
})();
