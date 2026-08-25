import type {
  Nanobot,
  NanobotPosition,
} from "./NanobotTypes";

export interface NanobotNavigationTarget {
  position: NanobotPosition;
  radius: number;
}

export interface NanobotNavigationResult {
  position: NanobotPosition;
  progress: number;
  arrived: boolean;
  distanceRemaining: number;
}

function distance(
  a: NanobotPosition,
  b: NanobotPosition,
): number {
  const dx =
    b.x - a.x;

  const dy =
    b.y - a.y;

  const dz =
    b.z - a.z;

  return Math.sqrt(
    dx * dx +
      dy * dy +
      dz * dz,
  );
}

function lerp(
  start: number,
  end: number,
  amount: number,
): number {
  return (
    start +
    (end - start) *
      amount
  );
}

export function navigateNanobot(
  nanobot: Nanobot,
  target: NanobotNavigationTarget,
  delta: number,
): NanobotNavigationResult {
  const current =
    nanobot.position;

  const totalDistance =
    distance(
      current,
      target.position,
    );

  if (
    totalDistance <=
    target.radius
  ) {
    return {
      position: {
        ...target.position,
      },
      progress: 1,
      arrived: true,
      distanceRemaining: 0,
    };
  }

  const movementRate =
    Math.min(
      1,
      Math.max(
        0.01,
        delta * 0.75,
      ),
    );

  const nextPosition = {
    x: lerp(
      current.x,
      target.position.x,
      movementRate,
    ),

    y: lerp(
      current.y,
      target.position.y,
      movementRate,
    ),

    z: lerp(
      current.z,
      target.position.z,
      movementRate,
    ),
  };

  const remainingDistance =
    distance(
      nextPosition,
      target.position,
    );

  const progress =
    Math.min(
      1,
      Math.max(
        0,
        1 -
          remainingDistance /
            Math.max(
              totalDistance,
              0.000001,
            ),
      ),
    );

  return {
    position:
      nextPosition,
    progress,
    arrived:
      remainingDistance <=
      target.radius,
    distanceRemaining:
      remainingDistance,
  };
}

export function returnNanobot(
  nanobot: Nanobot,
  delta: number,
): NanobotNavigationResult {
  return navigateNanobot(
    nanobot,
    {
      position:
        nanobot.deploymentPosition,
      radius: 0.05,
    },
    delta,
  );
}