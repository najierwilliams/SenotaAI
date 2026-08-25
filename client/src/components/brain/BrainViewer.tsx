import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import * as THREE from "three";

import {
  GLTFLoader,
} from "three/examples/jsm/loaders/GLTFLoader.js";

import {
  OrbitControls,
} from "three/examples/jsm/controls/OrbitControls.js";

import {
  buildBrainStructureRegistry,
  type BrainScale,
  type BrainStructure,
} from "./anatomy/BrainStructureRegistry";

import {
  nanobotRegistry,
} from "./anatomy/NanobotRegistry";

import {
  navigateNanobot,
} from "./anatomy/NanobotNavigation";

import {
  nanobotMissionEngine,
} from "./anatomy/NanobotMissionEngine";

import {
  resolveNanobotTarget,
} from "./anatomy/NanobotTargetResolver";

import {
  createNanobotObservationEnvironment,
  disposeNanobotObservationEnvironment,
  setNanobotObservationEnvironmentScale,
  updateNanobotObservationEnvironment,
  type NanobotObservationEnvironment,
} from "./anatomy/NanobotObservationEnvironment";

import type {
  Nanobot,
  NanobotPosition,
  NanobotType,
} from "./anatomy/NanobotTypes";

import {
  createNanobotVisual,
  disposeNanobotVisual,
  updateNanobotVisual,
  type NanobotVisual,
} from "./anatomy/NanobotVisuals";

import {
  archiveCompletedNanobot,
} from "./anatomy/NanobotCompletion";

import {
  enableBrainMeshDepth,
} from "./anatomy/BrainVisualPresentation";

import AnatomicalInspector from "./AnatomicalInspector";
import BrainAnatomyNavigator from "./BrainAnatomyNavigator";
import BrainScaleAssetLoader from "./BrainScaleAssetLoader";
import NanobotPanel from "./NanobotPanel";
import LunaBrainAssistant from "./LunaBrainAssistant";

import BrainWorkspace, {
  DEFAULT_PANELS,
  useBrainWorkspaceState,
} from "./workspace/BrainWorkspace";

import BrainWorkspaceBar from "./workspace/BrainWorkspaceBar";

import type {
  BrainScaleAsset,
} from "./anatomy/BrainScaleAssetRegistry";

import {
  createBrainObservationContext,
  getObservationContextLabel,
} from "./anatomy/BrainObservationContext";

import {
  registerLunaBrainCommandBridge,
  updateLunaBrainState,
} from "./anatomy/LunaBrainActions";

import {
  useBrainScientificObservation,
} from "./anatomy/useBrainScientificObservation";

const BRAIN_MODEL_URL =
  "/models/luna/brain/source/3d-vh-f-allen-brain.glb";

