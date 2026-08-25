import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const BRAIN_MODEL_URL =
  "/models/luna/brain/source/3d-vh-f-allen-brain.glb";

export default function BrainViewer() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState("Loading Luna's brain...");

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    // -----------------------------------------
    // Scene
    // -----------------------------------------

    const scene = new THREE.Scene();

    scene.background = new THREE.Color(0x080b10);

    // -----------------------------------------
    // Camera
    // -----------------------------------------

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth /
        Math.max(container.clientHeight, 1),
      0.000001,
      1000,
    );

    camera.position.set(0, 0, 0.3);

    // -----------------------------------------
    // Renderer
    // -----------------------------------------

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
    });

    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, 2),
    );

    renderer.setSize(
      container.clientWidth,
      Math.max(container.clientHeight, 1),
    );

    renderer.outputColorSpace =
      THREE.SRGBColorSpace;

    container.appendChild(
      renderer.domElement,
    );

    // -----------------------------------------
    // Lighting
    // -----------------------------------------

    const ambientLight =
      new THREE.AmbientLight(
        0xffffff,
        2.5,
      );

    scene.add(ambientLight);

    const keyLight =
      new THREE.DirectionalLight(
        0xffffff,
        3,
      );

    keyLight.position.set(
      2,
      3,
      4,
    );

    scene.add(keyLight);

    const fillLight =
      new THREE.DirectionalLight(
        0xffffff,
        1.5,
      );

    fillLight.position.set(
      -3,
      1,
      2,
    );

    scene.add(fillLight);

    // -----------------------------------------
    // Brain container
    // -----------------------------------------

    const brainRoot =
      new THREE.Group();

    scene.add(brainRoot);

    // -----------------------------------------
    // Camera controls
    // -----------------------------------------

    const controls =
      new OrbitControls(
        camera,
        renderer.domElement,
      );

    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Left mouse = rotate
    controls.mouseButtons.LEFT =
      THREE.MOUSE.ROTATE;

    // Right mouse = pan
    controls.mouseButtons.RIGHT =
      THREE.MOUSE.PAN;

    // Middle mouse = dolly
    controls.mouseButtons.MIDDLE =
      THREE.MOUSE.DOLLY;

    // Scroll wheel = zoom
    controls.enableZoom = true;

    // Allow the user to move close to the brain.
    controls.minDistance = 0.02;

    // Prevent the camera from getting
    // absurdly far away.
    controls.maxDistance = 2;

    // Allow panning.
    controls.enablePan = true;

    // Pan in screen space.
    controls.screenSpacePanning = true;

    // -----------------------------------------
    // Load brain
    // -----------------------------------------

    const loader = new GLTFLoader();

    loader.load(
      BRAIN_MODEL_URL,

      (gltf) => {
        const brain = gltf.scene;

        brainRoot.add(brain);

        // Find original dimensions.
        const box =
          new THREE.Box3().setFromObject(
            brain,
          );

        const center =
          box.getCenter(
            new THREE.Vector3(),
          );

        const size =
          box.getSize(
            new THREE.Vector3(),
          );

        // Center brain at origin.
        brain.position.sub(center);

        // -------------------------------------
        // Physical scale
        // -------------------------------------

        const maxDimension =
          Math.max(
            size.x,
            size.y,
            size.z,
          );

        if (maxDimension > 0) {
          // Approximately 170 mm.
          const targetSize = 0.17;

          const scale =
            targetSize /
            maxDimension;

          brain.scale.setScalar(
            scale,
          );
        }

        // -------------------------------------
        // Position camera
        // -------------------------------------

        const scaledBox =
          new THREE.Box3().setFromObject(
            brain,
          );

        const scaledSize =
          scaledBox.getSize(
            new THREE.Vector3(),
          );

        const startingDistance =
          Math.max(
            scaledSize.z * 2.5,
            0.3,
          );

        camera.position.set(
          0,
          0,
          startingDistance,
        );

        controls.target.set(
          0,
          0,
          0,
        );

        controls.update();

        // Remember this as the reset position.
        controls.saveState();

        setStatus(
          "Luna's brain online",
        );
      },

      undefined,

      (error) => {
        console.error(
          "Failed to load Luna brain:",
          error,
        );

        setStatus(
          "Unable to load Luna's brain model",
        );
      },
    );

    // -----------------------------------------
    // Double-click = reset camera
    // -----------------------------------------

    const handleDoubleClick = () => {
      controls.reset();
    };

    renderer.domElement.addEventListener(
      "dblclick",
      handleDoubleClick,
    );

    // -----------------------------------------
    // Resize
    // -----------------------------------------

    const handleResize = () => {
      const width =
        container.clientWidth;

      const height =
        Math.max(
          container.clientHeight,
          1,
        );

      camera.aspect =
        width / height;

      camera.updateProjectionMatrix();

      renderer.setSize(
        width,
        height,
      );
    };

    window.addEventListener(
      "resize",
      handleResize,
    );

    // -----------------------------------------
    // Animation
    // -----------------------------------------

    let animationFrame = 0;

    const animate = () => {
      animationFrame =
        requestAnimationFrame(
          animate,
        );

      controls.update();

      renderer.render(
        scene,
        camera,
      );
    };

    animate();

    // -----------------------------------------
    // Cleanup
    // -----------------------------------------

    return () => {
      cancelAnimationFrame(
        animationFrame,
      );

      window.removeEventListener(
        "resize",
        handleResize,
      );

      renderer.domElement.removeEventListener(
        "dblclick",
        handleDoubleClick,
      );

      controls.dispose();

      renderer.dispose();

      if (
        renderer.domElement.parentElement ===
        container
      ) {
        container.removeChild(
          renderer.domElement,
        );
      }
    };
  }, []);

  return (
    <div className="relative h-full min-h-[600px] w-full overflow-hidden rounded-xl bg-black">
      <div
        ref={containerRef}
        className="absolute inset-0"
      />

      <div className="pointer-events-none absolute left-4 top-4 rounded-lg bg-black/60 px-3 py-2 text-sm text-white backdrop-blur">
        {status}
      </div>

      <div className="pointer-events-none absolute bottom-4 left-4 rounded-lg bg-black/60 px-3 py-2 text-xs text-white/80 backdrop-blur">
        Drag to rotate · Scroll to zoom ·
        Right-drag to pan · Double-click to reset
      </div>
    </div>
  );
}