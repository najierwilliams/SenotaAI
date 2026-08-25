import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import {
  buildBrainStructureRegistry,
  type BrainScale,
  type BrainStructure,
} from "./anatomy/BrainStructureRegistry";

import AnatomicalInspector from "./AnatomicalInspector";
import BrainAnatomyNavigator from "./BrainAnatomyNavigator";
import BrainScaleAssetLoader from "./BrainScaleAssetLoader";
import type { BrainScaleAsset } from "./anatomy/BrainScaleAssetRegistry";

const BRAIN_MODEL_URL =
  "/models/luna/brain/source/3d-vh-f-allen-brain.glb";

export default function BrainViewer() {
  const containerRef =
    useRef<HTMLDivElement | null>(null);

  const selectedMeshRef =
    useRef<THREE.Mesh | null>(null);

  const selectedOriginalMaterialRef =
    useRef<
      THREE.Material |
      THREE.Material[] |
      null
    >(null);

  const brainRootRef =
    useRef<THREE.Group | null>(null);

  const cameraRef =
    useRef<THREE.PerspectiveCamera | null>(
      null,
    );

  const controlsRef =
    useRef<OrbitControls | null>(null);

  const brainMeshMapRef =
    useRef<Map<string, THREE.Mesh>>(
      new Map(),
    );

  const interiorOriginalMaterialsRef =
    useRef<
      Map<
        THREE.Mesh,
        THREE.Material | THREE.Material[]
      >
    >(new Map());

  const [status, setStatus] = useState(
    "Loading Luna's brain...",
  );

  const [selectedStructure, setSelectedStructure] =
    useState<BrainStructure | null>(null);

  const [isolationMode, setIsolationMode] =
    useState(false);

  const [interiorMode, setInteriorMode] =
    useState(false);

  const [interiorOpacity, setInteriorOpacity] =
    useState(0.12);

  const [cutawayDepth, setCutawayDepth] =
    useState(0);

  const [crossSectionMode, setCrossSectionMode] =
    useState(false);

  const [crossSectionDepth, setCrossSectionDepth] =
    useState(0);

  const interiorModeRef =
    useRef(false);

  const interiorOpacityRef =
    useRef(0.12);

  const cutawayDepthRef =
    useRef(0);

  const crossSectionModeRef =
    useRef(false);

  const crossSectionDepthRef =
    useRef(0);

  const clippingPlaneRef =
    useRef(
      new THREE.Plane(
        new THREE.Vector3(1, 0, 0),
        0,
      ),
    );

  const brainBoundsRef =
    useRef<THREE.Box3 | null>(null);

  interiorModeRef.current =
    interiorMode;

  interiorOpacityRef.current =
    interiorOpacity;

  crossSectionModeRef.current =
    crossSectionMode;

  crossSectionDepthRef.current =
    crossSectionDepth;

  const [brainStructures, setBrainStructures] =
    useState<BrainStructure[]>([]);

  const [activeScale, setActiveScale] =
    useState<BrainScale>("macro");

  const [scaleAsset, setScaleAsset] =
    useState<BrainScaleAsset | null>(null);

  const [scaleAssetLoading, setScaleAssetLoading] =
    useState(false);

  const [scaleAssetError, setScaleAssetError] =
    useState<string | null>(null);

  const restoreInteriorMode = () => {
    interiorOriginalMaterialsRef.current.forEach(
      (originalMaterial, mesh) => {
        mesh.material =
          originalMaterial;
      },
    );

    interiorOriginalMaterialsRef.current.clear();
  };

  const applyInteriorMode = (
    selectedMesh: THREE.Mesh | null,
  ) => {
    const brainRoot =
      brainRootRef.current;

    if (!brainRoot) {
      return;
    }

    interiorOriginalMaterialsRef.current.clear();

    brainRoot.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) {
        return;
      }

      if (object === selectedMesh) {
        return;
      }

      const originalMaterial =
        object.material;

      interiorOriginalMaterialsRef.current.set(
        object,
        originalMaterial,
      );

      if (Array.isArray(originalMaterial)) {
        const clonedMaterials =
          originalMaterial.map(
            (material) => {
              const clone =
                material.clone();

              clone.transparent = true;
              clone.opacity =
                interiorOpacityRef.current;
              clone.depthWrite = false;

              return clone;
            },
          );

        object.material =
          clonedMaterials;
      } else {
        const clonedMaterial =
          originalMaterial.clone();

        clonedMaterial.transparent = true;
        clonedMaterial.opacity =
          interiorOpacityRef.current;
        clonedMaterial.depthWrite = false;

        object.material =
          clonedMaterial;
      }
    });
  };

  const getCutawayOpacity = (
    mesh: THREE.Mesh,
    selectedMesh: THREE.Mesh | null,
    opacity: number,
  ) => {
    if (
      !selectedMesh ||
      cutawayDepthRef.current <= 0
    ) {
      return opacity;
    }

    const selectedBox =
      new THREE.Box3().setFromObject(
        selectedMesh,
      );

    const selectedCenter =
      selectedBox.getCenter(
        new THREE.Vector3(),
      );

    const selectedSize =
      selectedBox.getSize(
        new THREE.Vector3(),
      );

    const referenceRadius =
      Math.max(
        selectedSize.x,
        selectedSize.y,
        selectedSize.z,
        0.001,
      );

    const cutawayRadius =
      referenceRadius *
      (1 + cutawayDepthRef.current * 12);

    const box =
      new THREE.Box3().setFromObject(
        mesh,
      );

    const center =
      box.getCenter(
        new THREE.Vector3(),
      );

    return center.distanceTo(
      selectedCenter,
    ) <= cutawayRadius
      ? opacity
      : 0;
  };

  const updateInteriorOpacity = (
    value: number,
  ) => {
    const clampedValue = Math.min(
      0.5,
      Math.max(0.03, value),
    );

    interiorOpacityRef.current =
      clampedValue;

    setInteriorOpacity(
      clampedValue,
    );

    if (!interiorModeRef.current) {
      return;
    }

    const brainRoot =
      brainRootRef.current;

    const selectedMesh =
      selectedMeshRef.current;

    if (!brainRoot) {
      return;
    }

    brainRoot.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) {
        return;
      }

      if (object === selectedMesh) {
        return;
      }

      const material =
        object.material;

      const opacity =
        cutawayDepthRef.current > 0
          ? getCutawayOpacity(
              object,
              selectedMesh,
              clampedValue,
            )
          : clampedValue;

      if (Array.isArray(material)) {
        material.forEach(
          (item) => {
            item.opacity =
              opacity;
            item.transparent = true;
            item.depthWrite = false;
          },
        );
      } else {
        material.opacity =
          opacity;
        material.transparent = true;
        material.depthWrite = false;
      }
    });
  };

  const updateCutawayDepth = (
    value: number,
  ) => {
    const clampedValue = Math.min(
      1,
      Math.max(0, value),
    );

    cutawayDepthRef.current =
      clampedValue;

    setCutawayDepth(
      clampedValue,
    );

    if (!interiorModeRef.current) {
      return;
    }

    const brainRoot =
      brainRootRef.current;

    const selectedMesh =
      selectedMeshRef.current;

    if (!brainRoot || !selectedMesh) {
      return;
    }

    const selectedBox =
      new THREE.Box3().setFromObject(
        selectedMesh,
      );

    const selectedCenter =
      selectedBox.getCenter(
        new THREE.Vector3(),
      );

    const selectedSize =
      selectedBox.getSize(
        new THREE.Vector3(),
      );

    const referenceRadius =
      Math.max(
        selectedSize.x,
        selectedSize.y,
        selectedSize.z,
        0.001,
      );

    const cutawayRadius =
      referenceRadius *
      (1 + clampedValue * 12);

    brainRoot.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) {
        return;
      }

      if (object === selectedMesh) {
        object.visible = true;
        return;
      }

      const box =
        new THREE.Box3().setFromObject(
          object,
        );

      const center =
        box.getCenter(
          new THREE.Vector3(),
        );

      const distance =
        center.distanceTo(
          selectedCenter,
        );

      const material =
        object.material;

      const opacity =
        distance <= cutawayRadius
          ? interiorOpacityRef.current
          : 0;

      if (Array.isArray(material)) {
        material.forEach(
          (item) => {
            item.transparent = true;
            item.opacity = opacity;
            item.depthWrite = false;
          },
        );
      } else {
        material.transparent = true;
        material.opacity = opacity;
        material.depthWrite = false;
      }
    });
  };

  const applyClippingPlane = (
    enabled: boolean,
    depth: number,
  ) => {
    const brainRoot =
      brainRootRef.current;

    const bounds =
      brainBoundsRef.current;

    if (!brainRoot || !bounds) {
      return;
    }

    const minX = bounds.min.x;
    const maxX = bounds.max.x;

    const position =
      minX +
      (maxX - minX) *
        Math.min(
          1,
          Math.max(0, depth),
        );

    clippingPlaneRef.current.set(
      new THREE.Vector3(1, 0, 0),
      -position,
    );

    brainRoot.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) {
        return;
      }

      const material =
        object.material;

      if (Array.isArray(material)) {
        material.forEach(
          (item) => {
            item.clippingPlanes =
              enabled
                ? [clippingPlaneRef.current]
                : [];
          },
        );
      } else {
        material.clippingPlanes =
          enabled
            ? [clippingPlaneRef.current]
            : [];
      }
    });
  };

  const updateCrossSectionDepth = (
    value: number,
  ) => {
    const clampedValue = Math.min(
      1,
      Math.max(0, value),
    );

    crossSectionDepthRef.current =
      clampedValue;

    setCrossSectionDepth(
      clampedValue,
    );

    if (
      crossSectionModeRef.current
    ) {
      applyClippingPlane(
        true,
        clampedValue,
      );
    }
  };

  const toggleCrossSectionMode = () => {
    const bounds =
      brainBoundsRef.current;

    if (!bounds) {
      setStatus(
        "Brain model is still loading",
      );

      return;
    }

    if (crossSectionMode) {
      applyClippingPlane(
        false,
        0,
      );

      crossSectionModeRef.current =
        false;

      setCrossSectionMode(false);

      setCrossSectionDepth(0);

      crossSectionDepthRef.current =
        0;

      setStatus(
        selectedStructure
          ? `Selected: ${selectedStructure.displayName}`
          : "Luna's brain online",
      );

      return;
    }

    applyClippingPlane(
      true,
      crossSectionDepth,
    );

    crossSectionModeRef.current =
      true;

    setCrossSectionMode(true);

    setStatus(
      "Cross-section view active",
    );
  };

  const toggleInteriorMode = () => {
    const selectedMesh =
      selectedMeshRef.current;

    if (!selectedMesh) {
      setStatus(
        "Select a brain structure first",
      );

      return;
    }

    if (interiorMode) {
      restoreInteriorMode();

      applyClippingPlane(
        false,
        0,
      );

      crossSectionModeRef.current =
        false;

      crossSectionDepthRef.current =
        0;

      cutawayDepthRef.current =
        0;

      setCrossSectionDepth(0);
      setCrossSectionMode(false);
      setCutawayDepth(0);
      setInteriorMode(false);

      setStatus(
        `Selected: ${
          selectedStructure?.displayName ??
          selectedMesh.name
        }`,
      );

      return;
    }

    applyInteriorMode(
      selectedMesh,
    );

    setInteriorMode(true);

    setStatus(
      `Interior view: ${
        selectedStructure?.displayName ??
        selectedMesh.name
      }`,
    );
  };

  const restoreSelectedMesh = () => {
    const mesh =
      selectedMeshRef.current;

    const originalMaterial =
      selectedOriginalMaterialRef.current;

    if (
      !mesh ||
      !originalMaterial
    ) {
      return;
    }

    mesh.material =
      originalMaterial;

    selectedMeshRef.current =
      null;

    selectedOriginalMaterialRef.current =
      null;
  };

  const selectBrainStructure = (
    structure: BrainStructure,
  ) => {
    const mesh =
      brainMeshMapRef.current.get(
        structure.id,
      );

    if (!mesh) {
      setSelectedStructure(
        structure,
      );

      setStatus(
        `Structure not available in current mesh map: ${structure.displayName}`,
      );

      return;
    }

    restoreSelectedMesh();

    if (interiorMode) {
      restoreInteriorMode();
    }

    cutawayDepthRef.current =
      0;

    setCutawayDepth(0);

    selectedOriginalMaterialRef.current =
      mesh.material;

    if (
      Array.isArray(
        mesh.material,
      )
    ) {
      const clonedMaterials =
        mesh.material.map(
          (material) =>
            material.clone(),
        );

      clonedMaterials.forEach(
        (material) => {
          if (
            material instanceof
            THREE.MeshStandardMaterial
          ) {
            material.color.set(
              0x0088ff,
            );

            material.emissive.set(
              0x0066ff,
            );

            material.emissiveIntensity = 1.5;
          }
        },
      );

      mesh.material =
        clonedMaterials;
    } else {
      const clonedMaterial =
        mesh.material.clone();

      if (
        clonedMaterial instanceof
        THREE.MeshStandardMaterial
      ) {
        clonedMaterial.color.set(
          0x0088ff,
        );

        clonedMaterial.emissive.set(
          0x0066ff,
        );

        clonedMaterial.emissiveIntensity = 1.5;
      }

      mesh.material =
        clonedMaterial;
    }

    selectedMeshRef.current =
      mesh;

    if (interiorMode) {
      applyInteriorMode(
        mesh,
      );
    }

    if (crossSectionMode) {
      applyClippingPlane(
        true,
        crossSectionDepthRef.current,
      );
    }

    const box =
      new THREE.Box3().setFromObject(
        mesh,
      );

    const center =
      box.getCenter(
        new THREE.Vector3(),
      );

    const size =
      box.getSize(
        new THREE.Vector3(),
      );

    const maxSize =
      Math.max(
        size.x,
        size.y,
        size.z,
      );

    const focusDistance =
      Math.max(
        maxSize * 4,
        0.025,
      );

    const camera =
      cameraRef.current;

    const controls =
      controlsRef.current;

    if (camera && controls) {
      camera.position.set(
        center.x,
        center.y,
        center.z +
          focusDistance,
      );

      controls.target.copy(
        center,
      );

      controls.update();
    }

    setSelectedStructure(
      structure,
    );

    setIsolationMode(false);

    setStatus(
      `Selected: ${structure.displayName}`,
    );
  };

  const setBrainIsolation = (
    isolateMesh: THREE.Mesh | null,
  ) => {
    const brainRoot =
      brainRootRef.current;

    if (!brainRoot) {
      return;
    }

    brainRoot.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) {
        return;
      }

      object.visible =
        !isolateMesh ||
        object === isolateMesh;
    });
  };

  const restoreBrainVisibility = () => {
    const brainRoot =
      brainRootRef.current;

    if (!brainRoot) {
      return;
    }

    brainRoot.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) {
        return;
      }

      object.visible = true;
    });
  };

  useEffect(() => {
    const container =
      containerRef.current;

    if (!container) {
      return;
    }

    const scene = new THREE.Scene();

    scene.background =
      new THREE.Color(0x080b10);

    const camera =
      new THREE.PerspectiveCamera(
        45,
        container.clientWidth /
          Math.max(
            container.clientHeight,
            1,
          ),
        0.000001,
        1000,
      );

    cameraRef.current =
      camera;

    camera.position.set(
      0,
      0,
      0.3,
    );

    const renderer =
      new THREE.WebGLRenderer({
        antialias: true,
      });

    renderer.setPixelRatio(
      Math.min(
        window.devicePixelRatio,
        2,
      ),
    );

    renderer.setSize(
      container.clientWidth,
      Math.max(
        container.clientHeight,
        1,
      ),
    );

    renderer.outputColorSpace =
      THREE.SRGBColorSpace;

    renderer.localClippingEnabled =
      true;

    container.appendChild(
      renderer.domElement,
    );

    const ambientLight =
      new THREE.AmbientLight(
        0xffffff,
        2.5,
      );

    scene.add(
      ambientLight,
    );

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

    scene.add(
      keyLight,
    );

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

    scene.add(
      fillLight,
    );

    const brainRoot =
      new THREE.Group();

    scene.add(
      brainRoot,
    );

    brainRootRef.current =
      brainRoot;

    const controls =
      new OrbitControls(
        camera,
        renderer.domElement,
      );

    controlsRef.current =
      controls;

    controls.enableDamping =
      true;

    controls.dampingFactor =
      0.05;

    controls.mouseButtons.LEFT =
      THREE.MOUSE.ROTATE;

    controls.mouseButtons.RIGHT =
      THREE.MOUSE.PAN;

    controls.mouseButtons.MIDDLE =
      THREE.MOUSE.DOLLY;

    controls.enableZoom =
      true;

    controls.enablePan =
      true;

    controls.screenSpacePanning =
      true;

    controls.minDistance =
      0.02;

    controls.maxDistance =
      2;

    const raycaster =
      new THREE.Raycaster();

    const pointer =
      new THREE.Vector2();

    let pointerDownX = 0;
    let pointerDownY = 0;

    const highlightMesh = (
      mesh: THREE.Mesh,
    ) => {
      const originalMaterial =
        mesh.material;

      selectedOriginalMaterialRef.current =
        originalMaterial;

      if (
        Array.isArray(
          originalMaterial,
        )
      ) {
        const clonedMaterials =
          originalMaterial.map(
            (material) =>
              material.clone(),
          );

        clonedMaterials.forEach(
          (material) => {
            if (
              material instanceof
              THREE.MeshStandardMaterial
            ) {
              material.color.set(
                0x0088ff,
              );

              material.emissive.set(
                0x0066ff,
              );

              material.emissiveIntensity =
                1.5;
            }
          },
        );

        mesh.material =
          clonedMaterials;
      } else {
        const clonedMaterial =
          originalMaterial.clone();

        if (
          clonedMaterial instanceof
          THREE.MeshStandardMaterial
        ) {
          clonedMaterial.color.set(
            0x0088ff,
          );

          clonedMaterial.emissive.set(
            0x0066ff,
          );

          clonedMaterial.emissiveIntensity =
            1.5;
        }

        mesh.material =
          clonedMaterial;
      }

      selectedMeshRef.current =
        mesh;
    };

    const handlePointerDown = (
      event: PointerEvent,
    ) => {
      pointerDownX =
        event.clientX;

      pointerDownY =
        event.clientY;
    };

    const handlePointerUp = (
      event: PointerEvent,
    ) => {
      const movementX =
        Math.abs(
          event.clientX -
            pointerDownX,
        );

      const movementY =
        Math.abs(
          event.clientY -
            pointerDownY,
        );

      if (
        movementX > 5 ||
        movementY > 5
      ) {
        return;
      }

      const rect =
        renderer.domElement.getBoundingClientRect();

      pointer.x =
        ((event.clientX -
          rect.left) /
          rect.width) *
          2 -
        1;

      pointer.y =
        -(
          ((event.clientY -
            rect.top) /
            rect.height) *
            2 -
          1
        );

      raycaster.setFromCamera(
        pointer,
        camera,
      );

      const intersections =
        raycaster.intersectObjects(
          brainRoot.children,
          true,
        );

      if (
        intersections.length === 0
      ) {
        restoreSelectedMesh();

        if (
          interiorModeRef.current
        ) {
          restoreInteriorMode();

          applyClippingPlane(
            false,
            0,
          );

          crossSectionModeRef.current =
            false;

          crossSectionDepthRef.current =
            0;

          setCrossSectionDepth(
            0,
          );

          setCrossSectionMode(
            false,
          );

          cutawayDepthRef.current =
            0;

          setCutawayDepth(0);
          setInteriorMode(false);
        }

        setSelectedStructure(
          null,
        );

        setStatus(
          "Luna's brain online",
        );

        return;
      }

      const clickedObject =
        intersections[0].object;

      if (
        !(
          clickedObject instanceof
          THREE.Mesh
        )
      ) {
        return;
      }

      restoreSelectedMesh();

      if (
        interiorModeRef.current
      ) {
        restoreInteriorMode();
      }

      highlightMesh(
        clickedObject,
      );

      if (
        interiorModeRef.current
      ) {
        applyInteriorMode(
          clickedObject,
        );
      }

      const structureName =
        clickedObject.name;

      const registry =
        buildBrainStructureRegistry(
          [structureName],
        );

      const structure =
        registry[0] ?? null;

      setSelectedStructure(
        structure,
      );

      if (structure) {
        setStatus(
          `Selected: ${structure.displayName}`,
        );
      } else {
        setStatus(
          `Selected: ${structureName}`,
        );
      }
    };

    renderer.domElement.addEventListener(
      "pointerdown",
      handlePointerDown,
    );

    renderer.domElement.addEventListener(
      "pointerup",
      handlePointerUp,
    );

    const loader =
      new GLTFLoader();

    loader.load(
      BRAIN_MODEL_URL,

      (gltf) => {
        const brain =
          gltf.scene;

        brainRoot.add(
          brain,
        );

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

        brain.position.sub(
          center,
        );

        const maxDimension =
          Math.max(
            size.x,
            size.y,
            size.z,
          );

        if (
          maxDimension > 0
        ) {
          const targetSize =
            0.17;

          const scale =
            targetSize /
            maxDimension;

          brain.scale.setScalar(
            scale,
          );
        }

        const scaledBox =
          new THREE.Box3().setFromObject(
            brain,
          );

        brainBoundsRef.current =
          scaledBox.clone();

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

        controls.saveState();

        let meshCount = 0;

        const meshNames: string[] =
          [];

        const meshMap =
          new Map<string, THREE.Mesh>();

        brain.traverse(
          (object) => {
            if (
              object instanceof
              THREE.Mesh
            ) {
              meshCount++;

              if (object.name) {
                meshNames.push(
                  object.name,
                );

                const structureId =
                  buildBrainStructureRegistry([
                    object.name,
                  ])[0]?.id;

                if (structureId) {
                  meshMap.set(
                    structureId,
                    object,
                  );
                }
              }
            }
          },
        );

        brainMeshMapRef.current =
          meshMap;

        const structures =
          buildBrainStructureRegistry(
            meshNames,
          );

        setBrainStructures(
          structures,
        );

        setStatus(
          `Luna's brain online · ${meshCount} anatomical meshes`,
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

    const handleDoubleClick =
      () => {
        controls.reset();

        restoreInteriorMode();
        restoreSelectedMesh();

        setInteriorMode(false);
        setSelectedStructure(null);

        setStatus(
          "Luna's brain online",
        );
      };

    renderer.domElement.addEventListener(
      "dblclick",
      handleDoubleClick,
    );

    const handleResize =
      () => {
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

    return () => {
      cancelAnimationFrame(
        animationFrame,
      );

      window.removeEventListener(
        "resize",
        handleResize,
      );

      renderer.domElement.removeEventListener(
        "pointerdown",
        handlePointerDown,
      );

      renderer.domElement.removeEventListener(
        "pointerup",
        handlePointerUp,
      );

      renderer.domElement.removeEventListener(
        "dblclick",
        handleDoubleClick,
      );

      controls.dispose();

      renderer.dispose();

      restoreInteriorMode();

      brainMeshMapRef.current.clear();

      brainRootRef.current =
        null;

      interiorOpacityRef.current =
        0.12;

      cutawayDepthRef.current =
        0;

      crossSectionModeRef.current =
        false;

      crossSectionDepthRef.current =
        0;

      brainBoundsRef.current =
        null;

      cameraRef.current =
        null;

      controlsRef.current =
        null;

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

  const handleScaleChange = (
    scale: BrainScale,
  ) => {
    setActiveScale(scale);

    const labels: Record<
      BrainScale,
      string
    > = {
      macro: "Macro anatomy",
      tissue: "Tissue scale",
      cellular: "Cellular scale",
      subcellular:
        "Subcellular scale",
      molecular:
        "Molecular scale",
    };

    if (scale === "macro") {
      setStatus(
        selectedStructure
          ? `Selected: ${selectedStructure.displayName}`
          : "Luna's brain online",
      );

      return;
    }

    setStatus(
      `${labels[scale]} selected · checking layer`,
    );
  };

  const handleScaleAssetStateChange =
    useCallback(
      (state: {
        loading: boolean;
        error: string | null;
        asset: BrainScaleAsset | null;
      }) => {
        setScaleAssetLoading(
          state.loading,
        );

        setScaleAssetError(
          state.error,
        );

        setScaleAsset(
          state.asset,
        );

        if (state.loading) {
          setStatus(
            "Loading selected brain scale...",
          );

          return;
        }

        if (state.error) {
          setStatus(
            `Scale layer error: ${state.error}`,
          );

          return;
        }

        if (!state.asset) {
          return;
        }

        if (state.asset.available) {
          setStatus(
            `${state.asset.label} layer ready`,
          );

          return;
        }

        setStatus(
          `${state.asset.label} layer registered · dataset not connected`,
        );
      },
      [],
    );

  const focusSelectedStructure = () => {
    const mesh =
      selectedMeshRef.current;

    const camera =
      cameraRef.current;

    const controls =
      controlsRef.current;

    if (
      !mesh ||
      !camera ||
      !controls
    ) {
      return;
    }

    const box =
      new THREE.Box3().setFromObject(
        mesh,
      );

    const center =
      box.getCenter(
        new THREE.Vector3(),
      );

    const size =
      box.getSize(
        new THREE.Vector3(),
      );

    const maxSize =
      Math.max(
        size.x,
        size.y,
        size.z,
      );

    const focusDistance =
      Math.max(
        maxSize * 4,
        0.025,
      );

    camera.position.set(
      center.x,
      center.y,
      center.z +
        focusDistance,
    );

    controls.target.copy(
      center,
    );

    controls.update();

    setStatus(
      `Focused: ${
        selectedStructure?.displayName ??
        mesh.name
      }`,
    );
  };

  return (
    <div className="relative h-full min-h-[600px] w-full overflow-hidden rounded-xl bg-black">
      <div
        ref={containerRef}
        className="absolute inset-0"
      />

      <BrainScaleAssetLoader
        structure={selectedStructure}
        activeScale={activeScale}
        onAssetStateChange={
          handleScaleAssetStateChange
        }
      />

      <BrainAnatomyNavigator
        structures={brainStructures}
        selectedStructure={
          selectedStructure
        }
        onSelectStructure={
          selectBrainStructure
        }
      />

      <div className="pointer-events-none absolute left-4 top-4 rounded-lg bg-black/60 px-3 py-2 text-sm text-white backdrop-blur">
        {status}
      </div>

      <div className="pointer-events-none absolute left-4 top-16 rounded-lg border border-white/10 bg-black/55 px-3 py-2 text-[10px] text-white/60 backdrop-blur">
        <div className="uppercase tracking-wider text-white/35">
          Active scale
        </div>

        <div className="mt-1 text-xs text-white/80">
          {scaleAsset?.label ??
            activeScale}
        </div>

        <div className="mt-0.5">
          {scaleAssetLoading
            ? "Loading"
            : scaleAssetError
              ? "Error"
              : scaleAsset?.available
                ? "Dataset ready"
                : "Architecture ready · dataset pending"}
        </div>
      </div>

      <AnatomicalInspector
        structure={selectedStructure}
        activeScale={activeScale}
        onScaleChange={
          handleScaleChange
        }
        isIsolated={
          isolationMode
        }
        interiorMode={
          interiorMode
        }
        interiorOpacity={
          interiorOpacity
        }
        cutawayDepth={
          cutawayDepth
        }
        crossSectionMode={
          crossSectionMode
        }
        crossSectionDepth={
          crossSectionDepth
        }
        onToggleCrossSectionMode={
          toggleCrossSectionMode
        }
        onCrossSectionDepthChange={
          updateCrossSectionDepth
        }
        onToggleInteriorMode={
          toggleInteriorMode
        }
        onInteriorOpacityChange={
          updateInteriorOpacity
        }
        onCutawayDepthChange={
          updateCutawayDepth
        }
        onFocusStructure={
          focusSelectedStructure
        }
        onToggleIsolation={() => {
          const mesh =
            selectedMeshRef.current;

          if (!mesh) {
            return;
          }

          if (isolationMode) {
            restoreBrainVisibility();

            setIsolationMode(
              false,
            );

            setStatus(
              "Luna's brain online",
            );
          } else {
            if (
              interiorModeRef.current
            ) {
              restoreInteriorMode();
              setInteriorMode(false);
            }

            setBrainIsolation(
              mesh,
            );

            setIsolationMode(
              true,
            );

            setStatus(
              `Isolated: ${
                selectedStructure?.displayName ??
                mesh.name
              }`,
            );
          }
        }}
        onClear={() => {
          restoreBrainVisibility();
          restoreInteriorMode();
          restoreSelectedMesh();

          setIsolationMode(false);
          setInteriorMode(false);
          setSelectedStructure(null);

          setStatus(
            "Luna's brain online",
          );
        }}
      />

      <div className="pointer-events-none absolute bottom-4 left-4 rounded-lg bg-black/60 px-3 py-2 text-xs text-white/80 backdrop-blur">
        Drag to rotate · Scroll to zoom ·
        Right-drag to pan · Click a structure ·
        Double-click to reset
      </div>
    </div>
  );
}