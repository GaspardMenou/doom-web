import {Raycaster, Vector2} from 'three';

export function hitsTarget(camera, objects, target) {
  // shortcut: objets directs de la pièce ; adapter le parcours si le niveau utilise des groupes.
  camera.updateWorldMatrix(true, false);
  for (const object of objects) object.updateWorldMatrix(true, false);

  const raycaster = new Raycaster();
  raycaster.setFromCamera(new Vector2(0, 0), camera);
  const meshes = objects.filter(object => object.isMesh && object.visible);
  const hits = raycaster.intersectObjects(meshes, false);
  return hits[0]?.object === target;
}