export default function BrainViewer() {
  const containerRef =
    useRef<HTMLDivElement | null>(null);

  const selectedMeshRef =
    useRef<THREE.Mesh | null>(null);

  const selectedOriginalMaterialRef =
    useRef<THREE.Material | THREE.Material[] | null>(null);

  const brainRootRef =
    useRef<THREE.Group | null>(null);

  const observationAssetRootRef =
    useRef<THREE.Group | null>(null);

  const cameraRef =
    useRef<THREE.PerspectiveCamera | null>(null);

  const controlsRef =
    useRef<OrbitControls | null>(null);

  const brainMeshMapRef =
    useRef<Map<string, THREE.Mesh>>(new Map());

  const interiorOriginalMaterialsRef =
    useRef<Map<THREE.Mesh, THREE.Material | THREE.Material[]>>(
      new Map(),
    );

  const brainBoundsRef =
    useRef<THREE.Box3 | null>(null);

  const nanobotRootRef =
    useRef<THREE.Group | null>(null);

  const nanobotObservationEnvironmentRef =
    useRef<NanobotObservationEnvironment | null>(null);

  const nanobotVisualsRef =
    useRef<Map<string, NanobotVisual>>(new Map());

  const nanobotPositionsRef =
    useRef<Map<string, NanobotPosition>>(new Map());

  const nanobotClockRef =
    useRef(new THREE.Clock());

  const nanobotWorkStartedRef =
    useRef<Map<string, number>>(new Map());

  const nanobotReturnStartedRef =
    useRef<Map<string, number>>(new Map());

  const [status, setStatus] =
    useState("Loading Luna's brain...");

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

  const [brainStructures, setBrainStructures] =
    useState<BrainStructure[]>([]);

  const brainStructuresRef =
    useRef<BrainStructure[]>([]);

  brainStructuresRef.current =
    brainStructures;

  const [activeScale, setActiveScale] =
    useState<BrainScale>("macro");

  const [scaleAsset, setScaleAsset] =
    useState<BrainScaleAsset | null>(null);

  const [scaleAssetLoading, setScaleAssetLoading] =
    useState(false);

  const [scaleAssetError, setScaleAssetError] =
    useState<string | null>(null);

  const [scaleRetryToken, setScaleRetryToken] =
    useState(0);

  const [nanobots, setNanobots] =
    useState<Nanobot[]>([]);

  const [missionHistory, setMissionHistory] =
    useState(
      nanobotRegistry.getMissionHistory(),
    );

  const [selectedNanobotId, setSelectedNanobotId] =
    useState<string | null>(null);

  const workspace =
    useBrainWorkspaceState();

  const {
    observation: scientificObservation,
    loading: scientificLoading,
    error: scientificError,
    retry: retryScientificObservation,
  } = useBrainScientificObservation({
    scale: activeScale,
    structure: selectedStructure,
  });

  const observationContext =
    createBrainObservationContext({
      scale: activeScale,
      structure: selectedStructure,
      asset: scaleAsset,
      loading: scaleAssetLoading,
      error: scaleAssetError,
      scientificObservation,
      scientificLoading,
      scientificError,
    });

  useEffect(() => {
    nanobotRegistry.updateViewerScale(
      observationContext.scale,
    );

    if (nanobotRegistry.getAll().length) {
      setNanobots(
        nanobotRegistry.getAll(),
      );
    }
  }, [
    observationContext.scale,
    observationContext.datasetId,
    observationContext.status,
  ]);

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

  interiorModeRef.current =
    interiorMode;

  interiorOpacityRef.current =
    interiorOpacity;

  cutawayDepthRef.current =
    cutawayDepth;

  crossSectionModeRef.current =
    crossSectionMode;

  crossSectionDepthRef.current =
    crossSectionDepth;

  const clippingPlaneRef =
    useRef(
      new THREE.Plane(
        new THREE.Vector3(1, 0, 0),
        0,
      ),
    );

  const restoreInteriorMode =
    () => {
      interiorOriginalMaterialsRef.current.forEach(
        (originalMaterial, mesh) => {
          mesh.material = originalMaterial;
        },
      );

      interiorOriginalMaterialsRef.current.clear();
    };

  const applyInteriorMode =
    (selectedMesh: THREE.Mesh | null) => {
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
          object.material =
            originalMaterial.map((material) => {
              const clone =
                material.clone();

              clone.transparent = true;
              clone.opacity =
                interiorOpacityRef.current;
              clone.depthWrite = false;

              return clone;
            });
        } else {
          const clone =
            originalMaterial.clone();

          clone.transparent = true;
          clone.opacity =
            interiorOpacityRef.current;
          clone.depthWrite = false;

          object.material = clone;
        }
      });
    };

  const restoreSelectedMesh =
    () => {
      const mesh =
        selectedMeshRef.current;

      const originalMaterial =
        selectedOriginalMaterialRef.current;

      if (mesh && originalMaterial) {
        mesh.material =
          originalMaterial;
      }

      selectedMeshRef.current =
        null;

      selectedOriginalMaterialRef.current =
        null;
    };

  /**
   * Clears the opaque selection highlight without disabling Interior View.
   * Interior materials are always rebuilt from their stored originals so a
   * previously selected mesh cannot remain solid after deselection/reset.
   */
  const clearBrainSelection =
    () => {
      restoreSelectedMesh();

      if (interiorModeRef.current) {
        restoreInteriorMode();
        applyInteriorMode(null);
      }

      setSelectedStructure(null);
      setIsolationMode(false);
    };

  const setBrainIsolation =
    (isolateMesh: THREE.Mesh | null) => {
      const brainRoot =
        brainRootRef.current;

      if (!brainRoot) {
        return;
      }

      brainRoot.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.visible =
            !isolateMesh ||
            object === isolateMesh;
        }
      });
    };

  const restoreBrainVisibility =
    () => {
      const brainRoot =
        brainRootRef.current;

      if (!brainRoot) {
        return;
      }

      brainRoot.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.visible = true;
        }
      });
    };

  const resetCamera =
    () => {
      controlsRef.current?.reset();
      clearBrainSelection();
      setStatus(
        interiorModeRef.current
          ? "Brain view reset · interior view retained"
          : "Brain view reset",
      );
    };

  const focusSelectedStructure =
    () => {
      const mesh =
        selectedMeshRef.current;

      const camera =
        cameraRef.current;

      const controls =
        controlsRef.current;

      if (!mesh || !camera || !controls) {
        return;
      }

      const box =
        new THREE.Box3().setFromObject(mesh);

      const center =
        box.getCenter(new THREE.Vector3());

      const size =
        box.getSize(new THREE.Vector3());

      const maxSize =
        Math.max(size.x, size.y, size.z);

      const distance =
        Math.max(maxSize * 4, 0.025);

      camera.position.set(
        center.x,
        center.y,
        center.z + distance,
      );

      controls.target.copy(center);
      controls.update();

      setStatus(
        `Focused: ${
          selectedStructure?.displayName ??
          mesh.name
        }`,
      );
    };

  const selectBrainStructure =
    (structure: BrainStructure) => {
      const mesh =
        brainMeshMapRef.current.get(
          structure.id,
        );

      if (!mesh) {
        setSelectedStructure(structure);

        setStatus(
          `Structure not available: ${structure.displayName}`,
        );

        return;
      }

      restoreSelectedMesh();

      if (interiorModeRef.current) {
        restoreInteriorMode();
      }

      selectedOriginalMaterialRef.current =
        mesh.material;

      if (Array.isArray(mesh.material)) {
        mesh.material =
          mesh.material.map((material) => {
            const clone =
              material.clone();

            if (
              clone instanceof
              THREE.MeshStandardMaterial
            ) {
              clone.color.set(0x0088ff);
              clone.emissive.set(0x0066ff);
              clone.emissiveIntensity = 1.5;
            }

            return clone;
          });
      } else {
        const clone =
          mesh.material.clone();

        if (
          clone instanceof
          THREE.MeshStandardMaterial
        ) {
          clone.color.set(0x0088ff);
          clone.emissive.set(0x0066ff);
          clone.emissiveIntensity = 1.5;
        }

        mesh.material = clone;
      }

      selectedMeshRef.current =
        mesh;

      if (interiorModeRef.current) {
        applyInteriorMode(mesh);
      }

      setSelectedStructure(
        structure,
      );

      setIsolationMode(false);

      const box =
        new THREE.Box3().setFromObject(mesh);

      const center =
        box.getCenter(new THREE.Vector3());

      const size =
        box.getSize(new THREE.Vector3());

      const distance =
        Math.max(
          Math.max(size.x, size.y, size.z) * 4,
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
          center.z + distance,
        );

        controls.target.copy(center);
        controls.update();
      }

      setStatus(
        `Selected: ${structure.displayName}`,
      );
    };

  const getStructureTargetPosition =
    (structure: BrainStructure): NanobotPosition | null => {
      const mesh =
        brainMeshMapRef.current.get(
          structure.id,
        );

      if (!mesh) {
        return null;
      }

      const box =
        new THREE.Box3().setFromObject(mesh);

      if (box.isEmpty()) {
        return null;
      }

      const meshCenter =
        box.getCenter(new THREE.Vector3());

      const brainBounds = brainBoundsRef.current;

      if (!brainBounds || brainBounds.isEmpty()) {
        return {
          x: meshCenter.x,
          y: meshCenter.y,
          z: meshCenter.z,
        };
      }

      const brainCore = brainBounds.getCenter(
        new THREE.Vector3(),
      );

      // The GLB centre is often visually occluded by the cortical shell. Move
      // a small, deterministic amount toward the loaded brain core so the
      // simulation marker visibly enters the selected anatomy. This remains a
      // Luna-local presentation coordinate, not a scientific transform.
      const interiorPoint = meshCenter.lerp(
        brainCore,
        0.18,
      );

      return {
        x: interiorPoint.x,
        y: interiorPoint.y,
        z: interiorPoint.z,
      };
    };

  const getNanobotStartPosition =
    (): NanobotPosition => {
      const bounds =
        brainBoundsRef.current;

      if (!bounds) {
        return { x: 0, y: 0, z: 0 };
      }

      const size =
        bounds.getSize(new THREE.Vector3());

      return {
        x:
          bounds.min.x -
          Math.max(size.x * 0.2, 0.01),
        y:
          bounds.min.y +
          size.y * 0.5,
        z:
          bounds.min.z +
          size.z * 0.5,
      };
    };

  const getNanobotWorkDuration =
    (type: NanobotType): number => {
      switch (type) {
        case "diagnostic":
          return 4;
        case "repair":
          return 6;
        case "delivery":
          return 5;
        case "monitor":
          return 8;
        case "scout":
        default:
          return 3;
      }
    };

  const getNanobotReturnProgress =
    (nanobot: Nanobot): number => {
      const start =
        nanobotReturnStartedRef.current.get(
          nanobot.id,
        );

      if (!start) {
        return 0;
      }

      return Math.min(
        1,
        Math.max(
          0,
          (performance.now() - start) /
            3000,
        ),
      );
    };

  const syncNanobotState =
    () => {
      setNanobots(
        nanobotRegistry.getAll(),
      );
      setMissionHistory(
        nanobotRegistry.getMissionHistory(),
      );
    };

  const deployNanobot =
    (
      type: NanobotType,
      requestedStructure?: BrainStructure,
    ) => {
      const targetStructure =
        requestedStructure ?? selectedStructure;

      if (!targetStructure) {
        setStatus(
          "Select a brain structure before deploying a nanobot",
        );
        return;
      }

      const macroPosition =
        activeScale === "macro"
          ? getStructureTargetPosition(targetStructure)
          : null;

      const resolution = resolveNanobotTarget({
        structure: targetStructure,
        observationScale: observationContext.scale,
        macroPosition,
        macroTargetResolution:
          "Mesh-derived Luna Local interior simulation work point",
        macroTargetDerivation:
          "Selected Macro mesh centre offset 18% toward the loaded brain core for visible simulation entry; not registered to an external scientific reference space.",
        spatialTarget: observationContext.spatialTarget,
        spatialCapability:
          observationContext.spatialCapability,
        referenceSpace: observationContext.referenceSpace,
        coordinateTransform:
          observationContext.coordinateTransform,
      });

      const previewTarget = {
        scale: observationContext.scale,
        datasetId: observationContext.datasetId,
        status: observationContext.status,
        scientificStatus: observationContext.scientificStatus,
        contextLabel: getObservationContextLabel(observationContext),
        targetPosition: resolution.position,
        targetResolution: resolution.resolution,
        spatialStatus: resolution.spatialStatus,
        spatialMessage: resolution.message,
        spatialTarget: resolution.spatialTarget,
        spatialCapability: resolution.spatialCapability,
        referenceSpace: resolution.referenceSpace,
        coordinateTransform: resolution.coordinateTransform,
      } as const;

      const nanobot = nanobotRegistry.create(type);
      nanobot.position = getNanobotStartPosition();
      nanobot.deploymentPosition = { ...nanobot.position };
      nanobotRegistry.register(nanobot);

      const assigned = nanobotRegistry.assignTarget(
        nanobot.id,
        targetStructure,
        previewTarget,
      );

      const permission = nanobotMissionEngine.canDeploy(
        assigned?.target ?? null,
      );

      if (!assigned?.target || !permission.allowed) {
        nanobotRegistry.remove(nanobot.id);
        setStatus(permission.reason);
        syncNanobotState();
        return;
      }

      nanobotMissionEngine.start(
        assigned,
        assigned.target,
        performance.now(),
      );

      const visual = createNanobotVisual(assigned);
      const nanobotRoot = nanobotRootRef.current;

      if (nanobotRoot) nanobotRoot.add(visual.root);

      nanobotVisualsRef.current.set(assigned.id, visual);
      nanobotPositionsRef.current.set(assigned.id, {
        ...assigned.position,
      });
      setSelectedNanobotId(assigned.id);
      syncNanobotState();
      setStatus(
        `${assigned.metadata.label} deployed into ${targetStructure.displayName} · simulation mission`,
      );
    };

  const deployMission =
    (type: NanobotType) => {
      deployNanobot(type);
      workspace.closeMenu();
    };

  const pauseNanobots =
    () => {
      let paused = 0;
      nanobotRegistry.getAll().forEach((nanobot) => {
        if (nanobotMissionEngine.pause(nanobot)) paused += 1;
      });
      syncNanobotState();
      setStatus(
        paused
          ? `${paused} nanobot mission${paused === 1 ? "" : "s"} paused`
          : "No active nanobot mission can be paused",
      );
    };

  const resumeNanobots =
    () => {
      let resumed = 0;
      nanobotRegistry.getAll().forEach((nanobot) => {
        if (nanobotMissionEngine.resume(nanobot)) resumed += 1;
      });
      syncNanobotState();
      setStatus(
        resumed
          ? `${resumed} nanobot mission${resumed === 1 ? "" : "s"} resumed`
          : "No paused nanobot mission to resume",
      );
    };

  const returnNanobots =
    () => {
      let returning = 0;
      nanobotRegistry.getAll().forEach((nanobot) => {
        if (nanobotMissionEngine.requestReturn(nanobot)) returning += 1;
      });
      syncNanobotState();
      setStatus(
        returning
          ? "Nanobots returning to deployment point"
          : "No active nanobot mission can return",
      );
    };

  const clearNanobots =
    () => {
      nanobotVisualsRef.current.forEach(
        (visual) => {
          const root =
            nanobotRootRef.current;

          if (root) {
            root.remove(visual.root);
          }

          disposeNanobotVisual(visual);
        },
      );

      nanobotVisualsRef.current.clear();
      nanobotPositionsRef.current.clear();
      nanobotWorkStartedRef.current.clear();
      nanobotReturnStartedRef.current.clear();

      nanobotRegistry.clear();

      setNanobots([]);
      setSelectedNanobotId(null);

      setStatus(
        selectedStructure
          ? `Selected: ${selectedStructure.displayName}`
          : "Luna's brain online",
      );
    };

  const selectNanobot =
    (id: string) => {
      const nanobot =
        nanobotRegistry.get(id);

      if (!nanobot) {
        return;
      }

      setSelectedNanobotId(id);

      setStatus(
        `${nanobot.metadata.label} · ${nanobot.state}${
          nanobot.target
            ? ` · ${nanobot.target.structureName}`
            : ""
        }`,
      );
    };

  const handleScaleChange =
    (scale: BrainScale) => {
      setScaleAssetLoading(true);
      setScaleAssetError(null);

      if (scale === "macro") {
        controlsRef.current?.reset();
      }

      setActiveScale(scale);

      setStatus(
        `${scale} observation selected · checking registered dataset`,
      );
    };

  const handleScaleAssetStateChange =
    useCallback(
      (state: {
        loading: boolean;
        error: string | null;
        asset: BrainScaleAsset | null;
      }) => {
        setScaleAssetLoading(state.loading);
        setScaleAssetError(state.error);
        setScaleAsset(state.asset);

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

        setStatus(
          state.asset.available
            ? `${state.asset.label} layer ready`
            : `${state.asset.label} layer registered · dataset not connected`,
        );
      },
      [],
    );

  const retryScaleAsset =
    () => {
      setScaleRetryToken(
        (current) => current + 1,
      );
      retryScientificObservation();
    };

  const returnToMacro =
    () => {
      controlsRef.current?.reset();
      setActiveScale("macro");
      setStatus(
        "Macro anatomy selected · whole-brain observation restored",
      );
    };

  useEffect(() => {
    updateLunaBrainState({
      selectedStructure,
      structures: brainStructures,
      observationContext,
      fleet: nanobots,
      missionHistory,
    });
  }, [
    selectedStructure,
    brainStructures,
    observationContext,
    nanobots,
    missionHistory,
  ]);

  useEffect(() =>
    registerLunaBrainCommandBridge({
      selectStructure: selectBrainStructure,
      setObservationScale: handleScaleChange,
      resolveMacroPosition: getStructureTargetPosition,
      deployMission: (type, structure) =>
        deployNanobot(type, structure),
      pauseFleet: pauseNanobots,
      resumeFleet: resumeNanobots,
      returnFleet: returnNanobots,
    }),
  [
    selectBrainStructure,
    handleScaleChange,
    getStructureTargetPosition,
    deployNanobot,
    pauseNanobots,
    resumeNanobots,
    returnNanobots,
  ]);

  useEffect(() => {
    const brainRoot =
      brainRootRef.current;

    const observationAssetRoot =
      observationAssetRootRef.current;
    const nanobotEnvironment =
      nanobotObservationEnvironmentRef.current;

    if (!brainRoot || !observationAssetRoot) {
      return;
    }

    const clearObservationAsset = () => {
      while (observationAssetRoot.children.length) {
        observationAssetRoot.remove(
          observationAssetRoot.children[0],
        );
      }
    };

    clearObservationAsset();

    if (activeScale === "macro") {
      brainRoot.visible = true;
      if (nanobotEnvironment) {
        setNanobotObservationEnvironmentScale(
          nanobotEnvironment,
          "macro",
        );
      }
      return;
    }

    if (
      !scaleAsset?.available ||
      !scaleAsset.url
    ) {
      brainRoot.visible = false;
      if (nanobotEnvironment) {
        setNanobotObservationEnvironmentScale(
          nanobotEnvironment,
          activeScale,
        );
      }

      const camera = cameraRef.current;
      const controls = controlsRef.current;
      if (camera && controls) {
        camera.position.set(0, 0.03, 0.16);
        controls.target.set(0, 0, 0);
        controls.update();
      }
      return;
    }

    if (nanobotEnvironment) {
      setNanobotObservationEnvironmentScale(
        nanobotEnvironment,
        "macro",
      );
    }

    let cancelled = false;

    brainRoot.visible = false;

    const loader = new GLTFLoader();

    loader.load(
      scaleAsset.url,
      (gltf) => {
        if (cancelled) {
          return;
        }

        const observationModel =
          gltf.scene;

        observationAssetRoot.add(
          observationModel,
        );

        const camera =
          cameraRef.current;

        const controls =
          controlsRef.current;

        const bounds =
          new THREE.Box3().setFromObject(
            observationModel,
          );

        if (
          camera &&
          controls &&
          !bounds.isEmpty()
        ) {
          const center =
            bounds.getCenter(
              new THREE.Vector3(),
            );

          const size =
            bounds.getSize(
              new THREE.Vector3(),
            );

          const distance =
            Math.max(
              Math.max(size.x, size.y, size.z) * 2.5,
              0.025,
            );

          camera.position.set(
            center.x,
            center.y,
            center.z + distance,
          );

          controls.target.copy(center);
          controls.update();
        }

        setStatus(
          `${scaleAsset.label} observation ready`,
        );
      },
      undefined,
      (error) => {
        if (cancelled) {
          return;
        }

        brainRoot.visible = true;
        setScaleAssetError(
          error instanceof Error
            ? error.message
            : "Unable to load registered observation dataset",
        );
      },
    );

    return () => {
      cancelled = true;
      clearObservationAsset();
      brainRoot.visible = true;
    };
  }, [
    activeScale,
    scaleAsset,
  ]);

  const updateInteriorOpacity =
    (value: number) => {
      const next =
        Math.min(
          0.5,
          Math.max(0.03, value),
        );

      interiorOpacityRef.current = next;
      setInteriorOpacity(next);

      if (!interiorMode) {
        return;
      }

      interiorOriginalMaterialsRef.current.forEach(
        (_original, mesh) => {
          const material =
            mesh.material;

          if (Array.isArray(material)) {
            material.forEach((item) => {
              item.opacity = next;
              item.transparent = true;
              item.depthWrite = false;
            });
          } else {
            material.opacity = next;
            material.transparent = true;
            material.depthWrite = false;
          }
        },
      );
    };

  const updateCutawayDepth =
    (value: number) => {
      const next =
        Math.min(
          1,
          Math.max(0, value),
        );

      setCutawayDepth(next);
      cutawayDepthRef.current = next;
    };

  const toggleInteriorMode =
    () => {
      const mesh =
        selectedMeshRef.current;

      if (!mesh) {
        setStatus(
          "Select a brain structure first",
        );
        return;
      }

      if (interiorMode) {
        restoreInteriorMode();
        setInteriorMode(false);

        setStatus(
          `Selected: ${
            selectedStructure?.displayName ??
            mesh.name
          }`,
        );
        return;
      }

      applyInteriorMode(mesh);
      setInteriorMode(true);

      setStatus(
        `Interior view: ${
          selectedStructure?.displayName ??
          mesh.name
        }`,
      );
    };

  const toggleCrossSectionMode =
    () => {
      const brainRoot =
        brainRootRef.current;

      const bounds =
        brainBoundsRef.current;

      if (!brainRoot || !bounds) {
        return;
      }

      if (crossSectionMode) {
        brainRoot.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) {
            return;
          }

          const material =
            object.material;

          if (Array.isArray(material)) {
            material.forEach((item) => {
              item.clippingPlanes = [];
            });
          } else {
            material.clippingPlanes = [];
          }
        });

        setCrossSectionMode(false);
        return;
      }

      const position =
        THREE.MathUtils.lerp(
          bounds.min.x,
          bounds.max.x,
          crossSectionDepth,
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
          material.forEach((item) => {
            item.clippingPlanes = [
              clippingPlaneRef.current,
            ];
          });
        } else {
          material.clippingPlanes = [
            clippingPlaneRef.current,
          ];
        }
      });

      setCrossSectionMode(true);
    };

  const updateCrossSectionDepth =
    (value: number) => {
      setCrossSectionDepth(value);
      crossSectionDepthRef.current = value;

      if (crossSectionMode) {
        toggleCrossSectionMode();

        window.setTimeout(
          () => toggleCrossSectionMode(),
          0,
        );
      }
    };

  const handleViewReset =
    () => {
      controlsRef.current?.reset();
      clearBrainSelection();
      setStatus(
        interiorModeRef.current
          ? "Brain view reset · interior view retained"
          : "Brain view reset",
      );
      workspace.closeMenu();
    };

  const handleViewCrossSection =
    () => {
      toggleCrossSectionMode();
      workspace.closeMenu();
    };

  const handleViewInterior =
    () => {
      toggleInteriorMode();
      workspace.closeMenu();
    };

  useEffect(() => {
    const container =
      containerRef.current;

    if (!container) {
      return;
    }

    const scene =
      new THREE.Scene();

    // Keep the background in the DOM layer so the WebGL canvas can render
    // the anatomical model over a subdued clinical stage without adding a
    // texture asset or a second scene.
    scene.background = null;

    const camera =
      new THREE.PerspectiveCamera(
        45,
        container.clientWidth /
          Math.max(container.clientHeight, 1),
        0.000001,
        1000,
      );

    cameraRef.current = camera;

    const renderer =
      new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
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
    renderer.toneMapping =
      THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type =
      THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);

    renderer.localClippingEnabled = true;

    container.appendChild(
      renderer.domElement,
    );

    // A restrained three-point clinical lighting rig reveals sulci and gyri
    // while retaining the original GLB topology and materials as the source
    // of anatomical truth. The warm key is deliberately diffuse, not glossy.
    const ambientLight =
      new THREE.AmbientLight(
        0xffeadf,
        0.7,
      );

    const hemisphereLight =
      new THREE.HemisphereLight(
        0xdcecff,
        0x1d1112,
        1.15,
      );

    scene.add(ambientLight, hemisphereLight);

    const keyLight =
      new THREE.DirectionalLight(
        0xffe2d5,
        3.35,
      );

    keyLight.position.set(-2.5, 3.8, 4.6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 0.01;
    keyLight.shadow.camera.far = 8;
    keyLight.shadow.bias = -0.00008;
    keyLight.shadow.normalBias = 0.012;
    scene.add(keyLight);

    const fillLight =
      new THREE.DirectionalLight(
        0xffb9ad,
        1.1,
      );

    fillLight.position.set(3.2, 1.4, 2.6);
    scene.add(fillLight);

    const rimLight =
      new THREE.DirectionalLight(
        0xff8f78,
        1.55,
      );

    rimLight.position.set(-1.2, 2.1, -4.2);
    scene.add(rimLight);

    const brainRoot =
      new THREE.Group();

    brainRoot.name = "luna-brain";
    scene.add(brainRoot);
    brainRootRef.current = brainRoot;

    const observationAssetRoot =
      new THREE.Group();

    observationAssetRoot.name =
      "luna-observation-asset";

    scene.add(observationAssetRoot);
    observationAssetRootRef.current =
      observationAssetRoot;

    const nanobotObservationEnvironment =
      createNanobotObservationEnvironment();

    nanobotObservationEnvironment.root.name =
      "luna-nanobot-observation-environment";
    scene.add(
      nanobotObservationEnvironment.root,
    );
    nanobotObservationEnvironmentRef.current =
      nanobotObservationEnvironment;

    const nanobotRoot =
      new THREE.Group();

    nanobotRoot.name =
      "luna-nanobots";

    scene.add(nanobotRoot);
    nanobotRootRef.current =
      nanobotRoot;

    const controls =
      new OrbitControls(
        camera,
        renderer.domElement,
      );

    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.mouseButtons.LEFT =
      THREE.MOUSE.ROTATE;
    controls.mouseButtons.RIGHT =
      THREE.MOUSE.PAN;
    controls.mouseButtons.MIDDLE =
      THREE.MOUSE.DOLLY;
    controls.enableZoom = true;
    controls.enablePan = true;
    controls.screenSpacePanning = true;
    controls.minDistance = 0.02;
    controls.maxDistance = 2;

    const raycaster =
      new THREE.Raycaster();

    const pointer =
      new THREE.Vector2();

    let pointerDownX = 0;
    let pointerDownY = 0;

    const highlightMesh =
      (mesh: THREE.Mesh) => {
        const original =
          mesh.material;

        selectedOriginalMaterialRef.current =
          original;

        if (Array.isArray(original)) {
          mesh.material =
            original.map((material) => {
              const clone =
                material.clone();

              if (
                clone instanceof
                THREE.MeshStandardMaterial
              ) {
                clone.color.set(0x0088ff);
                clone.emissive.set(0x0066ff);
                clone.emissiveIntensity = 1.5;
              }

              return clone;
            });
        } else {
          const clone =
            original.clone();

          if (
            clone instanceof
            THREE.MeshStandardMaterial
          ) {
            clone.color.set(0x0088ff);
            clone.emissive.set(0x0066ff);
            clone.emissiveIntensity = 1.5;
          }

          mesh.material = clone;
        }

        selectedMeshRef.current =
          mesh;
      };

    const handlePointerDown =
      (event: PointerEvent) => {
        pointerDownX = event.clientX;
        pointerDownY = event.clientY;
      };

    const handlePointerUp =
      (event: PointerEvent) => {
        const movementX =
          Math.abs(event.clientX - pointerDownX);

        const movementY =
          Math.abs(event.clientY - pointerDownY);

        if (movementX > 5 || movementY > 5) {
          return;
        }

        const rect =
          renderer.domElement.getBoundingClientRect();

        pointer.x =
          ((event.clientX - rect.left) /
            rect.width) *
            2 -
          1;

        pointer.y =
          -(
            ((event.clientY - rect.top) /
              rect.height) *
              2 -
            1
          );

        raycaster.setFromCamera(pointer, camera);

        const intersections =
          raycaster.intersectObjects(
            brainRoot.children,
            true,
          );

        if (intersections.length === 0) {
          clearBrainSelection();
          setStatus(
            interiorModeRef.current
              ? "Interior view retained · selection cleared"
              : "Luna's brain online",
          );
          return;
        }

        const object =
          intersections[0].object;

        if (!(object instanceof THREE.Mesh)) {
          return;
        }

        restoreSelectedMesh();

        if (interiorModeRef.current) {
          restoreInteriorMode();
        }

        highlightMesh(object);

        if (interiorModeRef.current) {
          applyInteriorMode(object);
        }

        const registry =
          buildBrainStructureRegistry([
            object.name,
          ]);

        const structure =
          registry[0] ?? null;

        if (structure) {
          setSelectedStructure(structure);
          setStatus(
            `Selected: ${structure.displayName}`,
          );
        } else {
          setStatus(
            `Selected: ${object.name}`,
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

        brainRoot.add(brain);

        const box =
          new THREE.Box3().setFromObject(brain);

        const center =
          box.getCenter(new THREE.Vector3());

        const size =
          box.getSize(new THREE.Vector3());

        brain.position.sub(center);

        const maxDimension =
          Math.max(
            size.x,
            size.y,
            size.z,
          );

        if (maxDimension > 0) {
          brain.scale.setScalar(
            0.17 / maxDimension,
          );
        }

        const scaledBox =
          new THREE.Box3().setFromObject(brain);

        brainBoundsRef.current =
          scaledBox.clone();

        const scaledSize =
          scaledBox.getSize(new THREE.Vector3());

        camera.position.set(
          0,
          0,
          Math.max(scaledSize.z * 2.5, 0.3),
        );

        controls.target.set(0, 0, 0);
        controls.update();
        controls.saveState();

        const meshNames: string[] = [];
        const meshMap =
          new Map<string, THREE.Mesh>();

        let meshCount = 0;

        brain.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) {
            return;
          }

          meshCount++;

          // Preserve every GLB texture/map, color identity, geometry, name,
          // and transform. This visual-only pass adds soft shadow participation
          // and restrained tissue response for the upgraded clinical lighting.
          enableBrainMeshDepth(object);

          if (object.name) {
            meshNames.push(object.name);

            const structure =
              buildBrainStructureRegistry([
                object.name,
              ])[0];

            if (structure) {
              meshMap.set(
                structure.id,
                object,
              );
            }
          }
        });

        brainMeshMapRef.current =
          meshMap;

        setBrainStructures(
          buildBrainStructureRegistry(
            meshNames,
          ),
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
        clearBrainSelection();
        setStatus(
          interiorModeRef.current
            ? "Interior view retained · selection cleared"
            : "Luna's brain online",
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

        renderer.setSize(width, height);
      };

    window.addEventListener(
      "resize",
      handleResize,
    );

    let animationFrame = 0;

    const animate =
      () => {
        animationFrame =
          requestAnimationFrame(animate);

        const delta =
          Math.min(
            nanobotClockRef.current.getDelta(),
            0.05,
          );

        const elapsed =
          nanobotClockRef.current.elapsedTime;

        nanobotRegistry
          .getAll()
          .forEach((nanobot) => {
            const missionTick =
              nanobotMissionEngine.tick(
                nanobot,
                {
                  deltaSeconds: delta,
                  now: Date.now(),
                },
              );

            if (missionTick.completedResult) {
              const archivedHistory =
                archiveCompletedNanobot({
                  registry: nanobotRegistry,
                  nanobotId: nanobot.id,
                  completedResult: missionTick.completedResult,
                  visualRoot: nanobotRootRef.current,
                  visuals: nanobotVisualsRef.current,
                  positions: nanobotPositionsRef.current,
                });

              setMissionHistory(archivedHistory);
              setNanobots(nanobotRegistry.getAll());
              setSelectedNanobotId((current) =>
                current === nanobot.id ? null : current,
              );
              setStatus(
                `${nanobot.metadata.label} returned and archived after simulated ${nanobot.type} verification`,
              );
              return;
            }

            const engineVisual =
              nanobotVisualsRef.current.get(
                nanobot.id,
              );

            if (engineVisual) {
              updateNanobotVisual(
                engineVisual,
                nanobot,
                elapsed,
              );

              engineVisual.root.traverse(
                (object) => {
                  if (!(object instanceof THREE.Mesh)) return;
                  const materials = Array.isArray(object.material)
                    ? object.material
                    : [object.material];
                  materials.forEach((material) => {
                    if (!(material instanceof THREE.MeshStandardMaterial)) return;
                    material.color.set(0xff2b2b);
                    material.emissive.set(0xff0000);
                    material.emissiveIntensity = nanobot.state === "error" ? 2.4 : 1.6;
                  });
                },
              );
            }

            return;

          });

        if (nanobotObservationEnvironmentRef.current) {
          updateNanobotObservationEnvironment(
            nanobotObservationEnvironmentRef.current,
            elapsed,
          );
        }

        controls.update();

        renderer.render(
          scene,
          camera,
        );
      };

    animate();

    const stateInterval =
      window.setInterval(() => {
        setNanobots(
          nanobotRegistry.getAll(),
        );
      }, 150);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.clearInterval(stateInterval);

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

      nanobotVisualsRef.current.forEach(
        (visual) => {
          disposeNanobotVisual(visual);
        },
      );

      nanobotVisualsRef.current.clear();
      nanobotPositionsRef.current.clear();
      nanobotWorkStartedRef.current.clear();
      nanobotReturnStartedRef.current.clear();

      nanobotRegistry.clear();

      controls.dispose();
      renderer.dispose();

      brainMeshMapRef.current.clear();

      brainRootRef.current = null;
      observationAssetRootRef.current =
        null;
      if (nanobotObservationEnvironmentRef.current) {
        disposeNanobotObservationEnvironment(
          nanobotObservationEnvironmentRef.current,
        );
      }
      nanobotObservationEnvironmentRef.current = null;
      nanobotRootRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
      brainBoundsRef.current = null;

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

  const canDeployNanobot = Boolean(
    selectedStructure &&
      activeScale === "macro" &&
      observationContext.available &&
      getStructureTargetPosition(selectedStructure),
  );

  const nanobotDeploymentReason = !selectedStructure
    ? "Select a brain structure to resolve a Macro target."
    : activeScale !== "macro"
      ? observationContext.spatialCapability?.reason ??
        "Operation not supported: no coordinate-resolved mission data at this scale."
      : !observationContext.available
        ? "Macro anatomy asset is not available."
        : !getStructureTargetPosition(selectedStructure)
          ? "Target coordinate is not yet resolved from the loaded anatomy mesh."
          : "Macro simulation only: real viewer-mesh navigation with no clinical or physical claim.";

  return (
    <BrainWorkspace>
      <div className="relative h-full min-h-[600px] w-full overflow-hidden rounded-xl bg-black">
        <div
          ref={containerRef}
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_38%,#241214_0%,#0b0e15_48%,#030407_100%)]"
        />

        <BrainWorkspaceBar
          panels={DEFAULT_PANELS}
          workspace={workspace}
          activeScale={activeScale}
          selectedStructure={selectedStructure}
          nanobotCount={nanobots.length}
          canDeployNanobot={canDeployNanobot}
          deploymentReason={nanobotDeploymentReason}
          onScaleChange={handleScaleChange}
          onDeployMission={deployMission}
          onPauseNanobots={pauseNanobots}
          onResumeNanobots={resumeNanobots}
          onReturnNanobots={returnNanobots}
          onClearNanobots={clearNanobots}
          onResetView={handleViewReset}
          onToggleCrossSection={
            handleViewCrossSection
          }
          onToggleInterior={
            handleViewInterior
          }
        />

        <BrainScaleAssetLoader
          structure={selectedStructure}
          activeScale={activeScale}
          retryToken={scaleRetryToken}
          onAssetStateChange={
            handleScaleAssetStateChange
          }
        />

        <div className="pointer-events-none absolute left-1/2 top-16 z-30 w-[min(22rem,calc(100%-2rem))] -translate-x-1/2">
          <div className="pointer-events-auto rounded-lg border border-white/10 bg-black/70 px-3 py-2 text-center shadow-xl backdrop-blur-xl">
            <div className="text-[9px] font-medium uppercase tracking-[0.18em] text-blue-100/55">
              Observation
            </div>
            <div className="mt-1 text-xs font-semibold text-white/85">
              {getObservationContextLabel(
                observationContext,
              )}
            </div>
            {observationContext.scale !== "macro" && (
              <div className="mt-1 text-[10px] leading-relaxed text-white/50">
                <span className="block text-red-100/70">
                  Simulation visualization — spatial operation unavailable.
                </span>
                {observationContext.spatialCapability?.reason ??
                  observationContext.message}
                {observationContext.datasetLabel && (
                  <span className="mt-1 block text-white/35">
                    Source: {observationContext.datasetLabel} · {observationContext.scientificStatus ?? "local asset state"}
                  </span>
                )}
              </div>
            )}
            {observationContext.scale !== "macro" &&
              observationContext.scientificStatus &&
              observationContext.scientificStatus !== "available" &&
              observationContext.scientificStatus !== "partial" &&
              observationContext.scientificStatus !== "loading" && (
              <div className="mt-2 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={retryScaleAsset}
                  className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                  Retry
                </button>
                <button
                  type="button"
                  onClick={returnToMacro}
                  className="rounded-md border border-blue-400/20 bg-blue-500/10 px-2 py-1 text-[10px] text-blue-100 transition hover:bg-blue-500/20"
                >
                  Return to Macro
                </button>
              </div>
            )}
          </div>
        </div>

        {workspace.isOpen("anatomy") &&
          !workspace.isMinimized("anatomy") && (
            <div className="pointer-events-none absolute bottom-4 left-4 top-16 z-40 w-72">
              <div className="pointer-events-auto h-full">
                <BrainAnatomyNavigator
                  structures={brainStructures}
                  selectedStructure={selectedStructure}
                  onSelectStructure={selectBrainStructure}
                  observationContext={observationContext}
                  onReturnToMacro={returnToMacro}
                />

                <div className="pointer-events-auto absolute right-2 top-2 z-20 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      workspace.minimizePanel("anatomy")
                    }
                    className="flex h-6 w-6 items-center justify-center rounded-md bg-black/70 text-xs text-white/50 backdrop-blur hover:bg-white/10 hover:text-white"
                    title="Minimize"
                    aria-label="Minimize Brain Anatomy"
                  >
                    −
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      workspace.closePanel("anatomy")
                    }
                    className="flex h-6 w-6 items-center justify-center rounded-md bg-black/70 text-xs text-white/50 backdrop-blur hover:bg-red-500/20 hover:text-white"
                    title="Close"
                    aria-label="Close Brain Anatomy"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          )}

        <div className="pointer-events-none absolute left-4 top-16 z-10 mt-2 rounded-lg bg-black/55 px-3 py-2 text-sm text-white/80 backdrop-blur">
          {status}
        </div>

        {workspace.isOpen("inspector") &&
          !workspace.isMinimized("inspector") && (
            <div className="pointer-events-none absolute bottom-4 right-4 top-16 z-40 w-80 max-w-[calc(100%-2rem)]">
              <div className="pointer-events-auto h-full">
                <AnatomicalInspector
                  structure={selectedStructure}
                  activeScale={activeScale}
                  onScaleChange={handleScaleChange}
                  observationContext={observationContext}
                  onReturnToMacro={returnToMacro}
                  activeNanobots={nanobots.filter((nanobot) =>
                    nanobot.target?.structureId === selectedStructure?.id &&
                    nanobot.state !== "completed" &&
                    nanobot.state !== "error",
                  )}
                  onSelectNanobot={selectNanobot}
                  isIsolated={isolationMode}
                  interiorMode={interiorMode}
                  interiorOpacity={interiorOpacity}
                  cutawayDepth={cutawayDepth}
                  crossSectionMode={crossSectionMode}
                  crossSectionDepth={crossSectionDepth}
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
                      setIsolationMode(false);
                    } else {
                      setBrainIsolation(mesh);
                      setIsolationMode(true);
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

                <div className="pointer-events-auto absolute right-2 top-2 z-20 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      workspace.minimizePanel("inspector")
                    }
                    className="flex h-6 w-6 items-center justify-center rounded-md bg-black/70 text-xs text-white/50 backdrop-blur hover:bg-white/10 hover:text-white"
                    title="Minimize"
                    aria-label="Minimize Anatomical Inspector"
                  >
                    −
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      workspace.closePanel("inspector")
                    }
                    className="flex h-6 w-6 items-center justify-center rounded-md bg-black/70 text-xs text-white/50 backdrop-blur hover:bg-red-500/20 hover:text-white"
                    title="Close"
                    aria-label="Close Anatomical Inspector"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          )}

        {workspace.isOpen("nanobots") &&
          !workspace.isMinimized("nanobots") && (
            <div className="pointer-events-none absolute bottom-4 right-4 top-16 z-40 w-80 max-w-[calc(100%-2rem)]">
              <div className="pointer-events-auto h-full">
                <NanobotPanel
                  nanobots={nanobots}
                  missionHistory={missionHistory}
                  selectedNanobotId={selectedNanobotId}
                  selectedStructure={selectedStructure}
                  observationContext={observationContext}
                  onDeploy={deployNanobot}
                  onPause={pauseNanobots}
                  onResume={resumeNanobots}
                  onReturn={returnNanobots}
                  onClear={clearNanobots}
                  onSelectNanobot={selectNanobot}
                />

                <div className="pointer-events-auto absolute right-2 top-2 z-20 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      workspace.minimizePanel("nanobots")
                    }
                    className="flex h-6 w-6 items-center justify-center rounded-md bg-black/70 text-xs text-white/50 backdrop-blur hover:bg-white/10 hover:text-white"
                    title="Minimize"
                    aria-label="Minimize Nanobot System"
                  >
                    −
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      workspace.closePanel("nanobots")
                    }
                    className="flex h-6 w-6 items-center justify-center rounded-md bg-black/70 text-xs text-white/50 backdrop-blur hover:bg-red-500/20 hover:text-white"
                    title="Close"
                    aria-label="Close Nanobot System"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          )}

        {workspace.isOpen("luna") &&
          !workspace.isMinimized("luna") && (
            <div className="pointer-events-none absolute bottom-4 right-4 top-16 z-50 w-[min(22rem,calc(100%-2rem))] md:right-[21rem]">
              <div className="pointer-events-auto relative h-full">
                <LunaBrainAssistant />

                <div className="absolute right-2 top-2 z-20 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      workspace.minimizePanel("luna")
                    }
                    className="flex h-6 w-6 items-center justify-center rounded-md bg-black/70 text-xs text-white/50 backdrop-blur hover:bg-white/10 hover:text-white"
                    title="Minimize"
                    aria-label="Minimize Luna Brain Assistant"
                  >
                    −
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      workspace.closePanel("luna")
                    }
                    className="flex h-6 w-6 items-center justify-center rounded-md bg-black/70 text-xs text-white/50 backdrop-blur hover:bg-red-500/20 hover:text-white"
                    title="Close"
                    aria-label="Close Luna Brain Assistant"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          )}

        <div className="pointer-events-none absolute bottom-4 left-4 z-10 rounded-lg border border-white/10 bg-black/55 px-3 py-2 text-xs text-white/65 backdrop-blur">
          Drag to rotate · Scroll to zoom · Right-drag to pan · Click a structure · Double-click to reset
        </div>
      </div>
    </BrainWorkspace>
  );
}